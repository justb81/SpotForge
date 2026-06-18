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
      // Gate-Annahme-Schwelle auf die SUMMIERTE Fahrzeug-Masse über alle
      // `gate.allow`-Synsets (marginale P(Fahrzeug)), nicht auf einen einzelnen
      // Kandidaten (#83, evaluateGate). Bewusst recall-lastig getrimmt – ein
      // False-Negative killt einen legitimen Spot, ein False-Positive ist billig
      // (Feinmodell + `unrecognized`-Pfad fangen ihn). Startwert; final kalibriert
      // der Off-Device-Pre-Screen (tools/export-model/prescreen.py) und die
      // Geräte-Verifikation (#63).
      minConfidence: 0.35,
      rejectMessage: {
        de: "Das sieht nicht nach einem Fahrzeug aus. Richte die Kamera auf ein Auto, Motorrad, einen LKW oder Bus.",
        en: "That doesn't look like a vehicle. Point the camera at a car, motorcycle, truck or bus.",
      },
    },
    // Rohe ImageNet-1k-Labels des breiten fp32-Gate-Modells (EfficientNet-B0,
    // ADR 0008) für Straßenfahrzeuge. Müssen exakt dem Label-Vokabular des
    // Gate-Modells entsprechen (tools/export-model/imagenet-1k.labels.json;
    // Konvention: erstes Synonym, „_" → Leerzeichen). Domänen-Mapping → #72.
    //
    // Möglichst vollständig (#83): jedes fehlende Fahrzeug-Synset wäre ein
    // garantierter False-Negative für diese Karosserie. Enthält daher auch
    // motorisierte Sonder-/Geländefahrzeuge sowie – bewusst – einige stark
    // fahrzeug-indikative TEIL-Synsets (`car wheel`, `grille`, `car mirror`):
    // Sie tragen reale Fahrzeug-Masse bei Nah-/Teilaufnahmen bei (Asymmetrie:
    // FP billig). Reine Zweiräder ohne Motor (Fahrrad) bleiben außerhalb.
    gate: {
      allow: [
        // Pkw / Karosserieformen
        "sports car",
        "convertible",
        "cab",
        "jeep",
        "limousine",
        "minivan",
        "beach wagon",
        "Model T",
        "racer",
        "pickup",
        // Lkw / Nutzfahrzeuge
        "tow truck",
        "trailer truck",
        "garbage truck",
        "fire engine",
        "moving van",
        "police van",
        "ambulance",
        "snowplow",
        // Busse
        "minibus",
        "school bus",
        "trolleybus",
        // motorisierte Zweiräder
        "moped",
        "motor scooter",
        // Sonder-/Geländefahrzeuge
        "recreational vehicle",
        "golfcart",
        "go-kart",
        "snowmobile",
        "tractor",
        "forklift",
        // stark fahrzeug-indikative Teile (Recall bei Nah-/Teilaufnahmen)
        "car wheel",
        "grille",
        "car mirror",
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

  content: {
    "spot.cta": { de: "Auto spotten", en: "Spot a car" },
    "forge.title": { de: "Karte schmieden", en: "Forge card" },
    "collection.title": { de: "Garage", en: "Garage" },
    "battle.title": { de: "Duell", en: "Duel" },
    // Fahrzeug-spezifische Beschriftungen (die generische app-shell bleibt neutral):
    "draft.nameLabel": { de: "Marke / Modell", en: "Make / Model" },
    "spot.manualHint": {
      de: "Benenne Marke und Modell selbst.",
      en: "Name the make and model yourself.",
    },
  },

  // Galerie-Import aktiv (eigener Button neben der Kamera): ein vorhandenes Bild
  // durchläuft dieselbe Spot-Kette (Gate → Feinmodell). Erleichtert das Testen –
  // kein frisches Foto auf der Straße nötig. Kein Upload (rein on-device).
  features: {
    imageImport: true,
  },

  // Theme & Assets: siehe ./branding.config.ts (ADR 0011).
});
