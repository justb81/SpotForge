// Metro behandelt .pte (ExecuTorch-Modelle) als Assets (siehe metro.config.js)
// und liefert beim Import eine Asset-Registry-ID (number), die
// react-native-executorch via Resource-Fetcher auflöst. TypeScript kennt diese
// Modul-Endung nicht – diese Deklaration schließt die Lücke.
declare module "*.pte" {
  const asset: number;
  export default asset;
}

// Bild-Assets (z.B. die Seltenheits-Kartenrahmen) liefern beim Import eine
// Metro-Asset-Registry-ID (number), die als React-Native-`ImageSourcePropType` taugt.
declare module "*.png" {
  const asset: number;
  export default asset;
}

// Mitgelieferte Modell-Labels (`<id>.labels.json`, bezogen via tools/fetch-models,
// nicht im Git). Geordnete Klassen-Labels (Index = Logit-Position). Eigene Endung,
// damit echte, im Repo liegende JSONs (z.B. data/categories/*.json) typisiert bleiben.
declare module "*.labels.json" {
  const labels: string[];
  export default labels;
}
