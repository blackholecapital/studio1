# 06 — API Hardening Changes

> Date: 2026-04-02

## Summary

Hardened all Cloudflare Pages Functions (`functions/api/`) by:
- Centralizing shared logic into `_shared/` modules
- Adding input validation, MIME allowlists, path traversal prevention
- Adding CORS origin allowlists for write endpoints
- Adding request size guards
- Returning structured error responses
- Adding OPTIONS preflight handlers

## New Shared Modules

| File | Purpose |
|---|---|
| `functions/api/_shared/json.js` | `json()`, `errorResponse()`, `Errors.*` structured responses |
| `functions/api/_shared/validate.js` | `sanitizeSlug`, `sanitizeFilename`, `sanitizePathSegments`, MIME allowlist, size limits |
| `functions/api/_shared/cors.js` | `corsWriteHeaders`, `corsReadHeaders`, `handlePreflight`, origin allowlist |
| `functions/api/_shared/storage.js` | `putJson()`, `guessContentType()` |

## Handler Changes

### `functions/api/deploy.js`
- **Added**: Content-Length size guard (2MB limit)
- **Added**: Type checks on `body`, `body.main`, `body.holiday`
- **Added**: CORS headers via `corsWriteHeaders()` (origin allowlist)
- **Added**: OPTIONS preflight handler
- **Changed**: Uses shared `sanitizeSlug()`, `putJson()`, `json()`, `Errors.*`
- **Changed**: Structured error responses with error codes
- **Preserved**: Dual-deploy format, site.json compat alias, response shape

### `functions/api/upload.js`
- **Added**: MIME type validation against allowlist
- **Added**: CORS headers via `corsWriteHeaders()` (origin allowlist)
- **Added**: OPTIONS preflight handler
- **Added**: `remoteUrl` in success response (previously client had to construct it)
- **Changed**: Uses shared `sanitizeSlug()`, `sanitizeFilename()`, `Errors.*`
- **Changed**: Structured error responses with error codes
- **Preserved**: FormData parsing, 5MB limit, tenant-content key format

### `functions/api/media/[[path]].js`
- **Added**: Path traversal prevention via `sanitizePathSegments()`
- **Added**: CORS read headers (`Access-Control-Allow-Origin: *`)
- **Changed**: Uses shared `guessContentType()`
- **Preserved**: Cache-Control, ETag, content-type resolution

### `functions/api/tenant-content/[[path]].js`
- **Added**: Path traversal prevention via `sanitizePathSegments()`
- **Changed**: Uses shared `guessContentType()`, `corsReadHeaders()`
- **Preserved**: Cache-Control, CORS `*`, content-type resolution

### `functions/api/deploy-mobile.js`
- **No changes**: This file exports utility functions, not request handlers

## Error Response Shape

Before:
```json
{ "ok": false, "error": "Missing slug" }
```

After:
```json
{ "ok": false, "error": { "code": "BAD_REQUEST", "message": "Missing or invalid slug" } }
```

Error codes: `BAD_REQUEST`, `UNAUTHORIZED`, `NOT_FOUND`, `PAYLOAD_TOO_LARGE`, `SERVER_ERROR`

## CORS Policy

| Endpoint | Policy |
|---|---|
| POST/PUT `/api/deploy` | Origin allowlist (studio + gateway + Pages previews + localhost) |
| POST `/api/upload` | Origin allowlist (same) |
| GET `/api/media/*` | `Access-Control-Allow-Origin: *` (public assets) |
| GET `/api/tenant-content/*` | `Access-Control-Allow-Origin: *` (public tenant content) |

Allowed write origins:
- `https://dripstudio.xyz-labs.xyz`
- `https://gateway.xyz-labs.xyz`
- `https://*.studio1*.pages.dev` (Cloudflare Pages previews)
- `http://localhost:*` (development)
- Custom via `env.ALLOWED_ORIGINS` (comma-separated)
