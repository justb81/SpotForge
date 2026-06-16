// Metro behandelt .pte (ExecuTorch-Modelle) als Assets (siehe metro.config.js)
// und liefert beim Import eine Asset-Registry-ID (number), die
// react-native-executorch via Resource-Fetcher auflöst. TypeScript kennt diese
// Modul-Endung nicht – diese Deklaration schließt die Lücke.
declare module "*.pte" {
  const asset: number;
  export default asset;
}

// Bilder werden von Metro ebenso als Asset (Registry-ID) eingebunden – u.a. die
// gebündelten generischen Kartenrahmen aus @spotforge/ui.
declare module "*.png" {
  const asset: number;
  export default asset;
}
