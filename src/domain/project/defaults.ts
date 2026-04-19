/**
 * Shared default values and factory functions for projects.
 *
 * Extracted from:
 *   - src/ui/state/editorExport.ts (makeEmptyPage, makeEmptyProject)
 *   - src/ui/App.tsx (PAGE_KEYS, PAGE_ROUTES, PAGE_SHORT_TITLES, DEFAULT_INSTRUCTIONS, DEFAULT_EXCLUSIVE_TILES)
 *   - src/ui/MobileApp.tsx (PAGE_KEYS, PAGE_ROUTES, PAGE_TITLES)
 */

import type { PageKey, PageData, ProjectData, ExclusiveTile } from "./types";
import { DEFAULT_WALLPAPER_URL } from "../../core/wallpaperCatalog";

// ── Page constants ───────────────────────────────────────────────────────────

export const PAGE_KEYS: PageKey[] = ["p1", "p2", "p3", "p4"];

/** Backend route names used in deploy payloads. Shared by desktop and mobile. */
export const PAGE_ROUTES: Record<PageKey, string> = {
  p1: "home",
  p2: "members",
  p3: "services",
  p4: "exclusive",
};

/** Short display titles for page keys. */
export const PAGE_SHORT_TITLES: Record<PageKey, string> = {
  p1: "Home",
  p2: "Members",
  p3: "Services",
  p4: "Exclusive",
};

/** Holiday-pack wallpaper overrides by page key (desktop deploy). */
export const HOLIDAY_WALLPAPER_CODES: Record<PageKey, string> = {
  p1: "w1",
  p2: "w2",
  p3: "w4",
  p4: "w5",
};

// ── Default values ───────────────────────────────────────────────────────────

export const DEFAULT_INSTRUCTIONS = "Add content, skins, media";

export const DEFAULT_EXCLUSIVE_TILES: ExclusiveTile[] = [
  { url: "", price: "", locked: false },
  { url: "", price: "", locked: false },
  { url: "", price: "", locked: false },
  { url: "", price: "$1.00", locked: true },
  { url: "", price: "$1.00", locked: true },
  { url: "", price: "$1.00", locked: true },
];

// ── Factory functions ────────────────────────────────────────────────────────

/** Create a blank page with the default wallpaper. */
export function makeEmptyPage(): PageData {
  return {
    wallpaper: DEFAULT_WALLPAPER_URL,
    cards: [],
    selectedCardId: "",
    lockSize: false,
    lockPosition: false,
    lockPage: false,
    instructions: DEFAULT_INSTRUCTIONS,
  };
}

/** Create a blank 4-page project. */
export function makeEmptyProject(slug: string): ProjectData {
  return {
    version: 1,
    slug,
    pages: {
      p1: makeEmptyPage(),
      p2: makeEmptyPage(),
      p3: makeEmptyPage(),
      p4: makeEmptyPage(),
    },
  };
}
