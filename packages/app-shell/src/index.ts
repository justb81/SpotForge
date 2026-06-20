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
export type { SpotCameraProps, SpotCameraLabels } from "./camera/SpotCamera";

// Galerie-Import (optionales Feature `features.imageImport`): liefert eine
// lokale Bild-URI für dieselbe Spot-Kette wie das Kamera-Foto.
export { pickImageFromLibrary } from "./camera/pickImage";

// Spot-Pipeline-Wiring (Foto → Draft, ADR 0010). Das Forgen ist der Online-Schritt
// und nicht Teil der app-shell.
export { createSpotter } from "./spotting/createSpotter";
export type { Spotter, SpottingOptions } from "./spotting/createSpotter";
export { localDraftId, nowIso } from "./spotting/ids";

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
