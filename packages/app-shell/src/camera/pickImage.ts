import { launchImageLibraryAsync } from "expo-image-picker";

/**
 * Öffnet die System-Galerie und liefert die lokale URI des gewählten Bildes –
 * oder `null`, wenn der Nutzer abbricht. Kapselt die einzige `expo-image-picker`-
 * Abhängigkeit der app-shell (analog zu {@link SpotCamera} für `expo-camera`),
 * damit der SpotScreen kategorie- und SDK-neutral bleibt.
 *
 * Hinter dem optionalen Feature `features.imageImport` (siehe AppDefinition):
 * das gewählte Bild durchläuft danach dieselbe Spot-Kette (Gate → Feinmodell →
 * Draft) wie ein frisch aufgenommenes Foto. Reines Test-/QA-Komfort-Feature –
 * kein Upload, die URI bleibt lokal und wird nur on-device klassifiziert.
 */
export async function pickImageFromLibrary(): Promise<string | null> {
  // `launchImageLibraryAsync` nutzt den System-Foto-Picker; eine eigene
  // Galerie-Berechtigung ist dafür nicht nötig (Android Photo Picker / iOS
  // PHPicker). `mediaTypes: ["images"]` schließt Videos aus.
  const result = await launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}
