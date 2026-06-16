import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { AppDefinition, LocaleCode } from "@spotforge/app-config";
import { DEFAULT_LOCALE, resolveText } from "@spotforge/app-config";
import type { Classifier, ClassificationResult } from "@spotforge/ai-engine";
import { useTheme } from "@spotforge/ui";
import { SpotCamera } from "../camera/SpotCamera";

export interface SpotScreenProps {
  /** Aktive Variante – liefert Texte und Guardrails (das Theme kommt aus dem ThemeProvider). */
  definition: AppDefinition;
  /** Bevorzugte Anzeige-Sprache; Default: {@link DEFAULT_LOCALE}. */
  locale?: LocaleCode;
  /** On-Device-Klassifikator (#50); erst gesetzt, wenn das Modell geladen ist. */
  classifier?: Classifier;
}

type Mode = "idle" | "capturing" | "processing" | "preview";

/**
 * Die Spot-Screen-Shell des PoC und zugleich die Integrationsklammer (#51):
 * **idle** (CTA) → **capturing** (Live-Kamera, #49) → **processing**
 * (Aufbereitung + On-Device-Inferenz, #50) → **preview** (Foto + erkanntes
 * Label & Konfidenz). Vollständig offline, kein Login/Onboarding.
 */
export function SpotScreen({ definition, locale = DEFAULT_LOCALE, classifier }: SpotScreenProps) {
  const { identity, content } = definition;
  const theme = useTheme();
  const { minConfidence, rejectMessage } = definition.category.guardrails;
  // Mehrsprachige Overrides in die aktive Sprache auflösen; fehlende Schlüssel
  // fallen auf den mitgegebenen Default zurück.
  const text = (key: string, fallback: string) => {
    const override = content[key];
    return override ? resolveText(override, locale) : fallback;
  };

  const [mode, setMode] = useState<Mode>("idle");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = useCallback(
    async (uri: string) => {
      setMode("processing");
      setResult(null);
      setError(null);
      setPhotoUri(uri);

      // Die Engine (ExecuTorch) übernimmt Resize/Normalisierung intern – wir
      // reichen die Foto-URI direkt durch.
      if (classifier) {
        try {
          setResult(await classifier.classify({ imageUri: uri }));
        } catch {
          setError(text("spot.error", "Erkennung fehlgeschlagen. Bitte erneut versuchen."));
        }
      }
      setMode("preview");
    },
    [classifier],
  );

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
        ) : mode === "preview" && photoUri ? (
          <View style={styles.fill}>
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
            <View style={[styles.resultOverlay, { backgroundColor: theme.colors.secondary }]}>
              {renderResult()}
            </View>
          </View>
        ) : (
          <View style={styles.center}>
            <Text style={[styles.placeholder, { color: theme.colors.text }]}>
              {text("spot.resultPlaceholder", "Noch kein Spot. Nimm ein Foto auf.")}
            </Text>
          </View>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => setMode("capturing")}
        style={[styles.captureButton, { backgroundColor: theme.colors.primary }]}
      >
        <Text style={[styles.captureLabel, { color: theme.colors.text }]}>
          {mode === "preview" ? text("spot.retake", "Neues Foto") : text("spot.cta", "Spotten")}
        </Text>
      </Pressable>
    </View>
  );

  function renderResult() {
    if (error) {
      return <Text style={[styles.resultHint, { color: theme.colors.text }]}>{error}</Text>;
    }
    if (!classifier) {
      return (
        <Text style={[styles.resultHint, { color: theme.colors.text }]}>
          {text("spot.modelLoading", "Modell wird geladen …")}
        </Text>
      );
    }
    if (!result) {
      return null;
    }

    const percent = Math.round(result.confidence * 100);
    const lowConfidence = result.confidence < minConfidence;
    // Weitere Kandidaten (Top-k ohne die Top-1) zur Disambiguierung.
    const alternatives = result.candidates.slice(1);

    return (
      <View style={styles.resultBody}>
        <Text style={[styles.resultLabel, { color: theme.colors.text }]}>{result.label}</Text>
        <Text style={[styles.resultConfidence, { color: theme.colors.accent }]}>{percent} %</Text>
        {alternatives.length > 0 ? (
          <Text style={[styles.resultHint, { color: theme.colors.text }]}>
            {text("spot.alternatives", "Auch möglich")}:{" "}
            {alternatives.map((c) => `${c.label} (${Math.round(c.confidence * 100)} %)`).join(", ")}
          </Text>
        ) : null}
        {lowConfidence ? (
          <Text style={[styles.resultHint, { color: theme.colors.text }]}>
            {resolveText(rejectMessage, locale)}
          </Text>
        ) : null}
      </View>
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
  fill: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  placeholder: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: "center",
  },
  preview: {
    flex: 1,
    width: "100%",
  },
  resultOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    opacity: 0.92,
  },
  resultBody: {
    gap: 4,
  },
  resultLabel: {
    fontSize: 20,
    fontWeight: "700",
  },
  resultConfidence: {
    fontSize: 16,
    fontWeight: "600",
  },
  resultHint: {
    fontSize: 14,
    opacity: 0.85,
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
