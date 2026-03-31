import { MEDIA_BASE } from "./assetResolver";

export type MobileWallpaperItem = {
  code: string;
  url: string;
};

const MOBILE_WALLPAPER_BASE = `${MEDIA_BASE}/mobile-wallapaper`;

// m1–m50 — sequential mobile wallpapers in the R2 mobile-wallapaper/ folder.
// To add a new mobile wallpaper: upload m{N}.png where N <= 50.
const SEQUENTIAL_COUNT = 50;

const sequentialMobileWallpapers: MobileWallpaperItem[] = Array.from({ length: SEQUENTIAL_COUNT }, (_, i) => {
  const code = `m${i + 1}`;
  return { code, url: `${MOBILE_WALLPAPER_BASE}/${code}.png` };
});

// Additional mobile wallpapers with non-sequential codes
const extraMobileWallpapers: MobileWallpaperItem[] = [
  { code: "m1234",  url: `${MOBILE_WALLPAPER_BASE}/m1234.png` },
  { code: "m12345", url: `${MOBILE_WALLPAPER_BASE}/m12345.png` },
];

export const mobileWallpaperCatalog: MobileWallpaperItem[] = [...sequentialMobileWallpapers, ...extraMobileWallpapers];

/** Default mobile wallpaper */
export const DEFAULT_MOBILE_WALLPAPER_CODE = "m1234";
export const DEFAULT_MOBILE_WALLPAPER_URL = `${MOBILE_WALLPAPER_BASE}/m1234.png`;
