/**
 * Public custom domain for the media-assets R2 bucket.
 * Used for both studio previews and deployed JSON runtime resolution.
 */
export const MEDIA_BASE = "https://media.xyz-labs.xyz";

/**
 * Build a thumbnail URL for sidebar/picker panels.
 *
 * Returns the canonical media URL *unchanged*. It used to append a
 * per-session `?_v=<Date.now()>` cache-buster so newly-added wallpapers
 * would appear on refresh, but that had a catastrophic side-effect:
 * every page load produced unique query strings, which defeated both
 * the browser cache AND the Cloudflare edge cache, forcing every
 * wallpaper/content thumbnail to origin-pull from R2 on every visit.
 * Since the catalog is code-generated (a new image requires a deploy
 * anyway), we let the CDN and the browser cache the canonical URL.
 *
 * CSS handles visual sizing via object-fit: cover.
 */
export function thumbnailUrl(fullUrl: string): string {
  return fullUrl ?? "";
}

/**
 * Resolve an asset code to a full URL for use by the gateway runtime.
 * Codes:
 *   w{n}         → media.xyz-labs.xyz/wallpaper/w{n}.png
 *   s{n} / S{n}  → media.xyz-labs.xyz/skins/S{n}.png
 *   c{n}         → media.xyz-labs.xyz/content/c{n}.png
 *   g{n}         → media.xyz-labs.xyz/gif/g{n}.png
 *   H1–H4        → media.xyz-labs.xyz/wallpaper/H{n}.png  (holiday pack)
 *   x{n}-{file}  → demo-bucket/tenant-content/{slug}/{file}  (runtime resolves per slug)
 */
export function resolveWallpaperCode(code: string): string {
  if (!code) return "";
  if (/^w\d+$/i.test(code)) return `${MEDIA_BASE}/wallpaper/${code}.png`;
  if (/^m\d+$/i.test(code)) return `${MEDIA_BASE}/mobile-wallapaper/${code}.png`;
  if (/^H[1-4]$/.test(code)) return `${MEDIA_BASE}/wallpaper/${code}.png`;
  return "";
}

export function resolveSkinCode(code: string): string {
  if (!code) return "";
  // Accept s1/S1 → normalise to S1
  const id = code.replace(/^s/i, "S");
  return `${MEDIA_BASE}/skins/${id}.png`;
}

export function resolveContentCode(code: string): string {
  if (!code) return "";
  if (/^c\d+$/i.test(code)) return `${MEDIA_BASE}/content/${code}.png`;
  if (/^g\d+$/i.test(code)) return `${MEDIA_BASE}/gif/${code}.png`;
  return "";
}
