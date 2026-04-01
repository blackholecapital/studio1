# 01 - Baseline Import Graph

> Snapshot date: 2026-03-31
> Commit: 69e8236 (Initial commit)
> Build tool: Vite 5.4 + React 18.3 + TypeScript 5.5

---

## Entrypoints

| Entrypoint | Type | File |
|---|---|---|
| HTML root | Browser | `index.html` |
| JS entry | Vite module | `src/main.tsx` |
| Desktop app | React component | `src/ui/App.tsx` |
| Mobile app | React component | `src/ui/MobileApp.tsx` |
| Deploy worker | Cloudflare Pages Function | `functions/api/deploy.js` |
| Upload worker | Cloudflare Pages Function | `functions/api/upload.js` |
| Media proxy | Cloudflare Pages Function | `functions/api/media/[[path]].js` |
| Tenant proxy | Cloudflare Pages Function | `functions/api/tenant-content/[[path]].js` |
| Mobile deploy helper | Shared module (server) | `functions/api/deploy-mobile.js` |

---

## Client-Side Import Tree

```
index.html
 └─ src/main.tsx
     ├─ src/ui/styles.css
     ├─ src/ui/App.tsx  (desktop, window.innerWidth > 768)
     │   ├─ src/core/wallpaperCatalog.ts
     │   │   └─ src/core/assetResolver.ts          [MEDIA_BASE]
     │   ├─ src/core/contentCatalog.ts
     │   │   └─ src/core/assetResolver.ts           (shared)
     │   ├─ src/core/skinCatalog.ts
     │   │   └─ src/core/assetResolver.ts           (shared)
     │   ├─ src/core/assetResolver.ts               (shared)
     │   ├─ src/ui/state/editorExport.ts
     │   │   └─ src/core/wallpaperCatalog.ts        (shared)
     │   ├─ src/ui/state/layoutConfig.ts
     │   └─ src/ui/hooks/useCardInteractions.ts
     │
     └─ src/ui/MobileApp.tsx  (mobile, window.innerWidth <= 768)
         ├─ src/ui/mobile.css
         ├─ src/core/wallpaperCatalog.ts            (shared)
         ├─ src/core/mobileWallpaperCatalog.ts
         │   └─ src/core/assetResolver.ts           (shared)
         ├─ src/core/assetResolver.ts               (shared)
         ├─ src/core/contentCatalog.ts              (shared)
         ├─ src/core/skinCatalog.ts                 (shared)
         ├─ src/ui/state/editorExport.ts            (shared)
         └─ src/ui/hooks/useCardInteractions.ts     (shared)
```

## Server-Side (Cloudflare Functions) - No import sharing with client

```
functions/api/deploy.js          (standalone, uses env.DEMO_BUCKET, env.DEMO_BASE_URL)
functions/api/deploy-mobile.js   (standalone, exports toMobileRuntimePageSpec)
functions/api/upload.js          (standalone, uses env.DEMO_BUCKET)
functions/api/media/[[path]].js  (standalone, uses env.MEDIA_ASSETS_BUCKET)
functions/api/tenant-content/[[path]].js  (standalone, uses env.DEMO_BUCKET)
```

---

## Active Module Inventory (Client)

| Module | Imported By | Role |
|---|---|---|
| `src/main.tsx` | index.html | Root bootstrap + responsive router |
| `src/ui/App.tsx` | main.tsx | Desktop editor (1845 lines) |
| `src/ui/MobileApp.tsx` | main.tsx | Mobile editor (1427 lines) |
| `src/core/types.ts` | layoutPresets, store, components | Type definitions |
| `src/core/assetResolver.ts` | App, MobileApp, all catalogs | URL resolution (MEDIA_BASE) |
| `src/core/wallpaperCatalog.ts` | App, MobileApp, editorExport | Desktop wallpaper codes w1-w50 |
| `src/core/mobileWallpaperCatalog.ts` | MobileApp | Mobile wallpaper codes m1-m50 |
| `src/core/contentCatalog.ts` | App, MobileApp | Content codes c1-c9998 |
| `src/core/skinCatalog.ts` | App, MobileApp | Skin codes S1-S4 |
| `src/ui/state/editorExport.ts` | App, MobileApp | Save/load/deploy logic |
| `src/ui/state/layoutConfig.ts` | App | Workspace dimensions |
| `src/ui/hooks/useCardInteractions.ts` | App, MobileApp | Drag/resize/overlap |
| `src/ui/styles.css` | main.tsx | Desktop styles |
| `src/ui/mobile.css` | MobileApp | Mobile styles |

**Total active client modules: 14**

---

## Inactive Modules (Not in any active import chain)

See `01-baseline-orphan-candidates.md` for full list. Summary:

- 7 component files in `src/ui/components/`
- 2 panel files in `src/ui/panels/`
- 1 mobile component in `src/mobile/components/`
- 2 core modules (`store.ts`, `scrape.ts`) only imported by orphaned components
- 1 layout preset file (`src/mobile/mobileLayoutPresets.ts`) only imported by orphaned component
- 1 CSS file (`src/ui/styles/studio-shell.css`) not imported anywhere
- 1 core file (`src/core/defaultContent.ts`) only imported by orphaned store.ts
- 1 core file (`src/core/layoutPresets.ts`) only imported by orphaned store.ts

---

## Assumptions

1. `index.html` is the sole HTML entrypoint (confirmed by Vite config).
2. No service workers, web workers, or secondary bundles exist.
3. Cloudflare Functions are deployed separately (not bundled by Vite).
4. `dist/` contains both Vite build output AND pre-committed static assets (wallpapers, theme-packs, stickers, placeholders, skins).
5. The `functions/` directory is NOT processed by `vite build`; it is handled by Cloudflare Pages deployment.
