# 03 - Service Layer Changes

> Date: 2026-03-31
> Branch: claude/baseline-freeze-DgHRf
> Baseline: Steps 01 + 02

---

## Summary

Extracted side-effecting service logic from `App.tsx`, `MobileApp.tsx`, and `editorExport.ts` into dedicated service modules. No behavior, layout, routing, API contract, or deploy output changes.

---

## New Service Modules (8 files)

### Storage (`src/services/storage/`)

| File | Purpose | Lines |
|---|---|---|
| `projectStore.ts` | All localStorage access: project CRUD, slug persistence, upload state, ghost flow | 120 |

### Deploy (`src/services/deploy/`)

| File | Purpose | Lines |
|---|---|---|
| `buildPayload.ts` | Desktop + mobile deploy payload assembly (pure functions) | 250 |
| `api.ts` | Deploy network call to R2 endpoint | 55 |

### Upload (`src/services/upload/`)

| File | Purpose | Lines |
|---|---|---|
| `api.ts` | Upload network call with typed result | 65 |

### Assets (`src/services/assets/`)

| File | Purpose | Lines |
|---|---|---|
| `resolver.ts` | Re-export facade for core/assetResolver | 15 |
| `catalogs.ts` | Re-export facade for all catalog modules | 17 |

### Runtime (`src/services/runtime/`)

| File | Purpose | Lines |
|---|---|---|
| `urlState.ts` | Slug get-or-create helpers (desktop + mobile) | 30 |
| `download.ts` | Browser download/export of project JSON | 16 |

---

## Modified Files (3 files)

### `src/ui/state/editorExport.ts`
- **Replaced**: All implementation with re-exports from service layer
- Now a pure backwards-compatibility hub (24 lines, down from 105)
- Re-exports: `loadProject`, `saveProject`, `listSavedSlugs` from `services/storage/projectStore`
- Re-exports: `deployGateway` from `services/deploy/api`
- Re-exports: `downloadProjectJson` from `services/runtime/download`
- Re-exports: types from `domain/project/types`, factories from `domain/project/defaults`

### `src/ui/App.tsx`
- **Removed**: Inline slug initialization (localStorage read/write) → `getOrCreateDesktopSlug()`
- **Removed**: Inline ghost flow localStorage calls → `markGhostFlowSeen()`, `resetGhostFlowStorage()`
- **Removed**: 100-line inline deploy payload builder → `buildDesktopDeployBundle()`
- **Removed**: Inline upload fetch call → `uploadFile()`
- **Removed**: Inline `localStorage.setItem("drip-studio:desktop-slug")` → `saveDesktopSlug()`
- **Preserved**: All UI rendering, card interactions, drag-and-drop, ghost flow timing

### `src/ui/MobileApp.tsx`
- **Removed**: Inline slug initialization → `getOrCreateMobileSlug()`
- **Removed**: Inline upload state initialization → `loadUserUploads()`, `loadUploadCounter()`
- **Removed**: Inline upload state persistence → `saveUserUploads()`, `saveUploadCounter()`
- **Removed**: 110-line inline deploy payload builder → `buildMobileDeployBundle()`
- **Removed**: 40-line inline upload fetch → `uploadFile()`
- **Preserved**: All UI rendering, card interactions, panel logic, orientation handling

---

## Symbols Moved (Old → New Location)

### From `editorExport.ts` → Service Layer

| Symbol | New Location |
|---|---|
| `loadProject()` | `services/storage/projectStore.ts` |
| `saveProject()` | `services/storage/projectStore.ts` |
| `listSavedSlugs()` | `services/storage/projectStore.ts` |
| `storageKey()` (private) | `services/storage/projectStore.ts` → `projectKey()` |
| `STORAGE_PREFIX` | `services/storage/projectStore.ts` → `PROJECT_PREFIX` |
| `deployGateway()` | `services/deploy/api.ts` |
| `downloadProjectJson()` | `services/runtime/download.ts` |

### From `App.tsx` → Service Layer

| Symbol | New Location |
|---|---|
| Inline slug init (`localStorage.getItem/setItem`) | `services/runtime/urlState.ts` → `getOrCreateDesktopSlug()` |
| `localStorage.setItem("drip-studio:desktop-slug")` | `services/storage/projectStore.ts` → `saveDesktopSlug()` |
| `localStorage.setItem("ghostFlowSeen")` | `services/storage/projectStore.ts` → `markGhostFlowSeen()` |
| `localStorage.removeItem("ghostFlowSeen")` | `services/storage/projectStore.ts` → `resetGhostFlow()` |
| `buildPagePayload()` (desktop, inline) | `services/deploy/buildPayload.ts` → `buildDesktopPagePayload()` |
| `scaleForDeploy()` (desktop, inline) | `services/deploy/buildPayload.ts` → `scaleDesktop()` |
| Main/holiday payload assembly | `services/deploy/buildPayload.ts` → `buildDesktopDeployBundle()` |
| `fetch("/api/upload")` | `services/upload/api.ts` → `uploadFile()` |

### From `MobileApp.tsx` → Service Layer

| Symbol | New Location |
|---|---|
| Inline slug init | `services/runtime/urlState.ts` → `getOrCreateMobileSlug()` |
| `localStorage.getItem("drip-studio:user-uploads")` | `services/storage/projectStore.ts` → `loadUserUploads()` |
| `localStorage.setItem("drip-studio:user-uploads")` | `services/storage/projectStore.ts` → `saveUserUploads()` |
| `localStorage.getItem/setItem("drip-studio:upload-counter")` | `services/storage/projectStore.ts` → `loadUploadCounter()` / `saveUploadCounter()` |
| `buildPagePayload()` (mobile, inline) | `services/deploy/buildPayload.ts` → `buildMobilePagePayload()` |
| `scaleForDeploy()` (mobile, inline) | `services/deploy/buildPayload.ts` → `scaleMobile()` |
| Main/holiday payload assembly | `services/deploy/buildPayload.ts` → `buildMobileDeployBundle()` |
| `fetch(UPLOAD_ENDPOINT)` | `services/upload/api.ts` → `uploadFile()` |

### New Symbols (not previously existing)

| Symbol | Location | Purpose |
|---|---|---|
| `loadDesktopSlug()` | `services/storage/projectStore.ts` | Read desktop slug |
| `saveMobileSlug()` | `services/storage/projectStore.ts` | Write mobile slug |
| `hasSeenGhostFlow()` | `services/storage/projectStore.ts` | Check ghost flow flag |
| `UploadResult` type | `services/upload/api.ts` | Typed upload response |
| `tenantContentUrl()` | `services/upload/api.ts` | Build remote URL |
| `ScaleParams` type | `services/deploy/buildPayload.ts` | Coordinate scaling input |
| `DesktopBuildContext` | `services/deploy/buildPayload.ts` | Desktop payload context |
| `MobileBuildContext` | `services/deploy/buildPayload.ts` | Mobile payload context |

---

## What Was NOT Changed

- Desktop/mobile UI separation: fully preserved
- Boot flow: `main.tsx` responsive detection unchanged
- JSX rendering: zero JSX modified
- Card interactions: hook unchanged
- Ghost flow: timing and logic unchanged (only localStorage calls moved)
- Deploy endpoint value: `https://tenant-cdn.cryptocapitalgroupfl.workers.dev/deploy-demo` unchanged
- Upload endpoint value: `/api/upload` unchanged
- Deploy payload structure: identical JSON output
- Coordinate scaling math: identical formulas
- CSS: untouched
- Cloudflare Functions: untouched
- Orphan files: not deleted
- No new dependencies added
