/**
 * Deploy payload assembly — desktop and mobile variants.
 *
 * Extracted from:
 *   - src/ui/App.tsx: handleDeployGateway → buildPagePayload, scaleForDeploy
 *   - src/ui/MobileApp.tsx: handleDeploy → buildPagePayload, scaleForDeploy
 *
 * These are pure functions that take editor state and produce the JSON payloads
 * sent to the deploy endpoint. No side effects, no DOM access.
 */

import type { CardModel, PageData, ExclusiveTile } from "../../domain/project/types";
import type { PageKey } from "../../domain/project/types";
import type { WallpaperItem } from "../../core/wallpaperCatalog";
import { PAGE_ROUTES, HOLIDAY_WALLPAPER_CODES } from "../../domain/project/defaults";
import {
  DEPLOY_W, DEPLOY_H, DEPLOY_X_OFFSET, DEPLOY_Y_OFFSET,
  MOBILE_DEPLOY_W, MOBILE_DEPLOY_H,
  DEMO_CONTENT_BASE,
} from "../../domain/editor/constants";

// ── Coordinate scaling ───────────────────────────────────────────────────────

export type ScaleParams = {
  actualWsW: number;
  actualWsH: number;
};

/** Scale studio coords → desktop deploy coords. */
export function scaleDesktop(
  card: { x: number; y: number; w: number; h: number },
  params: ScaleParams,
  wsHeight: number,
): { x: number; y: number; w: number; h: number } {
  const dsx = DEPLOY_W / params.actualWsW;
  const dsy = DEPLOY_H / wsHeight;
  return {
    x: Math.round(card.x * dsx) + DEPLOY_X_OFFSET,
    y: Math.round(card.y * dsy) + DEPLOY_Y_OFFSET,
    w: Math.round(card.w * dsx),
    h: Math.round(card.h * dsy),
  };
}

/** Scale studio coords → mobile deploy coords. */
export function scaleMobile(
  card: { x: number; y: number; w: number; h: number },
  params: ScaleParams,
): { x: number; y: number; w: number; h: number } {
  const dsx = MOBILE_DEPLOY_W / params.actualWsW;
  const dsy = MOBILE_DEPLOY_H / params.actualWsH;
  return {
    x: Math.round(card.x * dsx),
    y: Math.round(card.y * dsy),
    w: Math.round(card.w * dsx),
    h: Math.round(card.h * dsy),
  };
}

// ── Shared exclusive-tile serializer ─────────────────────────────────────────

function serializeExclusiveTiles(tiles: ExclusiveTile[]) {
  return tiles.map((tile, i) => {
    const isEmpty = !tile.url && !tile.contentCode && !tile.price && !tile.locked;
    const out: Record<string, unknown> = {
      tileNumber: i + 1,
      contentCode: isEmpty ? null : (tile.contentCode || `EC-${String(i + 1).padStart(3, "0")}`),
      tileName: `Exclusive Content-${i + 1}`,
      lockStatus: tile.locked ? "locked" : "unlocked",
      purchasePrice: tile.price || null,
    };
    // Only include contentUrl for non-catalog items (user uploads, external URLs).
    // Catalog items (c2, c4444, etc.) are resolved by contentCode on the gateway side.
    if (!tile.contentCode && tile.url) {
      out.contentUrl = tile.url;
    }
    return out;
  });
}

// ── Desktop payload builder ──────────────────────────────────────────────────

export type DesktopBuildContext = {
  slug: string;
  scaleParams: ScaleParams;
  wsHeight: number;
  wallpaperCatalog: WallpaperItem[];
  exclusiveTiles: ExclusiveTile[];
};

/**
 * Build a single desktop page payload for deploy.
 * Exact port of App.tsx buildPagePayload.
 */
export function buildDesktopPagePayload(
  pageKey: string,
  pageData: PageData,
  ctx: DesktopBuildContext,
  overrideWallpaperCode?: string,
): Record<string, unknown> {
  const wpItem = ctx.wallpaperCatalog.find((w) => w.url === pageData.wallpaper);
  const wallpaperCode = overrideWallpaperCode ?? wpItem?.code ?? "";

  // p4 (Exclusive): only emit wallpaperCode unless user has placed non-default content
  if (pageKey === "p4") {
    const hasUserContent = pageData.cards.some(
      (c) => (c.contentCode && c.contentCode !== "c77" && c.contentCode !== "c813") || c.skinId || c.isExclusive,
    );
    const activeTiles = serializeExclusiveTiles(ctx.exclusiveTiles);
    const payload: Record<string, unknown> = {
      wallpaperCode,
      viewport: { width: DEPLOY_W, height: DEPLOY_H },
    };
    if (hasUserContent) {
      payload.cards = pageData.cards
        .filter((c) => (c.contentCode && c.contentCode !== "c77" && c.contentCode !== "c813") || c.skinId || c.isExclusive)
        .map((card) => ({
          id: card.id,
          ...scaleDesktop(card, ctx.scaleParams, ctx.wsHeight),
          contentCode: card.contentCode ?? null,
          skinId: card.skinId ? card.skinId.toLowerCase() : null,
          isExclusive: card.isExclusive ?? false,
          exclusivePrice: card.exclusivePrice ?? null,
        }));
    }
    if (activeTiles.length > 0) payload.exclusiveTiles = activeTiles;
    return payload;
  }

  // p1–p3: include all cards
  const cards = pageData.cards.map((card) => {
    const cc = card.contentCode ?? null;
    const isUserUpload = cc && /^x\d+$/i.test(cc);
    const base: Record<string, unknown> = {
      id: card.id,
      ...scaleDesktop(card, ctx.scaleParams, ctx.wsHeight),
      contentCode: cc,
      skinId: card.skinId ? card.skinId.toLowerCase() : null,
      isExclusive: card.isExclusive ?? false,
      exclusivePrice: card.exclusivePrice ?? null,
    };
    if (isUserUpload) {
      base.contentUrl = card.contentUrl || card.contentImage || `${DEMO_CONTENT_BASE}/tenant-content/${ctx.slug}/${cc}.png`;
    }
    return base;
  });
  return {
    wallpaperCode,
    cards,
    viewport: { width: DEPLOY_W, height: DEPLOY_H },
  };
}

/**
 * Build the full desktop deploy bundle (main + holiday payloads).
 */
export function buildDesktopDeployBundle(
  slug: string,
  pages: Record<string, PageData>,
  ctx: DesktopBuildContext,
): { main: Record<string, unknown>; holiday: Record<string, unknown> } {
  const mainPages = Object.fromEntries(
    Object.entries(pages).map(([pk, pd]) => [
      PAGE_ROUTES[pk as PageKey] ?? pk,
      buildDesktopPagePayload(pk, pd, ctx),
    ]),
  );

  const holidayPages = Object.fromEntries(
    Object.entries(pages).map(([pk, pd]) => [
      PAGE_ROUTES[pk as PageKey] ?? pk,
      buildDesktopPagePayload(pk, pd, ctx, HOLIDAY_WALLPAPER_CODES[pk as PageKey]),
    ]),
  );

  return {
    main: { version: 1, slug, pages: mainPages },
    holiday: { version: 1, slug, pages: holidayPages },
  };
}

// ── Mobile payload builder ───────────────────────────────────────────────────

export type MobileBuildContext = {
  slug: string;
  scaleParams: ScaleParams;
  wallpaperCatalog: WallpaperItem[];
  mobileWallpaperCatalog: Array<{ code: string; url: string }>;
  exclusiveTiles: ExclusiveTile[];
};

/**
 * Build a single mobile page payload for deploy.
 * Exact port of MobileApp.tsx buildPagePayload.
 */
export function buildMobilePagePayload(
  pageKey: string,
  pd: PageData,
  ctx: MobileBuildContext,
  overrideWallpaperCode?: string,
): Record<string, unknown> {
  const wpItem =
    ctx.mobileWallpaperCatalog.find((w) => w.url === pd.wallpaper) ??
    ctx.wallpaperCatalog.find((w) => w.url === pd.wallpaper);
  const wallpaper = overrideWallpaperCode ?? wpItem?.code ?? "";

  // p4 (Exclusive): emit wallpaper + exclusive tiles, no block canvas
  if (pageKey === "p4") {
    const activeTiles = serializeExclusiveTiles(ctx.exclusiveTiles);
    const payload: Record<string, unknown> = {
      mobile: true,
      viewport: { width: MOBILE_DEPLOY_W, height: MOBILE_DEPLOY_H },
      wallpaper,
    };
    if (activeTiles.length > 0) payload.exclusiveTiles = activeTiles;
    return payload;
  }

  // Build blocks array in the gateway-native format
  const blocks = pd.cards.map((card) => {
    const { x, y, w, h } = scaleMobile(card, ctx.scaleParams);
    const code = card.contentCode ?? null;
    const isGif = code && /^g\d+$/i.test(code);
    const block: Record<string, unknown> = {
      id: card.id,
      x, y, w, h,
      kind: card.contentDisplay === "video" ? "video" : "image",
      title: card.label ?? "",
      lines: [],
    };
    const isUserUpload = code && /^x\d+$/i.test(code);
    if (isGif) {
      block.gif = code;
    } else if (isUserUpload) {
      block.image = code;
      block.contentUrl = card.contentUrl || card.contentImage || `${DEMO_CONTENT_BASE}/tenant-content/${ctx.slug}/${code}.png`;
    } else if (code) {
      block.image = code;
    }
    if (card.contentDisplay === "video" && card.contentUrl) {
      block.contentUrl = card.contentUrl;
    } else if (!code && (card.contentImage || card.contentUrl)) {
      block.contentUrl = card.contentImage || card.contentUrl;
    }
    if (card.skinId) block.skin = card.skinId.toLowerCase();
    if (card.isExclusive) {
      block.isExclusive = true;
      block.exclusivePrice = card.exclusivePrice ?? null;
    }
    return block;
  });

  return {
    mobile: true,
    viewport: { width: MOBILE_DEPLOY_W, height: MOBILE_DEPLOY_H },
    wallpaper,
    blocks,
  };
}

/**
 * Build the full mobile deploy bundle (main + holiday payloads).
 */
export function buildMobileDeployBundle(
  slug: string,
  pages: Record<string, PageData>,
  ctx: MobileBuildContext,
): { main: Record<string, unknown>; holiday: Record<string, unknown> } {
  const mainPages = Object.fromEntries(
    Object.entries(pages).map(([pk, pd]) => [
      PAGE_ROUTES[pk as PageKey] ?? pk,
      buildMobilePagePayload(pk, pd, ctx),
    ]),
  );

  const holidayPages = Object.fromEntries(
    Object.entries(pages).map(([pk, pd]) => [
      PAGE_ROUTES[pk as PageKey] ?? pk,
      buildMobilePagePayload(pk, pd, ctx, HOLIDAY_WALLPAPER_CODES[pk as PageKey]),
    ]),
  );

  return {
    main: { version: 1, slug, mobile: true, pages: mainPages },
    holiday: { version: 1, slug, mobile: true, pages: holidayPages },
  };
}
