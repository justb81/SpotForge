// Die zehn SpotForge-Kategorien (GDD §4). Source of Truth für die
// Attributschemata: data/categories.

export const CATEGORY_IDS = [
  "vehicles", // 🚗 Fahrzeuge
  "aviation", // ✈️ Luftfahrt
  "animals", // 🦁 Tiere
  "plants", // 🌿 Pflanzen
  "construction", // 🏗️ Baumaschinen
  "watercraft", // 🚢 Wasserfahrzeuge
  "rail", // 🚂 Schienenfahrzeuge
  "structures", // 🏛️ Bauwerke
  "fungi", // 🍄 Pilze
  "minerals", // 🌍 Gestein & Mineralien
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];
