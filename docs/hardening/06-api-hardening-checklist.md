# 06 — API Hardening Checklist

> Date: 2026-04-02

## Hardening Items

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Centralize JSON/error responses | Done | `_shared/json.js` |
| 2 | Schema validation for deploy body | Done | Type checks on body, main, holiday |
| 3 | Normalize/validate slug inputs | Done | `sanitizeSlug()` shared, max 64 chars |
| 4 | MIME allowlist for uploads | Done | `ALLOWED_UPLOAD_TYPES` in validate.js |
| 5 | CORS origin allowlist (writes) | Done | `corsWriteHeaders()` with env override |
| 6 | CORS permissive (reads) | Done | `corsReadHeaders()` returns `*` |
| 7 | Path traversal prevention | Done | `sanitizePathSegments()` rejects `..`, empty, unsafe chars |
| 8 | Structured error codes | Done | `{ code, message }` format |
| 9 | Request size guards | Done | 2MB deploy body, 5MB upload file |
| 10 | Safe storage key construction | Done | All keys built from sanitized inputs only |
| 11 | OPTIONS preflight handlers | Done | deploy.js, upload.js |
| 12 | Backward-compatible responses | Done | `{ ok: true, ... }` shape preserved |

## Auth Gate

No auth infrastructure exists in the current env/config. A lightweight optional
gate was considered but deferred — adding it would break the existing studio
deploy flow which has no token. The CORS origin allowlist provides basic
protection against cross-origin abuse. Document for future:

- If `env.API_TOKEN` is set, handlers could check `Authorization: Bearer <token>`
- Studio would need to send the token header in deploy/upload requests
- This is a future hardening step, not required for current demo scope

## Verification

| Check | Result |
|---|---|
| Vite build passes | Yes (78 modules) |
| All JS files pass `node --check` | Yes |
| Deploy handler accepts valid dual-deploy | Yes (response shape preserved) |
| Deploy handler rejects missing slug | Yes (structured error) |
| Deploy handler rejects non-object body | Yes (structured error) |
| Deploy handler rejects oversized body | Yes (413 with error code) |
| Upload handler accepts valid form data | Yes (response includes remoteUrl) |
| Upload handler rejects missing file | Yes (structured error) |
| Upload handler rejects wrong MIME | Yes (structured error with allowlist) |
| Upload handler rejects oversized file | Yes (413 with error code) |
| Media proxy serves valid paths | Yes (with CORS, cache headers) |
| Media proxy rejects `../` traversal | Yes (404) |
| Tenant-content proxy serves valid paths | Yes (with CORS, cache headers) |
| Tenant-content proxy rejects traversal | Yes (404) |
| OPTIONS preflight returns 204 for allowed origins | Yes |
| OPTIONS preflight returns 403 for disallowed origins | Yes |
| Desktop deploy flow unchanged | Yes (same endpoint, same payload) |
| Mobile deploy flow unchanged | Yes (same endpoint, same payload) |

## Non-Changes

- Frontend UI: untouched
- Deploy payload fields: unchanged
- Upload endpoint path: unchanged (`/api/upload`)
- Media/content paths: unchanged
- `deploy-mobile.js`: unchanged (utility exports, not a handler)
- Studio-side code: no changes needed

## Checkpoint Status

**Safe to proceed** — all handlers hardened, build passes, response shapes
backward compatible.
