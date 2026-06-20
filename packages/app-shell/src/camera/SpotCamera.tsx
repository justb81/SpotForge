import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { ThemeTokens } from "@spotforge/app-config";

export interface SpotCameraLabels {
  /** Text auf dem Auslöser. */
  shutter: string;
  /** Hinweis, wenn die Kamera-Berechtigung noch nicht erteilt ist. */
  permissionPrompt: string;
  /** Button, der die Berechtigung anfragt. */
  permissionCta: string;
  /** Barrierefreies Label des Galerie-Import-Buttons (nur bei aktivem Feature). */
  importImage: string;
}

export interface SpotCameraProps {
  theme: ThemeTokens;
  labels: SpotCameraLabels;
  /** Wird mit der lokalen URI des aufgenommenen Originalfotos aufgerufen. */
  onCapture: (uri: string) => void;
  /**
   * Optionaler Galerie-Import (AppDefinition `features.imageImport`): ist der
   * Handler gesetzt, erscheint links unten – direkt über der Live-Vorschau –
   * ein Symbol-Button, der ein bestehendes Bild durch dieselbe Spot-Kette
   * schickt. Ohne Handler bleibt die Ansicht reine Kamera mit Auslöser.
   */
  onPickImage?: () => void;
}

/**
 * Live-Kamera-Vorschau mit Auslöser (#49). Kapselt das Permission-Handling und
 * nimmt auf Tap ein Foto auf; das Originalfoto wird per {@link SpotCameraProps.onCapture}
 * nach oben gereicht (Aufbereitung/Anzeige übernimmt der SpotScreen). Vollständig
 * on-device – kein Upload.
 */
export function SpotCamera({ theme, labels, onCapture, onPickImage }: SpotCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // Berechtigung noch nicht abgefragt: expo lädt den Status asynchron.
  if (!permission) {
    return <View style={[styles.fill, { backgroundColor: theme.colors.surface }]} />;
  }

  // Berechtigung (noch) nicht erteilt: Hinweis + Anfrage-Button.
  if (!permission.granted) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.prompt, { color: theme.colors.text }]}>{labels.permissionPrompt}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={requestPermission}
          style={[styles.permissionButton, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={[styles.permissionLabel, { color: theme.colors.text }]}>
            {labels.permissionCta}
          </Text>
        </Pressable>
      </View>
    );
  }

  const handleShutter = async () => {
    // Kein Auslöse-Ton (shutterSound default true) – aktuell soll die App
    // komplett geräuschlos sein.
    const photo = await cameraRef.current?.takePictureAsync({ shutterSound: false });
    if (photo?.uri) {
      onCapture(photo.uri);
    }
  };

  return (
    <View style={styles.fill}>
      <CameraView ref={cameraRef} style={styles.fill} facing="back" />
      <View style={styles.shutterBar}>
        <Pressable
          accessibilityRole="button"
          onPress={handleShutter}
          style={[styles.shutter, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={[styles.shutterLabel, { color: theme.colors.text }]}>{labels.shutter}</Text>
        </Pressable>
      </View>
      {onPickImage ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={labels.importImage}
          onPress={onPickImage}
          style={[
            styles.importButton,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary },
          ]}
        >
          {/* Galerie-Symbol für „Foto hochladen" – on-device, kein Upload. */}
          <Text style={styles.importIcon}>🖼️</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 16,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  prompt: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.85,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  permissionLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  shutterBar: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  shutter: {
    height: 56,
    paddingHorizontal: 32,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  // Galerie-Import unten links, vertikal etwa mittig zum Auslöser ausgerichtet.
  importButton: {
    position: "absolute",
    bottom: 18,
    left: 24,
    height: 52,
    width: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  importIcon: {
    fontSize: 24,
  },
});
