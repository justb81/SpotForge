import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PanResponderGestureState,
} from "react-native";
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
  /** Kurzwort neben dem enthüllten Auto-Toggle (#85). */
  auto: string;
  /** Barrierefreies Label zum Aktivieren des Auto-Modus (Geste-Fallback). */
  autoActivate: string;
  /** Barrierefreies Label/Badge, wenn der Auto-Modus aktiv ist. */
  autoActive: string;
  /** Barrierefreies Label zum Deaktivieren des Auto-Modus. */
  autoDeactivate: string;
}

export interface SpotCameraProps {
  theme: ThemeTokens;
  labels: SpotCameraLabels;
  /** Wird mit der lokalen URI des aufgenommenen Originalfotos aufgerufen (manueller Tap). */
  onCapture: (uri: string) => void;
  /**
   * Optionaler Galerie-Import (AppDefinition `features.imageImport`): ist der
   * Handler gesetzt, erscheint links unten ein Symbol-Button, der ein bestehendes
   * Bild durch dieselbe Spot-Kette schickt. Ohne Handler bleibt die Ansicht reine
   * Kamera mit Auslöser.
   */
  onPickImage?: () => void;
  /**
   * Aktiviert die **Auto-Spot**-Geste am Auslöser (#85): nur wenn die Variante das
   * Feature freischaltet. Ohne diesen Schalter bleibt der Auslöser ein einfacher Tap.
   */
  autoAvailable?: boolean;
  /** Ob der Auto-Modus gerade aktiv ist (steuert Knopf-Position/Indikator). */
  autoActive?: boolean;
  /** Schaltet den Auto-Modus um (Hold→Swipe an / Tippen auf den Schalter aus). */
  onAutoActiveChange?: (active: boolean) => void;
}

/** Imperatives Handle: erlaubt dem Auto-Spot-Loop einen stillen Schuss (#85). */
export interface SpotCameraHandle {
  /**
   * Nimmt **geräuschlos** (kein Auslöse-Ton/keine Animation) ein Vollbild-Still
   * auf und liefert dessen lokale URI – oder `null`, wenn die Kamera nicht bereit
   * ist (z.B. Berechtigung fehlt). Wird vom getakteten Auto-Spot-Loop aufgerufen.
   */
  captureSilently: () => Promise<string | null>;
}

// Schiebeweg des Knopfs in die Auto-Position und Gesten-Schwellen.
const TRACK_WIDTH = 96;
const SWIPE_ACTIVATE_RATIO = 0.6;
const TAP_SLOP = 8;
// Der Auto-Track ist im Ruhezustand dezent angedeutet (~33 %) und wird beim
// Gedrückt-Halten voll sichtbar (100 %) – so ist der Toggle auffindbar, drängt
// sich aber nicht auf (#85).
const TRACK_IDLE_OPACITY = 0.33;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Live-Kamera-Vorschau mit Auslöser (#49) und – wenn die Variante es freischaltet –
 * der **Auto-Spot**-Geste (#85): Tippen = Foto, Gedrückt-Halten enthüllt hinter dem
 * Knopf einen Schalter mit dem Wort „auto", Halten→nach-rechts-Wischen aktiviert den
 * Auto-Modus (der Knopf rastet rechts ein), erneutes Tippen deaktiviert ihn wieder.
 * Die mehrstufige Geste verhindert versehentliches Aktivieren (Akku/Privacy).
 * Vollständig on-device – kein Upload.
 */
export const SpotCamera = forwardRef<SpotCameraHandle, SpotCameraProps>(function SpotCamera(
  {
    theme,
    labels,
    onCapture,
    onPickImage,
    autoAvailable = false,
    autoActive = false,
    onAutoActiveChange,
  },
  ref,
) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // Aktuelle Callbacks/Flags in Refs spiegeln, damit der PanResponder stabil bleibt.
  const onCaptureRef = useRef(onCapture);
  const onAutoChangeRef = useRef(onAutoActiveChange);
  const autoActiveRef = useRef(autoActive);
  onCaptureRef.current = onCapture;
  onAutoChangeRef.current = onAutoActiveChange;
  autoActiveRef.current = autoActive;

  // Knopf-Position (0 = links/manuell, TRACK_WIDTH = rechts/auto) und Track-Sichtbarkeit.
  const knobX = useRef(new Animated.Value(autoActive ? TRACK_WIDTH : 0)).current;
  const trackOpacity = useRef(new Animated.Value(autoActive ? 1 : TRACK_IDLE_OPACITY)).current;

  const takeSilentPicture = async (): Promise<string | null> => {
    if (!cameraRef.current) return null;
    const photo = await cameraRef.current.takePictureAsync({ shutterSound: false });
    return photo?.uri ?? null;
  };

  useImperativeHandle(ref, () => ({ captureSilently: takeSilentPicture }), []);

  // Knopf-/Track-Animation an den externen Auto-Zustand angleichen (auch wenn der
  // Settings-Schalter ihn umschaltet, nicht nur die Geste).
  useEffect(() => {
    Animated.spring(knobX, {
      toValue: autoActive ? TRACK_WIDTH : 0,
      useNativeDriver: true,
    }).start();
    Animated.timing(trackOpacity, {
      toValue: autoActive ? 1 : TRACK_IDLE_OPACITY,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [autoActive, knobX, trackOpacity]);

  const snapBack = () => {
    Animated.spring(knobX, { toValue: 0, useNativeDriver: true }).start();
    Animated.timing(trackOpacity, {
      toValue: TRACK_IDLE_OPACITY,
      duration: 160,
      useNativeDriver: true,
    }).start();
  };

  // Hold→Swipe-Geste für den Auto-Toggle (nur relevant, solange nicht aktiv).
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !autoActiveRef.current,
        onMoveShouldSetPanResponder: () => !autoActiveRef.current,
        onPanResponderGrant: () => {
          // Track enthüllen, sobald der Knopf berührt/gehalten wird.
          Animated.timing(trackOpacity, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderMove: (_event, gesture: PanResponderGestureState) => {
          knobX.setValue(clamp(gesture.dx, 0, TRACK_WIDTH));
        },
        onPanResponderRelease: (_event, gesture: PanResponderGestureState) => {
          if (gesture.dx >= TRACK_WIDTH * SWIPE_ACTIVATE_RATIO) {
            // Weit genug gewischt → Auto-Modus an; Knopf rastet rechts ein.
            Animated.spring(knobX, { toValue: TRACK_WIDTH, useNativeDriver: true }).start();
            onAutoChangeRef.current?.(true);
          } else if (Math.abs(gesture.dx) < TAP_SLOP && Math.abs(gesture.dy) < TAP_SLOP) {
            // Reiner Tap → manuelles Foto.
            snapBack();
            void takeSilentPicture().then((uri) => {
              if (uri) onCaptureRef.current(uri);
            });
          } else {
            // Halb gewischt → zurückschnappen.
            snapBack();
          }
        },
        onPanResponderTerminate: () => snapBack(),
      }),
    // Stabil bauen: alle veränderlichen Werte kommen aus Refs bzw. stabilen
    // Animated.Values, daher bewusst keine Abhängigkeiten.
    [knobX, trackOpacity],
  );

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

  // Einfacher Tap-Auslöser (kein Ton/keine Animation – die App ist geräuschlos).
  const handleShutter = async () => {
    const uri = await takeSilentPicture();
    if (uri) onCapture(uri);
  };

  return (
    <View style={styles.fill}>
      <CameraView ref={cameraRef} style={styles.fill} facing="back" />

      {/* Aktiv-Badge, solange der Auto-Modus läuft. */}
      {autoAvailable && autoActive ? (
        <View
          accessibilityRole="text"
          accessibilityLabel={labels.autoActive}
          style={[styles.autoBadge, { backgroundColor: theme.colors.primary }]}
        >
          <View style={[styles.autoDot, { backgroundColor: theme.colors.text }]} />
          <Text style={[styles.autoBadgeText, { color: theme.colors.text }]}>{labels.auto}</Text>
        </View>
      ) : null}

      <View style={styles.shutterBar}>
        {autoAvailable ? (
          <View style={styles.autoControl}>
            {/* Enthüllter Track + „auto"-Wort hinter dem Knopf. */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.autoTrack,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.primary,
                  opacity: trackOpacity,
                },
              ]}
            >
              <Text style={[styles.autoWord, { color: theme.colors.text }]}>{labels.auto}</Text>
            </Animated.View>

            {autoActive ? (
              // Aktiv: Knopf rechts; Tippen deaktiviert.
              <Animated.View style={{ transform: [{ translateX: knobX }] }}>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: true }}
                  accessibilityLabel={labels.autoDeactivate}
                  onPress={() => onAutoActiveChange?.(false)}
                  style={[
                    styles.shutter,
                    { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                  ]}
                >
                  <View style={[styles.autoDot, { backgroundColor: theme.colors.text }]} />
                </Pressable>
              </Animated.View>
            ) : (
              // Inaktiv: Tap = Foto, Hold→Swipe = Auto an. Runder Auslöser (kein Text).
              <Animated.View
                accessibilityRole="button"
                accessibilityLabel={labels.autoActivate}
                style={[
                  styles.shutter,
                  { borderColor: theme.colors.text, transform: [{ translateX: knobX }] },
                ]}
                {...panResponder.panHandlers}
              >
                <View style={[styles.shutterCore, { backgroundColor: theme.colors.primary }]} />
              </Animated.View>
            )}
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={labels.shutter}
            onPress={handleShutter}
            style={[styles.shutter, { borderColor: theme.colors.text }]}
          >
            <View style={[styles.shutterCore, { backgroundColor: theme.colors.primary }]} />
          </Pressable>
        )}
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
});

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
  // Container für Knopf + dahinterliegenden Auto-Track.
  autoControl: {
    height: 72,
    justifyContent: "center",
  },
  autoTrack: {
    position: "absolute",
    left: 0,
    height: 72,
    width: 72 + TRACK_WIDTH,
    borderRadius: 36,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 24,
  },
  autoWord: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "lowercase",
  },
  // Runder Auslöser im Kamera-App-Standard: äußerer Ring + gefüllter Kern (#85).
  shutter: {
    height: 72,
    width: 72,
    borderRadius: 36,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterCore: {
    height: 56,
    width: 56,
    borderRadius: 28,
  },
  autoBadge: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  autoBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  autoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
