import { describe, it, expect } from "vitest";
import { parseProject, normalizePage, isValidCard } from "../domain/project/validators";
import { makeEmptyProject } from "../domain/project/defaults";

describe("parseProject", () => {
  it("parses a valid v1 project", () => {
    const proj = makeEmptyProject("test123");
    const raw = JSON.stringify(proj);
    const result = parseProject(raw);
    expect(result).not.toBeNull();
    expect(result!.version).toBe(1);
    expect(result!.slug).toBe("test123");
    expect(Object.keys(result!.pages)).toContain("p1");
  });

  it("returns null for invalid JSON", () => {
    expect(parseProject("not json")).toBeNull();
  });

  it("returns null for missing version", () => {
    expect(parseProject(JSON.stringify({ slug: "x", pages: {} }))).toBeNull();
  });

  it("returns null for missing slug", () => {
    expect(parseProject(JSON.stringify({ version: 1, pages: {} }))).toBeNull();
  });

  it("returns null for wrong version", () => {
    expect(parseProject(JSON.stringify({ version: 99, slug: "x", pages: {} }))).toBeNull();
  });
});

describe("normalizePage", () => {
  it("fills missing fields with defaults", () => {
    const page = normalizePage({});
    expect(page.wallpaper).toBeTruthy();
    expect(Array.isArray(page.cards)).toBe(true);
    expect(typeof page.lockPage).toBe("boolean");
    expect(typeof page.instructions).toBe("string");
  });

  it("preserves valid cards", () => {
    const page = normalizePage({
      wallpaper: "w1",
      cards: [{ id: "c1", x: 0, y: 0, w: 100, h: 100 }],
    });
    expect(page.cards).toHaveLength(1);
    expect(page.cards[0].id).toBe("c1");
  });

  it("filters out invalid cards", () => {
    const page = normalizePage({
      cards: [{ id: "c1", x: 0, y: 0, w: 100, h: 100 }, { bad: true }, null],
    });
    expect(page.cards).toHaveLength(1);
  });

  it("preserves valid exclusiveTiles", () => {
    const page = normalizePage({
      exclusiveTiles: [{ url: "http://img.png", price: "$5", locked: true }],
    });
    expect(page.exclusiveTiles).toHaveLength(1);
    expect(page.exclusiveTiles![0].locked).toBe(true);
  });
});

describe("isValidCard", () => {
  it("accepts a valid card", () => {
    expect(isValidCard({ id: "c1", x: 10, y: 20, w: 100, h: 200 })).toBe(true);
  });

  it("rejects missing id", () => {
    expect(isValidCard({ x: 0, y: 0, w: 100, h: 100 })).toBe(false);
  });

  it("rejects non-finite coordinates", () => {
    expect(isValidCard({ id: "c1", x: NaN, y: 0, w: 100, h: 100 })).toBe(false);
    expect(isValidCard({ id: "c1", x: 0, y: Infinity, w: 100, h: 100 })).toBe(false);
  });

  it("rejects null", () => {
    expect(isValidCard(null)).toBe(false);
  });
});
