# Debug Notes — Theme Packs / Skin 001

## If the wallpaper does not show
- Confirm file exists at: `public/theme-packs/skin-001/wallpapers/wp-001-holographic-cosmos.png`
- Confirm file exists at: `public/wallpapers/wp-001-holographic-cosmos.png`
- Confirm the default path in `src/ui/App.tsx` matches exactly

## If the app builds but styles look unchanged
- Check `src/ui/styles.css` is imported by the app entry
- Hard refresh the browser to clear Vite cache
- Restart dev server after replacing the zip contents

## If preview cards look too opaque
- Adjust the return value in `cardBgFor()` in `src/ui/components/PreviewPane.tsx`

## If top bar spacing feels tight on smaller screens
- The centered `XYZ Labs` banner auto-hides below 1100px width in CSS

## Recommended next-step convention
- Keep asset naming aligned:
  - `skin-001`
  - `WP-001`
  - `CS-001`
  - `UI-001`