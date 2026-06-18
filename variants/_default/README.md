# variants/_default

Generische **Branding-Basis** für alle Apps (ADR 0011). Liefert das Default-
`Branding` – ein neutrales Theme –, das jede konkrete Variante in ihrer eigenen
`branding.config.ts` nur **überschreibt**. `resolveBranding` legt die Variante über
diese Basis (Theme tief, Assets pro Feld) und liefert ein vollständiges,
aufgelöstes Branding.

Bewusst **keine** eigene App: `_default` hat **kein** `app.definition.ts`, kein
`icon`/`splash`/`logo` (marken-spezifisch, je Variante) und wird daher nicht als
baubare Variante behandelt.

Die Seltenheits-**Kartenrahmen** liegen hier **nicht** mehr als Assets: sie werden
prozedural aus `RARITY_STYLES` + Theme gerendert (ADR 0015, #96 – `CardFrame` in
`@spotforge/ui`).

Dateien:

- `branding.config.ts` – neutrales Theme (keine Assets; Frames werden gerendert).
