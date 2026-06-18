# variants/cars/assets

Marken-Grafiken für CarForge: Icon, Splash, Logo und Hintergrund, referenziert in
`../branding.config.ts`. Die Seltenheits-Kartenrahmen sind **nicht** hier – sie
werden prozedural aus `RARITY_STYLES` + Theme gerendert (ADR 0015, #96 –
`CardFrame` in `@spotforge/ui`), nicht als Assets gebündelt.

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
