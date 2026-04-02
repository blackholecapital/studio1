# 05b — Mobile UI File Map

> Date: 2026-04-02

## Full Mobile Module Structure (after 5A + 5B)

```
src/ui/mobile/
├── hooks/
│   ├── useMobileDeployFlow.ts      # [5A] Save + deploy orchestration
│   └── useMobileUploadFlow.ts      # [5A] Photo upload flow
├── lib/
│   ├── derivedState.ts             # [5A] Pure derived state helpers
│   ├── mobileConstants.ts          # [5A] Constants and config
│   └── mobileHelpers.ts            # [5A] Dimension calc, card factory
├── panels/
│   ├── MobileCreatePanel.tsx       # [5B] Wallpaper + portals panel
│   └── MobileContentPanel.tsx      # [5B] Content/media/skins/exclusive
├── sections/
│   ├── MobileTopBar.tsx            # [5B] Top nav bar
│   ├── MobileWorkspace.tsx         # [5B] Card canvas + exclusive workspace
│   ├── MobileDeployControls.tsx    # [5B] Floating save/deploy buttons
│   └── MobileDeployModal.tsx       # [5B] Deploy result modal
└── state/
    └── mobileReducers.ts           # [5A] Pure state mutation functions
```

## JSX Section → Component Map

| Original MobileApp.tsx Section | New Component | Props Count |
|---|---|---|
| `<nav className="mobileNav">` | `MobileTopBar` | 13 |
| `<section className="mobileWorkspace ...">` (both p4 and p1-p3) | `MobileWorkspace` | 12 |
| `<div className="mobileToolOverlay isLeft">` | `MobileCreatePanel` | 14 |
| `<div className="mobileToolOverlay ...">` (content) | `MobileContentPanel` | 17 |
| `<div className="mobFloatingActions">` | `MobileDeployControls` | 4 |
| `<div className="deployModalOverlay">` | `MobileDeployModal` | 2 |

## Parallel with Desktop Structure

| Desktop | Mobile |
|---|---|
| `src/ui/desktop/DesktopAppShell.tsx` | `src/ui/MobileApp.tsx` (orchestrator) |
| `src/ui/desktop/sections/DesktopTopBar.tsx` | `src/ui/mobile/sections/MobileTopBar.tsx` |
| `src/ui/desktop/sections/DesktopWorkspace.tsx` | `src/ui/mobile/sections/MobileWorkspace.tsx` |
| `src/ui/desktop/panels/WallpaperRail.tsx` | `src/ui/mobile/panels/MobileCreatePanel.tsx` |
| `src/ui/desktop/panels/ContentRail.tsx` | `src/ui/mobile/panels/MobileContentPanel.tsx` |
| `src/ui/desktop/sections/DesktopDeployControls.tsx` | `src/ui/mobile/sections/MobileDeployControls.tsx` |
