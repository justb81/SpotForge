// Metro behandelt .onnx/.ort als Assets (siehe metro.config.js) und liefert beim
// Import eine Asset-Registry-ID (number), die expo-asset auflöst. TypeScript
// kennt diese Modul-Endungen nicht – diese Deklaration schließt die Lücke.
declare module "*.onnx" {
  const asset: number;
  export default asset;
}

declare module "*.ort" {
  const asset: number;
  export default asset;
}
