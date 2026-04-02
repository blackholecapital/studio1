/**
 * Mobile-specific constants and config.
 *
 * Extracted from MobileApp.tsx top-level constants.
 */

import type { PageKey } from "../../../domain/project/types";
import { MOBILE_INSTRUCTIONS_IMAGE } from "../../../domain/editor/constants";
import { DEFAULT_MOBILE_WALLPAPER_URL } from "../../../core/mobileWallpaperCatalog";

// ── Image defaults ──────────────────────────────────────────────────────────

export const INSTRUCTIONS_IMAGE = MOBILE_INSTRUCTIONS_IMAGE;
export const DEFAULT_WALLPAPER = DEFAULT_MOBILE_WALLPAPER_URL;

// ── Page titles ─────────────────────────────────────────────────────────────

/** Mobile page titles (uppercase). Desktop uses PAGE_SHORT_TITLES from defaults. */
export const PAGE_TITLES: Record<PageKey, string> = {
  p1: "GATEWAY",
  p2: "MEMBERS",
  p3: "ACCESS",
  p4: "EXCLUSIVE",
};

// ── Media tile config ───────────────────────────────────────────────────────

export const mediaTiles = [
  { id: "media-video-1", type: "video" as const, placeholder: "https://...mp4", buttonLabel: "Video File" },
  { id: "media-image-1", type: "image" as const, placeholder: "https://...",    buttonLabel: "Media File" },
];
