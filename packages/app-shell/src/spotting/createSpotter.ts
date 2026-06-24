// Verdrahtet die On-Device-**Spot**-Pipeline (`ai-engine.createSpot`) mit der vom
// Host injizierten Kaskade und den Guardrails/Texten der aktiven Variante. Das
// **Forgen** (online, server-autoritativ) ist bewusst NICHT Teil davon (ADR 0010).
//
// Reine Wiring-Schicht: importiert die ai-engine-Pipeline (die zur Laufzeit über
// ExecuTorch/RN läuft) und delegiert. Wird daher – wie die ai-engine-Modell-
// Bausteine – nicht unter vitest, sondern im RN-Build verifiziert.

import {
  createSpot,
  slugLabelResolver,
  type CascadeClassifier,
  type FactLookup,
  type LabelResolver,
  type SpotInput,
  type SpotResult,
} from "@spotforge/ai-engine";
import type { AppDefinition, LocaleCode } from "@spotforge/app-config";
import { localDraftId, nowIso } from "./ids";
import type { PhotoSanitizer } from "../upload/createUploadSanitizer";

/** Die fertige Spot-Funktion: Foto → {@link SpotResult} (Draft | rejected | unrecognized). */
export type Spotter = (input: SpotInput) => Promise<SpotResult>;

/** Injizierbare Abhängigkeiten/Defaults der Spot-Verdrahtung. */
export interface SpottingOptions {
  /** Label → Domänen-Objekt; Default: trivialer Slug-Resolver (#72 produktiv). */
  resolver?: LabelResolver;
  /** Provisorische Offline-Vorschläge (#10); ohne Angabe keine Vorbefüllung. */
  factLookup?: FactLookup;
  /** Anzeige-Sprache der Reject-Meldung. */
  locale?: LocaleCode;
  /** Karten-ID-Generator; Default: {@link localDraftId}. */
  newId?: () => string;
  /** Zeitquelle; Default: {@link nowIso}. */
  now?: () => string;
  /**
   * On-Device-**Foto-Sanitisierung** (#89, **verpflichtend**), z.B. aus
   * {@link createUploadSanitizer} (bzw. dem nativen `createMobilePhotoSanitizer`).
   * Jeder erzeugte Draft hält **nur das bereinigte Foto** (das Original diente allein
   * der Erkennung). Fail-closed (Goldene Regel 5/6): ohne Sanitizer wird **kein**
   * Spotter gebaut – es gibt keinen Roh-Foto-Fallback.
   */
  sanitizer: PhotoSanitizer;
}

/**
 * Baut die Spot-Funktion aus der {@link AppDefinition} und der vom Host bereit-
 * gestellten {@link CascadeClassifier}. Kategorie-neutral: alles Variantenspezifische
 * (Gate-Allowlist, Schwelle, Reject-Text) stammt aus der Definition.
 */
export function createSpotter(
  definition: AppDefinition,
  cascade: CascadeClassifier,
  options: SpottingOptions,
): Spotter {
  return createSpot(definition, {
    cascade,
    resolver: options.resolver ?? slugLabelResolver,
    ...(options.factLookup !== undefined ? { factLookup: options.factLookup } : {}),
    newId: options.newId ?? localDraftId,
    now: options.now ?? nowIso,
    ...(options.locale !== undefined ? { locale: options.locale } : {}),
    sanitizePhoto: options.sanitizer,
  });
}
