import { describe, expect, it } from "vitest";
import { NEW_PLAYER, type PlayerProgress } from "../progression/disclosure";
import {
  DEFAULT_PREFERENCES,
  parsePreferences,
  resolveInitialProgress,
  serializePreferences,
} from "./preferences";

describe("Preferences", () => {
  it("zeigt das Tutorial standardmäßig (skipTutorial false)", () => {
    expect(DEFAULT_PREFERENCES.skipTutorial).toBe(false);
  });

  it("serialisiert und liest verlustfrei zurück", () => {
    const prefs = { skipTutorial: true };
    expect(parsePreferences(serializePreferences(prefs))).toEqual(prefs);
  });

  it("fällt bei fehlender/beschädigter Datei auf die Defaults zurück", () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences("nicht json")).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences("{}")).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('{"skipTutorial":"ja"}')).toEqual(DEFAULT_PREFERENCES);
  });
});

describe("resolveInitialProgress", () => {
  it("lässt den Fortschritt unverändert, wenn das Tutorial nicht übersprungen wird", () => {
    expect(resolveInitialProgress(NEW_PLAYER, { skipTutorial: false })).toBe(NEW_PLAYER);
  });

  it("schaltet bei übersprungenem Tutorial die Basis-Bereiche frei (FTUE + Level≥1)", () => {
    const seeded = resolveInitialProgress(NEW_PLAYER, { skipTutorial: true });
    expect(seeded.ftueCompleted).toBe(true);
    expect(seeded.level).toBe(1);
  });

  it("senkt ein bereits höheres Level nicht ab", () => {
    const veteran: PlayerProgress = { level: 7, ftueCompleted: false };
    expect(resolveInitialProgress(veteran, { skipTutorial: true })).toEqual({
      level: 7,
      ftueCompleted: true,
    });
  });
});
