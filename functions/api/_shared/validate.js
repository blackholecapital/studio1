/**
 * Input validation and sanitization helpers.
 */

/** Slug: lowercase alphanumeric + hyphens, 1–64 chars. */
export function sanitizeSlug(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

/** Filename: alphanumeric + dots/hyphens/underscores, 1–128 chars. */
export function sanitizeFilename(name) {
  return String(name || "upload.bin")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 128);
}

/** Validate that a value is a non-empty string after trimming. */
export function isNonEmpty(v) {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Validate path segments from a [[path]] wildcard.
 * Rejects traversal attempts (..), empty segments, and unsafe characters.
 * Returns sanitized key string or null.
 */
export function sanitizePathSegments(segments) {
  if (!Array.isArray(segments)) return null;
  const clean = [];
  for (const seg of segments) {
    const s = String(seg || "").trim();
    if (!s || s === "." || s === "..") return null;
    if (/[<>:"|?*\\]/.test(s)) return null;
    if (s.includes("/")) return null;
    clean.push(s);
  }
  return clean.length > 0 ? clean.join("/") : null;
}

/** Max deploy payload size: 2MB (generous for JSON). */
export const MAX_DEPLOY_BODY_SIZE = 2 * 1024 * 1024;

/** Max upload file size: 5MB. */
export const MAX_UPLOAD_FILE_SIZE = 5 * 1024 * 1024;

/** Allowed upload MIME types. */
export const ALLOWED_UPLOAD_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
]);
