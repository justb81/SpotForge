import { describe, expect, it } from "vitest";
import { NEW_PLAYER, type PlayerProgress } from "../progression/disclosure";
import { TAB_KEYS, resolveActiveTab, visibleTabs } from "./tabs";

const PLAYING: PlayerProgress = { level: 1, ftueCompleted: true };

describe("navigation tabs", () => {
  it("zeigt einem neuen Spieler nur das Spot-Tab", () => {
    expect(visibleTabs(NEW_PLAYER).map((t) => t.key)).toEqual(["spot"]);
  });

  it("zeigt nach der FTUE alle Haupt-Tabs in fester Reihenfolge", () => {
    expect(visibleTabs(PLAYING).map((t) => t.key)).toEqual([...TAB_KEYS]);
  });

  it("hält den aktiven Tab, solange er sichtbar ist", () => {
    expect(resolveActiveTab("battle", PLAYING)).toBe("battle");
  });

  it("fällt auf das erste sichtbare Tab zurück, wenn der aktive verschwindet", () => {
    // Spieler hat die FTUE noch offen → nur „spot" ist sichtbar.
    expect(resolveActiveTab("battle", NEW_PLAYER)).toBe("spot");
  });
});
