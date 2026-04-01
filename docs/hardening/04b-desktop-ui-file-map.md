# STEP 4B — Desktop UI File Map

## New files
- `src/ui/desktop/DesktopAppShell.tsx`
- `src/ui/desktop/sections/DesktopTopBar.tsx`
- `src/ui/desktop/sections/DesktopPageNav.tsx`
- `src/ui/desktop/sections/DesktopDeployControls.tsx`
- `src/ui/desktop/panels/WallpaperRail.tsx`
- `src/ui/desktop/panels/ContentRail.tsx`
- `src/ui/desktop/sections/DesktopWorkspace.tsx`

## App.tsx old -> new location
- Top strip/header controls -> `DesktopTopBar` (+ `DesktopPageNav` + `DesktopDeployControls`)
- Left rail header/panels -> `WallpaperRail`
- Workspace/exclusive/cards JSX -> `DesktopWorkspace`
- Right rail header/tabs/content/media/skins -> `ContentRail`
- Shell wrapper + deploy status banner -> `DesktopAppShell`

## Restored parity item
- Content rail Add Image plus-button now exists at top-left of content tray in `ContentRail`, wired to existing file-input upload flow.
