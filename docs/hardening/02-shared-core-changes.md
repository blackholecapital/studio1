# 02 - Shared Core Changes

> Date: 2026-03-31
> Branch: claude/baseline-freeze-DgHRf
> Baseline: 01-baseline-* documents

---

## Summary

Extracted shared non-UI logic from `App.tsx` and `MobileApp.tsx` into stable domain modules. No behavior, layout, routing, or deploy output changes.

---

## New Modules Created (11 files)

### Domain Layer (`src/domain/`)

| File | Purpose | Lines |
|---|---|---|
| `project/types.ts` | Canonical type definitions (CardModel, PageData, ProjectData, etc.) | 80 |
| `project/defaults.ts` | Factory functions (makeEmptyPage, makeEmptyProject) and shared constants | 78 |
| `project/schema.ts` | Version constant, limits, slug pattern | 26 |
| `project/migrations.ts` | Migration framework (stub for version 1 → 2 when needed) | 50 |
| `project/validators.ts` | Safe parse/validate for persisted state (parseProject, isValidCard, normalizePage) | 97 |
| `editor/constants.ts` | Deploy dimensions, endpoints, magic numbers, default images | 54 |
| `editor/selectors.ts` | Pure selectors (pageDataToCardState, cardStateToPageData, hasAnyOverlap, etc.) | 76 |
| `editor/actions.ts` | Slug helpers (sanitizeSlug, ensureUniqueSlug, generateSlug) | 40 |
| `shared/errors.ts` | Result<T> type and ok/err constructors | 17 |

### Shared Utilities (`src/shared/`)

| File | Purpose | Lines |
|---|---|---|
| `lib/guards.ts` | Runtime type guards (isRecord, safeJsonParse, safeLocalStorageGet/Set) | 42 |
| `lib/normalize.ts` | Image conversion (convertToPng — was duplicated in both editors) | 42 |

---

## Modified Files (4 files)

### `src/ui/hooks/useCardInteractions.ts`
- **Removed**: `CardModel` and `CardInteractionState` type definitions (22 lines)
- **Added**: Re-export from `domain/project/types.ts` + local import
- **Preserved**: Hook implementation unchanged

### `src/ui/state/editorExport.ts`
- **Removed**: `PageData`, `ProjectData`, `DeployResult` type definitions; `makeEmptyPage`, `makeEmptyProject` factory functions; inline `loadProject` validation logic (60 lines)
- **Added**: Re-exports from domain layer; `parseProject()` call for safe loading; `R2_DEPLOY_ENDPOINT` import from constants
- **Preserved**: `saveProject`, `listSavedSlugs`, `deployGateway`, `downloadProjectJson` — identical behavior

### `src/ui/App.tsx`
- **Removed**: Inline type aliases (`PageKey`, `ExclusiveTile`), duplicated constants (`PAGE_KEYS`, `PAGE_SHORT_TITLES`, `CATALOG_PAGE_SIZE`, `DEFAULT_INSTRUCTIONS`, deploy dimensions, `HOLIDAY_CODES`, `PAGE_ROUTES`), duplicated functions (`pageDataToCardState`, `cardStateToPageData`, `hasAnyOverlap`, `ensureUniqueSlug`), inline PNG conversion, hard-coded URLs
- **Added**: Imports from domain modules
- **Preserved**: All UI rendering, ghost flow, card interactions, drag-and-drop, deploy logic — identical behavior

### `src/ui/MobileApp.tsx`
- **Removed**: Inline type alias (`PageKey`), duplicated constants (`PAGE_KEYS`, `MOB_NAV_H`, `UPLOAD_ENDPOINT`, `DEMO_CONTENT_BASE`, deploy dimensions, `HOLIDAY_CODES`, `PAGE_ROUTES`), duplicated functions (`pageDataToCardState`, `cardStateToPageData`, `hasAnyOverlap`, `convertToPng`), hard-coded URLs
- **Added**: Imports from domain modules
- **Preserved**: All UI rendering, mobile card interactions, upload flow, deploy logic — identical behavior

---

## Symbols Moved (Old → New Location)

### Types

| Symbol | Old Location | New Location |
|---|---|---|
| `CardModel` | `ui/hooks/useCardInteractions.ts` | `domain/project/types.ts` (re-exported from old location) |
| `CardInteractionState` | `ui/hooks/useCardInteractions.ts` | `domain/project/types.ts` (re-exported from old location) |
| `PageData` | `ui/state/editorExport.ts` | `domain/project/types.ts` (re-exported from old location) |
| `ProjectData` | `ui/state/editorExport.ts` | `domain/project/types.ts` (re-exported from old location) |
| `DeployResult` | `ui/state/editorExport.ts` | `domain/project/types.ts` (re-exported from old location) |
| `PageKey` | `ui/App.tsx` (inline), `ui/MobileApp.tsx` (inline) | `domain/project/types.ts` |
| `ExclusiveTile` | `ui/App.tsx` (inline) | `domain/project/types.ts` |

### Constants

| Symbol | Old Location | New Location |
|---|---|---|
| `PAGE_KEYS` | `App.tsx`, `MobileApp.tsx` (duplicated) | `domain/project/defaults.ts` |
| `PAGE_SHORT_TITLES` | `App.tsx` | `domain/project/defaults.ts` |
| `PAGE_ROUTES` | `App.tsx`, `MobileApp.tsx` (duplicated) | `domain/project/defaults.ts` |
| `HOLIDAY_WALLPAPER_CODES` | `App.tsx` (`HOLIDAY_CODES`), `MobileApp.tsx` (`HOLIDAY_CODES`) | `domain/project/defaults.ts` |
| `DEFAULT_INSTRUCTIONS` | `App.tsx`, `editorExport.ts` | `domain/project/defaults.ts` |
| `DEFAULT_EXCLUSIVE_TILES` | `App.tsx` (inline array literal, duplicated in reset) | `domain/project/defaults.ts` |
| `DEPLOY_W/H`, `DEPLOY_X/Y_OFFSET` | `App.tsx` (inline) | `domain/editor/constants.ts` |
| `MOBILE_DEPLOY_W/H` | `MobileApp.tsx` (inline) | `domain/editor/constants.ts` |
| `MOB_NAV_H` | `MobileApp.tsx` | `domain/editor/constants.ts` |
| `UPLOAD_ENDPOINT` | `MobileApp.tsx` | `domain/editor/constants.ts` |
| `DEMO_CONTENT_BASE` | `MobileApp.tsx`, `App.tsx` (hard-coded) | `domain/editor/constants.ts` |
| `GATEWAY_BASE` | `App.tsx`, `MobileApp.tsx` (hard-coded) | `domain/editor/constants.ts` |
| `R2_DEPLOY_ENDPOINT` | `editorExport.ts` (inline) | `domain/editor/constants.ts` |
| `DESKTOP_INSTRUCTIONS_IMAGE` | `App.tsx` (`INSTRUCTIONS_IMAGE`) | `domain/editor/constants.ts` |
| `MOBILE_INSTRUCTIONS_IMAGE` | `MobileApp.tsx` (`INSTRUCTIONS_IMAGE`) | `domain/editor/constants.ts` |
| `LEFT_AD_IMAGE` | `App.tsx` | `domain/editor/constants.ts` |
| `RIGHT_AD_IMAGE` | `App.tsx` | `domain/editor/constants.ts` |
| `CATALOG_PAGE_SIZE` | `App.tsx` | `domain/editor/constants.ts` |

### Functions

| Symbol | Old Location | New Location |
|---|---|---|
| `makeEmptyPage` | `editorExport.ts` | `domain/project/defaults.ts` (re-exported from old location) |
| `makeEmptyProject` | `editorExport.ts` | `domain/project/defaults.ts` (re-exported from old location) |
| `pageDataToCardState` | `App.tsx`, `MobileApp.tsx` (duplicated) | `domain/editor/selectors.ts` |
| `cardStateToPageData` | `App.tsx`, `MobileApp.tsx` (duplicated, differed on instructions param) | `domain/editor/selectors.ts` (unified with optional `instructions` param, default `""`) |
| `hasAnyOverlap` | `App.tsx`, `MobileApp.tsx` (duplicated) | `domain/editor/selectors.ts` |
| `maxCardCounter` | `App.tsx`, `MobileApp.tsx` (inline reduce) | `domain/editor/selectors.ts` |
| `ensureUniqueSlug` | `App.tsx` | `domain/editor/actions.ts` |
| `sanitizeSlug` | `App.tsx` (inline regex) | `domain/editor/actions.ts` |
| `convertToPng` | `MobileApp.tsx` (function), `App.tsx` (inline Promise) | `shared/lib/normalize.ts` |

### New Functions (not previously existing)

| Symbol | Location | Purpose |
|---|---|---|
| `parseProject` | `domain/project/validators.ts` | Safe parse + normalize for persisted JSON |
| `isValidCard` | `domain/project/validators.ts` | Runtime CardModel shape check |
| `isValidPage` | `domain/project/validators.ts` | Runtime PageData shape check |
| `normalizePage` | `domain/project/validators.ts` | Patch missing fields with defaults |
| `migrateProject` | `domain/project/migrations.ts` | Version migration framework (currently passthrough for v1) |
| `getSelectedCard` | `domain/editor/selectors.ts` | Selected card lookup with fallback |
| `generateSlug` | `domain/editor/actions.ts` | Random slug generation |
| `isValidSlug` | `domain/editor/actions.ts` | Slug format validation |

---

## What Was NOT Changed

- Desktop/mobile UI separation: fully preserved
- Boot flow: `main.tsx` responsive detection unchanged
- JSX rendering: zero JSX moved or modified
- Ghost flow onboarding: unchanged
- Card drag/resize hook: implementation unchanged
- Deploy payload format: byte-consistent
- Upload flow: identical behavior
- CSS files: untouched
- Cloudflare Functions: untouched
- Orphan files: not deleted
- No new dependencies added
