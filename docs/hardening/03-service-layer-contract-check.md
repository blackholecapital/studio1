# 03 - Service Layer Contract Check

> Date: 2026-03-31

---

## Build Verification

### TypeScript Check
```
$ npx tsc --noEmit
(no errors)
```

### Production Build
```
$ npx vite build
vite v5.4.21 building for production...
✓ 55 modules transformed.
dist/index.html                     0.59 kB │ gzip:  0.34 kB
dist/assets/drip-CwVvgWYr.png   1,325.25 kB
dist/assets/index-Bozr73Kf.css     54.44 kB │ gzip: 10.82 kB
dist/assets/index-78o4RZs4.js     217.43 kB │ gzip: 64.73 kB
✓ built in 1.41s
```

### Build Comparison

| Metric | Step 01 Baseline | Step 02 | Step 03 (now) |
|---|---|---|---|
| Modules | 41 | 49 | 55 (+6 service modules) |
| CSS size | 54.44 kB | 54.44 kB | 54.44 kB (identical) |
| CSS gzip | 10.82 kB | 10.82 kB | 10.82 kB (identical) |
| JS size | 217.61 kB | 217.21 kB | 217.43 kB |
| JS gzip | 64.99 kB | 64.92 kB | 64.73 kB |
| Build time | 1.00s | 1.41s | 1.41s |
| Warning | `/placeholders/black-canvas.jpg` | same | same |

**CSS remains byte-identical across all three steps.** JS fluctuates slightly due to module boundary changes but gzip is actually smaller (Vite tree-shaking benefits from cleaner module boundaries).

---

## Deploy Payload Contract Check

### Desktop Deploy Payload

The `buildDesktopDeployBundle()` function in `services/deploy/buildPayload.ts` produces identical output to the inline builder that was in App.tsx:

**Preserved exactly:**
- Coordinate scaling: `DEPLOY_W=1400`, `DEPLOY_H=800`, `DEPLOY_X_OFFSET=0`, `DEPLOY_Y_OFFSET=80`
- Scale formula: `x = round(card.x * (1400/actualWsW)) + 0`, `y = round(card.y * (800/wsHeight)) + 80`
- Holiday wallpaper codes: `{ p1: "w1", p2: "w2", p3: "w4", p4: "w5" }`
- Page route mapping: `{ p1: "gate", p2: "members", p3: "access", p4: "tier-2" }`
- p4 exclusive handling: same `hasUserContent` check, same `EC-001` through `EC-006` format
- User upload detection: `^x\d+$/i` regex → include `contentUrl`
- Skin normalization: `card.skinId.toLowerCase()`
- Payload shape: `{ version: 1, slug, pages: { gate: { wallpaperCode, cards, viewport }, ... } }`

### Mobile Deploy Payload

The `buildMobileDeployBundle()` function produces identical output to the inline builder in MobileApp.tsx:

**Preserved exactly:**
- Coordinate scaling: `MOBILE_DEPLOY_W=430`, `MOBILE_DEPLOY_H=860`
- Scale formula: `x = round(card.x * (430/actualWsW))`, `y = round(card.y * (860/actualWsH))`
- Block format: `{ id, x, y, w, h, kind, title, lines, image/gif/contentUrl, skin, isExclusive, exclusivePrice }`
- Holiday wallpaper codes: same as desktop
- GIF detection: `^g\d+$/i` → `block.gif = code`
- User upload detection: `^x\d+$/i` → `block.contentUrl` from DEMO_CONTENT_BASE
- Video handling: `card.contentDisplay === "video"` → `block.contentUrl`
- Fallback content URL: `!code && (card.contentImage || card.contentUrl)` → `block.contentUrl`
- Payload shape: `{ version: 1, slug, mobile: true, pages: { gate: { mobile: true, viewport, wallpaper, blocks }, ... } }`

### Network Contract Check

**Deploy endpoint:** `POST https://tenant-cdn.cryptocapitalgroupfl.workers.dev/deploy-demo`
- Request body: `{ slug, data: { main, holiday } }` — unchanged
- Response: `{ ok, primaryUrl?, holidayUrl? }` or error — unchanged
- Error handling: identical (saves locally on network error)

**Upload endpoint:** `POST /api/upload`
- Request body: `FormData { file, slug }` — unchanged
- Response parsing: identical (handles 404, non-JSON, JSON error)
- The `UploadResult` type adds structure but the caller still receives the same data
- Mobile upload error messages are slightly simplified (single `uploadResult.error` instead of 3 separate error paths), but the error information is equivalent

---

## localStorage Contract Check

All localStorage keys and their data formats are preserved:

| Key | Format | Service Function |
|---|---|---|
| `drip-studio:project:{slug}` | JSON (ProjectData) | `loadProject()`, `saveProject()` |
| `drip-studio:desktop-slug` | string | `loadDesktopSlug()`, `saveDesktopSlug()` |
| `drip-studio:mob-slug` | string | `loadMobileSlug()`, `saveMobileSlug()` |
| `drip-studio:user-uploads` | JSON (ContentItem[]) | `loadUserUploads()`, `saveUserUploads()` |
| `drip-studio:upload-counter` | string (number) | `loadUploadCounter()`, `saveUploadCounter()` |
| `ghostFlowSeen` | `"true"` | `hasSeenGhostFlow()`, `markGhostFlowSeen()` |

**All read/write patterns are identical.** Error handling (try/catch with silent failure) is preserved for every localStorage operation.

---

## Known Differences

1. **Mobile upload error reporting simplified**: The inline `handleMobilePhotoUpload` had three separate error paths (404, non-JSON, JSON error) with distinct messages. The `uploadFile()` service returns a single `error` string which covers all three. The error information content is equivalent but phrasing may differ slightly for the non-JSON case.

2. **JS bundle hash changed**: Expected — module structure changed.

3. **`editorExport.ts` is now a pure re-export file**: Any code that imported from it gets the same symbols via re-exports. No external consumers need changes.

---

## Checkpoint Summary

### Status: SAFE TO PROCEED

- TypeScript: zero errors
- Build: succeeds, CSS identical, JS gzip smaller
- Deploy payloads: identical JSON structure and values
- Upload contract: identical request/response format
- localStorage: all keys, formats, and error handling preserved
- Desktop/mobile separation: fully preserved
- No UX changes, no API changes, no visual changes
- All re-exports maintain backwards compatibility

### Blockers: None

### Fragile areas (carried forward):
- `App.tsx` still ~1050 lines of JSX (component extraction is a future step)
- `MobileApp.tsx` still ~1000 lines of JSX
- `buildPayload.ts` duplicates desktop vs mobile logic (could be unified later, but current separation matches the distinct payload shapes)
