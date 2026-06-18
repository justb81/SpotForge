import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { AppDefinition, LocaleCode } from "@spotforge/app-config";
import { DEFAULT_LOCALE, resolveFeatures } from "@spotforge/app-config";
import {
  formatCascadeTimings,
  type CascadeClassifier,
  type SpotResult,
} from "@spotforge/ai-engine";
import type { AttributeDefinition, Card } from "@spotforge/game-core";
import { useTheme } from "@spotforge/ui";
import { useText } from "../content/text";
import { SpotCamera } from "../camera/SpotCamera";
import { pickImageFromLibrary } from "../camera/pickImage";
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
  locale = DEFAULT_LOCALE,
  spottedBy,
  cascade,
}: SpotScreenProps) {
  const { identity } = definition;
  const theme = useTheme();

  // Texte aus den gemeinsamen Defaults ⊕ Varianten-Overrides (siehe content/text).
  const text = useText(definition, locale);

  // Optionaler Galerie-Import (AppDefinition `features.imageImport`): blendet
  // neben der Kamera einen Button ein, der ein bestehendes Bild durch dieselbe
  // Spot-Kette schickt – erleichtert das Testen ohne frisches Foto.
  const { imageImport: canImportImage } = resolveFeatures(definition);

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
        setError(text("spot.modelLoading"));
        setMode("idle");
        return;
      }

      try {
        // Kein Auto-Draft mehr: bei akzeptiertem Gate zeigt der RecognitionPicker
        // erst die Top-k-Kandidaten zur Auswahl (Draft entsteht bei der Auswahl).
        setResult(await spotter({ imageUri: uri, spottedBy }));
      } catch {
        setError(text("spot.error"));
      }
      setMode("idle");
    },
    [spotter, spottedBy, reset, text],
  );

  // Galerie-Import (nur bei aktivem Feature): wähle ein bestehendes Bild und
  // schicke es durch dieselbe Spot-Kette wie ein frisches Kamera-Foto. Abbruch
  // im Picker ist ein No-op.
  const handlePickImage = useCallback(async () => {
    const uri = await pickImageFromLibrary();
    if (uri) {
      await handleCapture(uri);
    }
  }, [handleCapture]);

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
              shutter: text("spot.shutter"),
              permissionPrompt: text("spot.permissionPrompt"),
              permissionCta: text("spot.permissionCta"),
            }}
          />
        ) : (
          <>
            {/* Aufgenommenes Foto bleibt als Hintergrund sichtbar (Verarbeitung +
                Ergebnis/Picker); ein dezenter Scrim hält Texte lesbar. */}
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            ) : null}
            {photoUri ? <View style={[StyleSheet.absoluteFill, styles.scrim]} /> : null}
            {mode === "processing" ? (
              <View style={styles.center}>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            ) : (
              <>
                {renderResult()}
                {renderLatency()}
              </>
            )}
          </>
        )}
      </View>

      {showFooter ? (
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              reset();
              setMode("capturing");
            }}
            style={[styles.captureButton, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={[styles.captureLabel, { color: theme.colors.text }]}>
              {hasResult ? text("spot.retake") : text("spot.cta")}
            </Text>
          </Pressable>
          {canImportImage ? (
            <Pressable
              accessibilityRole="button"
              onPress={handlePickImage}
              style={[styles.importButton, { borderColor: theme.colors.primary }]}
            >
              <Text style={[styles.importLabel, { color: theme.colors.primary }]}>
                {text("spot.importImage")}
              </Text>
            </Pressable>
          ) : null}
        </View>
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
          onDraftChange={setDraft}
          labels={{
            hit: text("spot.hit"),
            forgePending: text("forge.pending"),
            edit: text("draft.edit"),
            spottedBy: text("card.spottedBy"),
            draftRarity: text("draft.rarity"),
            editor: {
              title: text("draft.editTitle"),
              nameLabel: text("draft.nameLabel"),
              attributesLabel: text("draft.attributesLabel"),
              save: text("draft.save"),
              cancel: text("draft.cancel"),
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
            title: text("spot.manualTitle"),
            hint: text("spot.manualHint"),
            nameLabel: text("draft.nameLabel"),
            create: text("spot.manualCreate"),
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
            title: text("spot.pickTitle"),
            manual: text("spot.manualEntry"),
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
              {text("spot.detected")}: {result.detectedLabel}
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
            title: text("spot.unrecognizedTitle"),
            hint: text("spot.unrecognizedHint"),
            nameLabel: text("draft.nameLabel"),
            create: text("spot.manualCreate"),
          }}
        />
      );
    }

    return (
      <View style={styles.center}>
        <Text style={[styles.placeholder, { color: theme.colors.text }]}>
          {text("spot.resultPlaceholder")}
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
  scrim: {
    // Neutraler Lesbarkeits-Schleier über dem Hintergrundfoto.
    backgroundColor: "rgba(0, 0, 0, 0.45)",
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
  footer: {
    gap: 12,
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
  importButton: {
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  importLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
});
