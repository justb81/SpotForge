// @spotforge/app-shell — öffentliche Einstiegspunkte.
//
// Die generische, kategorie-agnostische App. Siehe README.md.

export { SpotForgeApp, DEFAULT_SPOTTER } from "./SpotForgeApp";
export type { SpotForgeAppProps } from "./SpotForgeApp";

export { SpotScreen } from "./screens/SpotScreen";
export type { SpotScreenProps } from "./screens/SpotScreen";

export { SpotCamera } from "./camera/SpotCamera";
export type { SpotCameraProps, SpotCameraLabels } from "./camera/SpotCamera";

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
