# 06 — API Hardening File Map

> Date: 2026-04-02

## Directory Structure

```
functions/api/
├── _shared/
│   ├── json.js           # JSON response helpers + error codes
│   ├── validate.js       # Input sanitization + validation
│   ├── cors.js           # CORS origin allowlist + preflight
│   └── storage.js        # R2 storage helpers
├── deploy.js             # POST/PUT /api/deploy (hardened)
├── deploy-mobile.js      # Mobile page spec utility (unchanged)
├── upload.js             # POST /api/upload (hardened)
├── media/
│   └── [[path]].js       # GET /api/media/* (hardened)
└── tenant-content/
    └── [[path]].js       # GET /api/tenant-content/* (hardened)
```

## Dependency Graph

```
deploy.js
  ├── _shared/json.js        (json, Errors)
  ├── _shared/validate.js    (sanitizeSlug, MAX_DEPLOY_BODY_SIZE)
  ├── _shared/cors.js        (corsWriteHeaders, handlePreflight)
  └── _shared/storage.js     (putJson)

upload.js
  ├── _shared/json.js        (json, Errors)
  ├── _shared/validate.js    (sanitizeSlug, sanitizeFilename, MAX_UPLOAD_FILE_SIZE, ALLOWED_UPLOAD_TYPES)
  └── _shared/cors.js        (corsWriteHeaders, handlePreflight)

media/[[path]].js
  ├── _shared/validate.js    (sanitizePathSegments)
  ├── _shared/storage.js     (guessContentType)
  └── _shared/cors.js        (corsReadHeaders)

tenant-content/[[path]].js
  ├── _shared/validate.js    (sanitizePathSegments)
  ├── _shared/storage.js     (guessContentType)
  └── _shared/cors.js        (corsReadHeaders)
```

## Shared Module Exports

### `_shared/json.js`
- `json(obj, status)` — JSON Response
- `errorResponse(code, message, status)` — Structured error
- `Errors.BAD_REQUEST(msg)` — 400
- `Errors.UNAUTHORIZED(msg)` — 401
- `Errors.NOT_FOUND(msg)` — 404
- `Errors.PAYLOAD_TOO_LARGE(msg)` — 413
- `Errors.MISSING_BINDING(name)` — 500

### `_shared/validate.js`
- `sanitizeSlug(s)` — alphanumeric + hyphens, max 64
- `sanitizeFilename(name)` — safe filename, max 128
- `sanitizePathSegments(segments)` — path traversal guard
- `isNonEmpty(v)` — non-empty string check
- `MAX_DEPLOY_BODY_SIZE` — 2MB
- `MAX_UPLOAD_FILE_SIZE` — 5MB
- `ALLOWED_UPLOAD_TYPES` — Set of allowed MIME types

### `_shared/cors.js`
- `corsWriteHeaders(request, env)` — origin-checked CORS for writes
- `corsReadHeaders()` — permissive CORS for reads
- `handlePreflight(request, env)` — OPTIONS response

### `_shared/storage.js`
- `putJson(bucket, key, value)` — R2 JSON put
- `guessContentType(path)` — extension → MIME
