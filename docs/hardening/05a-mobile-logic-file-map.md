# 05a — Mobile Logic File Map

> Date: 2026-04-02

## Directory Structure

```
src/ui/mobile/
├── hooks/
│   ├── useMobileDeployFlow.ts    # Save + deploy orchestration
│   └── useMobileUploadFlow.ts    # Photo upload flow
├── lib/
│   ├── derivedState.ts           # Pure derived state helpers
│   ├── mobileConstants.ts        # Constants and config
│   └── mobileHelpers.ts          # Dimension calc, card factory, counter
└── state/
    └── mobileReducers.ts         # Pure state mutation functions
```

## Old → New Location Map

| Original (MobileApp.tsx lines) | New Location | Function/Symbol |
|---|---|---|
| L33 | `lib/mobileConstants.ts` | `INSTRUCTIONS_IMAGE` |
| L34 | `lib/mobileConstants.ts` | `DEFAULT_WALLPAPER` |
| L37-42 | `lib/mobileConstants.ts` | `PAGE_TITLES` |
| L44-47 | `lib/mobileConstants.ts` | `mediaTiles` |
| L50-55 | `lib/mobileHelpers.ts` | `getMobDims()` |
| L57 | `lib/mobileHelpers.ts` | `mobCardCounter` (via get/set/increment) |
| L59-77 | `lib/mobileHelpers.ts` | `makeMobDefaultCard()` |
| L170-173 | `lib/derivedState.ts` | `getSelectedCard()` |
| L125-127 | `lib/derivedState.ts` | `getPageNavigation()` |
| L440-443 | `lib/derivedState.ts` | `isPageLocked()` |
| L445 | `lib/derivedState.ts` | `getAllPagesLocked()` |
| L288-310 | `state/mobileReducers.ts` | `addMobileCard()` |
| L312-322 | `state/mobileReducers.ts` | `deleteSelectedCard()` |
| L324-385 | `state/mobileReducers.ts` | `applyCubeLayout()` |
| L388-395 | `state/mobileReducers.ts` | `setSelectedCardLockSize()` |
| L397-404 | `state/mobileReducers.ts` | `setSelectedCardLockPosition()` |
| L406-425 | `state/mobileReducers.ts` | `togglePageLockState()` |
| L427-438 | `state/mobileReducers.ts` | `resetAllPagesProject()` |
| L447-455 | `state/mobileReducers.ts` | `lockAllPagesProject()` |
| L457-465 | `state/mobileReducers.ts` | `unlockAllPagesProject()` |
| L531-545 | `state/mobileReducers.ts` | `applyContentToSelectedCard()` |
| L547-557 | `state/mobileReducers.ts` | `applySkinToSelectedCard()` |
| L559-579 | `state/mobileReducers.ts` | `applyMediaToSelectedCard()` |
| L596-621 | `state/mobileReducers.ts` | `applyDropToCard()`, `applySkinDropToCard()` |
| L230-246 | `hooks/useMobileDeployFlow.ts` | `handleSave()` |
| L249-286 | `hooks/useMobileDeployFlow.ts` | `handleDeploy()` |
| L467-528 | `hooks/useMobileUploadFlow.ts` | `handleMobilePhotoUpload()` |
| L118-119, L467-469 | `hooks/useMobileUploadFlow.ts` | `userUploads`, `uploading` state |

## Parallel with Desktop Structure

| Desktop | Mobile |
|---|---|
| `src/ui/desktop/lib/derivedState.ts` | `src/ui/mobile/lib/derivedState.ts` |
| `src/ui/desktop/state/desktopReducers.ts` | `src/ui/mobile/state/mobileReducers.ts` |
| `src/ui/desktop/hooks/useDesktopDeployFlow.ts` | `src/ui/mobile/hooks/useMobileDeployFlow.ts` |
| `src/ui/desktop/hooks/useDesktopUploadFlow.ts` | `src/ui/mobile/hooks/useMobileUploadFlow.ts` |
