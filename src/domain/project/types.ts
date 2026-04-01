/**
 * Shared project types — single source of truth for both desktop and mobile editors.
 *
 * Extracted from:
 *   - src/ui/hooks/useCardInteractions.ts (CardModel, CardInteractionState)
 *   - src/ui/state/editorExport.ts (PageData, ProjectData)
 *   - src/ui/App.tsx (PageKey, ExclusiveTile, SurfaceTab inline types)
 *   - src/ui/MobileApp.tsx (PageKey, SurfaceTab inline types)
 */

// ── Page keys ────────────────────────────────────────────────────────────────

/** Internal page identifiers (p1–p4). */
export type PageKey = "p1" | "p2" | "p3" | "p4";

// ── Card model ───────────────────────────────────────────────────────────────

export type CardModel = {
  id: string;
  label?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex?: number;
  lockSize?: boolean;
  lockPosition?: boolean;
  contentImage?: string;
  contentUrl?: string;
  contentType?: "image" | "video";
  contentDisplay?: "image" | "video" | "url";
  /** Asset code used in deployed JSON (c#, x#-filename, g#, etc.) */
  contentCode?: string;
  skinId?: string;
  isExclusive?: boolean;
  exclusivePrice?: string;
};

// ── Card interaction state ───────────────────────────────────────────────────

export type CardInteractionState = {
  cards: CardModel[];
  selectedCardId: string;
  lockSize: boolean;
  lockPosition: boolean;
  lockPage: boolean;
};

// ── Per-page snapshot ────────────────────────────────────────────────────────

export type PageData = {
  wallpaper: string;
  cards: CardModel[];
  selectedCardId: string;
  lockSize: boolean;
  lockPosition: boolean;
  lockPage: boolean;
  instructions: string;
  /** Exclusive content tiles (only meaningful on p4, but always serialized). */
  exclusiveTiles?: ExclusiveTile[];
};

// ── Full project (all pages + slug) ──────────────────────────────────────────

export type ProjectData = {
  version: 1;
  slug: string;
  pages: Record<string, PageData>;
};

// ── Exclusive tile ───────────────────────────────────────────────────────────

export type ExclusiveTile = {
  url: string;
  price: string;
  locked: boolean;
};

// ── Deploy result ────────────────────────────────────────────────────────────

export type DeployResult = {
  ok: boolean;
  primaryUrl?: string;
  holidayUrl?: string;
  error?: string;
};
