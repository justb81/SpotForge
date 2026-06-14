# variants/cars/assets

Grafiken für CarForge. Icon, Splash, Logo, Hintergrund und die
Seltenheits-Kartenrahmen (`frames/`), referenziert in `../app.definition.ts`.

Alle Grafiken werden aus der einzigen Markenquelle `carforge.png` (weißes
CarForge-Logo auf Schwarz) abgeleitet. Generator:
[`tools/gen-cars-assets.py`](../../../tools/gen-cars-assets.py) – nach dem
Ändern von `carforge.png` einfach `python3 tools/gen-cars-assets.py` ausführen.

Dateien:

- `carforge.png` – Markenquelle (Logo: Auto-Silhouette + Schriftzug)
- `icon.png` – App-Icon (1024×1024), Logo auf dunklem Verlauf mit Rot-Glow
- `splash.png` – Splash (transparent; Expo füllt mit `theme.background`)
- `logo.png` – In-App-Logo (weiß, transparent)
- `background.png` – Hintergrund (Portrait, Verlauf + Auto-Wasserzeichen)
- `frames/{common,uncommon,rare,epic,legendary}.png` – Kartenrahmen (750×1050,
  transparente Mitte; Seltenheitsfarbe + Glow steigen mit der Stufe)
