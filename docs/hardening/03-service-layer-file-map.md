# 03 - Service Layer File Map

> Date: 2026-03-31

---

## Directory Structure After Step 03

```
src/
├── main.tsx                              # UNCHANGED
├── core/                                 # UNCHANGED — original asset modules
│   ├── assetResolver.ts
│   ├── contentCatalog.ts
│   ├── wallpaperCatalog.ts
│   ├── mobileWallpaperCatalog.ts
│   ├── skinCatalog.ts
│   └── ... (orphans unchanged)
│
├── domain/                               # FROM STEP 02 — shared domain logic
│   ├── project/
│   │   ├── types.ts
│   │   ├── defaults.ts
│   │   ├── schema.ts
│   │   ├── migrations.ts
│   │   └── validators.ts
│   ├── editor/
│   │   ├── constants.ts
│   │   ├── selectors.ts
│   │   └── actions.ts
│   └── shared/
│       └── errors.ts
│
├── services/                             # NEW — service layer
│   ├── storage/
│   │   └── projectStore.ts             # All localStorage operations
│   ├── deploy/
│   │   ├── buildPayload.ts            # Desktop + mobile payload assembly
│   │   └── api.ts                      # Deploy network call
│   ├── upload/
│   │   └── api.ts                      # Upload network call
│   ├── assets/
│   │   ├── resolver.ts                # Facade for core/assetResolver
│   │   └── catalogs.ts                # Facade for all catalog modules
│   └── runtime/
│       ├── urlState.ts                 # Slug get-or-create helpers
│       └── download.ts                 # Project JSON download
│
├── shared/                               # FROM STEP 02 — shared utilities
│   └── lib/
│       ├── guards.ts
│       └── normalize.ts
│
├── ui/                                   # MODIFIED — callers thinned
│   ├── App.tsx                          # Desktop editor (uses services)
│   ├── MobileApp.tsx                    # Mobile editor (uses services)
│   ├── state/
│   │   ├── editorExport.ts             # Now pure re-export hub
│   │   └── layoutConfig.ts             # UNCHANGED
│   ├── hooks/
│   │   └── useCardInteractions.ts      # UNCHANGED since Step 02
│   ├── styles.css                       # UNCHANGED
│   ├── mobile.css                       # UNCHANGED
│   └── ... (components, panels — orphans unchanged)
│
└── mobile/                               # UNCHANGED (orphans)
```

---

## Service Dependency Graph

```
services/storage/projectStore.ts
  └── domain/project/validators.ts (parseProject)

services/deploy/api.ts
  ├── domain/project/types.ts
  ├── domain/editor/constants.ts (R2_DEPLOY_ENDPOINT)
  └── services/storage/projectStore.ts (saveProject — fallback on error)

services/deploy/buildPayload.ts
  ├── domain/project/types.ts
  ├── domain/project/defaults.ts (PAGE_ROUTES, HOLIDAY_WALLPAPER_CODES)
  ├── domain/editor/constants.ts (deploy dimensions, DEMO_CONTENT_BASE)
  └── core/wallpaperCatalog.ts (WallpaperItem type)

services/upload/api.ts
  └── domain/editor/constants.ts (UPLOAD_ENDPOINT, DEMO_CONTENT_BASE)

services/assets/resolver.ts
  └── core/assetResolver.ts (re-export)

services/assets/catalogs.ts
  ├── core/wallpaperCatalog.ts (re-export)
  ├── core/mobileWallpaperCatalog.ts (re-export)
  ├── core/contentCatalog.ts (re-export)
  └── core/skinCatalog.ts (re-export)

services/runtime/urlState.ts
  ├── services/storage/projectStore.ts (slug load/save)
  └── domain/editor/actions.ts (generateSlug)

services/runtime/download.ts
  └── domain/project/types.ts
```

---

## Caller → Service Mapping

### App.tsx (Desktop)
| Operation | Before | After |
|---|---|---|
| Slug init | Inline `localStorage.getItem/setItem` | `getOrCreateDesktopSlug()` |
| Slug save | `localStorage.setItem(...)` | `saveDesktopSlug()` |
| Ghost flow seen | `localStorage.setItem("ghostFlowSeen")` | `markGhostFlowSeen()` |
| Ghost flow reset | `localStorage.removeItem("ghostFlowSeen")` | `resetGhostFlowStorage()` |
| Deploy payload | 100-line inline builder | `buildDesktopDeployBundle()` |
| Deploy request | via `editorExport.deployGateway` | Same (re-exported from service) |
| Upload request | Inline `fetch("/api/upload")` | `uploadFile()` |
| Project save | via `editorExport.saveProject` | Same (re-exported from service) |
| Project load | via `editorExport.loadProject` | Same (re-exported from service) |

### MobileApp.tsx (Mobile)
| Operation | Before | After |
|---|---|---|
| Slug init | Inline `localStorage.getItem/setItem` | `getOrCreateMobileSlug()` |
| Upload state init | Inline `localStorage.getItem(...)` | `loadUserUploads()`, `loadUploadCounter()` |
| Upload state save | Inline `localStorage.setItem(...)` | `saveUserUploads()`, `saveUploadCounter()` |
| Deploy payload | 110-line inline builder | `buildMobileDeployBundle()` |
| Deploy request | via `editorExport.deployGateway` | Same (re-exported from service) |
| Upload request | Inline `fetch(UPLOAD_ENDPOINT)` | `uploadFile()` |

### editorExport.ts
| Before | After |
|---|---|
| 105 lines of implementation | 24 lines of re-exports |
| Direct localStorage calls | Delegates to `services/storage/projectStore` |
| Inline deploy fetch | Delegates to `services/deploy/api` |
| Inline download helper | Delegates to `services/runtime/download` |
