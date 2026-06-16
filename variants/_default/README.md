# variants/_default

Generische **Branding-Basis** für alle Apps (ADR 0011). Liefert das Default-
`Branding` – ein neutrales Theme und die kategorie-neutralen Seltenheits-
Kartenrahmen –, das jede konkrete Variante in ihrer eigenen `branding.config.ts`
nur **überschreibt**. `resolveBranding` legt die Variante über diese Basis
(Theme tief, Assets pro Feld) und liefert ein vollständiges, aufgelöstes Branding.

Bewusst **keine** eigene App: `_default` hat **kein** `app.definition.ts`, kein
`icon`/`splash`/`logo` (marken-spezifisch, je Variante) und wird daher nicht als
baubare Variante behandelt.

Dateien:

- `branding.config.ts` – neutrales Theme + `cardFrames` (alle fünf Stufen).
- `assets/frames/{common,uncommon,rare,epic,legendary}.png` – generische
  Kartenrahmen (750×1050, transparente Mitte; Seltenheitsfarbe + Glow steigen mit
  der Stufe). Reproduzierbar über [`tools/gen-ui-frames.py`](../../tools/gen-ui-frames.py).
