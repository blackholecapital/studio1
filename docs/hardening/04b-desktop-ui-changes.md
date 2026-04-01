# STEP 4B — Desktop UI Composition Changes

## Scope
- Extracted desktop JSX composition from `src/ui/App.tsx` into desktop-only shell/section/panel components.
- Preserved desktop behavior, mobile separation, deploy/upload contracts, routing/layout, and boot flow.
- Restored content upload affordance in right rail content tray via top-left Add Image (+) tile.

## App.tsx size delta
- Before (post-4A): 1485
- After: 1053
- Net: -432

## Extracted composition blocks
- Top header shell + controls -> `DesktopTopBar`, `DesktopPageNav`, `DesktopDeployControls`.
- Left rail (wallpaper/pages) -> `WallpaperRail`.
- Workspace canvas/exclusive grid/cards -> `DesktopWorkspace`.
- Right rail (content/exclusive/media/skins) -> `ContentRail`.
- Root desktop shell wrapper + status banner -> `DesktopAppShell`.

## Required parity restoration
- Added top-left upload affordance in content rail:
  - visual tile with plus and "Add Image"
  - triggers hidden file input click
  - uses existing `handleContentFileUpload` from extracted upload hook
- No new upload API behavior introduced.

## Checkpoint
**safe to proceed**
