# STEP 4A — Desktop Logic File Map

## New files
- `src/ui/desktop/lib/derivedState.ts`
  - `getSelectedCard`
  - `getPageNavigation`
  - `getAllPagesLocked`

- `src/ui/desktop/state/desktopReducers.ts`
  - `patchSelectedCard`
  - `setSelectedCardLockSize`
  - `setSelectedCardLockPosition`
  - `togglePageLockState`
  - `deleteSelectedCardState`

- `src/ui/desktop/hooks/useDesktopUploadFlow.ts`
  - `useDesktopUploadFlow`

- `src/ui/desktop/hooks/useDesktopDeployFlow.ts`
  - `useDesktopDeployFlow`

## App.tsx old -> new mapping
- Selected card derivation logic:
  - **Old:** inline `useMemo` in `App.tsx`
  - **New:** `derivedState.getSelectedCard`

- Page nav and all-pages-locked derivations:
  - **Old:** inline calculations in `App.tsx`
  - **New:** `derivedState.getPageNavigation`, `derivedState.getAllPagesLocked`

- Card mutation handlers:
  - **Old:** inline reducers in `updateSelectedCard`, `setLockSize`, `setLockPosition`, `toggleLockPage`, `deleteSelectedCard`
  - **New:** `desktopReducers` helpers called by those handlers

- Upload flow:
  - **Old:** inline `handleContentFileUpload`
  - **New:** `useDesktopUploadFlow(...).handleContentFileUpload`

- Save/deploy/download flow:
  - **Old:** inline `handleSave`, `handleDeployGateway`, `handleDownload`
  - **New:** `useDesktopDeployFlow(...).{handleSave,handleDeployGateway,handleDownload}`
