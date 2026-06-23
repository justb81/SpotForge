// Persistierbare Nutzer-Einstellungen (kein Spielfortschritt). Reine Logik –
// Defaults, tolerante (De-)Serialisierung und die Brücke zum Fortschritt; das I/O
// lebt im Host (expo-Adapter, analog zur Draft-Sammlung). Bewusst getrennt vom
// {@link PlayerProgress}: Fortschritt leitet Freischaltungen ab, Einstellungen sind
// eine Nutzer-Wahl (z.B. das Tutorial dauerhaft überspringen).

import { type PlayerProgress } from "../progression/disclosure";
import { TAB_KEYS, type TabKey } from "../navigation/tabs";

/** Vom Nutzer gewählte, geräte-lokal gespeicherte Einstellungen. */
export interface Preferences {
  /**
   * Gespeicherte Auswahl „skip_tutorial": ist sie gesetzt, wird die
   * First-Time-User-Experience beim Start automatisch übersprungen. Gesetzt über
   * den „Nein"-Pfad des Überspringen-Dialogs oder die Einstellungen im Profil.
   */
  skipTutorial: boolean;
  /**
   * Ob der **Auto-Spot**-Modus (#85) aktiv ist. Wird per Hold→Swipe-Geste am
   * Auslöser **oder** über den Settings-Schalter (Fallback/Barrierefreiheit)
   * umgeschaltet und überdauert die Sitzung. Greift nur, wenn die Variante das
   * Feature überhaupt aktiviert ({@link @spotforge/app-config!AppFeatures.autoSpot}).
   */
  autoSpotEnabled: boolean;
  /**
   * User-Override des Auto-Spot-Intervalls in **Millisekunden**. `undefined` ⇒
   * der Varianten-Default ({@link @spotforge/app-config!resolveAutoSpot}) gilt.
   * Wird beim Anwenden auf den erlaubten Bereich geklemmt (`clampAutoSpotInterval`).
   */
  autoSpotIntervalMs?: number;
  /**
   * Ob der einmalige Onboarding-Coachmark für die Auto-Spot-Geste schon gezeigt
   * wurde. Ohne diesen Hinweis ist der versteckte Toggle praktisch unauffindbar
   * (#85); nach dem ersten Mal bleibt er aus.
   */
  autoSpotCoachmarkSeen: boolean;
  /**
   * Einwilligung in den **Foto-Upload** (#89, Hook zu #26 DSGVO). Karten-Fotos
   * verlassen das Gerät erst nach expliziter Zustimmung (Goldene Regel 5: „Fotos
   * verlassen das Gerät nur per Opt-in"); davor werden sie on-device sanitisiert.
   * Default: **nicht erteilt** – der Upload-Pfad fragt vor dem ersten Mal. Über
   * die Einstellungen widerrufbar (Löschrecht/Transparenz).
   *
   * TODO(#81/#19): Diese Einwilligung wird bislang nur **persistiert**, aber noch
   * nirgends abgefragt (es gibt noch keinen Upload-Endpunkt). Wer den Upload baut,
   * MUSS hier das Gate setzen (kein Foto verlässt das Gerät bei `false`) und die
   * `privacy.upload.*`-Texte rendern.
   */
  uploadConsentGranted: boolean;
  /**
   * Die beim App-Start zuerst geöffnete Ansicht – einer der Tab-Leisten-Bereiche
   * ({@link TabKey}). Default: `"spot"` (der Kern-Loop). Ist die gewählte Ansicht
   * beim Start noch nicht freigeschaltet, fällt die Navigation auf die erste
   * sichtbare zurück ({@link resolveActiveTab}). Wirkt – wie das Tutorial – erst
   * beim **nächsten** Start, nicht mitten in der Sitzung.
   */
  defaultView: TabKey;
}

/**
 * Ausgangszustand: Tutorial sichtbar, Auto-Spot aus, Coachmark noch ungesehen,
 * Start in der Spot-Ansicht.
 */
export const DEFAULT_PREFERENCES: Preferences = {
  skipTutorial: false,
  autoSpotEnabled: false,
  autoSpotCoachmarkSeen: false,
  uploadConsentGranted: false,
  defaultView: "spot",
};

/**
 * Serialisiert die Einstellungen für die Persistenz (vom Host geschrieben). Das
 * optionale Intervall wird nur geschrieben, wenn der Nutzer es überschrieben hat.
 */
export function serializePreferences(preferences: Preferences): string {
  return JSON.stringify({
    skipTutorial: preferences.skipTutorial,
    autoSpotEnabled: preferences.autoSpotEnabled,
    autoSpotCoachmarkSeen: preferences.autoSpotCoachmarkSeen,
    uploadConsentGranted: preferences.uploadConsentGranted,
    defaultView: preferences.defaultView,
    ...(preferences.autoSpotIntervalMs !== undefined
      ? { autoSpotIntervalMs: preferences.autoSpotIntervalMs }
      : {}),
  });
}

/**
 * Liest Einstellungen aus dem gespeicherten JSON. Tolerant: fehlt die Datei
 * (`null`) oder ist sie beschädigt/unvollständig, gelten feldweise die
 * {@link DEFAULT_PREFERENCES} – ein kaputter Eintrag darf den App-Start nie
 * blockieren.
 */
export function parsePreferences(raw: string | null): Preferences {
  if (raw === null) return { ...DEFAULT_PREFERENCES };
  try {
    const parsed = JSON.parse(raw) as Partial<Preferences> | null;
    const interval = parsed?.autoSpotIntervalMs;
    return {
      skipTutorial: bool(parsed?.skipTutorial, DEFAULT_PREFERENCES.skipTutorial),
      autoSpotEnabled: bool(parsed?.autoSpotEnabled, DEFAULT_PREFERENCES.autoSpotEnabled),
      autoSpotCoachmarkSeen: bool(
        parsed?.autoSpotCoachmarkSeen,
        DEFAULT_PREFERENCES.autoSpotCoachmarkSeen,
      ),
      uploadConsentGranted: bool(
        parsed?.uploadConsentGranted,
        DEFAULT_PREFERENCES.uploadConsentGranted,
      ),
      defaultView: tabKey(parsed?.defaultView, DEFAULT_PREFERENCES.defaultView),
      // Nur ein endlicher, positiver Wert gilt als Override; sonst Varianten-Default.
      ...(typeof interval === "number" && Number.isFinite(interval) && interval > 0
        ? { autoSpotIntervalMs: interval }
        : {}),
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

/** Liest einen booleschen Wert tolerant (Nicht-Boolean ⇒ Fallback). */
function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * Liest eine Tab-Auswahl tolerant: nur ein bekannter {@link TabKey} gilt, ein
 * unbekannter/entfernter Wert (z.B. nach einer Navigations-Änderung) fällt auf
 * den Default zurück – die gewählte Start-Ansicht darf den App-Start nie blockieren.
 */
function tabKey(value: unknown, fallback: TabKey): TabKey {
  return typeof value === "string" && (TAB_KEYS as readonly string[]).includes(value)
    ? (value as TabKey)
    : fallback;
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
