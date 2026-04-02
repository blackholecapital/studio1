/**
 * Runtime hydration for exclusive tiles on the deployed gateway.
 *
 * The studio serializes exclusive tiles into `pages["tier-2"].exclusiveTiles`
 * using this deployed JSON shape:
 *
 *   { tileNumber, contentCode, tileName, lockStatus, purchasePrice, contentUrl? }
 *
 * The gateway runtime needs to:
 *   1. Normalize the raw JSON array into a predictable shape
 *   2. Resolve contentCode → full image URL via the standard asset resolver
 *   3. Map each entry onto a fixed 6-slot tile grid
 *
 * This module provides both steps so the gateway page component stays dumb.
 *
 * Old field names (if any legacy payloads exist) are also supported:
 *   locked   → lockStatus
 *   price    → purchasePrice
 *   url      → contentUrl
 *   name     → tileName
 */

import { resolveContentCode, MEDIA_BASE } from "../../core/assetResolver";

// ── Constants ───────────────────────────────────────────────────────────────

export const EXCLUSIVE_TILE_COUNT = 6;

// ── Types ───────────────────────────────────────────────────────────────────

/** Shape of a single exclusive tile in the deployed JSON payload. */
export type DeployedExclusiveTile = {
  tileNumber: number;
  contentCode: string;
  tileName: string;
  lockStatus: "locked" | "unlocked";
  purchasePrice: string | null;
  contentUrl?: string;
};

/** Runtime-ready tile with a resolved image URL. */
export type HydratedExclusiveTile = {
  tileNumber: number;
  contentCode: string;
  tileName: string;
  locked: boolean;
  purchasePrice: string | null;
  imageUrl: string;
};

// ── Normalization ───────────────────────────────────────────────────────────

/**
 * Normalize a single raw tile object from deployed JSON into a
 * well-typed DeployedExclusiveTile, supporting both current and
 * legacy field names.
 *
 * Returns null if the object is not a usable tile.
 */
function normalizeOneTile(raw: unknown): DeployedExclusiveTile | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  // tileNumber: required integer 1–6
  const tileNumber = typeof r.tileNumber === "number" ? r.tileNumber : NaN;
  if (!Number.isInteger(tileNumber) || tileNumber < 1 || tileNumber > EXCLUSIVE_TILE_COUNT) {
    return null;
  }

  // contentCode: required string (e.g. "c3", "EC-001")
  const contentCode =
    typeof r.contentCode === "string" && r.contentCode
      ? r.contentCode
      : null;
  if (!contentCode) return null;

  // tileName: string, with fallback
  const tileName =
    (typeof r.tileName === "string" && r.tileName) ||
    (typeof r.name === "string" && r.name) ||
    `Exclusive Content-${tileNumber}`;

  // lockStatus: support both "locked"/"unlocked" string and boolean `locked`
  let lockStatus: "locked" | "unlocked" = "unlocked";
  if (r.lockStatus === "locked" || r.lockStatus === "unlocked") {
    lockStatus = r.lockStatus;
  } else if (typeof r.locked === "boolean") {
    lockStatus = r.locked ? "locked" : "unlocked";
  }

  // purchasePrice: support both field names
  const purchasePrice =
    (typeof r.purchasePrice === "string" && r.purchasePrice) ||
    (typeof r.price === "string" && r.price) ||
    null;

  // contentUrl: optional override
  const contentUrl =
    (typeof r.contentUrl === "string" && r.contentUrl) ||
    (typeof r.url === "string" && r.url) ||
    undefined;

  return {
    tileNumber,
    contentCode,
    tileName,
    lockStatus,
    purchasePrice,
    ...(contentUrl ? { contentUrl } : {}),
  };
}

/**
 * Normalize a raw `exclusiveTiles` array from deployed JSON into
 * a clean array of DeployedExclusiveTile objects.
 *
 * - Filters out invalid entries
 * - De-duplicates by tileNumber (first occurrence wins)
 * - Sorts by tileNumber ascending
 */
export function normalizeDeployedExclusiveTiles(
  raw: unknown,
): DeployedExclusiveTile[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<number>();
  const result: DeployedExclusiveTile[] = [];

  for (const item of raw) {
    const tile = normalizeOneTile(item);
    if (!tile || seen.has(tile.tileNumber)) continue;
    seen.add(tile.tileNumber);
    result.push(tile);
  }

  return result.sort((a, b) => a.tileNumber - b.tileNumber);
}

// ── Content resolution ──────────────────────────────────────────────────────

/**
 * Resolve a contentCode to a full image URL.
 *
 * Resolution order:
 *   1. If an explicit contentUrl is provided, use it directly
 *   2. Standard catalog codes (c{N}, g{N}) → media.xyz-labs.xyz
 *   3. Synthetic codes (EC-NNN) → placeholder
 *   4. Fallback → empty string (caller should show placeholder)
 */
function resolveExclusiveTileImage(
  contentCode: string,
  contentUrl?: string,
): string {
  // Explicit URL takes priority (user uploads, external media)
  if (contentUrl) return contentUrl;

  // Standard catalog content codes
  const resolved = resolveContentCode(contentCode);
  if (resolved) return resolved;

  // Synthetic placeholder codes (EC-001 etc.) have no image
  return "";
}

// ── Hydration ───────────────────────────────────────────────────────────────

/**
 * Default placeholder tile for slots that have no data.
 */
function makeDefaultTile(slot: number): HydratedExclusiveTile {
  return {
    tileNumber: slot,
    contentCode: "",
    tileName: `Exclusive Content-${slot}`,
    locked: false,
    purchasePrice: null,
    imageUrl: "",
  };
}

/**
 * Full hydration: take raw page data from deployed JSON and produce
 * an array of exactly EXCLUSIVE_TILE_COUNT HydratedExclusiveTile objects,
 * ready for direct rendering.
 *
 * @param pageData  The parsed page object for the "tier-2" page.
 *                  Expected to contain an `exclusiveTiles` array.
 *
 * @returns Array of 6 HydratedExclusiveTile objects. Missing/invalid
 *          slots are filled with default placeholders.
 */
export function hydrateExclusiveTilesFromPageData(
  pageData: Record<string, unknown> | null | undefined,
): HydratedExclusiveTile[] {
  // Build 6-slot array with defaults
  const slots: HydratedExclusiveTile[] = Array.from(
    { length: EXCLUSIVE_TILE_COUNT },
    (_, i) => makeDefaultTile(i + 1),
  );

  if (!pageData) return slots;

  const normalized = normalizeDeployedExclusiveTiles(pageData.exclusiveTiles);

  for (const tile of normalized) {
    const idx = tile.tileNumber - 1;
    if (idx < 0 || idx >= EXCLUSIVE_TILE_COUNT) continue;

    slots[idx] = {
      tileNumber: tile.tileNumber,
      contentCode: tile.contentCode,
      tileName: tile.tileName,
      locked: tile.lockStatus === "locked",
      purchasePrice: tile.purchasePrice,
      imageUrl: resolveExclusiveTileImage(tile.contentCode, tile.contentUrl),
    };
  }

  return slots;
}
