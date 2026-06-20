import { describe, expect, it, vi } from "vitest";
import type { AppDefinition } from "@spotforge/app-config";
import type { SpotResult } from "@spotforge/ai-engine";
import { buildDraft } from "@spotforge/game-core";
import { DEFAULT_PREFERENCES, type Preferences } from "../preferences/preferences";
import {
  createAutoSpotRunner,
  evaluateAutoFire,
  resolveAutoSpotInterval,
  type AutoSpotScheduler,
} from "./autoSpot";

// --- Helfer ------------------------------------------------------------------

/** Lässt anhängige Microtasks (capture/classify-Ketten) durchlaufen. */
async function flush(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** Manueller Planer: hält genau einen anhängigen Tick, der explizit ausgelöst wird. */
function manualScheduler(): {
  schedule: AutoSpotScheduler;
  run: () => void;
  pending: () => boolean;
} {
  let cb: (() => void) | undefined;
  return {
    schedule: (fn) => {
      cb = fn;
      return () => {
        cb = undefined;
      };
    },
    run: () => {
      const fn = cb;
      cb = undefined;
      fn?.();
    },
    pending: () => cb !== undefined,
  };
}

function draft(gateMass: number): SpotResult {
  return {
    kind: "draft",
    gateMass,
    card: buildDraft({
      id: "draft-1",
      categoryId: "vehicles",
      objectName: "Auto",
      spottedBy: "local",
      createdAt: "2026-06-15T08:00:00.000Z",
      photoUri: "file:///a.jpg",
    }),
  };
}

function appDef(intervalMs: number): AppDefinition {
  return {
    id: "cars",
    identity: {
      displayName: "CarForge",
      slug: "carforge",
      scheme: "carforge",
      ios: { bundleIdentifier: "com.spotforge.cars" },
      android: { package: "com.spotforge.cars" },
    },
    category: {
      primary: "vehicles",
      guardrails: {
        allowed: ["vehicles"],
        minConfidence: 0.35,
        rejectMessage: { de: "x", en: "x" },
      },
      gate: { allow: ["sports car"], auto: { intervalMs, autoFireMinConfidence: 0.6 } },
    },
    ai: { cardArtPrompt: "a {objectName}", factPrompt: "f {objectName}" },
    content: {},
  };
}

// --- evaluateAutoFire --------------------------------------------------------

describe("evaluateAutoFire", () => {
  it("feuert, wenn die Gate-Masse die strengere Auto-Schwelle erreicht", () => {
    expect(evaluateAutoFire(draft(0.7), 0.6)).toBe(true);
    expect(evaluateAutoFire(draft(0.6), 0.6)).toBe(true);
  });

  it("feuert NICHT unter der Auto-Schwelle (auch wenn die Pipeline akzeptierte)", () => {
    expect(evaluateAutoFire(draft(0.45), 0.6)).toBe(false);
  });

  it("feuert konservativ nicht, wenn keine Gate-Masse vorliegt", () => {
    const noMass: SpotResult = { kind: "unrecognized", label: "x" };
    expect(evaluateAutoFire(noMass, 0.6)).toBe(false);
  });
});

// --- resolveAutoSpotInterval -------------------------------------------------

describe("resolveAutoSpotInterval", () => {
  it("nutzt den Varianten-Default ohne User-Override", () => {
    expect(resolveAutoSpotInterval(appDef(2000), DEFAULT_PREFERENCES)).toBe(2000);
  });

  it("bevorzugt den User-Override und klemmt ihn auf den erlaubten Bereich", () => {
    const prefs: Preferences = { ...DEFAULT_PREFERENCES, autoSpotIntervalMs: 100 };
    expect(resolveAutoSpotInterval(appDef(2000), prefs)).toBe(1000); // auf Minimum geklemmt
  });
});

// --- createAutoSpotRunner ----------------------------------------------------

describe("createAutoSpotRunner", () => {
  it("feuert über der Schwelle in den Draft-Flow und stoppt den Loop", async () => {
    const onFire = vi.fn();
    const classify = vi.fn(async () => draft(0.8));
    const runner = createAutoSpotRunner({
      capture: async () => "file:///shot.jpg",
      classify,
      onFire,
      intervalMs: 2000,
      autoFireMinConfidence: 0.6,
      schedule: manualScheduler().schedule,
    });

    runner.start();
    await flush();

    expect(classify).toHaveBeenCalledTimes(1);
    expect(onFire).toHaveBeenCalledWith(
      "file:///shot.jpg",
      expect.objectContaining({ gateMass: 0.8 }),
    );
    expect(runner.state).toBe("stopped");
  });

  it("feuert nicht unter der Schwelle und plant den nächsten Tick", async () => {
    const onFire = vi.fn();
    const sched = manualScheduler();
    const classify = vi.fn(async () => draft(0.4));
    const runner = createAutoSpotRunner({
      capture: async () => "file:///shot.jpg",
      classify,
      onFire,
      intervalMs: 2000,
      autoFireMinConfidence: 0.6,
      schedule: sched.schedule,
    });

    runner.start();
    await flush();

    expect(onFire).not.toHaveBeenCalled();
    expect(sched.pending()).toBe(true);
    expect(runner.state).toBe("scheduled");

    // Nächster Tick: erneuter Schuss.
    sched.run();
    await flush();
    expect(classify).toHaveBeenCalledTimes(2);
  });

  it("überlappt nicht: der nächste Tick wird erst nach dem Ergebnis geplant", async () => {
    const sched = manualScheduler();
    const gate = deferred<SpotResult>();
    const classify = vi.fn(() => gate.promise);
    const runner = createAutoSpotRunner({
      capture: async () => "file:///shot.jpg",
      classify,
      onFire: vi.fn(),
      intervalMs: 2000,
      autoFireMinConfidence: 0.6,
      schedule: sched.schedule,
    });

    runner.start();
    await flush();

    // Lauf in Bearbeitung: kein zweiter Tick geplant, kein zweiter classify.
    expect(classify).toHaveBeenCalledTimes(1);
    expect(sched.pending()).toBe(false);
    expect(runner.state).toBe("running");

    gate.resolve(draft(0.4)); // unter Schwelle
    await flush();
    expect(sched.pending()).toBe(true); // erst jetzt nächster Tick
  });

  it("pausiert (kein neuer Tick) und nimmt mit resume wieder auf", async () => {
    const sched = manualScheduler();
    const classify = vi.fn(async () => draft(0.4));
    const runner = createAutoSpotRunner({
      capture: async () => "file:///shot.jpg",
      classify,
      onFire: vi.fn(),
      intervalMs: 2000,
      autoFireMinConfidence: 0.6,
      schedule: sched.schedule,
    });

    runner.start();
    await flush();
    expect(sched.pending()).toBe(true);

    runner.pause();
    expect(runner.state).toBe("paused");
    expect(sched.pending()).toBe(false); // geplanter Tick abgebrochen

    runner.resume();
    await flush();
    expect(classify).toHaveBeenCalledTimes(2); // zeitnah fortgesetzt
  });

  it("feuert nicht mehr, wenn der Loop während eines Laufs gestoppt wird", async () => {
    const onFire = vi.fn();
    const gate = deferred<SpotResult>();
    const runner = createAutoSpotRunner({
      capture: async () => "file:///shot.jpg",
      classify: () => gate.promise,
      onFire,
      intervalMs: 2000,
      autoFireMinConfidence: 0.6,
      schedule: manualScheduler().schedule,
    });

    runner.start();
    await flush();
    runner.stop();
    gate.resolve(draft(0.9)); // würde sonst feuern
    await flush();

    expect(onFire).not.toHaveBeenCalled();
    expect(runner.state).toBe("stopped");
  });
});
