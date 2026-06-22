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
import type { ClassificationResult } from "./classifier";
import type { SanitizationReport, SanitizeInput, SanitizeResult } from "./sanitize";

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
  /**
   * Summierte Gate-Masse (`P(im Scope)`, siehe {@link GateDecision.mass}) dieses
   * Schusses – unabhängig davon, ob das Gate über {@link GateConfig.minConfidence}
   * akzeptiert hat. Aus dem Klassifikations-Lauf befüllt; bei manuell angelegten
   * Drafts (ohne Kaskade) `undefined`. Der **Auto-Spot** (#85) nutzt sie als
   * single-frame-Signal für seine eigene, strengere `autoFireMinConfidence` (vgl.
   * `evaluateAutoFire` in @spotforge/app-shell): die normale Pipeline darf bei der
   * manuellen Schwelle akzeptieren, der getaktete Auto-Modus „feuert" aber erst
   * über der strengeren Auto-Schwelle.
   */
  gateMass?: number;
  /**
   * **Sanitisierte, persist-/upload-bereite** Foto-URI (#89). Sobald das Gate
   * akzeptiert (das Foto wird also zu einem Draft – automatisch, per Kandidaten-
   * Auswahl oder manuell), wird es einmal on-device bereinigt (EXIF/GPS entfernt,
   * Gesichter/Kennzeichen redigiert) und **ab hier verlässt nur noch diese Version
   * die Pipeline** – das Original diente allein der Erkennung. Bei `rejected` (kein
   * Draft) **nicht gesetzt**; ohne injizierten {@link SpotDeps.sanitizePhoto} ist es
   * die Original-URI (Übergangszustand, bis die Detektor-Modelle gebündelt sind).
   */
  photoUri?: string;
  /**
   * Nachweis der **Foto-Sanitisierung** (#89) – wie viele Gesichter/Kennzeichen
   * redigiert wurden, Ausgabemaße/-größe, Metadaten entfernt. Für die On-Screen-
   * Diagnose ({@link formatSanitizationReport}, vgl. {@link timings}). Nur gesetzt,
   * wenn ein {@link SpotDeps.sanitizePhoto} lief (also bei akzeptiertem Gate); bei
   * `rejected` und ohne injizierten Sanitizer `undefined`.
   */
  sanitization?: SanitizationReport;
} & (
  | {
      kind: "draft";
      card: Card;
      /**
       * Feinmodell-Ergebnis (Top-1 + Kandidaten) hinter dem Draft – für die
       * **Konfidenz-Anzeige** in der UI. `undefined` bei manuell angelegten Drafts.
       * Hinweis: Klassifikatoren sind oft auch bei Fehlklassifikation
       * überzuversichtlich – die Konfidenz ist ein Hinweis, keine Garantie.
       */
      recognition?: ClassificationResult;
    }
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
  /**
   * On-Device-**Foto-Sanitisierung** (#89). Wird aufgerufen, **sobald das Gate
   * akzeptiert** (das Foto also persistiert wird) – die Erkennung lief bereits auf
   * dem Original, ab hier hält der Draft nur die bereinigte Version. Wirft die
   * Funktion, **bricht der Spot ab** (kein Draft mit Rohbild – harte Vorbedingung).
   * Fehlt sie (Tests / noch keine Detektor-Modelle gebündelt), bleibt die
   * Original-URI – das Original wird dann lokal persistiert (Übergangszustand).
   */
  sanitizePhoto?: (input: SanitizeInput) => Promise<SanitizeResult>;
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
  const { cascade, resolver, factLookup, newId, now, locale, sanitizePhoto } = deps;

  return async function spot(input: SpotInput): Promise<SpotResult> {
    const { decision, gate, fine, timings } = await cascade.classify({ imageUri: input.imageUri });
    const gateMass = decision.mass;

    // 1) Gate-Guardrail: nicht im Scope → Reject (mit erkanntem Top-Label für die UX).
    //    Reject persistiert nichts → das Original muss nicht sanitisiert werden.
    if (!decision.accepted) {
      const detectedLabel = gate.candidates[0]?.label;
      return {
        kind: "rejected",
        message: resolveText(appDef.category.guardrails.rejectMessage, locale),
        ...(detectedLabel !== undefined ? { detectedLabel } : {}),
        timings,
        gateMass,
      };
    }

    // 2) Gate akzeptiert ⇒ dieses Foto wird zu einem Draft (auto, per Auswahl oder
    //    manuell). Die Erkennung lief auf dem Original; **ab hier nur noch die
    //    bereinigte Version** (#89). Schlägt die Sanitisierung fehl, propagiert der
    //    Fehler → kein Draft mit Rohbild. Ohne injizierten Sanitizer bleibt die
    //    Original-URI (Übergangszustand, bis die Detektor-Modelle gebündelt sind).
    let photoUri = input.imageUri;
    let sanitization: SanitizationReport | undefined;
    if (sanitizePhoto) {
      const sanitized = await sanitizePhoto({ imageUri: input.imageUri });
      photoUri = sanitized.imageUri;
      sanitization = sanitized.report;
    }

    // 3) Feinmodell ohne verwertbares Ergebnis → unrecognized (mit bereinigtem Foto).
    const topFine = fine?.candidates[0];
    if (topFine === undefined || topFine.label.trim() === "") {
      return {
        kind: "unrecognized",
        label: gate.candidates[0]?.label ?? "",
        photoUri,
        timings,
        gateMass,
        ...(sanitization !== undefined ? { sanitization } : {}),
      };
    }

    // 4) Label → Domänen-Objekt (Default-Resolver; #72 produktiv).
    const resolution = resolver.resolve(topFine.label);
    if (resolution === undefined) {
      return {
        kind: "unrecognized",
        label: topFine.label,
        photoUri,
        timings,
        gateMass,
        ...(sanitization !== undefined ? { sanitization } : {}),
      };
    }

    // 5) Optionale provisorische Offline-Vorschläge (#10) – nicht autoritativ.
    const facts = factLookup?.find(resolution.objectId);

    // 6) Draft bauen mit dem **sanitisierten** Foto. Forgen ist online (#76).
    const card = buildDraft({
      id: newId(),
      categoryId: appDef.category.primary,
      objectName: resolution.objectName,
      spottedBy: input.spottedBy,
      createdAt: now(),
      photoUri,
      ...(facts !== undefined ? { proposedAttributes: facts.attributes } : {}),
      ...(input.geoRegion !== undefined ? { geoRegion: input.geoRegion } : {}),
    });

    return {
      kind: "draft",
      card,
      photoUri,
      timings,
      gateMass,
      ...(sanitization !== undefined ? { sanitization } : {}),
      ...(fine !== undefined ? { recognition: fine } : {}),
    };
  };
}
