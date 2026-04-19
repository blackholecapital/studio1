import { describe, it, expect } from "vitest";
import { buildDesktopDeployBundle } from "../services/deploy/buildPayload";
import { makeEmptyProject } from "../domain/project/defaults";
import { wallpaperCatalog } from "../core/wallpaperCatalog";
import { SHELL_ID, STAGE_W, STAGE_H, WORKSPACE_X, WORKSPACE_Y } from "../domain/editor/constants";
import type { ExclusiveTile } from "../domain/project/types";

describe("buildDesktopDeployBundle", () => {
  const slug = "testslug";
  const project = makeEmptyProject(slug);

  const ctx = {
    slug,
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

  it("includes shellId and stage in bundle", () => {
    const bundle = buildDesktopDeployBundle(slug, project.pages, ctx);
    expect(bundle.main.shellId).toBe(SHELL_ID);
    expect((bundle.main.stage as { w: number; h: number }).w).toBe(STAGE_W);
    expect((bundle.main.stage as { w: number; h: number }).h).toBe(STAGE_H);
  });

  it("maps page keys to route names", () => {
    const bundle = buildDesktopDeployBundle(slug, project.pages, ctx);
    const pages = bundle.main.pages as Record<string, unknown>;
    expect(pages).toHaveProperty("home");
    expect(pages).toHaveProperty("members");
    expect(pages).toHaveProperty("services");
    expect(pages).toHaveProperty("exclusive");
  });

  it("always emits 6 exclusive tiles for exclusive", () => {
    const bundle = buildDesktopDeployBundle(slug, project.pages, ctx);
    const tier2 = (bundle.main.pages as Record<string, any>)["exclusive"];
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

    const tier2 = (bundle.main.pages as Record<string, any>)["exclusive"];
    expect(tier2.exclusiveTiles).toHaveLength(6);

    // Tile 4 (index 3) should be locked with contentCode
    const tile4 = tier2.exclusiveTiles[3];
    expect(tile4.lockStatus).toBe("locked");
    expect(tile4.purchasePrice).toBe("$10");
    expect(tile4.contentCode).toBe("c2");
  });

  it("emits card coordinates in stage-space (workspace offset applied)", () => {
    const projectWithCard = makeEmptyProject(slug);
    projectWithCard.pages.p1.cards = [{
      id: "card-1",
      x: 120,
      y: 90,
      w: 460,
      h: 480,
      zIndex: 1,
    }];

    const bundle = buildDesktopDeployBundle(slug, projectWithCard.pages, ctx);
    const gate = (bundle.main.pages as Record<string, any>)["home"];
    const card = gate.cards[0];

    // Stage-space = workspace-relative + (WORKSPACE_X, WORKSPACE_Y)
    expect(card.x).toBe(120 + WORKSPACE_X);
    expect(card.y).toBe(90 + WORKSPACE_Y);
    expect(card.w).toBe(460);
    expect(card.h).toBe(480);
  });
});
