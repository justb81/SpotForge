# ADR 0002 – Mehrere Apps (eine pro Kategorie) aus einer Codebase

- **Status:** Akzeptiert (verfeinert durch
  [ADR 0016](./0016-vererbte-kategorie-taxonomie-je-app.md) — Entwurf: vererbte
  Kategorie-Taxonomie *innerhalb* jeder App; White-Label bleibt)
- **Datum:** 2026-06-14
- **Ersetzt teilweise:** ADR 0001 (Annahme einer einzigen Multi-Kategorie-App)

## Kontext

Statt einer App, die alle Kategorien vereint, soll **jede Kategorie ihre eigene
App** sein (Auto-App, Tier-App, …) – aus Marketing-, Fokus- und ASO-Gründen. Die
Apps sollen aber möglichst konfigurativ aus **einer einheitlichen Codebase**
entstehen, und es soll **einen zentralen Server** geben. Start ist
ausschließlich die Auto-App, das Design bleibt generisch.

## Entscheidung

1. **White-Label aus einer Codebase.** Ein generischer App-Kern
   (`@spotforge/app-shell`), gehostet von einem einzigen Expo-Projekt
   (`apps/mobile`). Die konkrete App wird zur **Build-Zeit** über `APP_VARIANT`
   gewählt.
2. **`AppDefinition` als Konfigurations-Vertrag** (`@spotforge/app-config`):
   bündelt Identität, Kategorie + **Guardrails**, **KI-Prompts**, **Theme**,
   **Text-Overrides**, **Assets**. Eine App = eine `AppDefinition` unter
   `variants/<name>/`. Kein App-Code pro App.
3. **Ein zentraler, mandantenfähiger Server.** Daten sind pro `appId` getrennt.
4. **Start mit `variants/cars` (CarForge)**, alles andere generisch.

## Begründung

- „Neue App erzeugen" wird zu „neue Konfiguration anlegen" – minimaler Aufwand,
  maximale Konsistenz, keine divergierenden App-Forks.
- Build-Zeit-Varianten sind das etablierte Expo-White-Label-Muster (app.config.ts
  + EAS-Profile) und liefern pro App eigene Store-Identität/Icons/Branding.
- Multi-Tenant-Server hält app-übergreifende Features (GDD-USP) später offen,
  ohne sie jetzt zu erzwingen.

## Konsequenzen

- Disziplin: `app-shell` darf **keine** kategorie-spezifischen Annahmen, Texte,
  Farben oder Bundle-IDs hart kodieren – alles kommt aus der `AppDefinition`.
- `ai-engine` und `ui` werden parametrisiert (Guardrails/Prompts bzw. Theme).
- Jede neue Kategorie braucht: `variants/<name>/`, ein EAS-Build-Profil und
  ggf. Kategorie-Daten unter `data/categories`.
- Der Server muss `appId` konsequent durch alle Schichten skopieren.
- Verworfene Alternativen: eigenes Expo-Projekt pro App (mehr Boilerplate);
  eine Laufzeit-umschaltbare App (widerspricht „eigene App pro Kategorie").
