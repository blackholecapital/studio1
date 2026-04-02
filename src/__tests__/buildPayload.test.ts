import { describe, it, expect } from "vitest";
import { buildDesktopDeployBundle } from "../services/deploy/buildPayload";
import { makeEmptyProject } from "../domain/project/defaults";
import { wallpaperCatalog } from "../core/wallpaperCatalog";
import type { ExclusiveTile } from "../domain/project/types";

describe("buildDesktopDeployBundle", () => {
  const slug = "testslug";
  const project = makeEmptyProject(slug);

  const ctx = {
    slug,
    scaleParams: { actualWsW: 900, actualWsH: 720 },
    wsHeight: 720,
    wallpaperCatalog,
    exclusiveTiles: [
      { url: "", price: "", locked: false },
      { url: "", price: "", locked: false },
      { url: "", price: "", locked: false },
      { url: "", price: "$1.00", locked: true },
      { url: "", price: "$1.00", locked: true },
      { url: "", price: "$1.00", locked: true },
    ] as ExclusiveTile[],
  };

  it("produces main and holiday payloads", () => {
    const bundle = buildDesktopDeployBundle(slug, project.pages, ctx);
    expect(bundle.main).toBeDefined();
    expect(bundle.holiday).toBeDefined();
    expect(bundle.main.version).toBe(1);
    expect(bundle.main.slug).toBe(slug);
  });

  it("maps page keys to route names", () => {
    const bundle = buildDesktopDeployBundle(slug, project.pages, ctx);
    const pages = bundle.main.pages as Record<string, unknown>;
    expect(pages).toHaveProperty("gate");
    expect(pages).toHaveProperty("members");
    expect(pages).toHaveProperty("access");
    expect(pages).toHaveProperty("tier-2");
  });

  it("always emits 6 exclusive tiles for tier-2", () => {
    const bundle = buildDesktopDeployBundle(slug, project.pages, ctx);
    const tier2 = (bundle.main.pages as Record<string, any>)["tier-2"];
    expect(tier2.exclusiveTiles).toHaveLength(6);
  });

  it("includes locked tiles with price", () => {
    const tilesWithContent: ExclusiveTile[] = [
      { url: "", contentCode: "c3", price: "", locked: false },
      { url: "", contentCode: "c6", price: "", locked: false },
      { url: "", price: "", locked: false },
      { url: "", contentCode: "c2", price: "$10", locked: true },
      { url: "", price: "$5", locked: true },
      { url: "", price: "", locked: false },
    ];

    const bundle = buildDesktopDeployBundle(slug, project.pages, {
      ...ctx,
      exclusiveTiles: tilesWithContent,
    });

    const tier2 = (bundle.main.pages as Record<string, any>)["tier-2"];
    expect(tier2.exclusiveTiles).toHaveLength(6);

    // Tile 4 (index 3) should be locked with contentCode
    const tile4 = tier2.exclusiveTiles[3];
    expect(tile4.lockStatus).toBe("locked");
    expect(tile4.purchasePrice).toBe("$10");
    expect(tile4.contentCode).toBe("c2");
  });
});
