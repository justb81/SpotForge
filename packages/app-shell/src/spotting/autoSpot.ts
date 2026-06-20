// Auto-Spot (#85, ADR 0010): die **reine** Steuer-Logik des intervallgesteuerten
// Auslösers – Auto-Feuer-Entscheidung, Intervall-Auflösung und der Back-Pressure-
// Loop. Bewusst RN-frei (Kamera/Timer/AppState injiziert), damit der heikle Teil
// – kein Überlappen, Timer-Restart erst nach Ergebnis, Pause im Hintergrund –
// unter vitest deterministisch testbar ist. Die native Verdrahtung (Kamera-Ref,
// AppState) lebt im `useAutoSpot`-Hook.
//
// Auto-Spot ist **kein** Frame-Processor: es wiederholt nur den ganz normalen
// Foto→Draft-Flow getaktet (vermeidet den nativen Bridgeless-Pfad, vgl. CLAUDE.md).

import { clampAutoSpotInterval, resolveAutoSpot, type AppDefinition } from "@spotforge/app-config";
import type { SpotResult } from "@spotforge/ai-engine";
import type { Preferences } from "../preferences/preferences";

/**
 * Entscheidet, ob ein einzelner Auto-Schuss „feuert" – also in den normalen
 * Detect-/Draft-Flow weitergeleitet wird. Maßgeblich ist die **summierte
 * Gate-Masse** ({@link SpotResult.gateMass}) gegen die **strengere**
 * `autoFireMinConfidence` (#85): die Pipeline akzeptiert schon bei der manuellen
 * Schwelle, der getaktete Auto-Modus aber erst über der Auto-Schwelle. So löst ein
 * flüchtiges, schwach auto-ähnliches Etwas beim Kamera-Schwenk nicht aus.
 *
 * Ein abgelehntes Gate trägt naturgemäß zu wenig Masse (< manuelle Schwelle <
 * Auto-Schwelle) und feuert nie; fehlt die Masse (manueller Draft ohne Kaskade),
 * wird konservativ **nicht** gefeuert.
 */
export function evaluateAutoFire(result: SpotResult, autoFireMinConfidence: number): boolean {
  return (result.gateMass ?? 0) >= autoFireMinConfidence;
}

/**
 * Auflösung des effektiven Auto-Spot-Intervalls: User-Override
 * ({@link Preferences.autoSpotIntervalMs}) vor dem Varianten-Default
 * ({@link resolveAutoSpot}), in jedem Fall auf den erlaubten Bereich geklemmt.
 */
export function resolveAutoSpotInterval(
  definition: AppDefinition,
  preferences: Preferences,
): number {
  const base = resolveAutoSpot(definition).intervalMs;
  return clampAutoSpotInterval(preferences.autoSpotIntervalMs ?? base);
}

/** Plant einen Rückruf nach `ms` ein und liefert einen Abbrecher. */
export type AutoSpotScheduler = (cb: () => void, ms: number) => () => void;

/** Aktueller Zustand des Loops (für UI-Indikatoren/Tests). */
export type AutoSpotState = "idle" | "scheduled" | "running" | "paused" | "stopped";

/** Injizierte Abhängigkeiten des Back-Pressure-Loops. */
export interface AutoSpotRunnerDeps {
  /**
   * Nimmt einen **stillen** Vollbild-Still auf und liefert dessen lokale URI.
   * `null` ⇒ kein Bild verfügbar (z.B. Kamera nicht bereit) → der Loop plant
   * einfach den nächsten Tick, ohne zu feuern.
   */
  capture: () => Promise<string | null>;
  /** Schickt ein Bild durch die normale Spot-Pipeline (Gate → Feinmodell). */
  classify: (uri: string) => Promise<SpotResult>;
  /**
   * Feuert: leitet einen Treffer in den normalen Detect-/Draft-Flow. Der Loop
   * **stoppt** danach; das erneute Starten (nach dem Draft-Review) obliegt dem Host.
   */
  onFire: (uri: string, result: SpotResult) => void;
  /** Optionaler Fehler-Hook; ein Fehler im Lauf stoppt den Loop nicht (nächster Tick). */
  onError?: (error: unknown) => void;
  /** Intervall zwischen zwei Schüssen in ms (bereits aufgelöst/geklemmt). */
  intervalMs: number;
  /** Strengere Auto-Feuer-Schwelle (#85). */
  autoFireMinConfidence: number;
  /** Planer für den Intervall-Timer; injizierbar für Tests. Default: setTimeout. */
  schedule?: AutoSpotScheduler;
}

/** Steuer-Handle des Auto-Spot-Loops. */
export interface AutoSpotRunner {
  /** Startet den Loop (erster Schuss sofort). Mehrfaches Starten ist ein No-op. */
  start(): void;
  /** Stoppt den Loop endgültig (Timer abgebrochen; laufender Schuss feuert nicht mehr). */
  stop(): void;
  /** Pausiert (z.B. App im Hintergrund): kein neuer Tick, laufender Schuss läuft aus. */
  pause(): void;
  /** Setzt nach einer Pause fort und löst zeitnah den nächsten Schuss aus. */
  resume(): void;
  /** Aktueller Zustand (für Tests/Indikatoren). */
  readonly state: AutoSpotState;
}

/** Default-Planer: `setTimeout` mit `clearTimeout`-Abbrecher. */
const defaultScheduler: AutoSpotScheduler = (cb, ms) => {
  const handle = setTimeout(cb, ms);
  return () => clearTimeout(handle);
};

/**
 * Baut den Back-Pressure-Loop: capture → classify → (feuern | nächster Tick).
 *
 * Garantien (Akzeptanzkriterien #85):
 * - **Kein Überlappen:** während ein Schuss in Bearbeitung ist, wird kein neuer
 *   ausgelöst (`running`-Guard). Dauert ein Lauf länger als das Intervall, läuft
 *   Auto-Spot „so schnell wie das Gerät kann".
 * - **Timer-Restart erst nach Ergebnis:** der nächste Tick wird erst geplant, wenn
 *   der aktuelle Lauf ein Ergebnis hat (Reject **oder** Treffer).
 * - **Pause im Hintergrund:** {@link AutoSpotRunner.pause} unterbindet neue Ticks;
 *   ein bereits laufender Schuss wird verworfen (kein Feuern nach Pause/Stop).
 */
export function createAutoSpotRunner(deps: AutoSpotRunnerDeps): AutoSpotRunner {
  const { capture, classify, onFire, onError, intervalMs, autoFireMinConfidence } = deps;
  const schedule = deps.schedule ?? defaultScheduler;

  let active = false; // Loop läuft (zwischen start und stop/fire).
  let paused = false; // Vorübergehend angehalten (Hintergrund).
  let running = false; // Ein Schuss ist gerade in Bearbeitung (Back-Pressure).
  let cancelTimer: (() => void) | undefined;

  function clearTimer(): void {
    cancelTimer?.();
    cancelTimer = undefined;
  }

  function scheduleNext(): void {
    if (!active || paused || running) return;
    clearTimer();
    cancelTimer = schedule(() => {
      cancelTimer = undefined;
      void tick();
    }, intervalMs);
  }

  async function tick(): Promise<void> {
    // Back-Pressure + Lebenszyklus: nur ein Lauf gleichzeitig, nicht im Pause-/Stopp-Zustand.
    if (!active || paused || running) return;
    running = true;
    try {
      const uri = await capture();
      // Während des Laufs gestoppt/pausiert? → Ergebnis verwerfen, nicht feuern.
      if (!active || paused) return;
      if (uri === null) return; // Kein Bild → nächster Tick (im finally geplant).

      const result = await classify(uri);
      if (!active || paused) return;

      if (evaluateAutoFire(result, autoFireMinConfidence)) {
        active = false; // Treffer: Loop endet; Host führt durch den Draft-Flow.
        clearTimer();
        onFire(uri, result);
      }
    } catch (error) {
      onError?.(error);
    } finally {
      running = false;
      // Nächsten Tick nur planen, wenn weiterhin aktiv und nicht pausiert (und
      // nicht gerade gefeuert → active=false verhindert das).
      scheduleNext();
    }
  }

  return {
    start(): void {
      if (active) return;
      active = true;
      paused = false;
      void tick(); // Erster Schuss sofort.
    },
    stop(): void {
      active = false;
      paused = false;
      clearTimer();
    },
    pause(): void {
      if (!active || paused) return;
      paused = true;
      clearTimer();
    },
    resume(): void {
      if (!active || !paused) return;
      paused = false;
      if (!running) void tick(); // Zeitnah fortsetzen.
    },
    get state(): AutoSpotState {
      if (!active) return "stopped";
      if (paused) return "paused";
      if (running) return "running";
      return cancelTimer ? "scheduled" : "idle";
    },
  };
}
