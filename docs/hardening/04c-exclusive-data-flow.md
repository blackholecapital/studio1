# 04c — Exclusive Tile Data Flow

> Date: 2026-04-01

## Type Shape

```typescript
// src/domain/project/types.ts
type ExclusiveTile = {
  url: string;     // image URL (uploaded or pasted)
  price: string;   // e.g. "$1.00" or ""
  locked: boolean; // purchase-lock status
};

// PageData now includes:
type PageData = {
  // … existing fields …
  exclusiveTiles?: ExclusiveTile[];  // NEW — only meaningful on p4
};
```

## Lifecycle

### 1. Initialization
- `App.tsx useState`: reads `loadProject("user")?.pages?.p4?.exclusiveTiles`
- Falls back to `DEFAULT_EXCLUSIVE_TILES` (6 tiles: 3 unlocked empty, 3 locked at $1.00)

### 2. Editing (UI state only)
- **ContentRail** exclusive tab: user edits `url`, `price`, toggles `locked`
- **DesktopWorkspace** p4 grid: user drops content images onto tiles
- Both update via `setExclusiveTiles` in App.tsx

### 3. Auto-save to project state
- `useEffect` in App.tsx watches `[cardState, wallpaper, page, slug, pageInstructions, exclusiveTiles]`
- Calls `cardStateToPageData(cardState, wallpaper, pageInstructions, page === "p4" ? exclusiveTiles : undefined)`
- Result written to `project.pages[page]`

### 4. Explicit save (Save button)
- `useDesktopDeployFlow.handleSave()` calls `cardStateToPageData` with exclusive tiles for p4
- Calls `saveProject(full)` → JSON.stringify → localStorage

### 5. Load / reload
- `loadProject(slug)` → `parseProject(raw)` → `normalizePage(raw)`
- `normalizePage` calls `normalizeExclusiveTiles(raw.exclusiveTiles)`
- Validates each tile has `{url: string, price: string, locked: boolean}`
- Invalid tiles are filtered out; if none valid, field is omitted

### 6. Page switch
- Leaving p4: current tiles saved into `project.pages.p4.exclusiveTiles`
- Entering p4: `setExclusiveTiles(target.exclusiveTiles ?? DEFAULT_EXCLUSIVE_TILES)`

### 7. Deploy
- `handleDeployGateway()` builds `full` project with exclusive tiles on p4
- `buildDesktopDeployBundle()` receives `ctx.exclusiveTiles` from `full.pages.p4.exclusiveTiles`
- `serializeExclusiveTiles()` in buildPayload.ts produces deploy-ready shape:
  ```json
  {
    "tileNumber": 1,
    "contentCode": "EC-001",
    "tileName": "Exclusive Content-1",
    "lockStatus": "locked",
    "purchasePrice": "$1.00",
    "contentUrl": "https://demo-content.xyz-labs.xyz/tenant-content/slug/x001.png"
  }
  ```
- Included in p4 (Exclusive page) payload as `exclusiveTiles` array

### 8. Reset workspace
- `resetWorkspace()` writes `DEFAULT_EXCLUSIVE_TILES` into fresh p4 page data
- `setExclusiveTiles([...DEFAULT_EXCLUSIVE_TILES])` resets UI state

## localStorage Shape

```json
{
  "version": 1,
  "slug": "abc12345",
  "pages": {
    "p1": { "wallpaper": "…", "cards": [], … },
    "p2": { "wallpaper": "…", "cards": [], … },
    "p3": { "wallpaper": "…", "cards": [], … },
    "p4": {
      "wallpaper": "…",
      "cards": [],
      "exclusiveTiles": [
        { "url": "https://…/x001.png", "price": "$2.00", "locked": true },
        { "url": "", "price": "", "locked": false }
      ],
      …
    }
  }
}
```
