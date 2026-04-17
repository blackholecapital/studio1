import { MEDIA_BASE } from "./assetResolver";

export type WallpaperItem = {
  code: string;
  url: string;
};

const WALLPAPER_BASE = `${MEDIA_BASE}/wallpaper`;

// Sequential wallpapers w1–w200.
// Upload w{N}.png to R2 (N ≤ 200) to make it available; missing codes are
// automatically hidden by the onError handler in the wallpaper picker.
// Bump SEQUENTIAL_COUNT and redeploy to extend the range further.
const SEQUENTIAL_COUNT = 200;

const sequentialWallpapers: WallpaperItem[] = Array.from({ length: SEQUENTIAL_COUNT }, (_, i) => {
  const code = `w${i + 1}`;
  return { code, url: `${WALLPAPER_BASE}/${code}.png` };
});

// Wallpapers with non-integer codes (decimal variants, special codes).
// Sorted so they appear near their numeric neighbours in the picker.
const extraWallpapers: WallpaperItem[] = [
  { code: "w1.11",  url: `${WALLPAPER_BASE}/w1.11.png` },
  { code: "w1.13",  url: `${WALLPAPER_BASE}/w1.13.png` },
  { code: "w813",   url: `${WALLPAPER_BASE}/w813.png` },
  { code: "w1234",  url: `${WALLPAPER_BASE}/w1234.png` },
  { code: "w12345", url: `${WALLPAPER_BASE}/w12345.png` },
];

// Merge sequential + extras, sorted by numeric value so the picker stays
// ordered and decimal variants appear next to their integer neighbours.
function numericKey(code: string): number {
  // Strip leading 'w' or 'W', parse the remaining string as a float.
  return parseFloat(code.replace(/^[wW]/, "")) || 0;
}

export const wallpaperCatalog: WallpaperItem[] = [
  ...sequentialWallpapers,
  ...extraWallpapers,
].sort((a, b) => numericKey(a.code) - numericKey(b.code));

/** Default wallpaper — shown on page load and on reset. */
export const DEFAULT_WALLPAPER_CODE = "w1.13";
export const DEFAULT_WALLPAPER_URL = `${WALLPAPER_BASE}/w1.13.png`;
