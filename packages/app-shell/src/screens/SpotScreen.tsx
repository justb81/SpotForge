import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { AppDefinition } from "@spotforge/app-config";
import { SpotCamera } from "../camera/SpotCamera";
import { preparePhotoForClassification } from "../camera/preprocess";
import type { CapturedPhoto } from "../camera/types";

export interface SpotScreenProps {
  /** Aktive Variante – liefert Theme und Texte für die Shell. */
  definition: AppDefinition;
}

type Mode = "idle" | "capturing" | "processing" | "preview";

/**
 * Die Spot-Screen-Shell des PoC.
 *
 * Zustandsfluss: **idle** (CTA) → **capturing** (Live-Kamera, #49) →
 * **processing** (Bildaufbereitung) → **preview** (aufbereitetes Foto). Die
 * On-Device-Klassifikation (#50) und die Anzeige von Label + Konfidenz (#51)
 * docken im Preview-Schritt an. Kein Login/Onboarding, vollständig offline.
 */
export function SpotScreen({ definition }: SpotScreenProps) {
  const { theme, identity, content } = definition;
  const text = (key: string, fallback: string) => content[key] ?? fallback;

  const [mode, setMode] = useState<Mode>("idle");
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);

  const handleCapture = useCallback(async (uri: string) => {
    setMode("processing");
    const prepared = await preparePhotoForClassification(uri);
    setPhoto(prepared);
    setMode("preview");
  }, []);

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
        ) : mode === "preview" && photo ? (
          <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="cover" />
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
