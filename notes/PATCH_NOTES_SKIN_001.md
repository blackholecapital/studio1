# Patch Notes — Skin 001 (Holographic Glass)

## What changed
- Added holographic-glass UI styling without changing layout structure
- Added centered `XYZ Labs` banner in the top bar
- Added drip icon treatment to the Drip Studio brand area
- Restyled Gate and Canvas header sections
- Added a new default wallpaper asset for the skin pack
- Added theme-pack folder structure for future skin drops

## Files changed
- `src/ui/App.tsx`
- `src/ui/styles.css`
- `src/ui/components/PreviewPane.tsx`
- `src/core/wallpaperCatalog.ts`

## Files added
- `public/theme-packs/README.md`
- `public/theme-packs/skin-001/manifest.json`
- `public/theme-packs/skin-001/wallpapers/wp-001-holographic-cosmos.png`
- `public/theme-packs/skin-002/manifest.json`
- `public/theme-packs/skin-003/manifest.json`
- `public/wallpapers/wp-001-holographic-cosmos.png`
- `notes/PATCH_NOTES_SKIN_001.md`
- `notes/DEBUG_THEME_PACKS.md`

## Behavior
- The wallpaper is set as the current default in `App.tsx`
- The same wallpaper is also available in the wallpaper catalog

## How to swap later
- Replace the `studioWallpaper` default path in `src/ui/App.tsx`
- Or add a new wallpaper entry in `src/core/wallpaperCatalog.ts`
- Or create a new `skin-00X` folder and point the app to that asset

## Safe rollback
- Restore the original versions of the four changed source files
- Remove the added `theme-packs` and notes files if not needed