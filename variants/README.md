# variants

Jeder Unterordner hier ist **eine App**. Eine Variante besteht ausschließlich aus
Konfiguration und Assets – keinem Code. Die generische App
(`@spotforge/app-shell`, gehostet von `apps/mobile`) wird damit parametrisiert.

## Eine neue App erzeugen

1. Ordner `variants/<name>/` anlegen.
2. `app.definition.ts` schreiben (typgeprüft über `defineApp` aus
   `@spotforge/app-config`) – setzt Identität, Kategorie + Guardrails,
   KI-Prompts, Theme, Text-Overrides, Asset-Pfade.
3. Assets nach `variants/<name>/assets/` legen (Icon, Splash, Logo, …).
4. Build-Profil ergänzen und mit `APP_VARIANT=<name>` bauen
   (siehe `apps/mobile`).

**Kein Eingriff in den App-Code nötig.**

## Aufbau einer Variante

```
variants/<name>/
├── app.definition.ts   # die AppDefinition (Single Source pro App)
└── assets/             # icon, splash, logo, Kartenrahmen, Hintergründe
```

## Aktuelle Varianten

- **`cars/`** — CarForge (Kategorie: `vehicles`). Die erste und derzeit einzige
  App. Dient zugleich als Referenz für weitere Varianten.
