# 05a — Mobile Logic Extraction

> Date: 2026-04-02

## Summary

Extracted non-visual logic from `MobileApp.tsx` into mobile-only modules under
`src/ui/mobile/`. No visual, interaction, deploy contract, or boot-flow changes.

## Line Count

| File | Before | After | Delta |
|---|---|---|---|
| `src/ui/MobileApp.tsx` | 1215 | 888 | -327 (27%) |

## New Files

| File | Purpose | Lines |
|---|---|---|
| `src/ui/mobile/lib/mobileConstants.ts` | Mobile-specific constants (titles, defaults, media tiles) | 31 |
| `src/ui/mobile/lib/mobileHelpers.ts` | `getMobDims`, `makeMobDefaultCard`, card counter mgmt | 55 |
| `src/ui/mobile/lib/derivedState.ts` | Pure derived state: `getSelectedCard`, `getPageNavigation`, `isPageLocked`, `getAllPagesLocked` | 43 |
| `src/ui/mobile/state/mobileReducers.ts` | Pure state reducers: lock ops, card ops, layout, content/skin/media application, drop handlers | 230 |
| `src/ui/mobile/hooks/useMobileDeployFlow.ts` | Save + deploy orchestration hook | 85 |
| `src/ui/mobile/hooks/useMobileUploadFlow.ts` | Photo upload flow hook (PNG convert, R2 upload, auto-apply) | 88 |

## What Was Extracted

### Constants (→ `mobileConstants.ts`)
- `INSTRUCTIONS_IMAGE` — mobile default card image
- `DEFAULT_WALLPAPER` — mobile default wallpaper URL
- `PAGE_TITLES` — uppercase page title map
- `mediaTiles` — media tile config array

### Helpers (→ `mobileHelpers.ts`)
- `getMobDims()` — window dimension calculator
- `makeMobDefaultCard(dims)` — default card factory
- `mobCardCounter` management: `getMobCardCounter`, `setMobCardCounter`, `incrementMobCardCounter`

### Derived State (→ `derivedState.ts`)
- `getSelectedCard(cardState)` — find selected card from state
- `getPageNavigation(page)` — page index, prev/next booleans
- `isPageLocked(project, page, cardState, key)` — check if a specific page is locked
- `getAllPagesLocked(project, page, cardState)` — check if all pages locked

### Reducers (→ `mobileReducers.ts`)
- `setSelectedCardLockSize` — lock/unlock selected card size
- `setSelectedCardLockPosition` — lock/unlock selected card position
- `togglePageLockState` — toggle page lock (with cascade to cards)
- `deleteSelectedCard` — remove selected card
- `addMobileCard` — add new card with mobile sizing
- `applyCubeLayout` — apply 1/2/3/4 tile layout preset
- `lockAllPagesProject` / `unlockAllPagesProject` — batch page lock operations
- `resetAllPagesProject` — reset all pages to empty
- `applyContentToSelectedCard` — apply content image to selected card
- `applySkinToSelectedCard` — apply skin to selected card
- `applyMediaToSelectedCard` — apply video/image media to selected card
- `applyDropToCard` / `applySkinDropToCard` — drag-and-drop handlers

### Deploy Flow (→ `useMobileDeployFlow.ts`)
- `handleSave()` — save project to localStorage with overlap check
- `handleDeploy()` — full deploy orchestration (build payload, POST, show modal)

### Upload Flow (→ `useMobileUploadFlow.ts`)
- `userUploads` state + localStorage persistence
- `uploading` flag
- `handleMobilePhotoUpload(file)` — PNG conversion, local preview, R2 upload, auto-apply

## What Remains in MobileApp.tsx

- All React state declarations (useState, useRef)
- useEffect for resize listener and auto-save
- Project initialization with wallpaper normalization
- Card interaction hook wiring (`useCardInteractions`)
- Page switching logic (`switchPage`) — kept because it orchestrates multiple state setters
- Panel toggle functions (`handleCreateClick`, `handleContentClick`, `collapseAll`)
- All JSX rendering (nav, workspace, panels, modals, etc.)

## Non-Changes

- Desktop files: untouched
- CSS: untouched
- Deploy payload shape: unchanged
- Upload contract: unchanged
- API endpoints: unchanged
- Boot flow: unchanged
- Routing: unchanged
