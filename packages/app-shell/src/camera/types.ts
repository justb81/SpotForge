/**
 * Ergebnis eines Kamera-Captures (#49) – das Übergabeformat an die On-Device-
 * Klassifikation (#50). Bewusst entkoppelt von den game-core-Domänentypen:
 * der PoC reicht nur ein vorbereitetes Bild weiter, noch keine Card.
 */
export interface CapturedPhoto {
  /** Lokale URI des vorbereiteten (quadratisch skalierten) Bildes. */
  uri: string;
  /** Kantenlänge in px (quadratisch, = Modell-Eingabegröße). */
  size: number;
  /** Base64 des JPEG, falls für die Inferenz benötigt (z.B. Pixel-Dekodierung). */
  base64?: string;
}
