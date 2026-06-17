// Gemeinsame Text-Defaults der generischen App. Jede sichtbare Zeichenkette der
// app-shell lebt hier als mehrsprachiger {@link LocalizedText} und kann von einer
// Variante über `AppDefinition.content` überschrieben werden (siehe `text.ts`).
//
// Kategorie-neutral: keine fahrzeug-/tier-/… spezifischen Begriffe. Die cars-
// Variante rebrandet z.B. `collection.title` → „Garage" oder `spot.cta` →
// „Auto spotten" allein über ihre `content`-Overrides – ohne Code-Änderung.

import type { ContentOverrides } from "@spotforge/app-config";

/**
 * Vollständiger Default-Katalog. `satisfies ContentOverrides` erzwingt, dass jeder
 * Eintrag für **alle** {@link LocaleCode}s übersetzt ist (fehlt eine Sprache,
 * schlägt der Typecheck fehl). Die Schlüssel sind die in der app-shell verwendeten
 * i18n-Keys; die Variante muss nur Abweichungen liefern.
 */
export const DEFAULT_CONTENT = {
  // --- Navigation (Tab-Labels; Screen-Titel teilen sich dieselben Keys) -------
  "nav.spot": { de: "Spotten", en: "Spot" },
  "collection.title": { de: "Sammlung", en: "Collection" },
  "battle.title": { de: "Duell", en: "Duel" },
  "trade.title": { de: "Tausch", en: "Trade" },
  "profile.title": { de: "Profil", en: "Profile" },
  "forge.title": { de: "Schmieden", en: "Forge" },

  // --- Spot-Screen (Kern-Loop) ------------------------------------------------
  "spot.cta": { de: "Spotten", en: "Spot" },
  "spot.retake": { de: "Neues Foto", en: "New photo" },
  "spot.shutter": { de: "Auslösen", en: "Capture" },
  "spot.permissionPrompt": {
    de: "Für das Spotten wird Zugriff auf die Kamera benötigt.",
    en: "Spotting needs access to your camera.",
  },
  "spot.permissionCta": { de: "Kamera erlauben", en: "Allow camera" },
  "spot.modelLoading": { de: "Modell wird geladen …", en: "Loading model …" },
  "spot.error": {
    de: "Erkennung fehlgeschlagen. Bitte erneut versuchen.",
    en: "Recognition failed. Please try again.",
  },
  "spot.hit": { de: "Treffer! Draft angelegt.", en: "Hit! Draft created." },
  "spot.detected": { de: "Erkannt", en: "Detected" },
  "spot.resultPlaceholder": {
    de: "Noch kein Spot. Nimm ein Foto auf.",
    en: "No spot yet. Take a photo.",
  },
  "spot.pickTitle": { de: "Erkannt – bitte auswählen:", en: "Recognized — please choose:" },
  "spot.manualEntry": { de: "Manuell eingeben", en: "Enter manually" },
  "spot.manualTitle": { de: "Manuell eingeben", en: "Enter manually" },
  "spot.manualHint": {
    de: "Benenne das Objekt selbst.",
    en: "Name the object yourself.",
  },
  "spot.manualCreate": { de: "Als Draft anlegen", en: "Create draft" },
  "spot.unrecognizedTitle": { de: "Nicht erkannt", en: "Not recognized" },
  "spot.unrecognizedHint": {
    de: "Das ließ sich keinem Objekt zuordnen. Du kannst es selbst benennen.",
    en: "This couldn't be matched to an object. You can name it yourself.",
  },

  // --- Draft / Forge ----------------------------------------------------------
  "forge.pending": {
    de: "Geschmiedet wird online – Verbindung erforderlich.",
    en: "Forging happens online — connection required.",
  },
  "draft.edit": { de: "Bestätigen / korrigieren", en: "Confirm / correct" },
  "draft.rarity": { de: "Entwurf", en: "Draft" },
  "draft.editTitle": { de: "Draft bearbeiten", en: "Edit draft" },
  "draft.nameLabel": { de: "Name", en: "Name" },
  "draft.attributesLabel": { de: "Werte vorschlagen", en: "Suggest stats" },
  "draft.save": { de: "Übernehmen", en: "Apply" },
  "draft.cancel": { de: "Abbrechen", en: "Cancel" },
  "card.spottedBy": { de: "Gespottet von", en: "Spotted by" },

  // --- First-Time-User-Experience (GDD §11.1) ---------------------------------
  "ftue.skip": { de: "Überspringen", en: "Skip" },
  "ftue.next": { de: "Weiter", en: "Next" },
  "ftue.back": { de: "Zurück", en: "Back" },
  "ftue.finish": { de: "Loslegen", en: "Start playing" },
  "ftue.welcome.title": { de: "Spot · Forge · Battle", en: "Spot · Forge · Battle" },
  "ftue.welcome.body": {
    de: "Fotografiere echte Objekte, schmiede sie zu Sammelkarten und tritt in Trumpf-Duellen an.",
    en: "Photograph real-world objects, forge them into cards and compete in trump duels.",
  },
  "ftue.spot.title": { de: "Dein erster Spot", en: "Your first spot" },
  "ftue.spot.body": {
    de: "Richte die Kamera auf ein Objekt und löse aus – mehr braucht es nicht.",
    en: "Point the camera at an object and capture — that's all it takes.",
  },
  "ftue.forge.title": { de: "Schmieden", en: "Forging" },
  "ftue.forge.body": {
    de: "Aus deinem Spot entsteht eine Karte mit echten Fakten als Werten.",
    en: "Your spot becomes a card with real-world facts as its stats.",
  },
  "ftue.battle.title": { de: "Duelliere dich", en: "Duel others" },
  "ftue.battle.body": {
    de: "Wähle einen Wert – der höhere gewinnt den Stich.",
    en: "Pick a stat — the higher value wins the trick.",
  },
  "ftue.trade.title": { de: "Tauschen", en: "Trading" },
  "ftue.trade.body": {
    de: "Tausche Dubletten mit anderen Sammlern.",
    en: "Trade duplicates with other collectors.",
  },
  "ftue.gift.title": { de: "3 Starter-Karten", en: "3 starter cards" },
  "ftue.gift.body": {
    de: "Als Willkommensgeschenk erhältst du drei Karten für den Start.",
    en: "As a welcome gift you get three cards to start with.",
  },

  // --- Generische Screen-Platzhalter (echte Features folgen in eigenen Issues) -
  "screen.comingSoon": { de: "Kommt bald", en: "Coming soon" },
  "collection.empty": {
    de: "Noch keine Karten. Spotte dein erstes Objekt!",
    en: "No cards yet. Spot your first object!",
  },
  "battle.empty": {
    de: "Sammle ein paar Karten und fordere andere zum Duell.",
    en: "Collect some cards and challenge others to a duel.",
  },
  "trade.empty": {
    de: "Tausche Dubletten, sobald du welche hast.",
    en: "Trade duplicates once you have some.",
  },
  "profile.empty": {
    de: "Hier entstehen Statistiken und Fortschritt.",
    en: "Stats and progress will live here.",
  },

  // --- Progressive Disclosure (GDD §11.2) -------------------------------------
  // `{level}` wird zur Anzeige durch die konkrete Stufe ersetzt.
  "feature.locked": {
    de: "Wird ab Level {level} freigeschaltet.",
    en: "Unlocks at level {level}.",
  },
} satisfies ContentOverrides;

/** Alle bekannten Default-Schlüssel (für Typsicherheit beim Auflösen). */
export type DefaultTextKey = keyof typeof DEFAULT_CONTENT;
