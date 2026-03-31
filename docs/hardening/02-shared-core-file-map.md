# 02 - Shared Core File Map

> Date: 2026-03-31

---

## Directory Structure After Extraction

```
src/
├── main.tsx                              # UNCHANGED — root bootstrap
├── core/                                 # UNCHANGED — asset catalogs
│   ├── assetResolver.ts                  # UNCHANGED
│   ├── contentCatalog.ts                 # UNCHANGED
│   ├── defaultContent.ts                 # UNCHANGED (orphan)
│   ├── layoutPresets.ts                  # UNCHANGED (orphan)
│   ├── mobileWallpaperCatalog.ts         # UNCHANGED
│   ├── scrape.ts                         # UNCHANGED (orphan)
│   ├── skinCatalog.ts                    # UNCHANGED
│   ├── store.ts                          # UNCHANGED (orphan)
│   ├── types.ts                          # UNCHANGED (orphan, not domain/project/types.ts)
│   └── wallpaperCatalog.ts              # UNCHANGED
│
├── domain/                               # NEW — shared domain logic
│   ├── project/
│   │   ├── types.ts                     # Canonical types (CardModel, PageData, ProjectData, etc.)
│   │   ├── defaults.ts                  # Factory functions + shared constants
│   │   ├── schema.ts                    # Version constant, limits, slug pattern
│   │   ├── migrations.ts               # Version migration framework
│   │   └── validators.ts               # Safe parse/validate for persisted state
│   ├── editor/
│   │   ├── constants.ts                 # Deploy dims, endpoints, magic numbers
│   │   ├── selectors.ts                # Pure selectors (pageDataToCardState, hasAnyOverlap, etc.)
│   │   └── actions.ts                  # Slug helpers
│   └── shared/
│       └── errors.ts                    # Result<T> type
│
├── shared/                               # NEW — shared utilities
│   └── lib/
│       ├── guards.ts                    # Runtime type guards
│       └── normalize.ts                # Image conversion (convertToPng)
│
├── ui/                                   # MODIFIED — imports updated
│   ├── App.tsx                          # Desktop editor (imports from domain, removed duplicates)
│   ├── MobileApp.tsx                    # Mobile editor (imports from domain, removed duplicates)
│   ├── styles.css                       # UNCHANGED
│   ├── mobile.css                       # UNCHANGED
│   ├── state/
│   │   ├── editorExport.ts             # Re-exports types from domain, uses parseProject
│   │   └── layoutConfig.ts             # UNCHANGED
│   ├── hooks/
│   │   └── useCardInteractions.ts      # Re-exports types from domain
│   ├── components/                      # UNCHANGED (all orphaned)
│   ├── panels/                          # UNCHANGED (all orphaned)
│   └── styles/
│       └── studio-shell.css            # UNCHANGED (orphaned)
│
└── mobile/                               # UNCHANGED (all orphaned)
    ├── components/
    │   └── MobilePreviewPane.tsx
    └── mobileLayoutPresets.ts
```

---

## Import Dependency Graph (After)

```
domain/project/types.ts
  └── (no dependencies — leaf module)

domain/project/schema.ts
  └── (no dependencies — leaf module)

domain/project/defaults.ts
  ├── domain/project/types.ts
  └── core/wallpaperCatalog.ts

domain/project/migrations.ts
  └── domain/project/schema.ts

domain/project/validators.ts
  ├── domain/project/types.ts
  ├── domain/project/schema.ts
  ├── domain/project/defaults.ts
  └── domain/project/migrations.ts

domain/editor/constants.ts
  └── ui/state/layoutConfig.ts (re-export)

domain/editor/selectors.ts
  └── domain/project/types.ts

domain/editor/actions.ts
  └── domain/project/schema.ts

domain/shared/errors.ts
  └── (no dependencies — leaf module)

shared/lib/guards.ts
  └── (no dependencies — leaf module)

shared/lib/normalize.ts
  └── domain/project/schema.ts (MAX_IMAGE_DIMENSION)

ui/hooks/useCardInteractions.ts
  └── domain/project/types.ts (re-export + import)

ui/state/editorExport.ts
  ├── domain/project/types.ts (re-export)
  ├── domain/project/defaults.ts (re-export)
  ├── domain/project/validators.ts
  └── domain/editor/constants.ts

ui/App.tsx
  ├── core/wallpaperCatalog.ts
  ├── core/contentCatalog.ts
  ├── core/skinCatalog.ts
  ├── core/assetResolver.ts
  ├── ui/state/editorExport.ts
  ├── ui/state/layoutConfig.ts
  ├── ui/hooks/useCardInteractions.ts
  ├── domain/project/types.ts
  ├── domain/project/defaults.ts
  ├── domain/editor/constants.ts
  ├── domain/editor/selectors.ts
  ├── domain/editor/actions.ts
  └── shared/lib/normalize.ts

ui/MobileApp.tsx
  ├── core/wallpaperCatalog.ts
  ├── core/mobileWallpaperCatalog.ts
  ├── core/assetResolver.ts
  ├── core/contentCatalog.ts
  ├── core/skinCatalog.ts
  ├── ui/state/editorExport.ts
  ├── ui/hooks/useCardInteractions.ts
  ├── domain/project/types.ts
  ├── domain/project/defaults.ts
  ├── domain/editor/constants.ts
  ├── domain/editor/selectors.ts
  ├── domain/editor/actions.ts (maxCardCounter only)
  └── shared/lib/normalize.ts
```

---

## Backwards Compatibility

Re-exports are provided at old import paths so any external or orphaned code
that imports from the original locations will continue to work:

| Old Import Path | Re-exports |
|---|---|
| `ui/hooks/useCardInteractions` | `CardModel`, `CardInteractionState` |
| `ui/state/editorExport` | `PageData`, `ProjectData`, `DeployResult`, `makeEmptyPage`, `makeEmptyProject` |
