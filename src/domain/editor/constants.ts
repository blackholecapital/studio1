/**
 * Editor constants — deploy dimensions, layout magic numbers, and shared config.
 *
 * Extracted from:
 *   - src/ui/App.tsx (DEPLOY_W, DEPLOY_H, DEPLOY_Y_OFFSET, INSTRUCTIONS_IMAGE, etc.)
 *   - src/ui/MobileApp.tsx (MOBILE_DEPLOY_W, MOBILE_DEPLOY_H, MOB_NAV_H, UPLOAD_ENDPOINT, DEMO_CONTENT_BASE)
 *   - src/ui/state/editorExport.ts (R2_DEPLOY_ENDPOINT)
 *   - src/ui/state/layoutConfig.ts (layoutConfig)
 */

// ── Desktop deploy dimensions ────────────────────────────────────────────────

export const DEPLOY_W = 1400;
export const DEPLOY_H = 800;
export const DEPLOY_X_OFFSET = 0;
/** 10% of DEPLOY_H — clears the deployed nav bar. */
export const DEPLOY_Y_OFFSET = 80;

// ── Mobile deploy dimensions ─────────────────────────────────────────────────

export const MOBILE_DEPLOY_W = 430;
export const MOBILE_DEPLOY_H = 860;

// ── Mobile UI ────────────────────────────────────────────────────────────────

/** Height of the mobile nav bar in pixels. */
export const MOB_NAV_H = 63;

// ── Breakpoint ───────────────────────────────────────────────────────────────

/** Window width at or below which the mobile app is rendered. */
export const MOBILE_BREAKPOINT = 768;

// ── Endpoints ────────────────────────────────────────────────────────────────

export const UPLOAD_ENDPOINT = "/api/upload";
export const DEMO_CONTENT_BASE = "https://demo-content.xyz-labs.xyz";
export const R2_DEPLOY_ENDPOINT = "https://tenant-cdn.cryptocapitalgroupfl.workers.dev/deploy-demo";
export const GATEWAY_BASE = "https://gateway.xyz-labs.xyz";

// ── Default content images ───────────────────────────────────────────────────

/** Instruction card image shown on new desktop cards. */
export const DESKTOP_INSTRUCTIONS_IMAGE = "https://media.xyz-labs.xyz/content/c5555.png";

/** Instruction card image shown on new mobile cards. */
export const MOBILE_INSTRUCTIONS_IMAGE = "https://media.xyz-labs.xyz/content/c4444.png";

/** Left ad slot default image. */
export const LEFT_AD_IMAGE = "https://media.xyz-labs.xyz/content/c5555.png";

/** Right ad slot default image. */
export const RIGHT_AD_IMAGE = "https://media.xyz-labs.xyz/content/c2232.png";

// ── Catalog pagination ───────────────────────────────────────────────────────

export const CATALOG_PAGE_SIZE = 8;

// ── Desktop layout config ────────────────────────────────────────────────────
// Re-exported as-is from layoutConfig.ts for backwards compat.
// Both App.tsx and useCardInteractions use this shape.

export { layoutConfig } from "../../ui/state/layoutConfig";
