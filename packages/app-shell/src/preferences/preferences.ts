// Persistierbare Nutzer-Einstellungen (kein Spielfortschritt). Reine Logik –
// Defaults, tolerante (De-)Serialisierung und die Brücke zum Fortschritt; das I/O
// lebt im Host (expo-Adapter, analog zur Draft-Sammlung). Bewusst getrennt vom
// {@link PlayerProgress}: Fortschritt leitet Freischaltungen ab, Einstellungen sind
// eine Nutzer-Wahl (z.B. das Tutorial dauerhaft überspringen).

import { type PlayerProgress } from "../progression/disclosure";

/** Vom Nutzer gewählte, geräte-lokal gespeicherte Einstellungen. */
export interface Preferences {
  /**
   * Gespeicherte Auswahl „skip_tutorial": ist sie gesetzt, wird die
   * First-Time-User-Experience beim Start automatisch übersprungen. Gesetzt über
   * den „Nein"-Pfad des Überspringen-Dialogs oder die Einstellungen im Profil.
   */
  skipTutorial: boolean;
}

/** Ausgangszustand: Tutorial wird beim Start gezeigt. */
export const DEFAULT_PREFERENCES: Preferences = { skipTutorial: false };

/**
 * Serialisiert die Einstellungen für die Persistenz (vom Host geschrieben).
 */
export function serializePreferences(preferences: Preferences): string {
  return JSON.stringify({ skipTutorial: preferences.skipTutorial });
}

/**
 * Liest Einstellungen aus dem gespeicherten JSON. Tolerant: fehlt die Datei
 * (`null`) oder ist sie beschädigt/unvollständig, gelten die {@link DEFAULT_PREFERENCES}
 * – ein kaputter Eintrag darf den App-Start nie blockieren.
 */
export function parsePreferences(raw: string | null): Preferences {
  if (raw === null) return { ...DEFAULT_PREFERENCES };
  try {
    const parsed = JSON.parse(raw) as Partial<Preferences> | null;
    return {
      skipTutorial:
        typeof parsed?.skipTutorial === "boolean"
          ? parsed.skipTutorial
          : DEFAULT_PREFERENCES.skipTutorial,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

/**
 * Anfänglicher Sitzungs-Fortschritt unter Berücksichtigung der Einstellungen:
 * ist das Tutorial dauerhaft übersprungen (`skipTutorial`), gilt die FTUE als
 * abgeschlossen und der Spieler liegt auf mindestens Level 1 – sonst blieben nach
 * dem Überspringen Sammlung/Profil/**Einstellungen** verschlossen, und man käme nie
 * dazu, die Auswahl wieder zurückzunehmen.
 *
 * Bewusst nur **einmal beim Start** angewandt (Seed): ein späteres Umschalten der
 * Einstellung greift erst beim nächsten Start und reißt den Nutzer nicht mitten in
 * der Sitzung ins Tutorial.
 */
export function resolveInitialProgress(
  progress: PlayerProgress,
  preferences: Preferences,
): PlayerProgress {
  if (!preferences.skipTutorial) return progress;
  return { ftueCompleted: true, level: Math.max(progress.level, 1) };
}
