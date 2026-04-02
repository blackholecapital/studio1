# 07 — Cleanup File Map

> Date: 2026-04-02

## Files Added

```
.github/workflows/ci.yml                        # CI: install + typecheck + build + test
src/__tests__/validators.test.ts                 # Project schema tests
src/__tests__/buildPayload.test.ts               # Deploy payload tests
src/__tests__/exclusiveTileHydration.test.ts     # Exclusive tile tests
src/__tests__/apiValidation.test.ts              # API validation tests
```

## Files Modified

```
.gitignore                     # Added .env.*, *.local
package.json                   # Added vitest, test script
package-lock.json              # Updated
```

## Files Removed

```
# Build artifacts (untracked from git)
dist/assets/drip-CwVvgWYr.png
dist/devnotes/3.22.26
dist/devnotes/3.222.26
dist/placeholders/black-canvas.jpg
dist/stickers/A1.png
dist/stickers/A2.png
dist/stickers/A3.png
dist/stickers/ali-ai1.png

# Orphan source files (20)
src/core/defaultContent.ts
src/core/layoutPresets.ts
src/core/scrape.ts
src/core/store.ts
src/core/types.ts
src/domain/shared/errors.ts
src/mobile/components/MobilePreviewPane.tsx
src/mobile/mobileLayoutPresets.ts
src/services/assets/catalogs.ts
src/services/assets/resolver.ts
src/shared/lib/guards.ts
src/ui/components/AccordionCardEditor.tsx
src/ui/components/AssistantPromoCard.tsx
src/ui/components/DevCardTools.tsx
src/ui/components/FloatingCard.tsx
src/ui/components/LayoutButtons.tsx
src/ui/components/PreviewPane.tsx
src/ui/components/Tabs.tsx
src/ui/panels/PrototypePanel.tsx
src/ui/panels/ScraperPanel.tsx
```

## Final Source File Count

| Area | Files |
|---|---|
| `src/core/` | 5 (was 10) |
| `src/domain/` | 6 (was 7) |
| `src/services/` | 6 (was 8) |
| `src/shared/` | 1 (was 2) |
| `src/ui/` (desktop) | 10 |
| `src/ui/` (mobile) | 10 |
| `src/ui/` (shared) | 5 (was 15) |
| `src/__tests__/` | 4 (new) |
| `functions/api/` | 9 (was 5, +4 shared) |
| **Total source** | **56** (was 70) |
