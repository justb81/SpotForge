import { describe, expect, it } from "vitest";
import {
  FIRST_FTUE_STEP,
  FTUE_STEPS,
  FTUE_STEP_CONTENT,
  ftueProgress,
  isFirstFtueStep,
  isLastFtueStep,
  nextFtueStep,
  prevFtueStep,
} from "./steps";

describe("FTUE-Schrittmaschine", () => {
  it("startet bei welcome und endet bei gift", () => {
    expect(FIRST_FTUE_STEP).toBe("welcome");
    expect(isFirstFtueStep("welcome")).toBe(true);
    expect(isLastFtueStep("gift")).toBe(true);
  });

  it("läuft die Sequenz vorwärts vollständig durch und endet mit null", () => {
    const visited: string[] = [];
    let step: ReturnType<typeof nextFtueStep> | (typeof FTUE_STEPS)[number] = FIRST_FTUE_STEP;
    while (step) {
      visited.push(step);
      step = nextFtueStep(step);
    }
    expect(visited).toEqual([...FTUE_STEPS]);
  });

  it("navigiert rückwärts und stoppt am Anfang", () => {
    expect(prevFtueStep("forge")).toBe("spot");
    expect(prevFtueStep("welcome")).toBeNull();
  });

  it("liefert monoton steigenden Fortschritt von >0 bis 1", () => {
    expect(ftueProgress("welcome")).toBeCloseTo(1 / FTUE_STEPS.length);
    expect(ftueProgress("gift")).toBe(1);
  });

  it("hat für jeden Schritt Titel- und Body-Schlüssel", () => {
    for (const step of FTUE_STEPS) {
      expect(FTUE_STEP_CONTENT[step].titleKey).toMatch(/^ftue\./);
      expect(FTUE_STEP_CONTENT[step].bodyKey).toMatch(/^ftue\./);
    }
  });
});
