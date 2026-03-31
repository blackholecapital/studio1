/**
 * Catalog access facade — re-exports all asset catalogs.
 *
 * Provides a single import point for wallpaper, content, and skin catalogs.
 * The underlying catalog modules are unchanged.
 */

export { wallpaperCatalog, DEFAULT_WALLPAPER_URL, DEFAULT_WALLPAPER_CODE } from "../../core/wallpaperCatalog";
export type { WallpaperItem } from "../../core/wallpaperCatalog";

export { mobileWallpaperCatalog, DEFAULT_MOBILE_WALLPAPER_URL, DEFAULT_MOBILE_WALLPAPER_CODE } from "../../core/mobileWallpaperCatalog";
export type { MobileWallpaperItem } from "../../core/mobileWallpaperCatalog";

export { contentCatalog } from "../../core/contentCatalog";
export type { ContentItem } from "../../core/contentCatalog";

export { skinCatalog } from "../../core/skinCatalog";
export type { SkinItem } from "../../core/skinCatalog";
