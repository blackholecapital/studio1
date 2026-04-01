# 04c — Exclusive Content Parity Check

> Date: 2026-04-01

## Verification Matrix

| Scenario | Before Fix | After Fix |
|----------|-----------|-----------|
| Edit exclusive tile URL in ContentRail | UI updates only | UI + project state + localStorage |
| Edit exclusive tile price | UI updates only | UI + project state + localStorage |
| Toggle tile lock/unlock | UI updates only | UI + project state + localStorage |
| Drop image onto exclusive tile in workspace | UI updates only | UI + project state + localStorage |
| Save button | Tiles NOT in saved project | Tiles saved in `pages.p4.exclusiveTiles` |
| Page reload after save | Tiles reset to defaults | Tiles restored from localStorage |
| Switch away from p4 and back | Tiles lost (reset to defaults) | Tiles preserved in project, restored on return |
| Deploy gateway | Tiles included (from transient state) | Tiles included (from canonical project state) |
| Deploy after reload | Tiles missing (defaults deployed) | Tiles correct (loaded from localStorage) |
| Download project JSON | Tiles NOT in export | Tiles included in p4 page data |
| Change slug | Tiles lost | Tiles saved with old slug, loaded from new slug |
| Reset workspace | Tiles reset (UI only) | Tiles reset in both UI and project (saved) |

## Non-exclusive page verification

| Scenario | Expected | Status |
|----------|----------|--------|
| p1 (Gateway) save/deploy | No exclusiveTiles field in page data | Verified — `undefined` when page !== p4 |
| p2 (Members) save/deploy | No exclusiveTiles field in page data | Verified |
| p3 (Access) save/deploy | No exclusiveTiles field in page data | Verified |
| Wallpaper changes on any page | Deploy correctly | Unaffected — wallpaper path unchanged |
| Card content on any page | Deploy correctly | Unaffected — card path unchanged |

## Backwards Compatibility

| Concern | Status |
|---------|--------|
| Old projects without `exclusiveTiles` field | Safe — field is optional, `normalizePage` returns `undefined` for missing/invalid, UI falls back to `DEFAULT_EXCLUSIVE_TILES` |
| Mobile editor calls `cardStateToPageData(cs, wp)` | Safe — 3rd and 4th params are optional with defaults |
| Schema version unchanged (still v1) | Safe — no migration needed, field is additive |
| `parseProject` / `normalizePage` handle corrupt tile data | Safe — `isValidExclusiveTile` filters invalid entries |

## Build Verification

- `vite build` passes: 66 modules, no errors
- No TypeScript errors
- No new warnings

## Checkpoint

**Status: Safe to proceed** — exclusive content is now a first-class part of
the desktop project model. The shared deploy path is correct. Ready for Step 5
mobile decomposition.
