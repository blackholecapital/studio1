/**
 * Asset resolution facade — re-exports and augments core/assetResolver.
 *
 * Provides a single import point for all asset URL resolution.
 * The underlying logic in core/assetResolver.ts is unchanged.
 */

// Re-export all existing resolver functions and constants
export {
  MEDIA_BASE,
  thumbnailUrl,
  resolveWallpaperCode,
  resolveSkinCode,
  resolveContentCode,
} from "../../core/assetResolver";
