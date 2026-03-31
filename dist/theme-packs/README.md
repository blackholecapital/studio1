# Theme Packs

Each skin pack gets its own folder:

- `skin-001/`
- `skin-002/`
- `skin-003/`

Recommended code format:
- Wallpaper: `WP-001`
- Card skin: `CS-001`
- UI theme: `UI-001`

For every new skin:
1. Create `public/theme-packs/skin-00X/`
2. Add a `manifest.json`
3. Put wallpaper assets in `wallpapers/`
4. Keep file names stable so future GPT passes can target them directly
5. Update `src/ui/styles.css` and `src/core/wallpaperCatalog.ts` only if the skin should be selectable in the current build

Current active default:
- `skin-001`
- wallpaper file: `/theme-packs/skin-001/wallpapers/wp-001-holographic-cosmos.png`