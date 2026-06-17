import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { AppDefinition, LocaleCode } from "@spotforge/app-config";
import { DEFAULT_LOCALE, resolveText } from "@spotforge/app-config";
import {
  formatCascadeTimings,
  type CascadeClassifier,
  type SpotResult,
} from "@spotforge/ai-engine";
import type { AttributeDefinition, Card } from "@spotforge/game-core";
import { useTheme, type ResolvedCardFrames } from "@spotforge/ui";
import { SpotCamera } from "../camera/SpotCamera";
import { DraftPanel } from "../draft/DraftPanel";
import { UnrecognizedPanel } from "./UnrecognizedPanel";
import { RecognitionPicker } from "./RecognitionPicker";
import { createSpotter } from "../spotting/createSpotter";
import { buildManualDraft } from "../draft/manual-draft";

export interface SpotScreenProps {
  /** Aktive Variante – liefert Texte und Guardrails (das Theme kommt aus dem ThemeProvider). */
  definition: AppDefinition;
  /** Attribut-Schema der App-Kategorie (Draft-Bearbeitung & Karten-Stats). */
  attributes: AttributeDefinition[];
  /** Aufgelöste Seltenheits-Frames für das Kartenrendering. */
  frames: ResolvedCardFrames;
  /** Bevorzugte Anzeige-Sprache; Default: {@link DEFAULT_LOCALE}. */
  locale?: LocaleCode;
  /** Entdecker-Tag der erzeugten Drafts (Creator-Ownership, GDD §15). */
  spottedBy: string;
  /** Zwei-Stufen-Kaskade (Gate → Feinmodell, #8/#50); erst gesetzt, wenn die Modelle geladen sind. */
  cascade?: CascadeClassifier;
}

type Mode = "idle" | "capturing" | "processing";

/**
 * Der Kern-Loop in der UI (ADR 0010, GDD §5.1): **Spotten** erzeugt offline einen
 * **Draft**. idle (CTA) → capturing (Live-Kamera) → processing (Kaskade + Draft) →
 * Ergebnis (`draft` | `rejected` | `unrecognized`). Ein Draft lässt sich bestätigen/
 * korrigieren und mit Attribut-Vorschlägen versehen. Das **Forgen** ist der
 * Online-Schritt und liegt außerhalb dieses Screens.
 */
export function SpotScreen({
  definition,
  attributes,
  frames,
  locale = DEFAULT_LOCALE,
  spottedBy,
  cascade,
}: SpotScreenProps) {
  const { identity, content } = definition;
  const theme = useTheme();

  // Mehrsprachige Overrides in die aktive Sprache auflösen; fehlende Schlüssel
  // fallen auf den mitgegebenen Default zurück.
  const text = useCallback(
    (key: string, fallback: string) => {
      const override = content[key];
      return override ? resolveText(override, locale) : fallback;
    },
    [content, locale],
  );

  const spotter = useMemo(
    () => (cascade ? createSpotter(definition, cascade, { locale }) : undefined),
    [definition, cascade, locale],
  );

  const [mode, setMode] = useState<Mode>("idle");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [result, setResult] = useState<SpotResult | null>(null);
  const [draft, setDraft] = useState<Card | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setResult(null);
    setDraft(null);
    setManualMode(false);
    setError(null);
  }, []);

  const handleCapture = useCallback(
    async (uri: string) => {
      setMode("processing");
      reset();
      setPhotoUri(uri);

      if (!spotter) {
        setError(text("spot.modelLoading", "Modell wird geladen …"));
        setMode("idle");
        return;
      }

      try {
        // Kein Auto-Draft mehr: bei akzeptiertem Gate zeigt der RecognitionPicker
        // erst die Top-k-Kandidaten zur Auswahl (Draft entsteht bei der Auswahl).
        setResult(await spotter({ imageUri: uri, spottedBy }));
      } catch {
        setError(text("spot.error", "Erkennung fehlgeschlagen. Bitte erneut versuchen."));
      }
      setMode("idle");
    },
    [spotter, spottedBy, reset, text],
  );

  // Auswahl eines Kandidaten → Draft. Für den Top-1 wird der bereits in der
  // Pipeline gebaute Draft (inkl. evtl. Vorschläge) genutzt, sonst aus dem Label.
  const handleSelectCandidate = useCallback(
    (index: number, label: string) => {
      if (index === 0 && result?.kind === "draft") {
        setDraft(result.card);
        return;
      }
      if (!photoUri) return;
      setDraft(buildManualDraft(definition, { objectName: label, photoUri, spottedBy }));
    },
    [definition, photoUri, spottedBy, result],
  );

  const handleManualCreate = useCallback(
    (objectName: string) => {
      if (!photoUri) return;
      const card = buildManualDraft(definition, { objectName, photoUri, spottedBy });
      setManualMode(false);
      setDraft(card);
      setResult({ kind: "draft", card });
    },
    [definition, photoUri, spottedBy],
  );

  const showFooter = mode === "idle";
  const hasResult = result !== null || error !== null;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.primary }]}>{identity.displayName}</Text>
      </View>

      <View
        style={[
          styles.stage,
          { backgroundColor: theme.colors.surface, borderRadius: theme.radius ?? 12 },
        ]}
      >
        {mode === "capturing" ? (
          <SpotCamera
            theme={theme}
            onCapture={handleCapture}
            labels={{
              shutter: text("spot.shutter", "Auslösen"),
              permissionPrompt: text(
                "spot.permissionPrompt",
                "Für das Spotten wird Zugriff auf die Kamera benötigt.",
              ),
              permissionCta: text("spot.permissionCta", "Kamera erlauben"),
            }}
          />
        ) : mode === "processing" ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          <>
            {renderResult()}
            {renderLatency()}
          </>
        )}
      </View>

      {showFooter ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            reset();
            setMode("capturing");
          }}
          style={[styles.captureButton, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={[styles.captureLabel, { color: theme.colors.text }]}>
            {hasResult ? text("spot.retake", "Neues Foto") : text("spot.cta", "Spotten")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  function renderResult() {
    if (error) {
      return (
        <View style={styles.center}>
          <Text style={[styles.message, { color: theme.colors.text }]}>{error}</Text>
        </View>
      );
    }

    // Bestätigter/ausgewählter Draft (überlebt Editor-Speichern).
    if (draft && result?.kind === "draft") {
      return (
        <DraftPanel
          draft={draft}
          attributes={attributes}
          frames={frames}
          onDraftChange={setDraft}
          labels={{
            hit: text("spot.hit", "Treffer! Draft angelegt."),
            forgePending: text(
              "forge.pending",
              "Geschmiedet wird online – Verbindung erforderlich.",
            ),
            edit: text("draft.edit", "Bestätigen / korrigieren"),
            spottedBy: text("card.spottedBy", "Gespottet von"),
            draftRarity: text("draft.rarity", "Entwurf"),
            editor: {
              title: text("draft.editTitle", "Draft bearbeiten"),
              nameLabel: text("draft.nameLabel", "Marke / Modell"),
              attributesLabel: text("draft.attributesLabel", "Werte vorschlagen"),
              save: text("draft.save", "Übernehmen"),
              cancel: text("draft.cancel", "Abbrechen"),
            },
          }}
        />
      );
    }

    // „Manuell eingeben" aus dem Picker: leeres Namensfeld.
    if (manualMode) {
      return (
        <UnrecognizedPanel
          rawLabel=""
          onCreate={handleManualCreate}
          labels={{
            title: text("spot.manualTitle", "Manuell eingeben"),
            hint: text("spot.manualHint", "Benenne Marke und Modell selbst."),
            nameLabel: text("draft.nameLabel", "Marke / Modell"),
            create: text("spot.manualCreate", "Als Draft anlegen"),
          }}
        />
      );
    }

    // Gate akzeptiert → Top-k-Kandidaten (mit Konfidenz) zur Auswahl + „Manuell".
    if (
      result?.kind === "draft" &&
      result.recognition &&
      result.recognition.candidates.length > 0
    ) {
      return (
        <RecognitionPicker
          candidates={result.recognition.candidates}
          onSelect={handleSelectCandidate}
          onManual={() => setManualMode(true)}
          labels={{
            title: text("spot.pickTitle", "Erkannt – bitte auswählen:"),
            manual: text("spot.manualEntry", "Manuell eingeben"),
          }}
        />
      );
    }

    if (result?.kind === "rejected") {
      return (
        <View style={styles.center}>
          <Text style={[styles.message, { color: theme.colors.text }]}>{result.message}</Text>
          {result.detectedLabel ? (
            <Text style={[styles.detected, { color: theme.colors.accent }]}>
              {text("spot.detected", "Erkannt")}: {result.detectedLabel}
            </Text>
          ) : null}
        </View>
      );
    }

    if (result?.kind === "unrecognized") {
      return (
        <UnrecognizedPanel
          rawLabel={result.label}
          onCreate={handleManualCreate}
          labels={{
            title: text("spot.unrecognizedTitle", "Nicht erkannt"),
            hint: text(
              "spot.unrecognizedHint",
              "Das ließ sich keinem Objekt zuordnen. Du kannst es selbst benennen.",
            ),
            nameLabel: text("draft.nameLabel", "Marke / Modell"),
            create: text("spot.manualCreate", "Als Draft anlegen"),
          }}
        />
      );
    }

    return (
      <View style={styles.center}>
        <Text style={[styles.placeholder, { color: theme.colors.text }]}>
          {text("spot.resultPlaceholder", "Noch kein Spot. Nimm ein Foto auf.")}
        </Text>
      </View>
    );
  }

  // Dezente Latenz-Diagnosezeile (#63): zeigt die gemessenen Kaskaden-Laufzeiten
  // (Gate-only-Reject vs. Gate→Fein-Accept) **auf dem Bildschirm** an, weil ein
  // Standalone-Release kein Profiler-Overlay hat. Nur sichtbar, wenn ein
  // Klassifikations-Lauf Timings lieferte (nicht bei manuell angelegten Drafts).
  function renderLatency() {
    const timings = result?.timings;
    if (!timings) return null;
    return (
      <Text style={[styles.latency, { color: theme.colors.text }]} accessibilityRole="text">
        {formatCascadeTimings(timings)}
      </Text>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 24,
    gap: 24,
  },
  header: {
    alignItems: "center",
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  stage: {
    flex: 1,
    overflow: "hidden",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  placeholder: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
  },
  detected: {
    fontSize: 14,
    fontWeight: "600",
  },
  latency: {
    fontSize: 11,
    fontFamily: "monospace",
    textAlign: "center",
    opacity: 0.55,
    paddingVertical: 6,
  },
  captureButton: {
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  captureLabel: {
    fontSize: 18,
    fontWeight: "700",
  },
});
