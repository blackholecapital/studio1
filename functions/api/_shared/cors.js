/**
 * CORS helpers.
 *
 * Allowed origins for write operations (upload, deploy).
 * Read operations (media, tenant-content) allow any origin since
 * they serve public deployed content.
 */

const ALLOWED_WRITE_ORIGINS = [
  "https://dripstudio.xyz-labs.xyz",
  "https://gateway.xyz-labs.xyz",
];

/** Check if an origin is allowed for write operations. */
function isAllowedWriteOrigin(origin, env) {
  if (!origin) return false;
  if (ALLOWED_WRITE_ORIGINS.includes(origin)) return true;
  // Allow Cloudflare Pages preview deployments
  if (/^https:\/\/[a-z0-9-]+\.studio1(-[a-z0-9]+)?\.pages\.dev$/.test(origin)) return true;
  // Allow localhost for development
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  // Allow custom origin from env
  const extra = env?.ALLOWED_ORIGINS;
  if (extra && typeof extra === "string") {
    return extra.split(",").map((o) => o.trim()).includes(origin);
  }
  return false;
}

/** Build CORS headers for write endpoints (upload, deploy). */
export function corsWriteHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const headers = {};
  if (isAllowedWriteOrigin(origin, env)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, PUT, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}

/** Build CORS headers for read endpoints (media, content). */
export function corsReadHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
  };
}

/** Handle OPTIONS preflight for write endpoints. */
export function handlePreflight(request, env) {
  const headers = corsWriteHeaders(request, env);
  if (!headers["Access-Control-Allow-Origin"]) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, { status: 204, headers });
}
