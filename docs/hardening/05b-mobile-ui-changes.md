# 05b — Mobile UI Composition Extraction

> Date: 2026-04-02

## Summary

Decomposed MobileApp.tsx JSX into focused mobile-only components/sections.
State ownership and business logic remain in MobileApp.tsx; components are
presentational with explicit props.

## Line Count

| File | Before (5A) | After (5B) | Delta |
|---|---|---|---|
| `src/ui/MobileApp.tsx` | 888 | 444 | -444 (50%) |
| Original (pre-5A) | 1215 | 444 | -771 (63%) |

## New Component Files

| File | Lines | Extracts |
|---|---|---|
| `src/ui/mobile/sections/MobileTopBar.tsx` | 65 | Top nav: Create/Content buttons, page arrows, +/- buttons |
| `src/ui/mobile/sections/MobileWorkspace.tsx` | 190 | Exclusive workspace (p4) + regular card canvas (p1-p3) |
| `src/ui/mobile/panels/MobileCreatePanel.tsx` | 97 | Wallpaper picker + portals/pages panel |
| `src/ui/mobile/panels/MobileContentPanel.tsx` | 158 | Content/media/skins/exclusive panel |
| `src/ui/mobile/sections/MobileDeployControls.tsx` | 15 | Floating Save + Deploy Gateway buttons |
| `src/ui/mobile/sections/MobileDeployModal.tsx` | 76 | Deploy result modal with copy-to-clipboard |

## What Remains in MobileApp.tsx (444 lines)

- All React state declarations
- Hook wiring (useCardInteractions, useMobileDeployFlow, useMobileUploadFlow)
- Business logic functions (switchPage, card ops, lock ops, content application)
- Panel toggle functions
- Thin render: component composition with prop passing
- Hidden file inputs (kept in orchestrator since refs are owned here)

## What Was Extracted

| JSX Section | Original Lines | New Component |
|---|---|---|
| Top nav bar | 332-371 | `MobileTopBar` |
| Exclusive workspace (p4) | 379-451 | `MobileWorkspace` (p4 branch) |
| Card canvas (p1-p3) | 452-567 | `MobileWorkspace` (p1-p3 branch) |
| Create panel (wallpaper + portals) | 569-646 | `MobileCreatePanel` |
| Content panel (content/media/skins/exclusive) | 676-816 | `MobileContentPanel` |
| Deploy controls | 818-826 | `MobileDeployControls` |
| Deploy modal | 828-885 | `MobileDeployModal` |

## Non-Changes

- Desktop files: untouched
- CSS: untouched
- Deploy payload shape: unchanged
- Upload contract: unchanged
- API endpoints: unchanged
- Boot flow: unchanged
- No new state ownership in components (all presentational)
