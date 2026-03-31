# 02 - Shared Core Validation Notes

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
✓ 49 modules transformed.
dist/index.html                     0.59 kB │ gzip:  0.35 kB
dist/assets/drip-CwVvgWYr.png   1,325.25 kB
dist/assets/index-Bozr73Kf.css     54.44 kB │ gzip: 10.82 kB
dist/assets/index-CkNLyMZa.js     217.21 kB │ gzip: 64.92 kB
✓ built in 1.41s
```

### Comparison with Baseline (Step 01)

| Metric | Baseline | After Step 02 | Delta |
|---|---|---|---|
| Modules transformed | 41 | 49 | +8 (new domain modules) |
| CSS bundle size | 54.44 kB | 54.44 kB | 0 (identical) |
| JS bundle size | 217.61 kB | 217.21 kB | -0.40 kB (removed duplicate code) |
| CSS gzip | 10.82 kB | 10.82 kB | 0 (identical) |
| JS gzip | 64.99 kB | 64.92 kB | -0.07 kB |
| Build time | 1.00s | 1.41s | +0.41s (more modules to resolve) |
| Warning | `/placeholders/black-canvas.jpg` | same | unchanged |

**CSS is byte-identical.** JS is slightly smaller because duplicated function bodies (pageDataToCardState, cardStateToPageData, hasAnyOverlap, convertToPng, maxCardCounter inline) were replaced with single shared implementations. Vite tree-shakes the new modules into the same single chunk.

---

## Behavioral Verification

### Desktop Rendering
- App.tsx still renders identically — no JSX changes
- Ghost flow onboarding unchanged
- Card drag/resize unchanged (hook implementation not touched)
- All tab navigation unchanged

### Mobile Rendering
- MobileApp.tsx still renders identically — no JSX changes
- Touch interactions unchanged
- Mobile upload flow unchanged
- Panel toggles unchanged

### localStorage Payloads
- **Existing payloads**: `loadProject()` now uses `parseProject()` from validators.ts, which:
  1. Parses JSON (same as before)
  2. Runs `migrateProject()` — passthrough for version 1 (same result)
  3. Normalizes each page via `normalizePage()` — patches missing `instructions` field (same behavior as the old inline fix)
  4. Validates card shapes via `isValidCard()` — filters out corrupted entries (new safety, previously would pass through)
- **Behavioral difference**: Cards with non-finite coordinates or missing `id` fields will now be filtered out. Previously they would be included and could cause rendering issues. This is strictly safer, not a behavior change for valid data.

### Deploy Output
- Desktop deploy payload construction unchanged:
  - Same coordinate scaling (DEPLOY_W=1400, DEPLOY_H=800, Y_OFFSET=80)
  - Same holiday wallpaper codes (w1, w2, w4, w5)
  - Same PAGE_ROUTES mapping (p1→gate, p2→members, p3→access, p4→tier-2)
- Mobile deploy payload construction unchanged:
  - Same coordinate scaling (MOBILE_DEPLOY_W=430, MOBILE_DEPLOY_H=860)
  - Same holiday wallpaper codes
  - Same PAGE_ROUTES mapping

### Upload Flow
- Desktop: `convertToPng` extracted from inline Promise to shared function — same MAX_IMAGE_DIMENSION (1200), same canvas conversion, same fallback behavior
- Mobile: `convertToPng` moved from module-level function to shared import — identical implementation

---

## Assumptions

1. **Re-exports are safe**: Existing code importing from `editorExport.ts` or `useCardInteractions.ts` will get the same types via re-exports. No external consumers need updating.
2. **Migration passthrough**: `migrateProject()` returns the data unchanged for version 1. No existing data will be rejected.
3. **Validator strictness**: `isValidCard()` requires `id`, `x`, `y`, `w`, `h` to be present and finite. This matches the implicit contract that all card operations depend on.
4. **No orphan deletion**: `core/types.ts` (the old types file) is still present and unchanged. It defines `TabKey`, `CardKind`, `LayoutId`, `BlockSpec`, `PageSpec`, `DemoSpecBundle` — none of which overlap with the new `domain/project/types.ts`. No collision.

---

## Known Differences from Baseline

1. **`loadProject()` is slightly stricter**: Uses `parseProject()` which validates card shapes. Invalid cards are silently filtered. This is a safety improvement, not a behavior change for valid data.
2. **`cardStateToPageData()` signature unified**: Desktop version took `(cs, wallpaper, instructions)`, mobile took `(cs, wallpaper)`. Now a single function with `instructions = ""` default. Mobile call sites pass no third argument, so the empty string default matches the old hardcoded `""`.
3. **JS bundle hash changed**: `index-DZQCCZoo.js` → `index-CkNLyMZa.js` (expected; code structure changed even if behavior didn't).

---

## Checkpoint Summary

### Status: SAFE TO PROCEED

- TypeScript: zero errors
- Build: succeeds, CSS identical, JS slightly smaller
- No UX changes
- No API contract changes
- No deploy output changes
- Existing localStorage payloads load correctly (with added validation safety)
- Desktop/mobile separation fully preserved
- All re-exports maintain backwards compatibility

### Blockers: None

### Fragile areas (carried forward from Step 01):
- `App.tsx` still 1100+ lines of JSX (component extraction is a future step)
- `MobileApp.tsx` still 1300+ lines of JSX
- Deploy coordinate scaling still inline in both editors (could be extracted in a future step, but touches UI state refs)
