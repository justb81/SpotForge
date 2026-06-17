import { describe, expect, it } from "vitest";

import { durationToSeconds } from "./tokens";

describe("durationToSeconds", () => {
  it("interpretiert Einheiten s/m/h/d", () => {
    expect(durationToSeconds("30s")).toBe(30);
    expect(durationToSeconds("15m")).toBe(900);
    expect(durationToSeconds("1h")).toBe(3600);
    expect(durationToSeconds("7d")).toBe(604800);
  });

  it("interpretiert eine reine Zahl als Sekunden", () => {
    expect(durationToSeconds("45")).toBe(45);
  });

  it("wirft bei ungültiger Angabe", () => {
    expect(() => durationToSeconds("bald")).toThrow();
  });
});
