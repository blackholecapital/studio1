# 07 — Release Gates

> Date: 2026-04-02

## Automated Gates (CI)

| Gate | Command | Blocks merge? |
|---|---|---|
| Install | `npm ci` | Yes |
| TypeScript | `npx tsc --noEmit` | Yes (pre-existing App.tsx errors allowed) |
| Build | `npx vite build` | Yes |
| Tests | `npm test` (vitest) | Yes |

## Test Coverage Summary

| Area | Tests | Critical path |
|---|---|---|
| Project schema parse/migrate | 5 | Load corrupted localStorage safely |
| Page normalization | 4 | Restore page state from save |
| Card validation | 4 | Reject malformed card data |
| Deploy payload builder | 4 | Correct JSON shape for gateway |
| Exclusive tile serialization | Included above | All 6 slots emitted |
| Exclusive tile hydration | 9 | Gateway renders correct tiles |
| Slug sanitization | 5 | Safe storage key construction |
| Filename sanitization | 3 | Safe upload key construction |
| Path traversal prevention | 6 | Block `../` in media/content paths |
| MIME allowlist | 3 | Block dangerous upload types |
| **Total** | **43** | |

## Manual Verification Checklist

Before any production deploy, verify:

### Desktop
- [ ] App loads without errors
- [ ] All 4 pages navigable (Gateway, Members, Access, Exclusive)
- [ ] Cards create, move, resize, delete correctly
- [ ] Content/skin/media drag-and-drop works
- [ ] Exclusive tiles: add content, set price, lock/unlock
- [ ] Save persists to localStorage
- [ ] Deploy produces valid gateway URL
- [ ] Deployed gateway shows correct content

### Mobile
- [ ] App loads at mobile viewport
- [ ] All 4 pages navigable
- [ ] Cards create, layout presets (1-4), delete
- [ ] Content/skin panels work
- [ ] Photo upload → PNG → R2 → card applied
- [ ] Exclusive tiles editable
- [ ] Save and deploy work

### API
- [ ] Upload accepts valid image, returns `{ ok: true, key, remoteUrl }`
- [ ] Upload rejects oversized file (413)
- [ ] Upload rejects disallowed MIME type (400)
- [ ] Deploy accepts valid dual payload, returns URLs
- [ ] Deploy rejects malformed body (400)
- [ ] Media proxy serves content with cache headers
- [ ] Media proxy returns 404 for `../` traversal attempts
- [ ] CORS preflight returns 204 for allowed origins

### Exclusive Tiles (End-to-End)
- [ ] Studio: set 6 tiles with mixed lock/unlock, prices, content codes
- [ ] Deploy: JSON payload contains all 6 tiles under `pages["tier-2"].exclusiveTiles`
- [ ] Gateway: all 6 tiles render with correct images, labels, lock state, prices
- [ ] Empty tiles show as placeholders (not missing)

## Known Pre-existing Issues

| Issue | Severity | Notes |
|---|---|---|
| App.tsx type error (line 554) | Low | `Object.fromEntries` loses type narrowing; runtime works correctly |
| No auth on deploy/upload | Medium | CORS origin allowlist provides basic protection; token gate deferred |
| No rate limiting | Medium | Workers-level rate limiting recommended for production |

## Checkpoint Status

**Safe to proceed** — hardening pass complete. Repo contains only live product
code, confirmed orphans removed, CI gates in place, critical paths tested.
