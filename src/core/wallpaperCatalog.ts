import { MEDIA_BASE } from "./assetResolver";

export type WallpaperItem = {
  code: string;
  url: string;
};

const WALLPAPER_BASE = `${MEDIA_BASE}/wallpaper`;

// w1–w50 — sequential wallpapers in the R2 wallpaper/ folder.
// To add a new wallpaper: just upload w{N}.png to R2 where N <= 50.
// If you need more than 50, bump SEQUENTIAL_COUNT and redeploy.
const SEQUENTIAL_COUNT = 50;

const sequentialWallpapers: WallpaperItem[] = Array.from({ length: SEQUENTIAL_COUNT }, (_, i) => {
  const code = `w${i + 1}`;
  return { code, url: `${WALLPAPER_BASE}/${code}.png` };
});

// Additional wallpapers with non-sequential codes
const extraWallpapers: WallpaperItem[] = [
  { code: "w813",   url: `${WALLPAPER_BASE}/w813.png` },
  { code: "w1234",  url: `${WALLPAPER_BASE}/w1234.png` },
  { code: "w12345", url: `${WALLPAPER_BASE}/w12345.png` },
];

export const wallpaperCatalog: WallpaperItem[] = [...sequentialWallpapers, ...extraWallpapers];

/** Default wallpaper */
export const DEFAULT_WALLPAPER_CODE = "w813";
export const DEFAULT_WALLPAPER_URL = `${WALLPAPER_BASE}/w813.png`;
