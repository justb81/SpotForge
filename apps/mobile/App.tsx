import { Component, type ReactNode, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { AppDefinition, Branding } from "@spotforge/app-config";
import {
  SpotForgeApp,
  createDraftStore,
  createExpoDraftPersistence,
  createPreferencesStore,
  createExpoPreferencesPersistence,
  type Preferences,
} from "@spotforge/app-shell";
import {
  createCascadeClassifier,
  gateConfigFromAppDefinition,
  GATE_TOP_K,
  type CascadeClassifier,
} from "@spotforge/ai-engine";
import { initExecutorch } from "react-native-executorch";
import { ExpoResourceFetcher } from "react-native-executorch-expo-resource-fetcher";
import Constants from "expo-constants";
// Gebündeltes breites Gate-Modell (#83): EfficientNet-B0, ImageNet-1k, **fp32**
// (keine Quantisierung → kein Quant-Verlust; fp32 ist die einheitliche Präzision,
// ADR 0014). data/models/* liegt nicht im Git; `pnpm fetch-models` (CI vor dem
// Bundle, lokal vor `dev`) legt Modell + Labels ab. Metro bündelt sie als Assets
// (metro.config.js).
import gateModelAsset from "../../data/models/gate_imagenet_efficientnet_b0_fp32.pte";
import gateLabels from "../../data/models/gate_imagenet_efficientnet_b0.labels.json";
// Gebündeltes Feinmodell (#9): Jordo23/vehicle-classifier (EfficientNet-B4, VMMRdb,
// 8.949 Klassen „Make Model Year", fp32). Wird nur bei akzeptiertem Gate in den
// Speicher initialisiert (Kaskade). data/models/* liegt nicht im Git; `pnpm
// fetch-models` zieht es vor dem Build. fp32 ist die einheitliche Präzision
// (volles Modell, kein Quant-Verlust; int8 verworfen, ADR 0014).
import fineModelAsset from "../../data/models/cars_jordo23_vmmr_fp32.pte";
import fineLabels from "../../data/models/cars_jordo23_vmmr.labels.json";
// Foto-Sanitisierung (#89): die Detektoren laufen über **MLKit** (permissiv,
// on-device, KEIN gebündeltes Modell) – daher keine .pte-Detektor-Assets hier.
// createMobilePhotoSanitizer (samt Skia + MLKit) wird BEWUSST erst im Effekt
// dynamisch importiert – nicht statisch. Sonst liefe Skias `NativeSetup`
// (`SkiaModule.install()`) schon beim Modul-Laden, also VOR dem ersten Render:
// ein Fehler dort schlösse die App still (die StartupErrorBoundary greift erst,
// sobald React rendert). Dynamisch + im try/catch wird ein Init-Fehler stattdessen
// als „Modell-Ladefehler" sichtbar (gleiche Deferral-Logik wie beim Klassifikator).
import type { PhotoSanitizer } from "@spotforge/app-shell";

// ImageNet-Normalisierung – gilt für Gate (B0) UND Feinmodell (B4); beide Exporte
// nutzen denselben normMean/normStd (muss zum Export passen, ADR 0008).
const IMAGENET_PREPROCESSOR = {
  normMean: [0.485, 0.456, 0.406] as [number, number, number],
  normStd: [0.229, 0.224, 0.225] as [number, number, number],
};
// Attribut-Schema je Kategorie (Source of Truth: data/categories/<id>.json). Statisch
// gebündelt, da Metro keine dynamischen require-Pfade auflöst; die aktive Kategorie
// wählt die App über definition.category.primary.
import vehiclesCategory from "../../data/categories/vehicles.json";

const APP_VERSION = Constants.expoConfig?.version ?? "?";

// Attribut-Schemata der bündelbaren Kategorien (aktuell nur die Auto-Kategorie).
const CATEGORY_ATTRIBUTES: Record<string, (typeof vehiclesCategory)["attributes"]> = {
  vehicles: vehiclesCategory.attributes,
};

/**
 * Fängt Render-/Startfehler ab und zeigt sie **auf dem Bildschirm** an, statt die
 * App still zu schließen. Im Standalone-Release-Build gibt es kein Metro-Overlay –
 * ohne diese Boundary wäre ein Startfehler nur ein wortloser Sofort-Absturz.
 */
class StartupErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <SafeAreaView style={styles.errorRoot}>
          <ScrollView contentContainerStyle={styles.errorContent}>
            <Text style={styles.errorTitle}>Startfehler</Text>
            <Text style={styles.errorVersion}>v{APP_VERSION}</Text>
            <Text style={styles.errorText}>{error.stack ?? String(error)}</Text>
          </ScrollView>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

function Root() {
  // Die aktive Variante wird zur Build-Zeit von app.config.ts aufgelöst; ihre
  // AppDefinition und das aufgelöste Branding (Basis ⊕ Variante, ADR 0011) liegen
  // in expoConfig.extra.
  const definition = Constants.expoConfig?.extra?.appDefinition as AppDefinition | undefined;
  const branding = Constants.expoConfig?.extra?.appBranding as Branding | undefined;

  // ExecuTorch initialisieren und aus dem gebündelten Modell die Zwei-Stufen-
  // Kaskade (Gate → Feinmodell) bauen, mit der die app-shell den Spot-Flow fährt.
  // Bis sie bereit ist, zeigt der Spot-Screen einen Lade-Hinweis; Ladefehler werden
  // sichtbar gemacht statt verschluckt.
  const [cascade, setCascade] = useState<CascadeClassifier>();
  // Foto-Sanitisierung (#89): aus den gebündelten Detektoren + Skia-Prozessor
  // gebaut. Solange `undefined`, persistiert der Spot-Flow das Originalfoto
  // (Übergang); ist sie gesetzt, hält jeder Draft nur das bereinigte Foto.
  const [photoSanitizer, setPhotoSanitizer] = useState<PhotoSanitizer>();
  const [modelError, setModelError] = useState<string>();
  // Eigener Fehlerzustand der Sanitisierung: ein Init-Fehler hier darf die
  // **Erkennung nicht** mit-abwürgen (eigener try unten), führt aber fail-closed
  // (#89) dazu, dass nicht gespottet werden kann – mit eigener, ehrlicher Meldung.
  const [sanitizerError, setSanitizerError] = useState<string>();

  // Persistenter, **appId-skopierter** Draft-Store (#102, ADR 0002/0012): on-device
  // über expo-file-system, je Variante (Mandant) getrennt. Einmal je Definition
  // gebaut, damit der Store seinen Cache hält.
  const draftStore = useMemo(
    () => (definition ? createDraftStore(createExpoDraftPersistence(definition.id)) : undefined),
    [definition],
  );

  // Persistente, **appId-skopierte** Nutzer-Einstellungen (z.B. „skip_tutorial").
  // Werden **vor** dem Mounten geladen, damit die FTUE-Entscheidung beim Start ohne
  // Aufblitzen feststeht; Änderungen schreibt die app-shell über onPreferencesChange.
  const preferencesStore = useMemo(
    () =>
      definition
        ? createPreferencesStore(createExpoPreferencesPersistence(definition.id))
        : undefined,
    [definition],
  );
  const [preferences, setPreferences] = useState<Preferences>();
  useEffect(() => {
    if (!preferencesStore) return;
    let active = true;
    void preferencesStore.load().then((loaded) => {
      if (active) setPreferences(loaded);
    });
    return () => {
      active = false;
    };
  }, [preferencesStore]);
  useEffect(() => {
    if (!definition || !branding) return;
    let active = true;
    (async () => {
      initExecutorch({ resourceFetcher: ExpoResourceFetcher });

      // 1) **Erkennung** (Zwei-Stufen-Kaskade) – in einem EIGENEN try, damit ein
      //    Sanitizer-/Skia-Init-Fehler die Erkennung nicht mit abwürgt (#89-Review).
      try {
        const { createClassifier } = await import("@spotforge/ai-engine");
        // Breites fp32-Gate (#83): EfficientNet-B0/ImageNet mit mitgeliefertem
        // Label-Satz + Normalisierung. Erhöhtes topK ({@link GATE_TOP_K}), damit
        // evaluateGate die über mehrere Synsets verteilte Fahrzeug-Masse erfasst.
        const gate = await createClassifier(
          {
            modelSource: gateModelAsset,
            labels: gateLabels,
            preprocessor: IMAGENET_PREPROCESSOR,
          },
          { topK: GATE_TOP_K },
        );
        if (active) {
          setCascade(
            createCascadeClassifier({
              gate,
              gateConfig: gateConfigFromAppDefinition(definition),
              // Feinmodell (Marke+Modell, #9) erst beim ersten akzeptierten Gate in
              // den Speicher initialisieren – das große B4 belegt Speicher/Akku nur,
              // wenn das Gate ein Fahrzeug durchlässt (kleines topK = Top-k-UX).
              initFine: () =>
                createClassifier(
                  {
                    modelSource: fineModelAsset,
                    labels: fineLabels,
                    preprocessor: IMAGENET_PREPROCESSOR,
                  },
                  { topK: 5 },
                ),
            }),
          );
        }
      } catch (e) {
        if (active) setModelError(e instanceof Error ? (e.stack ?? e.message) : String(e));
      }

      // 2) **Foto-Sanitisierung** (#89) – eigener try. Scheitert sie, ist nur das
      //    Spotten deaktiviert (fail-closed: kein Draft ohne Bereinigung), nicht die
      //    Erkennung. Dynamischer Import: Skias `NativeSetup` (`SkiaModule.install()`)
      //    läuft erst HIER (nach dem ersten Render) – sonst schlösse ein Init-Fehler
      //    die App still, bevor die StartupErrorBoundary greift.
      try {
        const { createMobilePhotoSanitizer } = await import("./upload/createMobilePhotoSanitizer");
        const sanitizer = await createMobilePhotoSanitizer({ definition, branding });
        if (active) setPhotoSanitizer(() => sanitizer);
      } catch (e) {
        if (active) setSanitizerError(e instanceof Error ? (e.stack ?? e.message) : String(e));
      }
    })();
    return () => {
      active = false;
    };
  }, [definition, branding]);

  if (!definition || !branding) {
    return (
      <SafeAreaView style={styles.errorRoot}>
        <ScrollView contentContainerStyle={styles.errorContent}>
          <Text style={styles.errorTitle}>AppDefinition/Branding fehlt</Text>
          <Text style={styles.errorVersion}>v{APP_VERSION}</Text>
          <Text style={styles.errorText}>
            Constants.expoConfig.extra.appDefinition/appBranding ist im Build nicht verfügbar.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (modelError) {
    return (
      <SafeAreaView style={styles.errorRoot}>
        <ScrollView contentContainerStyle={styles.errorContent}>
          <Text style={styles.errorTitle}>Modell-Ladefehler</Text>
          <Text style={styles.errorVersion}>v{APP_VERSION}</Text>
          <Text style={styles.errorText}>{modelError}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Fail-closed (#89): ohne Sanitisierung darf nicht gespottet/persistiert werden.
  // Eigene, ehrliche Meldung (nicht als „Modell-Ladefehler" tarnen) – die Erkennung
  // selbst hat unabhängig davon geladen.
  if (sanitizerError) {
    return (
      <SafeAreaView style={styles.errorRoot}>
        <ScrollView contentContainerStyle={styles.errorContent}>
          <Text style={styles.errorTitle}>Sanitisierung nicht verfügbar</Text>
          <Text style={styles.errorVersion}>v{APP_VERSION}</Text>
          <Text style={styles.errorText}>{sanitizerError}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Auf die geladenen Einstellungen warten, damit der Start-Bildschirm (FTUE vs.
  // Spot) ohne Umschalt-Flackern feststeht. Kurzer, neutraler Halt im App-Hintergrund.
  if (!preferences) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: branding.theme.colors.background }} />;
  }

  return (
    <SpotForgeApp
      definition={definition}
      theme={branding.theme}
      attributes={CATEGORY_ATTRIBUTES[definition.category.primary] ?? []}
      cascade={cascade}
      photoSanitizer={photoSanitizer}
      draftStore={draftStore}
      initialPreferences={preferences}
      onPreferencesChange={(next) => {
        setPreferences(next);
        if (preferencesStore) void preferencesStore.save(next);
      }}
    />
  );
}

export default function App() {
  // SafeAreaProvider stellt die System-Insets (Status-/Navigationsleiste,
  // Notch) bereit. Pflicht, weil Expo SDK 56 / Android edge-to-edge zeichnet:
  // ohne sie läge der App-Inhalt unter den System-Leisten. Ganz außen, damit
  // auch die Fehler-/Lade-SafeAreaViews der Boundary korrekte Insets erhalten.
  return (
    <SafeAreaProvider>
      <StartupErrorBoundary>
        <Root />
      </StartupErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorRoot: {
    flex: 1,
    backgroundColor: "#1a0000",
  },
  errorContent: {
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    color: "#ff5555",
    fontSize: 20,
    fontWeight: "700",
  },
  errorVersion: {
    color: "#ff9999",
    fontSize: 12,
    fontWeight: "600",
  },
  errorText: {
    color: "#ffdddd",
    fontSize: 12,
    fontFamily: "monospace",
  },
});
