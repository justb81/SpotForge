// React-Anbindung des Auto-Spot-Loops (#85): hält einen {@link AutoSpotRunner} am
// Leben, startet/stoppt ihn anhand von `active` und pausiert ihn, sobald die App in
// den Hintergrund geht (AppState) – ein Akzeptanzkriterium. Die reine Loop-Logik
// (Back-Pressure, Auto-Feuer-Schwelle) liegt in `autoSpot.ts`; dieser Hook ist die
// dünne, RN-spezifische Verdrahtung und wird – wie SpotCamera – im Build verifiziert.

import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import type { SpotResult } from "@spotforge/ai-engine";
import { createAutoSpotRunner, type AutoSpotRunner } from "./autoSpot";

export interface UseAutoSpotParams {
  /** Soll der Loop laufen? (Feature an + per Geste/Settings aktiviert + Kamera sichtbar). */
  active: boolean;
  /** Aufgelöstes Intervall in ms (User-Override ▸ Varianten-Default). */
  intervalMs: number;
  /** Strengere Auto-Feuer-Schwelle (#85). */
  autoFireMinConfidence: number;
  /** Nimmt einen stillen Still auf (Kamera-Ref); `null` ⇒ nicht bereit. */
  capture: () => Promise<string | null>;
  /** Schickt das Bild durch die normale Spot-Pipeline. */
  classify: (uri: string) => Promise<SpotResult>;
  /** Treffer über der Schwelle → in den normalen Detect-/Draft-Flow. */
  onFire: (uri: string, result: SpotResult) => void;
  /** Optionaler Fehler-Hook (Logging); ein Fehler stoppt den Loop nicht. */
  onError?: (error: unknown) => void;
}

/**
 * Verdrahtet den Auto-Spot-Loop mit React-Lebenszyklus und AppState. Gibt nichts
 * zurück – der Effekt ist die Steuerung; der UI-Zustand (Knopf in Auto-Position)
 * lebt im Aufrufer (aus den Preferences abgeleitet).
 */
export function useAutoSpot({
  active,
  intervalMs,
  autoFireMinConfidence,
  capture,
  classify,
  onFire,
  onError,
}: UseAutoSpotParams): void {
  // Aktuelle Callbacks/Flags in Refs spiegeln, damit der Runner stabil bleibt und
  // nicht bei jeder Render-Identität neu gebaut werden muss.
  const captureRef = useRef(capture);
  const classifyRef = useRef(classify);
  const onFireRef = useRef(onFire);
  const onErrorRef = useRef(onError);
  const activeRef = useRef(active);
  captureRef.current = capture;
  classifyRef.current = classify;
  onFireRef.current = onFire;
  onErrorRef.current = onError;

  const runnerRef = useRef<AutoSpotRunner | null>(null);

  // Runner (neu) bauen, wenn sich die getakteten Parameter ändern. Beim Aufbau
  // sofort starten, falls schon aktiv; Cleanup stoppt den alten Runner.
  useEffect(() => {
    const runner = createAutoSpotRunner({
      capture: () => captureRef.current(),
      classify: (uri) => classifyRef.current(uri),
      onFire: (uri, result) => onFireRef.current(uri, result),
      onError: (error) => onErrorRef.current?.(error),
      intervalMs,
      autoFireMinConfidence,
    });
    runnerRef.current = runner;
    if (activeRef.current) runner.start();
    return () => {
      runner.stop();
      runnerRef.current = null;
    };
  }, [intervalMs, autoFireMinConfidence]);

  // Start/Stop bei Wechsel von `active`.
  useEffect(() => {
    activeRef.current = active;
    const runner = runnerRef.current;
    if (!runner) return;
    if (active) runner.start();
    else runner.stop();
  }, [active]);

  // Im Hintergrund pausieren, im Vordergrund fortsetzen (Akzeptanzkriterium).
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      const runner = runnerRef.current;
      if (!runner) return;
      if (next === "active") runner.resume();
      else runner.pause();
    });
    return () => subscription.remove();
  }, []);
}
