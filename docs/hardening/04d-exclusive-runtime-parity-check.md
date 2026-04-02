# 04d — Exclusive Tile Runtime Parity Check

> Date: 2026-04-02

## Studio → Deploy Parity

| Studio internal field | Deploy JSON field | Mapping |
|---|---|---|
| `ExclusiveTile.locked` | `lockStatus` | `true` → `"locked"`, `false` → `"unlocked"` |
| `ExclusiveTile.price` | `purchasePrice` | Direct string copy, `""` → `null` |
| `ExclusiveTile.url` | `contentUrl` | Only emitted for non-catalog items |
| `ExclusiveTile.contentCode` | `contentCode` | Direct copy; fallback `EC-{NNN}` if absent |
| (array index + 1) | `tileNumber` | 1-indexed slot number |
| `"Exclusive Content-{N}"` | `tileName` | Generated from index |

## Deploy → Runtime Parity

| Deploy JSON field | Runtime hydrated field | Mapping |
|---|---|---|
| `tileNumber` | `tileNumber` | Direct (validated 1–6) |
| `contentCode` | `contentCode` | Direct copy |
| `contentCode` | `imageUrl` | `resolveContentCode(code)` → full URL |
| `contentUrl` | `imageUrl` | Overrides contentCode resolution |
| `tileName` | `tileName` | Direct copy |
| `lockStatus` | `locked` | `"locked"` → `true`, else `false` |
| `purchasePrice` | `purchasePrice` | Direct copy |

## Round-Trip Verification

Starting with studio state:
```ts
[
  { url: "…/c3.png",    contentCode: "c3",    price: "",         locked: false },
  { url: "…/c6.png",    contentCode: "c6",    price: "",         locked: false },
  { url: "…/c4.png",    contentCode: "c4",    price: "",         locked: false },
  { url: "…/c2222.png", contentCode: "c2222", price: "$188.00",  locked: true  },
  { url: "…/c2.png",    contentCode: "c2",    price: "$221.00",  locked: true  },
  { url: "…/c5.png",    contentCode: "c5",    price: "$22221.00",locked: true  },
]
```

After `serializeExclusiveTiles()`:
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

After `hydrateExclusiveTilesFromPageData()`:
```ts
[
  { tileNumber: 1, contentCode: "c3",    tileName: "Exclusive Content-1", locked: false, purchasePrice: null,       imageUrl: "https://media.xyz-labs.xyz/content/c3.png" },
  { tileNumber: 2, contentCode: "c6",    tileName: "Exclusive Content-2", locked: false, purchasePrice: null,       imageUrl: "https://media.xyz-labs.xyz/content/c6.png" },
  { tileNumber: 3, contentCode: "c4",    tileName: "Exclusive Content-3", locked: false, purchasePrice: null,       imageUrl: "https://media.xyz-labs.xyz/content/c4.png" },
  { tileNumber: 4, contentCode: "c2222", tileName: "Exclusive Content-4", locked: true,  purchasePrice: "$188.00",  imageUrl: "https://media.xyz-labs.xyz/content/c2222.png" },
  { tileNumber: 5, contentCode: "c2",    tileName: "Exclusive Content-5", locked: true,  purchasePrice: "$221.00",  imageUrl: "https://media.xyz-labs.xyz/content/c2.png" },
  { tileNumber: 6, contentCode: "c5",    tileName: "Exclusive Content-6", locked: true,  purchasePrice: "$22221.00",imageUrl: "https://media.xyz-labs.xyz/content/c5.png" },
]
```

## Non-Exclusive Page Impact

- **None.** The serializer change only affects the `exclusiveTiles` filter
  condition on `p4`. Pages `p1`–`p3` use a completely separate code path
  (`buildDesktopPagePayload` returns cards/blocks, not exclusive tiles).
- The hydration module is additive — no existing code imports it yet.

## Edge Cases Verified

| Case | Before fix | After fix |
|---|---|---|
| Unlocked tile with contentCode, no url | Dropped from payload | Included in payload |
| Unlocked tile with no contentCode, no url | Dropped (correct) | Still dropped (correct) |
| Locked tile with price | Included | Included (unchanged) |
| Tile with contentUrl override | Included | Included; contentUrl takes priority in hydration |
| Missing exclusiveTiles in page data | N/A (gateway shows defaults) | Hydration returns 6 default placeholders |
| Duplicate tileNumbers | N/A | First occurrence wins, rest de-duped |
| tileNumber out of range (0, 7+) | N/A | Skipped during normalization |

## Checkpoint Status

**Safe to proceed** — all parity checks pass. No non-exclusive page behavior affected.
