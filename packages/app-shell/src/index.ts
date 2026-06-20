// @spotforge/app-shell — öffentliche Einstiegspunkte.
//
// Die generische, kategorie-agnostische App. Siehe README.md.

export { SpotForgeApp, DEFAULT_SPOTTER } from "./SpotForgeApp";
export type { SpotForgeAppProps } from "./SpotForgeApp";

// Gemeinsame Text-Defaults + Auflösung (Override ▸ Default ▸ Schlüssel).
export { DEFAULT_CONTENT } from "./content/defaults";
export type { DefaultTextKey } from "./content/defaults";
export { createTextResolver, useText } from "./content/text";
export type { TextResolver } from "./content/text";

// Navigation (generische Tab-Shell + Progressive Disclosure).
export { AppNavigator } from "./navigation/AppNavigator";
export type { AppNavigatorProps } from "./navigation/AppNavigator";
export { TabBar } from "./navigation/TabBar";
export type { TabBarProps } from "./navigation/TabBar";
export { TABS, TAB_KEYS, visibleTabs, resolveActiveTab } from "./navigation/tabs";
export type { TabDefinition, TabKey } from "./navigation/tabs";

// Progressive Disclosure (Feature-Freischaltung).
export {
  FEATURES,
  NEW_PLAYER,
  isFeatureUnlocked,
  unlockedFeatures,
  featureUnlockLevel,
} from "./progression/disclosure";
export type { Feature, PlayerProgress } from "./progression/disclosure";

// Nutzer-Einstellungen (z.B. „skip_tutorial"): reine Logik, Store-Abstraktion und
// On-Device-Adapter (expo-file-system). Der Host lädt sie vor dem Mounten und
// persistiert Änderungen – app-shell bleibt I/O-frei.
export {
  DEFAULT_PREFERENCES,
  serializePreferences,
  parsePreferences,
  resolveInitialProgress,
} from "./preferences/preferences";
export type { Preferences } from "./preferences/preferences";
export {
  createPreferencesStore,
  createInMemoryPreferencesStore,
} from "./preferences/preferencesStore";
export type { PreferencesStore, PreferencesPersistence } from "./preferences/preferencesStore";
export { createExpoPreferencesPersistence } from "./preferences/expoPreferencesPersistence";

// First-Time-User-Experience (Sequenz + Flow-UI).
export { FtueFlow } from "./ftue/FtueFlow";
export type { FtueFlowProps } from "./ftue/FtueFlow";
export {
  FTUE_STEPS,
  FTUE_STEP_CONTENT,
  FIRST_FTUE_STEP,
  ftueStepIndex,
  ftueProgress,
  nextFtueStep,
  prevFtueStep,
  isFirstFtueStep,
  isLastFtueStep,
} from "./ftue/steps";
export type { FtueStep, FtueStepContent } from "./ftue/steps";

export { SpotScreen } from "./screens/SpotScreen";
export type { SpotScreenProps } from "./screens/SpotScreen";

export { FeatureScreen } from "./screens/FeatureScreen";
export type { FeatureScreenProps } from "./screens/FeatureScreen";

export { CollectionScreen } from "./screens/CollectionScreen";
export type { CollectionScreenProps } from "./screens/CollectionScreen";

export { CardDetail } from "./screens/CardDetail";
export type { CardDetailProps, CardDetailLabels } from "./screens/CardDetail";

export { ProfileScreen } from "./screens/ProfileScreen";
export type { ProfileScreenProps } from "./screens/ProfileScreen";

export { SettingsScreen } from "./screens/SettingsScreen";
export type { SettingsScreenProps } from "./screens/SettingsScreen";

export { DeckScreen } from "./screens/DeckScreen";
export type { DeckScreenProps } from "./screens/DeckScreen";

// Profil/Progression (GDD §7.1): Level-Grenzen, Titel-System, Sammlungs-Kennzahlen.
export {
  MAX_LEVEL,
  MIN_LEVEL,
  TITLE_BANDS,
  clampLevel,
  titleForLevel,
  nextTitleBand,
  collectionStats,
} from "./progression/profile";
export type { PlayerTitle, TitleBand, CollectionStats } from "./progression/profile";

// Deck-Management (GDD §7.2): reine Logik (Kapazität, Mitgliedschaft, Auflösung).
export {
  DEFAULT_DECK_CAPACITY,
  EMPTY_DECK,
  deckCapacity,
  deckSize,
  isInDeck,
  isDeckFull,
  deckRemaining,
  addToDeck,
  removeFromDeck,
  toggleInDeck,
  pruneDeck,
  deckCards,
} from "./deck/deck";
export type { Deck } from "./deck/deck";

// Kartenbibliothek (GDD §7.2): Filter + Sortierung über der Sammlung.
export { LIBRARY_SORTS, filterCards, sortCards, queryLibrary } from "./collection/library";
export type { LibrarySort, LibraryFilter, LibraryQuery } from "./collection/library";

// Lokale Draft-Sammlung (#102): reine Logik, Store-Abstraktion, On-Device-Adapter
// (expo-file-system) und React-Anbindung. Der Host baut den persistenten,
// appId-skopierten Store und reicht ihn an SpotForgeApp.
export {
  upsertDraft,
  removeDraftById,
  sortByNewest,
  serializeDrafts,
  parseDrafts,
  draftScopeSegment,
} from "./collection/draft-collection";
export { createDraftStore, createInMemoryDraftStore } from "./collection/draftStore";
export type { DraftStore, DraftPersistence } from "./collection/draftStore";
export { createExpoDraftPersistence } from "./collection/expoDraftPersistence";
export { useDraftCollection } from "./collection/useDraftCollection";
export type { DraftCollection } from "./collection/useDraftCollection";

export { SpotCamera } from "./camera/SpotCamera";
export type { SpotCameraProps, SpotCameraLabels, SpotCameraHandle } from "./camera/SpotCamera";

// Auto-Spot (#85): reine Loop-Logik + React-/AppState-Verdrahtung. Der getaktete
// Auslöser wiederholt den normalen Foto→Draft-Flow (kein Frame-Processor).
export {
  createAutoSpotRunner,
  evaluateAutoFire,
  resolveAutoSpotInterval,
} from "./spotting/autoSpot";
export type {
  AutoSpotRunner,
  AutoSpotRunnerDeps,
  AutoSpotScheduler,
  AutoSpotState,
} from "./spotting/autoSpot";
export { useAutoSpot } from "./spotting/useAutoSpot";
export type { UseAutoSpotParams } from "./spotting/useAutoSpot";
export { AutoSpotCoachmark } from "./screens/AutoSpotCoachmark";
export type { AutoSpotCoachmarkProps, AutoSpotCoachmarkLabels } from "./screens/AutoSpotCoachmark";

// Galerie-Import (optionales Feature `features.imageImport`): liefert eine
// lokale Bild-URI für dieselbe Spot-Kette wie das Kamera-Foto.
export { pickImageFromLibrary } from "./camera/pickImage";

// Spot-Pipeline-Wiring (Foto → Draft, ADR 0010). Das Forgen ist der Online-Schritt
// und nicht Teil der app-shell.
export { createSpotter } from "./spotting/createSpotter";
export type { Spotter, SpottingOptions } from "./spotting/createSpotter";
export { localDraftId, nowIso } from "./spotting/ids";

// Foto-Sanitisierung vor Upload (#89): verpflichtende On-Device-Bereinigung
// (EXIF/GPS entfernen, Gesichter/Kennzeichen blurren) als harte Vorbedingung des
// Upload-Pfads. Blur-Ziele & Grenzen kommen aus der Variante (Goldene Regel 1/3).
export { createUploadSanitizer } from "./upload/createUploadSanitizer";
export type { PhotoSanitizer, UploadSanitizerDeps } from "./upload/createUploadSanitizer";

// Manueller Draft (Fallback bei `unrecognized`) und Draft-Bearbeitung: reine Logik + UI.
export { buildManualDraft } from "./draft/manual-draft";
export type { ManualDraftInput, ManualDraftDeps } from "./draft/manual-draft";
export {
  applyDraftEdits,
  collectProposedAttributes,
  draftAttributeInputs,
  draftPreviewCard,
  parseAttributeInput,
} from "./draft/draft-edit";
export type { AttributeInputs, DraftEdits } from "./draft/draft-edit";
export { DraftEditor } from "./draft/DraftEditor";
export type { DraftEditorProps, DraftEditorLabels } from "./draft/DraftEditor";
export { DraftPanel } from "./draft/DraftPanel";
export type { DraftPanelProps, DraftPanelLabels } from "./draft/DraftPanel";
export { UnrecognizedPanel } from "./screens/UnrecognizedPanel";
export type { UnrecognizedPanelProps, UnrecognizedPanelLabels } from "./screens/UnrecognizedPanel";
