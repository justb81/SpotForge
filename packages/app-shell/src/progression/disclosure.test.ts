import { describe, expect, it } from "vitest";
import {
  NEW_PLAYER,
  featureUnlockLevel,
  isFeatureUnlocked,
  unlockedFeatures,
  type PlayerProgress,
} from "./disclosure";

describe("progressive disclosure", () => {
  it("zeigt einem neuen Spieler nur den Kern-Loop (spot)", () => {
    expect(unlockedFeatures(NEW_PLAYER)).toEqual(["spot"]);
    expect(isFeatureUnlocked("spot", NEW_PLAYER)).toBe(true);
    expect(isFeatureUnlocked("collection", NEW_PLAYER)).toBe(false);
  });

  it("schaltet die Basis-Bereiche nach der FTUE frei", () => {
    const afterFtue: PlayerProgress = { level: 1, ftueCompleted: true };
    expect(isFeatureUnlocked("collection", afterFtue)).toBe(true);
    expect(isFeatureUnlocked("battle", afterFtue)).toBe(true);
    expect(isFeatureUnlocked("trade", afterFtue)).toBe(true);
    expect(isFeatureUnlocked("profile", afterFtue)).toBe(true);
  });

  it("hält Spezial-Mechaniken bis zum jeweiligen Level zurück", () => {
    const lvl1: PlayerProgress = { level: 1, ftueCompleted: true };
    expect(isFeatureUnlocked("fusion", lvl1)).toBe(false);
    expect(isFeatureUnlocked("fusion", { level: 3, ftueCompleted: true })).toBe(true);
    expect(isFeatureUnlocked("market", { level: 5, ftueCompleted: true })).toBe(true);
    expect(isFeatureUnlocked("clans", { level: 7, ftueCompleted: true })).toBe(false);
  });

  it("meldet das Freischalt-Level je Feature", () => {
    expect(featureUnlockLevel("spot")).toBe(0);
    expect(featureUnlockLevel("fusion")).toBe(3);
    expect(featureUnlockLevel("clans")).toBe(8);
  });
});
