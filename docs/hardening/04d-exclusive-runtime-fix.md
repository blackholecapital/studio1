# 04d — Exclusive Tile Runtime Hydration Fix

> Date: 2026-04-02

## Root Cause

Two issues prevented the deployed EXCLUSIVE page from hydrating tiles correctly:

### 1. Serialization filter excluded content-bearing unlocked tiles

`serializeExclusiveTiles()` in `buildPayload.ts` line 65 had this filter:

```ts
if (!tile.url && !tile.price && !tile.locked) return null;
```

This filtered out tiles where `locked=false`, `price=""`, and `url=""` — even
when the tile had a valid `contentCode` (e.g. `"c3"`). An unlocked tile with
catalog content but no direct URL was silently dropped from the deploy payload.

**Fix:** Added `!tile.contentCode` to the filter condition:

```ts
if (!tile.url && !tile.contentCode && !tile.price && !tile.locked) return null;
```

### 2. No runtime hydration layer existed

The gateway runtime had no decoder to map the deployed JSON shape
(`tileNumber`, `contentCode`, `tileName`, `lockStatus`, `purchasePrice`)
back to renderable tile props with resolved image URLs. The gateway was
receiving the data but had no code path to consume it.

**Fix:** Added `src/services/runtime/exclusiveTileHydration.ts` with:

- `normalizeDeployedExclusiveTiles(raw)` — validates, de-dupes, sorts
- `hydrateExclusiveTilesFromPageData(pageData)` — full decode to 6-slot
  array with resolved image URLs and default fallbacks

## Files Changed

| File | Change |
|---|---|
| `src/services/deploy/buildPayload.ts` | Fixed filter to include tiles with `contentCode` |
| `src/services/runtime/exclusiveTileHydration.ts` | **New** — runtime hydration utilities |

## Field Mapping (Deploy JSON → Runtime)

| Deploy field | Runtime field | Notes |
|---|---|---|
| `tileNumber` | `tileNumber` | 1-indexed slot identity (1–6) |
| `contentCode` | `contentCode` | Catalog code (c3, c6, etc.) |
| `contentCode` | `imageUrl` | Resolved via `resolveContentCode()` → `media.xyz-labs.xyz/content/{code}.png` |
| `tileName` | `tileName` | Display label, defaults to `"Exclusive Content-{N}"` |
| `lockStatus` | `locked` | `"locked"` → `true`, `"unlocked"` → `false` |
| `purchasePrice` | `purchasePrice` | String price or `null` |
| `contentUrl` | `imageUrl` | Takes priority over `contentCode` resolution when present |

## Legacy Field Support

The normalizer also accepts old/alternate field names for backwards compat:

| Legacy field | Maps to |
|---|---|
| `locked` (boolean) | `lockStatus` |
| `price` | `purchasePrice` |
| `url` | `contentUrl` |
| `name` | `tileName` |

## Verification

### Acceptance test payload

```json
[
  { "tileNumber": 1, "contentCode": "c3",    "tileName": "Exclusive Content-1", "lockStatus": "unlocked", "purchasePrice": null },
  { "tileNumber": 2, "contentCode": "c6",    "tileName": "Exclusive Content-2", "lockStatus": "unlocked", "purchasePrice": null },
  { "tileNumber": 3, "contentCode": "c4",    "tileName": "Exclusive Content-3", "lockStatus": "unlocked", "purchasePrice": null },
  { "tileNumber": 4, "contentCode": "c2222", "tileName": "Exclusive Content-4", "lockStatus": "locked",   "purchasePrice": "$188.00" },
  { "tileNumber": 5, "contentCode": "c2",    "tileName": "Exclusive Content-5", "lockStatus": "locked",   "purchasePrice": "$221.00" },
  { "tileNumber": 6, "contentCode": "c5",    "tileName": "Exclusive Content-6", "lockStatus": "locked",   "purchasePrice": "$22221.00" }
]
```

### Expected hydration result

| Slot | imageUrl | locked | price |
|---|---|---|---|
| 1 | `https://media.xyz-labs.xyz/content/c3.png` | false | null |
| 2 | `https://media.xyz-labs.xyz/content/c6.png` | false | null |
| 3 | `https://media.xyz-labs.xyz/content/c4.png` | false | null |
| 4 | `https://media.xyz-labs.xyz/content/c2222.png` | true | $188.00 |
| 5 | `https://media.xyz-labs.xyz/content/c2.png` | true | $221.00 |
| 6 | `https://media.xyz-labs.xyz/content/c5.png` | true | $22221.00 |

## Checkpoint Status

**Safe to proceed** — serializer fix is backwards-compatible; hydration layer
is additive with no impact on existing rendering paths.
