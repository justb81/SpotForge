/**
 * On-Device-**Spot**-Pipeline (GDD §5.1, ADR 0010): aus einem Foto wird – sofern
 * das Gate die Kategorie akzeptiert – ein **Draft** (`game-core.buildDraft`).
 * Das **Forgen** (autoritative Attribute + Seltenheit + Status `forged`) ist ein
 * Online-/Server-Schritt (#76) und steht bewusst NICHT hier.
 *
 * Kategorie-neutral: Gate-Allowlist, Schwelle und Reject-Meldung kommen aus der
 * `AppDefinition`. Rein orchestrierend, ohne RN-Import → unter vitest testbar.
 */

import { buildDraft, type AttributeValues, type Card } from "@spotforge/game-core";
import { resolveText, type AppDefinition, type LocaleCode } from "@spotforge/app-config";
import type { CascadeClassifier, CascadeTimings, GateConfig } from "./cascade";

/** Eingabe eines Spot-Vorgangs. */
export interface SpotInput {
  /** Lokale URI des aufgenommenen Fotos. */
  imageUri: string;
  /** Entdecker-Tag der Karte. */
  spottedBy: string;
  /** Grobe Fundregion (PLZ/Region), optional. */
  geoRegion?: string;
}

/** Ergebnis eines Spot-Vorgangs. */
export type SpotResult = {
  /**
   * Gemessene Kaskaden-Latenzen (#63) für die On-Screen-Geräte-Verifikation.
   * Aus dem Klassifikations-Lauf befüllt; bei manuell angelegten Drafts (ohne
   * Kaskade) `undefined`.
   */
  timings?: CascadeTimings;
} & (
  | { kind: "draft"; card: Card }
  | { kind: "rejected"; message: string; detectedLabel?: string }
  | { kind: "unrecognized"; label: string }
);

/**
 * Auflösung eines rohen Feinmodell-Labels auf das Domänenmodell. **Seam für #72**;
 * #8 liefert nur einen trivialen Default ({@link slugLabelResolver}).
 */
export interface Resolution {
  /** Stabile Objekt-ID im Fakten-/World-Data-Raum. */
  objectId: string;
  /** Anzeigename des erkannten Objekts (z.B. "VW Golf VII"). */
  objectName: string;
}

export interface LabelResolver {
  /** Löst ein rohes Label auf; `undefined` ⇒ nicht zuordenbar (→ `unrecognized`). */
  resolve(label: string): Resolution | undefined;
}

/** Provisorische Offline-Fakten zu einem Objekt (#10) – **nicht** autoritativ. */
export interface FactRecord {
  /** Vorgeschlagene Attributwerte (Vorbefüllung des Drafts). */
  attributes: AttributeValues;
}

export interface FactLookup {
  /** Provisorische Attribut-Vorschläge zur Objekt-ID; `undefined`, wenn unbekannt. */
  find(objectId: string): FactRecord | undefined;
}

/** Injizierte Abhängigkeiten der Spot-Pipeline (alle mockbar). */
export interface SpotDeps {
  /** Zwei-Stufen-Kaskade (Gate → Feinmodell), gebaut aus den gebündelten Modellen. */
  cascade: CascadeClassifier;
  /** Label → Domänen-Objekt. Default: {@link slugLabelResolver}; produktiv #72. */
  resolver: LabelResolver;
  /** Optionale provisorische Offline-Vorschläge (#10). */
  factLookup?: FactLookup;
  /** Erzeugt eine neue Karten-ID (z.B. UUID). */
  newId: () => string;
  /** Aktueller Zeitstempel als ISO-8601 (injizierbar für Tests). */
  now: () => string;
  /** Bevorzugte Sprache der Reject-Meldung (Default: app-config-Standard). */
  locale?: LocaleCode;
}

/**
 * Leitet die {@link GateConfig} aus der `AppDefinition` ab: die erlaubten rohen
 * Gate-Labels (`category.gate.allow`) und die Annahme-Schwelle
 * (`category.guardrails.minConfidence`). Damit baut der App-Host die Kaskade.
 */
export function gateConfigFromAppDefinition(appDef: AppDefinition): GateConfig {
  return {
    allow: appDef.category.gate.allow,
    minConfidence: appDef.category.guardrails.minConfidence,
  };
}

/** Slug aus einem Label: Kleinbuchstaben, Nicht-Alphanumerisches → „-". */
function slug(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Trivialer Default-{@link LabelResolver}: nimmt das Label als Anzeigename und
 * seinen Slug als Objekt-ID. Demonstriert die Pipeline ohne #72; der produktive,
 * an den Objekt-ID-Raum der Fakten-DB gebundene Resolver kommt in #72.
 */
export const slugLabelResolver: LabelResolver = {
  resolve(label: string): Resolution | undefined {
    const objectId = slug(label);
    if (objectId === "") return undefined;
    return { objectId, objectName: label.trim() };
  },
};

/**
 * Baut die Spot-Funktion: Foto → {@link SpotResult}. Verkettet
 * classify (Kaskade) → Gate-Guardrail → resolve → optionale Offline-Vorschläge →
 * `game-core.buildDraft`. Erzeugt **keine** fertige (geforgte) Karte (→ #76).
 */
export function createSpot(
  appDef: AppDefinition,
  deps: SpotDeps,
): (input: SpotInput) => Promise<SpotResult> {
  const { cascade, resolver, factLookup, newId, now, locale } = deps;

  return async function spot(input: SpotInput): Promise<SpotResult> {
    const { decision, gate, fine, timings } = await cascade.classify({ imageUri: input.imageUri });

    // 1) Gate-Guardrail: nicht im Scope → Reject (mit erkanntem Top-Label für die UX).
    if (!decision.accepted) {
      const detectedLabel = gate.candidates[0]?.label;
      return {
        kind: "rejected",
        message: resolveText(appDef.category.guardrails.rejectMessage, locale),
        ...(detectedLabel !== undefined ? { detectedLabel } : {}),
        timings,
      };
    }

    // 2) Feinmodell ohne verwertbares Ergebnis → unrecognized.
    const topFine = fine?.candidates[0];
    if (topFine === undefined || topFine.label.trim() === "") {
      return { kind: "unrecognized", label: gate.candidates[0]?.label ?? "", timings };
    }

    // 3) Label → Domänen-Objekt (Default-Resolver; #72 produktiv).
    const resolution = resolver.resolve(topFine.label);
    if (resolution === undefined) {
      return { kind: "unrecognized", label: topFine.label, timings };
    }

    // 4) Optionale provisorische Offline-Vorschläge (#10) – nicht autoritativ.
    const facts = factLookup?.find(resolution.objectId);

    // 5) Draft bauen (Platzhalter-Rarity, Foto, Vorschläge). Forgen ist online (#76).
    const card = buildDraft({
      id: newId(),
      categoryId: appDef.category.primary,
      objectName: resolution.objectName,
      spottedBy: input.spottedBy,
      createdAt: now(),
      photoUri: input.imageUri,
      ...(facts !== undefined ? { proposedAttributes: facts.attributes } : {}),
      ...(input.geoRegion !== undefined ? { geoRegion: input.geoRegion } : {}),
    });

    return { kind: "draft", card, timings };
  };
}
