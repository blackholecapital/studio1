# 04d — Exclusive Tile Runtime Data Flow

> Date: 2026-04-02

## End-to-End Flow: Studio → Deploy → Gateway

```
┌─────────────────────────────────────────────────────────────────┐
│ STUDIO (editor)                                                 │
│                                                                 │
│ ExclusiveTile[] (internal shape)                                │
│   { url, price, locked, contentCode? }                          │
│                                                                 │
│   ↓ buildPayload.ts:serializeExclusiveTiles()                   │
│                                                                 │
│ Deployed JSON shape:                                            │
│   { tileNumber, contentCode, tileName, lockStatus,              │
│     purchasePrice, contentUrl? }                                │
│                                                                 │
│   ↓ POST /deploy-demo                                           │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ R2 STORAGE                                                      │
│                                                                 │
│ json/{slug}/main.json                                           │
│   └─ pages["tier-2"].exclusiveTiles = [ ... ]                   │
│                                                                 │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ GATEWAY RUNTIME (consumer)                                      │
│                                                                 │
│ 1. Fetch json/{slug}/main.json                                  │
│ 2. Extract pages["tier-2"]                                      │
│ 3. Call hydrateExclusiveTilesFromPageData(pageData)              │
│    ├─ normalizeDeployedExclusiveTiles(pageData.exclusiveTiles)   │
│    │   ├─ Validate each entry (tileNumber, contentCode)          │
│    │   ├─ Support legacy field names (locked, price, url, name)  │
│    │   ├─ De-duplicate by tileNumber                             │
│    │   └─ Sort by tileNumber ascending                           │
│    ├─ Resolve contentCode → imageUrl                             │
│    │   ├─ contentUrl (explicit override) → use directly          │
│    │   ├─ c{N} → media.xyz-labs.xyz/content/c{N}.png             │
│    │   ├─ g{N} → media.xyz-labs.xyz/gif/g{N}.png                 │
│    │   └─ EC-NNN (synthetic) → "" (placeholder)                  │
│    └─ Fill 6-slot array (missing slots get defaults)             │
│                                                                 │
│ 4. Render 6 HydratedExclusiveTile objects                       │
│    ├─ imageUrl → <img src>                                       │
│    ├─ tileName → label                                           │
│    ├─ locked → lock icon + gating                                │
│    └─ purchasePrice → price badge                                │
└─────────────────────────────────────────────────────────────────┘
```

## Page Key Routing

| Internal key | Deploy route key | Page name |
|---|---|---|
| `p1` | `gate` | Gateway |
| `p2` | `members` | Members |
| `p3` | `access` | Access |
| `p4` | `tier-2` | Exclusive |

The exclusive tiles live exclusively under `pages["tier-2"]`.

## Serialization Filter (Fixed)

Before fix:
```ts
// Dropped unlocked tiles with contentCode but no url
if (!tile.url && !tile.price && !tile.locked) return null;
```

After fix:
```ts
// Only drop tiles with NO content of any kind
if (!tile.url && !tile.contentCode && !tile.price && !tile.locked) return null;
```

## Fallback Behavior

| Scenario | Result |
|---|---|
| `exclusiveTiles` missing from page data | 6 default placeholder tiles |
| `exclusiveTiles` is empty array | 6 default placeholder tiles |
| Some tiles invalid (bad tileNumber, no contentCode) | Valid tiles hydrated, invalid slots get defaults |
| All tiles invalid | 6 default placeholder tiles |
| Tile has contentUrl + contentCode | contentUrl wins (user upload override) |
| Tile has contentCode only | Resolved via media.xyz-labs.xyz |
| Tile has synthetic code (EC-NNN) | Empty imageUrl (placeholder shown) |
