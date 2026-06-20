import { describe, expect, it } from "vitest";
import { NEW_PLAYER, type PlayerProgress } from "../progression/disclosure";
import {
  DEFAULT_PREFERENCES,
  parsePreferences,
  resolveInitialProgress,
  serializePreferences,
  type Preferences,
} from "./preferences";

describe("Preferences", () => {
  it("zeigt das Tutorial standardmäßig, hat Auto-Spot aus und startet im Spot-Tab", () => {
    expect(DEFAULT_PREFERENCES.skipTutorial).toBe(false);
    expect(DEFAULT_PREFERENCES.autoSpotEnabled).toBe(false);
    expect(DEFAULT_PREFERENCES.autoSpotCoachmarkSeen).toBe(false);
    expect(DEFAULT_PREFERENCES.autoSpotIntervalMs).toBeUndefined();
    expect(DEFAULT_PREFERENCES.defaultView).toBe("spot");
  });

  it("serialisiert und liest verlustfrei zurück", () => {
    const prefs: Preferences = {
      skipTutorial: true,
      autoSpotEnabled: true,
      autoSpotCoachmarkSeen: true,
      autoSpotIntervalMs: 2500,
      defaultView: "battle",
    };
    expect(parsePreferences(serializePreferences(prefs))).toEqual(prefs);
  });

  it("fällt bei unbekannter Start-Ansicht auf den Default zurück", () => {
    expect(parsePreferences('{"defaultView":"garage"}')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('{"defaultView":42}')).toEqual(DEFAULT_PREFERENCES);
  });

  it("schreibt das Intervall nur, wenn der Nutzer es überschrieben hat", () => {
    const roundtrip = parsePreferences(serializePreferences(DEFAULT_PREFERENCES));
    expect(roundtrip).toEqual(DEFAULT_PREFERENCES);
    expect("autoSpotIntervalMs" in roundtrip).toBe(false);
  });

  it("fällt bei fehlender/beschädigter Datei auf die Defaults zurück", () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences("nicht json")).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences("{}")).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('{"skipTutorial":"ja"}')).toEqual(DEFAULT_PREFERENCES);
  });

  it("ignoriert ein ungültiges (nicht-positives) Intervall", () => {
    expect(parsePreferences('{"autoSpotIntervalMs":0}')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('{"autoSpotIntervalMs":"viel"}')).toEqual(DEFAULT_PREFERENCES);
  });
});

describe("resolveInitialProgress", () => {
  const prefs = (skipTutorial: boolean): Preferences => ({
    ...DEFAULT_PREFERENCES,
    skipTutorial,
  });

  it("lässt den Fortschritt unverändert, wenn das Tutorial nicht übersprungen wird", () => {
    expect(resolveInitialProgress(NEW_PLAYER, prefs(false))).toBe(NEW_PLAYER);
  });

  it("schaltet bei übersprungenem Tutorial die Basis-Bereiche frei (FTUE + Level≥1)", () => {
    const seeded = resolveInitialProgress(NEW_PLAYER, prefs(true));
    expect(seeded.ftueCompleted).toBe(true);
    expect(seeded.level).toBe(1);
  });

  it("senkt ein bereits höheres Level nicht ab", () => {
    const veteran: PlayerProgress = { level: 7, ftueCompleted: false };
    expect(resolveInitialProgress(veteran, prefs(true))).toEqual({
      level: 7,
      ftueCompleted: true,
    });
  });
});
