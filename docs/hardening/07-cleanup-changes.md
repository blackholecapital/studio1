# 07 — Cleanup + Gates

> Date: 2026-04-02

## Summary

Final hardening pass: removed orphan code, cleaned repo artifacts, added CI
gates and minimal test coverage for critical paths.

## Orphan Files Removed (20 files)

Import graph analysis from `src/main.tsx` confirmed these files are unreachable:

| File | Reason |
|---|---|
| `src/core/defaultContent.ts` | Zero imports anywhere |
| `src/core/layoutPresets.ts` | Only imported by orphan LayoutButtons |
| `src/core/scrape.ts` | Only imported by orphan ScraperPanel |
| `src/core/store.ts` | Zero imports anywhere |
| `src/core/types.ts` | Zero imports anywhere |
| `src/domain/shared/errors.ts` | Zero imports anywhere |
| `src/mobile/components/MobilePreviewPane.tsx` | Zero imports anywhere |
| `src/mobile/mobileLayoutPresets.ts` | Zero imports anywhere |
| `src/services/assets/catalogs.ts` | Zero imports anywhere |
| `src/services/assets/resolver.ts` | Zero imports anywhere |
| `src/shared/lib/guards.ts` | Zero imports anywhere |
| `src/ui/components/AccordionCardEditor.tsx` | Zero imports anywhere |
| `src/ui/components/AssistantPromoCard.tsx` | Zero imports anywhere |
| `src/ui/components/DevCardTools.tsx` | Zero imports anywhere |
| `src/ui/components/FloatingCard.tsx` | Zero imports anywhere |
| `src/ui/components/LayoutButtons.tsx` | Zero imports anywhere |
| `src/ui/components/PreviewPane.tsx` | Zero imports anywhere |
| `src/ui/components/Tabs.tsx` | Zero imports anywhere |
| `src/ui/panels/PrototypePanel.tsx` | Zero imports anywhere |
| `src/ui/panels/ScraperPanel.tsx` | Zero imports anywhere |

### Intentionally Kept

- `src/services/runtime/exclusiveTileHydration.ts` — Created in Step 4D for
  gateway runtime consumption. Not imported by studio but serves as a shared
  utility for the gateway side.

## Repo Hygiene

- `dist/` removed from git tracking (was committed despite `.gitignore` rule)
- `.gitignore` updated: added `.env.*`, `*.local`

## CI Workflow

Added `.github/workflows/ci.yml`:
- Triggers on push to main and PRs
- Steps: checkout → Node 20 → `npm ci` → `tsc --noEmit` → `vite build` → `npm test`

## Test Suite

Added vitest as dev dependency with `npm test` script.

4 test files, 43 tests covering:

| Test File | Coverage Area | Tests |
|---|---|---|
| `validators.test.ts` | Project parse, page normalize, card validation | 12 |
| `buildPayload.test.ts` | Deploy payload builder, exclusive tile serialization | 4 |
| `exclusiveTileHydration.test.ts` | Runtime tile normalize + hydrate | 9 |
| `apiValidation.test.ts` | Slug/filename/path sanitization, MIME allowlist | 18 |

## Non-Changes

- No UX/visual changes
- No endpoint/path changes
- No deploy payload changes
- No mobile/desktop architecture changes
