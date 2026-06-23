// Nativer {@link ImageProcessor} der Foto-Sanitisierung (#89) über **Skia**.
// Erfüllt den ai-engine-Seam: ein Rohfoto → frisch enkodiertes, **metadatenfreies**
// JPEG, dessen sensible Regionen entweder **weichgezeichnet** (`"blur"`) oder mit
// dem **App-Namen in Theme-Farben überdeckt** (`"cover"`) sind. Die Re-Enkodierung
// aus rohen Pixeln entfernt EXIF/GPS unbedingt (kein Metadaten-Container).
//
// Wird zur Laufzeit über Skia/RN ausgeführt und – wie das Spot-Wiring – im
// RN-Build verifiziert (keine vitest-Abdeckung; reine native Bildverarbeitung).

import {
  Skia,
  ImageFormat,
  TileMode,
  ClipOp,
  FontStyle,
  BlendMode,
  BlurStyle,
  type SkCanvas,
  type SkImage,
  type SkTypeface,
} from "@shopify/react-native-skia";
import { Directory, File, Paths } from "expo-file-system";
import type {
  ImageProcessor,
  ProcessImageRequest,
  ProcessedImage,
  RedactionRegion,
} from "@spotforge/ai-engine";

/** Styling des Redaktions-Stils `"cover"`: App-Name in Theme-Farben über die Region. */
export interface CoverStyle {
  /** Über `"cover"`-Regionen geschriebener Text (i.d.R. der App-Name, z.B. „CarForge"). */
  label: string;
  /** Füllfarbe der Überdeckung (Hex), z.B. Theme-`surface`. */
  fillColor: string;
  /** Textfarbe (Hex), z.B. Theme-`primary` (die Markenfarbe). */
  textColor: string;
}

export interface SkiaImageProcessorOptions {
  /**
   * Styling für `"cover"`. Fehlt es, fällt `"cover"` sicherheitshalber auf Blur
   * zurück (nie un-redigiert): ohne Label/Farben gibt es nichts zu zeichnen.
   */
  cover?: CoverStyle;
}

/** Pixel-Rechteck im Quellbild-Koordinatenraum. */
interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Aufweitung knapper Detektor-Boxen, damit Gesicht/Kennzeichen sicher abgedeckt ist. */
const REGION_PADDING = 0.08;

/**
 * Baut den Skia-{@link ImageProcessor}. Lädt das Bild, skaliert auf
 * `encode.maxEdge`, zeichnet es neu (⇒ Metadaten weg), redigiert jede Region je
 * Stil und enkodiert als JPEG in den Cache.
 */
export function createSkiaImageProcessor(options: SkiaImageProcessorOptions = {}): ImageProcessor {
  // System-Typeface einmal auflösen (memoisiert). WICHTIG: NIE `Skia.Font(undefined, …)`
  // aufrufen – die native RN-Skia-Bindung wirft dann „Value is undefined, expected
  // Object". Daher eine echte Typeface über den System-FontMgr holen; klappt das nicht,
  // bleibt es `null` und `drawCover` deckt die Region dann ohne Schrift nur mit der
  // Füllfläche ab (Privacy hängt nie am Text-Rendering).
  let cachedTypeface: SkTypeface | null | undefined;
  const resolveTypeface = (): SkTypeface | null => {
    if (cachedTypeface !== undefined) return cachedTypeface;
    try {
      const fontMgr = Skia.FontMgr.System();
      const family = fontMgr.countFamilies() > 0 ? fontMgr.getFamilyName(0) : "";
      cachedTypeface = fontMgr.matchFamilyStyle(family, FontStyle.Bold) ?? null;
    } catch {
      cachedTypeface = null;
    }
    return cachedTypeface;
  };

  return {
    async process({ imageUri, regions, encode }: ProcessImageRequest): Promise<ProcessedImage> {
      const data = await Skia.Data.fromURI(imageUri);
      const image = Skia.Image.MakeImageFromEncoded(data);
      if (!image) throw new Error(`Bild konnte nicht dekodiert werden: ${imageUri}`);

      const srcW = image.width();
      const srcH = image.height();
      // Auf die maximale Kantenlänge herunterskalieren (nie hochskalieren).
      const scale = Math.min(1, encode.maxEdge / Math.max(srcW, srcH));
      const outW = Math.max(1, Math.round(srcW * scale));
      const outH = Math.max(1, Math.round(srcH * scale));

      const surface = Skia.Surface.MakeOffscreen(outW, outH);
      if (!surface) throw new Error("Skia-Offscreen-Surface konnte nicht erstellt werden");
      const canvas = surface.getCanvas();
      // Ab hier in Quellbild-Pixeln zeichnen; die Skalierung mappt auf die Ausgabe.
      canvas.scale(scale, scale);
      canvas.drawImage(image, 0, 0);

      for (const region of regions) {
        const rect = toPixelRect(region, srcW, srcH);
        if (rect.width <= 0 || rect.height <= 0) continue;
        if (region.style === "cover" && options.cover) {
          drawCover(canvas, rect, options.cover, resolveTypeface());
        } else {
          drawBlur(canvas, image, rect);
        }
      }

      const snapshot = surface.makeImageSnapshot();
      const quality = Math.round(Math.min(1, Math.max(0, encode.quality)) * 100);
      const bytes = snapshot.encodeToBytes(ImageFormat.JPEG, quality);

      const dir = new Directory(Paths.cache, "spotforge", "sanitized");
      if (!dir.exists) dir.create({ intermediates: true });
      const file = new File(dir, `sanitized-${Date.now()}.jpg`);
      file.write(bytes);

      return {
        imageUri: file.uri,
        format: "jpeg",
        width: outW,
        height: outH,
        bytes: bytes.length,
        // Snapshot wird aus rohen Surface-Pixeln enkodiert – keine EXIF/Metadaten.
        metadataStripped: true,
      };
    },
  };
}

/** Normalisierte (0..1) Region → aufgeweitetes, auf das Bild geklemmtes Pixel-Rechteck. */
function toPixelRect(region: RedactionRegion, srcW: number, srcH: number): PixelRect {
  const padX = region.width * REGION_PADDING;
  const padY = region.height * REGION_PADDING;
  const x0 = Math.max(0, (region.x - padX) * srcW);
  const y0 = Math.max(0, (region.y - padY) * srcH);
  const x1 = Math.min(srcW, (region.x + region.width + padX) * srcW);
  const y1 = Math.min(srcH, (region.y + region.height + padY) * srcH);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/**
 * Region weichzeichnen mit **weicher elliptischer Kante** (statt harter Rechteck-
 * Kontur): In einer eigenen Ebene wird die geblurrte Bildkopie abgelegt und mit
 * einer Ellipse maskiert, deren Rand über einen Blur-MaskFilter ausgefedert ist
 * (DstIn). Beim Zusammenführen läuft der Blur dadurch sanft ins scharfe Bild aus.
 */
function drawBlur(canvas: SkCanvas, image: SkImage, rect: PixelRect): void {
  const minEdge = Math.min(rect.width, rect.height);
  const sigma = Math.max(8, minEdge * 0.5);
  // Federbreite der Kante; etwas Rand, damit die Feder innerhalb der Ebene Platz hat.
  const feather = Math.max(6, minEdge * 0.18);
  const pad = feather * 1.5;
  const bounds = Skia.XYWHRect(
    rect.x - pad,
    rect.y - pad,
    rect.width + pad * 2,
    rect.height + pad * 2,
  );

  // WICHTIG: `saveLayer()` ohne Argumente aufrufen – ein explizites `undefined`
  // (z.B. `saveLayer(undefined, bounds)`) bringt die native RN-Skia-Bindung dazu,
  // die Ebene NICHT korrekt zu isolieren (gleiche Undefined-Falle wie bei
  // `Skia.Font`); die DstIn-Maske unten griffe dann nicht und es bliebe die harte
  // Rechteck-Kante. Stattdessen vorher per Clip begrenzen, dann die Ebene öffnen.
  canvas.save();
  canvas.clipRect(bounds, ClipOp.Intersect, true);
  canvas.saveLayer();

  // 1) Geblurrte Bildkopie in der (auf `bounds` begrenzten) Ebene.
  const blurPaint = Skia.Paint();
  blurPaint.setImageFilter(Skia.ImageFilter.MakeBlur(sigma, sigma, TileMode.Clamp, null));
  canvas.drawImage(image, 0, 0, blurPaint);

  // 2) Weich auslaufende Ellipse als DstIn-Maske: behält die Blur-Farbe, federt
  //    aber das Alpha zur Kante hin aus (Normal-Blur fuzzt innen wie außen).
  const maskPaint = Skia.Paint();
  maskPaint.setAntiAlias(true);
  maskPaint.setColor(Skia.Color("black")); // opak – für DstIn zählt nur das Alpha
  maskPaint.setBlendMode(BlendMode.DstIn);
  maskPaint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, feather, false));
  canvas.drawOval(Skia.XYWHRect(rect.x, rect.y, rect.width, rect.height), maskPaint);

  canvas.restore(); // Ebene zurückführen (komponiert die weiche Ellipse aufs Bild)
  canvas.restore(); // Clip
}

/**
 * Region mit dem App-Namen in Theme-Farben überdecken (opak, garantiert unlesbar).
 * Die opake Füllung wird **immer** gezeichnet – sie allein deckt die Region ab
 * (Privacy). Der App-Name kommt nur obendrauf, wenn eine Typeface auflösbar war;
 * ohne sie bleibt es bei der Füllung (kein `Skia.Font(undefined, …)` → kein Crash).
 */
function drawCover(
  canvas: SkCanvas,
  rect: PixelRect,
  cover: CoverStyle,
  typeface: SkTypeface | null,
): void {
  const fill = Skia.Paint();
  fill.setColor(Skia.Color(cover.fillColor));
  fill.setAntiAlias(true);
  canvas.drawRect(Skia.XYWHRect(rect.x, rect.y, rect.width, rect.height), fill);

  // Ohne Typeface keine Schrift – die Füllung oben hat die Region bereits abgedeckt.
  if (!typeface) return;

  const textPaint = Skia.Paint();
  textPaint.setColor(Skia.Color(cover.textColor));
  textPaint.setAntiAlias(true);

  // Schriftgröße aus der Region ableiten und auf ~86% der Breite einpassen.
  let size = Math.max(1, rect.height * 0.6);
  const font = Skia.Font(typeface, size);
  const measured = font.measureText(cover.label);
  const maxWidth = rect.width * 0.86;
  if (measured.width > maxWidth && measured.width > 0) {
    size = size * (maxWidth / measured.width);
    font.setSize(size);
  }
  const fitted = font.measureText(cover.label);
  const tx = rect.x + (rect.width - fitted.width) / 2;
  const ty = rect.y + rect.height / 2 + size * 0.35; // grob vertikal mittig (Baseline)
  canvas.drawText(cover.label, tx, ty, textPaint, font);
}
