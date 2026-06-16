// Metro behandelt Bilder (.png) als Assets und liefert beim Import eine
// Asset-Registry-ID (number), die <Image source={…}> auflöst. TypeScript kennt
// diese Modul-Endung nicht – diese Deklaration schließt die Lücke (analog zur
// .pte-Deklaration der App).
declare module "*.png" {
  const asset: number;
  export default asset;
}
