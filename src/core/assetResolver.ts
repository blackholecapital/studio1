/**
 * Public custom domain for the media-assets R2 bucket.
 * Used for both studio previews and deployed JSON runtime resolution.
 */
export const MEDIA_BASE = "https://media.xyz-labs.xyz";

/**
 * Session cache-buster: changes on each page load so the browser
 * re-checks R2 for newly-added wallpapers instead of serving cached 404s.
 */
const SESSION_CB = `_v=${Date.now()}`;

/**
 * Build a Cloudflare Image Transform thumbnail URL for sidebar/picker panels.
 * Wraps media.xyz-labs.xyz paths with CF transform (120×90 cover).
 * Includes a session cache-buster so newly-added wallpapers appear on refresh.
 * Falls through unchanged for any other URL.
 */
export function thumbnailUrl(fullUrl: string): string {
  if (!fullUrl) return "";
  // Return the raw URL with cache-buster; CSS handles sizing via object-fit:cover.
  // Cloudflare Image Transform (cdn-cgi/image) is not reliably available on all domains,
  // so we skip the transform and serve the full-res image directly.
  if (fullUrl.startsWith(MEDIA_BASE + "/")) {
    return `${fullUrl}?${SESSION_CB}`;
  }
  return fullUrl;
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
