# 01 - Baseline Config Surface

> Snapshot date: 2026-03-31
> Commit: 69e8236 (Initial commit)

---

## 1. Environment Variables

### Server-Side (Cloudflare Pages Functions bindings)

| Variable | File | Required | Default | Purpose |
|---|---|---|---|---|
| `DEMO_BUCKET` | `functions/api/deploy.js`, `upload.js`, `tenant-content/[[path]].js` | Yes | - | R2 bucket for deploys + tenant content |
| `MEDIA_ASSETS_BUCKET` | `functions/api/media/[[path]].js` | Yes | - | R2 bucket for public media assets |
| `DEMO_BASE_URL` | `functions/api/deploy.js` | No | `https://gateway.xyz-labs.xyz` | Base URL for generated gateway links |

### Client-Side

**None.** No `import.meta.env`, `process.env`, or `VITE_*` variables are used in client code.

### .env Files

**None present** in the repository.

---

## 2. Hard-Coded Domains

| Domain | File(s) | Usage |
|---|---|---|
| `https://media.xyz-labs.xyz` | `src/core/assetResolver.ts:5` | MEDIA_BASE - all wallpaper/skin/content/gif asset URLs |
| `https://demo-content.xyz-labs.xyz` | `src/ui/App.tsx`, `src/ui/MobileApp.tsx` | Tenant-uploaded content serving |
| `https://tenant-cdn.cryptocapitalgroupfl.workers.dev` | `src/ui/state/editorExport.ts:113` | R2_DEPLOY_ENDPOINT for project deployment |
| `https://gateway.xyz-labs.xyz` | `src/ui/App.tsx`, `src/ui/MobileApp.tsx`, `functions/api/deploy.js` | Default base for deployed gateway URLs |

---

## 3. API Endpoints

### Client-Side Calls

| Endpoint | Method | Source File | Purpose |
|---|---|---|---|
| `/api/upload` | POST | `App.tsx:840`, `MobileApp.tsx:46` | Upload files to R2 |
| `https://tenant-cdn.cryptocapitalgroupfl.workers.dev/deploy-demo` | POST | `editorExport.ts:122` | Deploy project JSON to R2 |
| `{user-provided-url}` | GET | `ScraperPanel.tsx:74` | HTML scraping (orphaned panel) |

### Server-Side Routes (Cloudflare Functions)

| Route | Method | Handler File | Purpose |
|---|---|---|---|
| `/api/upload` | POST | `functions/api/upload.js` | Accept file uploads (5MB limit) |
| `/api/deploy` | POST/PUT | `functions/api/deploy.js` | Deploy main + holiday JSON bundles |
| `/api/media/*` | GET | `functions/api/media/[[path]].js` | Proxy media assets from R2 |
| `/api/tenant-content/*` | GET | `functions/api/tenant-content/[[path]].js` | Serve tenant uploaded content |

---

## 4. localStorage Keys

| Key Pattern | File | Type | Purpose |
|---|---|---|---|
| `drip-studio:project:{slug}` | `editorExport.ts:22` | JSON (ProjectData) | Full project state |
| `drip-studio:desktop-slug` | `App.tsx:137` | string | Current desktop tenant slug |
| `drip-studio:mob-slug` | `MobileApp.tsx:148` | string | Current mobile tenant slug |
| `drip-studio:user-uploads` | `MobileApp.tsx:182` | JSON (ContentItem[]) | Mobile uploaded file references |
| `drip-studio:upload-counter` | `MobileApp.tsx:188` | number | Upload counter for x-codes |
| `ghostFlowSeen` | `App.tsx:195` | boolean | Onboarding completion flag |

---

## 5. R2 Storage Paths

### DEMO_BUCKET

| Path Pattern | Written By | Purpose |
|---|---|---|
| `json/{slug}/main.json` | `deploy.js` | Primary deployed project spec |
| `json/{slug}/site.json` | `deploy.js` | Compat alias (copy of main) |
| `json/{slug}/holiday.json` | `deploy.js` | Holiday variant spec |
| `tenant-content/{slug}/{filename}` | `upload.js` | User-uploaded media files |

### MEDIA_ASSETS_BUCKET

| Path Pattern | Read By | Purpose |
|---|---|---|
| `wallpaper/w{N}.png` | `media/[[path]].js` | Desktop wallpapers (w1-w50, w1234, w12345) |
| `wallpaper/H{N}.png` | `media/[[path]].js` | Holiday wallpapers (H1-H4) |
| `mobile-wallapaper/m{N}.png` | `media/[[path]].js` | Mobile wallpapers (m1-m50, m1234, m12345) |
| `skins/S{N}.png` | `media/[[path]].js` | Card skins (S1-S4) |
| `content/c{N}.png` | `media/[[path]].js` | Content images (c1-c6, c2222, etc.) |
| `gif/g{N}.png` | `media/[[path]].js` | GIF assets |

---

## 6. Asset Code Systems

### Wallpaper Codes (Desktop)
- Sequential: `w1` through `w50`
- Named: `w1234`, `w12345`
- Default: `w1234`
- Holiday: `H1`, `H2`, `H3`, `H4`

### Wallpaper Codes (Mobile)
- Sequential: `m1` through `m50`
- Named: `m1234`, `m12345`
- Default: `m1234`

### Content Codes
- Sequential: `c1` through `c6`
- Named: `c2222`, `c2232`, `c2233`, `c2244`, `c4444`, `c5555`, `c8886`, `c8887`, `c8888`, `c9998`
- GIFs: `g1`, `g2`, ...
- User uploads: `x001`, `x002`, ... (auto-incremented)

### Skin Codes
- `S1` = Rainbow
- `S2` = Steel
- `S3` = Flame
- `S4` = Corporate

---

## 7. Build Configuration

| Setting | Value | File |
|---|---|---|
| Build tool | Vite 5.4.2 | `package.json` |
| Node engine | >=22 <23 | `package.json` |
| TS target | ES2022 | `tsconfig.json` |
| TS module | ESNext | `tsconfig.json` |
| JSX | react-jsx | `tsconfig.json` |
| Strict mode | true | `tsconfig.json` |
| Dev port | 5173 | `vite.config.ts` |
| React version | 18.3.1 | `package.json` |

---

## 8. Deploy Dimensions

| Context | Width | Height | Notes |
|---|---|---|---|
| Desktop workspace | 900px | 720px | Max 1120x900 |
| Desktop deploy target | 1400px | 800px | Coordinates scaled from workspace |
| Mobile workspace | 430px | dynamic | window.innerHeight - 63 |
| Mobile deploy target | 430px | 860px | MOBILE_CANVAS constant |

---

## 9. Magic Numbers & Constants

| Constant | Value | Location | Purpose |
|---|---|---|---|
| Mobile breakpoint | 768px | `main.tsx` | Desktop/mobile switch |
| Max upload size | 5MB | `upload.js` | Server-side upload limit |
| Max image dimension | 1200px | `App.tsx`, `MobileApp.tsx` | Client-side image resize cap |
| Sidebar width | 175px | `layoutConfig.ts` | UI layout |
| Cache TTL | 86400s (24h) | `media/[[path]].js`, `tenant-content/[[path]].js` | CDN cache duration |
| Deploy Y offset | 80px | `App.tsx` deploy flow | Clears nav bar at runtime |
| Upload code prefix | `x` | `App.tsx`, `MobileApp.tsx` | User upload content codes |
| Slug length | 8 chars | `App.tsx`, `MobileApp.tsx` | `Math.random().toString(36).slice(2,10)` |

---

## Assumptions

1. All client config is hard-coded (no runtime config fetching).
2. Server config is via Cloudflare bindings only (no .env files needed).
3. The `DEMO_BASE_URL` env var is optional; production uses the default `https://gateway.xyz-labs.xyz`.
4. No feature flags exist.
5. No A/B testing or experiment configuration.
6. The deploy endpoint URL (`tenant-cdn.cryptocapitalgroupfl.workers.dev`) is a separate Cloudflare Worker, not co-located with the Pages Functions.
