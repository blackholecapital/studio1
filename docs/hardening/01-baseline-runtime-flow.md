# 01 - Baseline Runtime Flow

> Snapshot date: 2026-03-31
> Commit: 69e8236 (Initial commit)

---

## 1. App Bootstrap

```
Browser loads index.html
  → <div id="root">
  → <script type="module" src="/src/main.tsx">
  → main.tsx checks window.innerWidth
  → width <= 768 ? render <MobileApp /> : render <App />
  → resize listener toggles between App/MobileApp at runtime
```

**No routing library.** Internal navigation is tab/page state only.

---

## 2. Desktop Flow (`App.tsx`)

### 2a. Initialization
1. Read `localStorage["drip-studio:desktop-slug"]` or generate random 8-char base36 slug
2. Load `localStorage["drip-studio:project:{slug}"]` or create empty 4-page project
3. Initialize card state from page p1 (Gateway)
4. Check `localStorage["ghostFlowSeen"]` - if not set, run onboarding ghost flow
5. Ghost flow: 5-step timed sequence highlighting UI panels (400ms-3500ms intervals)

### 2b. Editor Interaction
- **Pages:** p1=Gateway, p2=Members, p3=Access, p4=Exclusive
- **Tabs:** Cards, Content, Wallpaper, Media, Skins, Exclusive
- **Left rail:** Wallpaper picker, Page switcher
- **Right rail:** Card editor, Content picker
- **Workspace:** 900x720px canvas with draggable/resizable cards
- **Card types:** text, video, social, image
- **Layout presets:** L1-L8 (8 predefined block arrangements)

### 2c. Auto-Save
- `useEffect` triggers `saveProject()` on every change to: cardState, wallpaper, page, slug, pageInstructions
- Persists full ProjectData to `localStorage["drip-studio:project:{slug}"]`
- No debounce - saves on every state change

---

## 3. Mobile Flow (`MobileApp.tsx`)

### 3a. Initialization
1. Read `localStorage["drip-studio:mob-slug"]` or generate random 8-char base36 slug
2. Compute workspace dimensions: width=window.innerWidth, height=window.innerHeight-63
3. Load project from localStorage or create empty
4. Load upload state from `localStorage["drip-studio:user-uploads"]` and `localStorage["drip-studio:upload-counter"]`

### 3b. Editor Interaction
- Same 4 pages as desktop
- Touch-friendly card manipulation
- Bottom floating action buttons
- Panels: wallpaper picker, portals, content, media, skins, exclusive
- Canvas: 430x860px mobile viewport

### 3c. Auto-Save
- Same pattern as desktop, different localStorage key prefix

---

## 4. Upload Flow (Desktop + Mobile)

```
User selects file via <input type="file">
  → handleContentFileUpload()
  → Load into Image element
  → Scale to max 1200px (longest side)
  → Convert to PNG via canvas.toBlob()
  → Generate code: x{counter} (e.g. x001, x002)
  → Create blob URL for instant preview (optimistic)
  → POST /api/upload (FormData: file + slug)
    → Server: sanitize slug & filename
    → Server: validate <= 5MB
    → Server: DEMO_BUCKET.put("tenant-content/{slug}/{filename}")
    → Response: { ok, key }
  → On success: swap blob URL → https://demo-content.xyz-labs.xyz/tenant-content/{slug}/{code}.png
  → Mobile only: auto-apply to selected card
```

---

## 5. Deploy Flow (Desktop)

```
User clicks "Deploy Gateway"
  → Validate: check for overlapping cards (abort if found)
  → Normalize slug (append suffix if collision)
  → Save slug to localStorage
  → Scale coordinates: studio (900x720) → deploy (1400x800)
    → dsx = 1400/actualWidth, dsy = 800/720, yOffset = 80
  → Build mainPayload: per-page { wallpaper code, blocks[], content codes, skin IDs }
  → Build holidayPayload: same structure, wallpaper overrides (H1-H4)
  → Wrap: { slug, data: { main: { version:1, slug, pages }, holiday: { ... } } }
  → POST https://tenant-cdn.cryptocapitalgroupfl.workers.dev/deploy-demo
    → Server (deploy.js):
      → DEMO_BUCKET.put("json/{slug}/main.json", mainPayload)
      → DEMO_BUCKET.put("json/{slug}/site.json", mainPayload)  [compat alias]
      → DEMO_BUCKET.put("json/{slug}/holiday.json", holidayPayload)
    → Response: { ok, slug, primaryUrl, holidayUrl, keys }
  → Show modal: primaryUrl = https://gateway.xyz-labs.xyz/{slug}/gate
                holidayUrl = https://gateway.xyz-labs.xyz/{slug}/holiday
```

## 6. Deploy Flow (Mobile)

```
Same as desktop except:
  → Deploy canvas: 430x860 (mobile dimensions)
  → Block format includes: mobile flag, viewport, blocks array with full card data
  → Same dual-deploy (main + holiday)
  → Same endpoint and response
```

---

## 7. Media Serving Flow

```
Asset code resolution (client-side, assetResolver.ts):
  w{N}       → https://media.xyz-labs.xyz/wallpaper/w{N}.png
  m{N}       → https://media.xyz-labs.xyz/mobile-wallapaper/m{N}.png
  H{N}       → https://media.xyz-labs.xyz/wallpaper/H{N}.png
  S{N}       → https://media.xyz-labs.xyz/skins/S{N}.png
  c{N}       → https://media.xyz-labs.xyz/content/c{N}.png
  g{N}       → https://media.xyz-labs.xyz/gif/g{N}.png
  x{N}       → https://demo-content.xyz-labs.xyz/tenant-content/{slug}/{file}

Server-side proxies:
  /api/media/{path}            → MEDIA_ASSETS_BUCKET (public R2)
  /api/tenant-content/{path}   → DEMO_BUCKET (tenant R2)
  Both: Cache-Control: public, max-age=86400, CORS enabled
```

---

## 8. Tenant-Content Path

```
Tenant isolation: slug-based (no auth)
  → Each browser generates unique slug on first visit
  → Uploads stored in: tenant-content/{slug}/{filename}
  → Deploys stored in: json/{slug}/main.json, holiday.json, site.json
  → No cross-tenant data sharing
  → No authentication or authorization
  → Slug is random 8-char base36 (e.g. "a1b2c3d4")
```

---

## 9. State Management Architecture

**Pattern:** Pure React hooks (useState/useEffect/useCallback/useMemo/useRef)
**No external state library** (no Redux, Zustand, Jotai, Context).

Key state atoms (desktop):
- `project: ProjectData` - full project data
- `page: PageKey` - current page (p1-p4)
- `slug: string` - tenant identifier
- `cardState: CardInteractionState` - cards + selection + locks
- `wallpaper: string` - current wallpaper code
- `activeTab: SurfaceTab` - right rail tab
- `uploadedContents: Array<{name, url, code}>` - user uploads
- `deploying: boolean` - deploy-in-progress flag
- `deployModal: {primaryUrl, holidayUrl, ok, error}` - deploy result
- `ghostStep: number | null` - onboarding state

---

## 10. Authentication

**None.** No login, no sessions, no tokens. Identity = random browser slug.

---

## 11. Real-Time / WebSocket

**None.** All communication is synchronous HTTP request-response.

---

## 12. Third-Party Integrations

**None active.** No analytics, no payments, no external SDKs.

The exclusive-tile pricing field (`exclusivePrice`) exists in the data model but has no payment processor integration.

---

## Fragile Areas

| Area | Risk | Notes |
|---|---|---|
| Slug collision | Low but nonzero | 8-char base36 = ~2.8T combinations, no collision check on deploy |
| localStorage quota | Medium | Large projects with many uploads could exceed 5-10MB quota; no error handling |
| No auth on deploy | High | Anyone who guesses a slug can overwrite its deployed content |
| No rate limiting | Medium | Upload and deploy endpoints have no rate limits |
| CORS on scraper | Low | Scraper panel silently fails on CORS-blocked URLs; expected behavior |
| Auto-save flood | Low | Every state change triggers localStorage write; no debounce |
| Coordinate scaling | Medium | Desktop→deploy scaling (900x720 → 1400x800) is fragile if workspace dims change |
