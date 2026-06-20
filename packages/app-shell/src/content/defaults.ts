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
  // Sekundärer Button (nur bei `features.imageImport`): bestehendes Bild laden.
  "spot.importImage": { de: "Bild laden", en: "Load image" },
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

  // --- Auto-Spot (#85): versteckte Geste am Auslöser + Coachmark --------------
  "spot.auto": { de: "auto", en: "auto" },
  "spot.auto.activate": {
    de: "Auslöser halten und nach rechts wischen, um den Auto-Modus zu aktivieren",
    en: "Hold the shutter and swipe right to turn on auto mode",
  },
  "spot.auto.active": { de: "Auto-Spot aktiv", en: "Auto-spot active" },
  "spot.auto.deactivate": {
    de: "Tippen, um den Auto-Modus zu deaktivieren",
    en: "Tap to turn off auto mode",
  },
  "spot.auto.coachmark.title": {
    de: "Auto-Spot: freihändig spotten",
    en: "Auto-spot: hands-free spotting",
  },
  "spot.auto.coachmark.body": {
    de: "Halte den Auslöser gedrückt und wische nach rechts – dann spottet die Kamera in festem Takt von selbst. Alles bleibt on-device (kein Upload); im Dauerbetrieb verbraucht es mehr Akku.",
    en: "Hold the shutter and swipe right — the camera then spots on its own at a fixed pace. Everything stays on-device (no upload); running continuously uses more battery.",
  },
  "spot.auto.coachmark.dismiss": { de: "Verstanden", en: "Got it" },

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

  // --- Lokale Sammlung (#102) -------------------------------------------------
  "collection.save": { de: "In Sammlung speichern", en: "Save to collection" },
  "collection.saved": { de: "In Sammlung gespeichert", en: "Saved to collection" },
  "collection.back": { de: "Zurück", en: "Back" },
  "collection.remove": { de: "Aus Sammlung entfernen", en: "Remove from collection" },
  "collection.removeConfirm": { de: "Wirklich entfernen?", en: "Remove for good?" },

  // --- Kartenbibliothek: Filter/Sortierung (#17) ------------------------------
  "collection.search": { de: "Suchen …", en: "Search …" },
  "collection.noMatches": {
    de: "Keine Karte passt zur Suche.",
    en: "No card matches your search.",
  },
  "collection.sort.newest": { de: "Neueste", en: "Newest" },
  "collection.sort.oldest": { de: "Älteste", en: "Oldest" },
  "collection.sort.name": { de: "Name", en: "Name" },
  "collection.sort.rarity": { de: "Seltenheit", en: "Rarity" },

  // --- Deck-Management (GDD §7.2, #17) ----------------------------------------
  "deck.manage": { de: "Deck", en: "Deck" },
  "deck.back": { de: "Zurück", en: "Back" },
  // `{count}` Karten im Deck von `{capacity}` Plätzen.
  "deck.count": { de: "{count} / {capacity}", en: "{count} / {capacity}" },
  "deck.inDeck": { de: "Im Deck", en: "In deck" },
  "deck.add": { de: "Tippen zum Hinzufügen", en: "Tap to add" },
  "deck.full": { de: "Deck voll", en: "Deck full" },
  "deck.empty": {
    de: "Sammle erst ein paar Karten für dein Deck.",
    en: "Collect some cards for your deck first.",
  },

  // --- Seltenheits-Stufen (GDD §5.3) ------------------------------------------
  "rarity.common": { de: "Gewöhnlich", en: "Common" },
  "rarity.uncommon": { de: "Ungewöhnlich", en: "Uncommon" },
  "rarity.rare": { de: "Selten", en: "Rare" },
  "rarity.epic": { de: "Episch", en: "Epic" },
  "rarity.legendary": { de: "Legendär", en: "Legendary" },

  // --- Profil & Progression (GDD §7.1, #17) -----------------------------------
  "profile.level": { de: "Level {level}", en: "Level {level}" },
  "profile.nextTitle": {
    de: "Nächster Titel: {title} ab Level {level}",
    en: "Next title: {title} at level {level}",
  },
  "profile.maxTitle": { de: "Höchster Titel erreicht", en: "Highest title reached" },
  "profile.stats": { de: "Statistiken", en: "Statistics" },
  "profile.byRarity": { de: "Nach Seltenheit", en: "By rarity" },
  "profile.stat.spotted": { de: "Gespottet", en: "Spotted" },
  "profile.stat.forged": { de: "Geschmiedet", en: "Forged" },
  "profile.stat.rarityScore": { de: "Seltenheits-Score", en: "Rarity score" },
  // Titel-System (GDD §7.1).
  "profile.title.rookie": { de: "Rookie-Spotter", en: "Rookie Spotter" },
  "profile.title.pro": { de: "Profi-Spotter", en: "Pro Spotter" },
  "profile.title.expert": { de: "Experten-Schmied", en: "Expert Forge" },
  "profile.title.master": { de: "Meister-Schmied", en: "Master Forge" },
  "profile.title.legendary": { de: "Legendärer Spotter", en: "Legendary Spotter" },
  // Unterpunkt im Profil, der die Einstellungen öffnet.
  "profile.settings": { de: "Einstellungen", en: "Settings" },

  // --- Einstellungen (Profil ▸ Einstellungen) ---------------------------------
  "settings.title": { de: "Einstellungen", en: "Settings" },
  "settings.back": { de: "Zurück", en: "Back" },
  "settings.tutorial.label": {
    de: "Tutorial beim Start anzeigen",
    en: "Show tutorial on start",
  },
  "settings.tutorial.hint": {
    de: "Aus: Beim nächsten Start geht es direkt ins Spotten.",
    en: "Off: jump straight to spotting on the next start.",
  },
  // Start-Ansicht: welche Tab-Leisten-Ansicht beim App-Start zuerst erscheint.
  "settings.defaultView.label": { de: "Start-Ansicht", en: "Start view" },
  "settings.defaultView.hint": {
    de: "Ansicht, die beim Öffnen der App zuerst erscheint. Greift beim nächsten Start.",
    en: "View shown first when the app opens. Applies on the next start.",
  },
  // Auto-Spot (#85): Schalter als Fallback zur Geste + Intervall-Einstellung.
  "settings.autoSpot.label": { de: "Auto-Spot", en: "Auto-spot" },
  "settings.autoSpot.hint": {
    de: "Nimmt in festem Takt selbst Fotos auf und spottet on-device. Mehr Akkuverbrauch.",
    en: "Captures photos on a fixed cadence and spots on-device. Uses more battery.",
  },
  "settings.autoSpot.interval.label": { de: "Aufnahme-Intervall", en: "Capture interval" },
  // `{seconds}` = Intervall in Sekunden (eine Nachkommastelle).
  "settings.autoSpot.interval.value": { de: "alle {seconds} s", en: "every {seconds} s" },
  "settings.autoSpot.interval.decrease": { de: "Intervall verkürzen", en: "Shorten interval" },
  "settings.autoSpot.interval.increase": { de: "Intervall verlängern", en: "Lengthen interval" },

  // --- First-Time-User-Experience (GDD §11.1) ---------------------------------
  "ftue.skip": { de: "Überspringen", en: "Skip" },
  // Abfrage beim Überspringen: ob das Tutorial beim nächsten Start wieder erscheint.
  "ftue.skipConfirm.title": {
    de: "Beim nächsten Start wieder anzeigen?",
    en: "Show again on next start?",
  },
  "ftue.skipConfirm.yes": { de: "Ja", en: "Yes" },
  "ftue.skipConfirm.no": { de: "Nein", en: "No" },
  "ftue.skipConfirm.dismiss": { de: "Abbrechen", en: "Cancel" },
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

  // --- Progressive Disclosure (GDD §11.2) -------------------------------------
  // `{level}` wird zur Anzeige durch die konkrete Stufe ersetzt.
  "feature.locked": {
    de: "Wird ab Level {level} freigeschaltet.",
    en: "Unlocks at level {level}.",
  },
} satisfies ContentOverrides;

/** Alle bekannten Default-Schlüssel (für Typsicherheit beim Auflösen). */
export type DefaultTextKey = keyof typeof DEFAULT_CONTENT;
