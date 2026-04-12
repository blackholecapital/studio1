/**
 * Shared auth helpers for the Studio + Gateway backends.
 *
 * Password hashing:   PBKDF2-SHA256, 100k iterations, 16-byte salt.
 * Tokens (session / recovery): 32 random bytes, hex-encoded.
 *
 * R2 layout (all inside the MEDIA_ASSETS binding):
 *   data/users/<username>.json
 *   data/sessions/<token>.json
 *   data/recovery/<token>.json
 *   data/pages/<pageSlug>.json
 */

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH = "SHA-256";
const SALT_BYTES = 16;
const TOKEN_BYTES = 32;

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const RECOVERY_TTL_MS = 60 * 60 * 1000;          // 1 hour

export const R2_KEYS = {
  user:     (username) => `data/users/${username}.json`,
  session:  (token)    => `data/sessions/${token}.json`,
  recovery: (token)    => `data/recovery/${token}.json`,
  page:     (slug)     => `data/pages/${slug}.json`,
};

// ── byte helpers ─────────────────────────────────────────────────────────────

function bytesToHex(bytes) {
  const arr = Array.from(bytes);
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function randomHex(byteLen = TOKEN_BYTES) {
  const bytes = new Uint8Array(byteLen);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

// ── password hashing (PBKDF2) ────────────────────────────────────────────────

async function pbkdf2(password, saltBytes) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
    key,
    256,
  );
  return new Uint8Array(bits);
}

/** Hash a password. Returns { hash, salt } (both hex strings). */
export async function hashPassword(password) {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  const hashBytes = await pbkdf2(password, salt);
  return { hash: bytesToHex(hashBytes), salt: bytesToHex(salt) };
}

/** Constant-time comparison of two hex-encoded strings of equal length. */
function timingSafeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verify a password against a stored { hash, salt } pair. */
export async function verifyPassword(password, storedHashHex, storedSaltHex) {
  if (!storedHashHex || !storedSaltHex) return false;
  const saltBytes = hexToBytes(storedSaltHex);
  const derived = bytesToHex(await pbkdf2(password, saltBytes));
  return timingSafeEqualHex(derived, storedHashHex);
}

// ── username / email sanitization ────────────────────────────────────────────

/** Lowercase, alnum + underscore + hyphen + dot, 3–32 chars. */
export function sanitizeUsername(raw) {
  const u = String(raw ?? "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(u)) return null;
  return u;
}

/** Very loose email shape check — we do not verify deliverability. */
export function sanitizeEmail(raw) {
  const e = String(raw ?? "").trim().toLowerCase();
  if (e.length < 3 || e.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}

/** Password must be 8–128 chars. */
export function validatePassword(raw) {
  if (typeof raw !== "string") return false;
  return raw.length >= 8 && raw.length <= 128;
}

// ── R2 record helpers ────────────────────────────────────────────────────────

async function getJson(bucket, key) {
  const obj = await bucket.get(key);
  if (!obj) return null;
  try {
    return JSON.parse(await obj.text());
  } catch {
    return null;
  }
}

async function putJson(bucket, key, value) {
  await bucket.put(key, JSON.stringify(value), {
    httpMetadata: { contentType: "application/json" },
  });
}

export async function loadUser(bucket, username) {
  return await getJson(bucket, R2_KEYS.user(username));
}

export async function saveUser(bucket, user) {
  await putJson(bucket, R2_KEYS.user(user.username), user);
}

export async function loadSession(bucket, token) {
  return await getJson(bucket, R2_KEYS.session(token));
}

export async function saveSession(bucket, session) {
  await putJson(bucket, R2_KEYS.session(session.token), session);
}

export async function deleteSession(bucket, token) {
  await bucket.delete(R2_KEYS.session(token));
}

export async function loadRecovery(bucket, token) {
  return await getJson(bucket, R2_KEYS.recovery(token));
}

export async function saveRecovery(bucket, recovery) {
  await putJson(bucket, R2_KEYS.recovery(recovery.token), recovery);
}

export async function savePageOwnership(bucket, page) {
  await putJson(bucket, R2_KEYS.page(page.slug), page);
}

// ── session / recovery record factories ─────────────────────────────────────

export function makeSession(user) {
  const now = Date.now();
  return {
    token: randomHex(TOKEN_BYTES),
    user_id: user.user_id,
    username: user.username,
    issued_at: now,
    expires_at: now + SESSION_TTL_MS,
  };
}

export function makeRecovery(user) {
  const now = Date.now();
  return {
    token: randomHex(TOKEN_BYTES),
    user_id: user.user_id,
    username: user.username,
    recovery_email: user.recovery_email,
    issued_at: now,
    expires_at: now + RECOVERY_TTL_MS,
    used: false,
  };
}

export function isExpired(record) {
  return !record || typeof record.expires_at !== "number" || record.expires_at < Date.now();
}

/** Extract a bearer token from an Authorization header. */
export function bearerToken(request) {
  const auth = request.headers.get("Authorization") || "";
  const match = /^Bearer\s+([a-f0-9]{16,128})$/i.exec(auth);
  return match ? match[1] : null;
}

/** Strip sensitive fields before returning a user record to the client. */
export function publicUser(user) {
  if (!user) return null;
  return {
    user_id: user.user_id,
    username: user.username,
    recovery_email: user.recovery_email,
    created_at: user.created_at,
    status: user.status,
    app_access: user.app_access ?? [],
    page_ids: user.page_ids ?? [],
  };
}
