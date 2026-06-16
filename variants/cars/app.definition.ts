import { defineApp } from "@spotforge/app-config";

/**
 * CarForge – die Auto-App. Erste und derzeit einzige Variante; zugleich
 * Referenz für weitere Apps. Alles Auto-Spezifische steht hier – die
 * generische app-shell bleibt unverändert.
 */
export default defineApp({
  id: "cars",

  identity: {
    displayName: "CarForge",
    slug: "carforge",
    scheme: "carforge",
    ios: { bundleIdentifier: "com.spotforge.cars" },
    android: { package: "com.spotforge.cars" },
  },

  category: {
    primary: "vehicles",
    guardrails: {
      allowed: ["vehicles"],
      minConfidence: 0.6,
      rejectMessage: {
        de: "Das sieht nicht nach einem Fahrzeug aus. Richte die Kamera auf ein Auto, Motorrad, einen LKW oder Bus.",
        en: "That doesn't look like a vehicle. Point the camera at a car, motorcycle, truck or bus.",
      },
    },
    // Rohe ImageNet-1k-Labels (EfficientNet-V2-S-Gate, ADR 0008) für Straßen-
    // fahrzeuge: Autos, LKW, Busse, motorisierte Zweiräder. Müssen exakt dem
    // Label-Vokabular des Gate-Modells entsprechen; Domänen-Mapping → #72.
    gate: {
      allow: [
        "ambulance",
        "beach wagon",
        "cab",
        "convertible",
        "jeep",
        "limousine",
        "minivan",
        "Model T",
        "racer",
        "sports car",
        "recreational vehicle",
        "pickup",
        "tow truck",
        "trailer truck",
        "garbage truck",
        "fire engine",
        "moving van",
        "police van",
        "minibus",
        "school bus",
        "trolleybus",
        "moped",
        "motor scooter",
      ],
    },
  },

  ai: {
    classificationHint:
      "Focus on road vehicles: cars, motorcycles, trucks and buses. Ignore background objects.",
    cardArtPrompt:
      "Dynamic collectible trading-card illustration of {objectName}, {rarity} rarity, dramatic studio lighting, clean gradient background, high detail.",
    factPrompt:
      "Provide factual specifications for the vehicle {objectName}: horsepower (PS), 0-100 km/h time, top speed (km/h), weight (kg), price (EUR), model year.",
  },

  theme: {
    colors: {
      primary: "#E10600", // Racing-Rot
      secondary: "#1A1A1A",
      background: "#0E0E0E",
      surface: "#1C1C1E",
      text: "#FFFFFF",
      accent: "#FFD400",
    },
    typography: {
      fontFamily: "Inter",
      headingFontFamily: "Inter",
    },
    radius: 16,
  },

  content: {
    "spot.cta": { de: "Auto spotten", en: "Spot a car" },
    "forge.title": { de: "Karte schmieden", en: "Forge card" },
    "collection.title": { de: "Garage", en: "Garage" },
    "battle.title": { de: "Duell", en: "Duel" },
  },

  assets: {
    icon: "./assets/icon.png",
    splash: "./assets/splash.png",
    logo: "./assets/logo.png",
    background: "./assets/background.png",
    // Keine eigenen `cardFrames`: CarForge nutzt die generischen Rahmen aus
    // @spotforge/ui. Eigene Grafiken könnten einzelne Stufen hier überschreiben.
  },
});
