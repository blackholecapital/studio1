import { describe, it, expect } from "vitest";
import {
  normalizeDeployedExclusiveTiles,
  hydrateExclusiveTilesFromPageData,
  EXCLUSIVE_TILE_COUNT,
} from "../services/runtime/exclusiveTileHydration";

describe("normalizeDeployedExclusiveTiles", () => {
  it("returns empty array for non-array input", () => {
    expect(normalizeDeployedExclusiveTiles(null)).toEqual([]);
    expect(normalizeDeployedExclusiveTiles(undefined)).toEqual([]);
    expect(normalizeDeployedExclusiveTiles("bad")).toEqual([]);
  });

  it("normalizes valid tiles", () => {
    const raw = [
      { tileNumber: 1, contentCode: "c3", tileName: "Test", lockStatus: "unlocked", purchasePrice: null },
      { tileNumber: 2, contentCode: "c6", tileName: "Test2", lockStatus: "locked", purchasePrice: "$5" },
    ];
    const result = normalizeDeployedExclusiveTiles(raw);
    expect(result).toHaveLength(2);
    expect(result[0].tileNumber).toBe(1);
    expect(result[1].lockStatus).toBe("locked");
  });

  it("accepts tiles with null contentCode (empty slots)", () => {
    const raw = [
      { tileNumber: 1, contentCode: null, tileName: "Empty", lockStatus: "unlocked", purchasePrice: null },
    ];
    const result = normalizeDeployedExclusiveTiles(raw);
    expect(result).toHaveLength(1);
    expect(result[0].contentCode).toBeNull();
  });

  it("rejects tiles with out-of-range tileNumber", () => {
    const raw = [
      { tileNumber: 0, contentCode: "c1", tileName: "Bad", lockStatus: "unlocked", purchasePrice: null },
      { tileNumber: 7, contentCode: "c1", tileName: "Bad", lockStatus: "unlocked", purchasePrice: null },
    ];
    expect(normalizeDeployedExclusiveTiles(raw)).toEqual([]);
  });

  it("de-duplicates by tileNumber", () => {
    const raw = [
      { tileNumber: 1, contentCode: "c1", tileName: "A", lockStatus: "unlocked", purchasePrice: null },
      { tileNumber: 1, contentCode: "c2", tileName: "B", lockStatus: "locked", purchasePrice: "$1" },
    ];
    const result = normalizeDeployedExclusiveTiles(raw);
    expect(result).toHaveLength(1);
    expect(result[0].contentCode).toBe("c1"); // first wins
  });

  it("supports legacy field names", () => {
    const raw = [
      { tileNumber: 1, contentCode: "c1", name: "Legacy", locked: true, price: "$9" },
    ];
    const result = normalizeDeployedExclusiveTiles(raw);
    expect(result).toHaveLength(1);
    expect(result[0].lockStatus).toBe("locked");
    expect(result[0].purchasePrice).toBe("$9");
    expect(result[0].tileName).toBe("Legacy");
  });
});

describe("hydrateExclusiveTilesFromPageData", () => {
  it("returns 6 default tiles for null page data", () => {
    const result = hydrateExclusiveTilesFromPageData(null);
    expect(result).toHaveLength(EXCLUSIVE_TILE_COUNT);
    expect(result[0].locked).toBe(false);
    expect(result[0].imageUrl).toBe("");
  });

  it("returns 6 default tiles for missing exclusiveTiles", () => {
    const result = hydrateExclusiveTilesFromPageData({});
    expect(result).toHaveLength(EXCLUSIVE_TILE_COUNT);
  });

  it("hydrates tiles with resolved image URLs", () => {
    const pageData = {
      exclusiveTiles: [
        { tileNumber: 1, contentCode: "c3", tileName: "T1", lockStatus: "unlocked", purchasePrice: null },
        { tileNumber: 4, contentCode: "c2222", tileName: "T4", lockStatus: "locked", purchasePrice: "$188" },
      ],
    };
    const result = hydrateExclusiveTilesFromPageData(pageData);
    expect(result).toHaveLength(6);
    expect(result[0].imageUrl).toBe("https://media.xyz-labs.xyz/content/c3.png");
    expect(result[0].locked).toBe(false);
    expect(result[3].imageUrl).toBe("https://media.xyz-labs.xyz/content/c2222.png");
    expect(result[3].locked).toBe(true);
    expect(result[3].purchasePrice).toBe("$188");
    // Unfilled slots should be defaults
    expect(result[1].imageUrl).toBe("");
    expect(result[1].contentCode).toBeNull();
  });
});
