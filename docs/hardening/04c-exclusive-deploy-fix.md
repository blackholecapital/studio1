# 04c — Exclusive Content Deploy/Persistence Fix

> Date: 2026-04-01

## Root Cause

Exclusive tile data (`url`, `price`, `locked`) lived only in ephemeral React
`useState` inside `App.tsx` (line ~102). It was **never written** to the
canonical `ProjectData` / `PageData` model, so:

1. **Save** — `handleSave()` called `cardStateToPageData()` which had no
   exclusive-tile parameter → tiles dropped from localStorage.
2. **Reload** — `loadProject()` returned a `ProjectData` with no tile data →
   tiles reset to defaults on every page load.
3. **Deploy** — `buildDesktopDeployBundle()` *did* receive tiles from the
   transient `args.exclusiveTiles` prop, so a deploy issued without a page
   reload would correctly include tiles. But after save+reload, the deploy
   would use the default (empty) tiles.

### Data flow before fix

```
UI state (exclusiveTiles)
  ├─ → DesktopWorkspace (render)       ✅ displayed
  ├─ → ContentRail (edit)              ✅ editable
  ├─ → buildDesktopDeployBundle (ctx)  ✅ in deploy payload (transient only)
  └─ → cardStateToPageData → project   ❌ NOT serialized
       → saveProject → localStorage    ❌ NOT persisted
```

## Changes Made

### 1. `src/domain/project/types.ts`
- Added optional `exclusiveTiles?: ExclusiveTile[]` to `PageData`.

### 2. `src/domain/editor/selectors.ts`
- `cardStateToPageData()` gains an optional 4th parameter `exclusiveTiles`.
  When provided, attaches it to the returned `PageData`.
- Import added for `ExclusiveTile` type.

### 3. `src/domain/project/validators.ts`
- Added `isValidExclusiveTile()` and `normalizeExclusiveTiles()` validators.
- `normalizePage()` now reads and validates `raw.exclusiveTiles`, preserving
  valid tiles through the load path.

### 4. `src/ui/App.tsx`
- `exclusiveTiles` state initializer reads from `loadProject("user")?.pages?.p4?.exclusiveTiles`.
- All `cardStateToPageData()` call sites (auto-save effect, `switchPage`,
  `handleSlugChange`, `lockAllPages`, `unlockAllPages`) now pass
  `exclusiveTiles` when serializing p4.
- `switchPage()` loads exclusive tiles from the target page's `exclusiveTiles`.
- `handleSlugChange()` loads exclusive tiles from the new project's p4.
- `resetWorkspace()` writes `DEFAULT_EXCLUSIVE_TILES` into p4's fresh page.
- Auto-save `useEffect` depends on `exclusiveTiles` so changes trigger project save.

### 5. `src/ui/desktop/hooks/useDesktopDeployFlow.ts`
- `handleSave()` passes exclusive tiles to `cardStateToPageData` for p4.
- `handleDeployGateway()` passes exclusive tiles to `cardStateToPageData`,
  and reads tiles from `full.pages.p4.exclusiveTiles` for the deploy bundle
  (with fallback to `args.exclusiveTiles`).
- `handleDownload()` passes exclusive tiles for p4.

### Data flow after fix

```
UI state (exclusiveTiles)
  ├─ → DesktopWorkspace (render)            ✅ displayed
  ├─ → ContentRail (edit)                   ✅ editable
  ├─ → cardStateToPageData(…, tiles)        ✅ serialized into PageData
  │    → project.pages.p4.exclusiveTiles    ✅ canonical in project model
  │    → saveProject → localStorage         ✅ persisted
  │    → loadProject → normalizePage        ✅ restored on reload
  └─ → buildDesktopDeployBundle (from project) ✅ in deploy payload (canonical)
```

## Non-changes

- Mobile editor: unaffected. `cardStateToPageData` called with 2 args; new
  optional parameter defaults to `undefined`.
- Deploy endpoint contract: unchanged. `exclusiveTiles` payload shape was
  already defined in `buildPayload.ts:serializeExclusiveTiles`.
- Schema version: stays at 1. The new field is optional and backwards-compatible.
- No UI changes, no endpoint changes, no file deletions.
