/**
 * Runtime validators for persisted editor state.
 *
 * These provide a safe parse path so that corrupted or outdated
 * localStorage payloads fail gracefully instead of crashing the app.
 *
 * Extracted/new: loadProject() in editorExport.ts previously did
 * minimal validation inline. These validators formalize that logic.
 */

import type { CardModel, ExclusiveTile, PageData, ProjectData } from "./types";
import { PROJECT_VERSION } from "./schema";
import { makeEmptyPage } from "./defaults";
import { migrateProject } from "./migrations";

// ── Exclusive tile validation ───────────────────────────────────────────────

/** Check that a value looks like an ExclusiveTile. */
function isValidExclusiveTile(v: unknown): v is ExclusiveTile {
  if (typeof v !== "object" || v === null) return false;
  const t = v as Record<string, unknown>;
  if (typeof t.url !== "string" || typeof t.price !== "string" || typeof t.locked !== "boolean") return false;
  // contentCode is optional; if present, must be a string
  if (t.contentCode !== undefined && typeof t.contentCode !== "string") return false;
  return true;
}

/** Normalize an array of raw values into valid ExclusiveTile[]. */
function normalizeExclusiveTiles(raw: unknown): ExclusiveTile[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const valid = raw.filter(isValidExclusiveTile);
  return valid.length > 0 ? valid : undefined;
}

// ── Card validation ──────────────────────────────────────────────────────────

/** Check that a value looks like a CardModel with required numeric fields. */
export function isValidCard(v: unknown): v is CardModel {
  if (typeof v !== "object" || v === null) return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    c.id.length > 0 &&
    typeof c.x === "number" &&
    typeof c.y === "number" &&
    typeof c.w === "number" &&
    typeof c.h === "number" &&
    isFinite(c.x) &&
    isFinite(c.y) &&
    isFinite(c.w) &&
    isFinite(c.h)
  );
}

// ── Page validation ──────────────────────────────────────────────────────────

/** Check that a value has the shape of a PageData object. */
export function isValidPage(v: unknown): v is PageData {
  if (typeof v !== "object" || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.wallpaper === "string" &&
    Array.isArray(p.cards)
  );
}

/**
 * Normalize a page: ensure all required fields exist with safe defaults.
 * Does NOT reject the page — patches missing fields instead.
 */
export function normalizePage(raw: Record<string, unknown>): PageData {
  const base = makeEmptyPage();
  const cards = Array.isArray(raw.cards)
    ? (raw.cards as unknown[]).filter(isValidCard)
    : [];

  const page: PageData = {
    wallpaper: typeof raw.wallpaper === "string" && raw.wallpaper ? raw.wallpaper : base.wallpaper,
    cards,
    selectedCardId: typeof raw.selectedCardId === "string" ? raw.selectedCardId : cards[0]?.id ?? "",
    lockSize: typeof raw.lockSize === "boolean" ? raw.lockSize : false,
    lockPosition: typeof raw.lockPosition === "boolean" ? raw.lockPosition : false,
    lockPage: typeof raw.lockPage === "boolean" ? raw.lockPage : false,
    instructions:
      typeof raw.instructions === "string" && raw.instructions.trim()
        ? raw.instructions
        : base.instructions,
  };
  const tiles = normalizeExclusiveTiles(raw.exclusiveTiles);
  if (tiles) page.exclusiveTiles = tiles;
  return page;
}

// ── Project validation ───────────────────────────────────────────────────────

/**
 * Safely parse a JSON string into a ProjectData, applying migrations
 * and normalization. Returns null if the data is unrecoverable.
 *
 * This replaces the inline validation that was in editorExport.ts loadProject().
 */
export function parseProject(raw: string): ProjectData | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  // Attempt migration if version differs
  const migrated = migrateProject(parsed);
  if (!migrated) return null;

  if (migrated.version !== PROJECT_VERSION) return null;
  if (typeof migrated.slug !== "string") return null;

  const rawPages = migrated.pages;
  if (typeof rawPages !== "object" || rawPages === null) return null;

  const pages: Record<string, PageData> = {};
  for (const [key, value] of Object.entries(rawPages as Record<string, unknown>)) {
    if (typeof value === "object" && value !== null) {
      pages[key] = normalizePage(value as Record<string, unknown>);
    }
  }

  return {
    version: 1,
    slug: migrated.slug as string,
    pages,
  };
}
