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
    cardFrames: {
      common: "./assets/frames/common.png",
      uncommon: "./assets/frames/uncommon.png",
      rare: "./assets/frames/rare.png",
      epic: "./assets/frames/epic.png",
      legendary: "./assets/frames/legendary.png",
    },
  },
});
