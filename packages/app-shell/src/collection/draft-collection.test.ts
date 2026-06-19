import { describe, expect, it } from "vitest";
import type { Card } from "@spotforge/game-core";
import { buildDraft } from "@spotforge/game-core";
import {
  draftScopeSegment,
  parseDrafts,
  removeDraftById,
  serializeDrafts,
  sortByNewest,
  upsertDraft,
} from "./draft-collection";

function draft(id: string, createdAt: string, objectName = "sports car"): Card {
  return buildDraft({
    id,
    categoryId: "vehicles",
    objectName,
    spottedBy: "tester",
    createdAt,
    photoUri: `file:///${id}.jpg`,
  });
}

describe("upsertDraft", () => {
  it("hängt einen neuen Draft an, ohne die Eingabe zu mutieren", () => {
    const a = draft("a", "2026-06-01T00:00:00.000Z");
    const b = draft("b", "2026-06-02T00:00:00.000Z");
    const list = [a];
    const next = upsertDraft(list, b);
    expect(next).toHaveLength(2);
    expect(list).toHaveLength(1); // unverändert
  });

  it("ersetzt einen vorhandenen Draft mit gleicher id (idempotent)", () => {
    const a = draft("a", "2026-06-01T00:00:00.000Z", "VW Golf");
    const aCorrectedName = { ...a, objectName: "VW Golf VII" };
    const next = upsertDraft([a], aCorrectedName);
    expect(next).toHaveLength(1);
    expect(next[0]?.objectName).toBe("VW Golf VII");
  });
});

describe("removeDraftById", () => {
  it("entfernt den passenden Draft", () => {
    const next = removeDraftById([draft("a", "t"), draft("b", "t")], "a");
    expect(next.map((d) => d.id)).toEqual(["b"]);
  });

  it("ist ein No-op für unbekannte ids", () => {
    const list = [draft("a", "t")];
    expect(removeDraftById(list, "x")).toHaveLength(1);
  });
});

describe("sortByNewest", () => {
  it("sortiert nach createdAt absteigend, stabiler Tiebreak über die id", () => {
    const older = draft("b", "2026-06-01T00:00:00.000Z");
    const newer = draft("a", "2026-06-03T00:00:00.000Z");
    const sameTimeC = draft("c", "2026-06-02T00:00:00.000Z");
    const sameTimeD = draft("d", "2026-06-02T00:00:00.000Z");
    const sorted = sortByNewest([older, newer, sameTimeD, sameTimeC]);
    expect(sorted.map((d) => d.id)).toEqual(["a", "c", "d", "b"]);
  });
});

describe("serializeDrafts / parseDrafts", () => {
  it("ist ein Roundtrip", () => {
    const list = [draft("a", "2026-06-01T00:00:00.000Z")];
    expect(parseDrafts(serializeDrafts(list))).toEqual(list);
  });

  it("liefert eine leere Liste für leeren/null-Inhalt", () => {
    expect(parseDrafts(null)).toEqual([]);
    expect(parseDrafts("")).toEqual([]);
  });

  it("ist tolerant gegenüber korruptem JSON", () => {
    expect(parseDrafts("{ not json")).toEqual([]);
    expect(parseDrafts('"a string"')).toEqual([]);
    expect(parseDrafts("42")).toEqual([]);
  });

  it("verwirft Einträge, die nicht wie eine Karte aussehen", () => {
    const valid = draft("a", "2026-06-01T00:00:00.000Z");
    const raw = JSON.stringify([valid, { id: "x" }, null, 7, { foo: "bar" }]);
    expect(parseDrafts(raw)).toEqual([valid]);
  });
});

describe("draftScopeSegment", () => {
  it("hält gültige appIds unverändert", () => {
    expect(draftScopeSegment("cars")).toBe("cars");
    expect(draftScopeSegment("com.spotforge.cars")).toBe("com.spotforge.cars");
  });

  it("liefert für verschiedene appIds verschiedene Segmente (Mandantentrennung)", () => {
    expect(draftScopeSegment("cars")).not.toBe(draftScopeSegment("animals"));
  });

  it("entschärft Pfad-Separatoren/Traversal", () => {
    expect(draftScopeSegment("../../etc")).toBe(".._.._etc");
    expect(draftScopeSegment("a/b")).toBe("a_b");
  });

  it("wirft bei leerer appId", () => {
    expect(() => draftScopeSegment("")).toThrow();
    expect(() => draftScopeSegment("   ")).toThrow();
  });
});
