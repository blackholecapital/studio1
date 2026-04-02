# 05a — Mobile Logic Parity Check

> Date: 2026-04-02

## Build Verification

- `npx tsc --noEmit`: No new errors (only pre-existing App.tsx type mismatch)
- `npx vite build`: Passes (72 modules, up from 66)
- Module count increase: +6 (the 6 new extracted files)

## Behavioral Parity

### Card Operations
| Operation | Before | After | Parity |
|---|---|---|---|
| Add card | Inline in MobileApp | `addMobileCardReducer(cur)` | Identical logic |
| Delete card | Inline in MobileApp | `deleteSelectedCardReducer(cur)` | Identical logic |
| Cube layout (1-4) | Inline in MobileApp | `applyCubeLayoutReducer(cur, count)` | Identical logic |
| Lock size | Inline in MobileApp | `setSelectedCardLockSize(cur, next)` | Identical logic |
| Lock position | Inline in MobileApp | `setSelectedCardLockPosition(cur, next)` | Identical logic |
| Toggle page lock | Inline in MobileApp | `togglePageLockState(cur)` | Identical logic |
| Lock all pages | Inline in MobileApp | `lockAllPagesProject(prev)` | Identical logic |
| Unlock all pages | Inline in MobileApp | `unlockAllPagesProject(prev)` | Identical logic |
| Reset all pages | Inline in MobileApp | `resetAllPagesProject(prev)` | Identical logic |

### Content Application
| Operation | Before | After | Parity |
|---|---|---|---|
| Apply content to card | Inline setCardState | `applyContentToSelectedCard()` | Identical mapping |
| Apply skin to card | Inline setCardState | `applySkinToSelectedCard()` | Identical mapping |
| Apply media to card | Inline setCardState | `applyMediaToSelectedCard()` | Identical mapping |
| Card drop (content) | Inline setCardState | `applyDropToCard()` | Identical mapping |
| Card drop (skin) | Inline setCardState | `applySkinDropToCard()` | Identical mapping |

### Deploy Flow
| Operation | Before | After | Parity |
|---|---|---|---|
| Save | `handleSave()` inline | `useMobileDeployFlow.handleSave()` | Identical: overlap check, save, status |
| Deploy | `handleDeploy()` inline | `useMobileDeployFlow.handleDeploy()` | Identical: payload build, POST, modal |

### Upload Flow
| Operation | Before | After | Parity |
|---|---|---|---|
| Photo upload | `handleMobilePhotoUpload()` inline | `useMobileUploadFlow.handleMobilePhotoUpload()` | Identical: PNG convert, x-code, R2 upload |
| User uploads state | `useState` in MobileApp | Owned by `useMobileUploadFlow` | Same persistence to localStorage |
| Upload counter | `useState` in MobileApp | Owned by `useMobileUploadFlow` | Same persistence to localStorage |

### Derived State
| Value | Before | After | Parity |
|---|---|---|---|
| Selected card | `useMemo` inline | `getSelectedCard(cardState)` | Identical fallback chain |
| Page navigation | 3 inline computations | `getPageNavigation(page)` | Identical logic |
| Is page locked | Inline function | `isPageLocked(project, page, cardState, key)` | Identical logic |
| All pages locked | `PAGE_KEYS.every(...)` inline | `getAllPagesLocked(project, page, cardState)` | Identical logic |

## Desktop Impact

- **None.** No desktop files modified.
- Desktop imports, state, and rendering are completely unchanged.

## Deploy Payload Parity

The deploy flow uses the exact same `buildMobileDeployBundle` call with the same
parameters. The exclusive tiles are passed through identically. No payload shape changes.

## Coordinate/Scaling Parity

`getMobDims()`, `makeMobDefaultCard()`, and `applyCubeLayout()` all use the same
dimension calculations (window.innerWidth, MOB_NAV_H, margin/gap constants).
The card counter module preserves the same global mutable counter behavior.

## Removed Imports (No Longer Needed in MobileApp.tsx)

- `wallpaperCatalog` — used only in deploy flow (now in hook)
- `DEFAULT_MOBILE_WALLPAPER_URL` — replaced by `DEFAULT_WALLPAPER` from constants
- `MEDIA_BASE` — was unused
- `saveProject`, `deployGateway` — moved to deploy flow hook
- `PAGE_ROUTES`, `HOLIDAY_WALLPAPER_CODES` — were unused in MobileApp
- `hasAnyOverlap` — moved to deploy flow hook
- `MOB_NAV_H`, `MOBILE_DEPLOY_W`, `MOBILE_DEPLOY_H`, `MOBILE_INSTRUCTIONS_IMAGE`, `UPLOAD_ENDPOINT`, `DEMO_CONTENT_BASE`, `GATEWAY_BASE` — used only in extracted modules
- `convertToPng` — moved to upload flow hook
- `saveMobileSlug`, `saveUserUploads`, `saveUploadCounter`, `loadUserUploads`, `loadUploadCounter` — moved to hooks
- `buildMobileDeployBundle` — moved to deploy flow hook
- `uploadFile` — moved to upload flow hook
- `ContentItem` type — used only in upload flow hook

## Checkpoint Status

**Safe to proceed** — all logic extracted preserves exact behavioral parity.
Build passes. No desktop changes. No visual changes.
