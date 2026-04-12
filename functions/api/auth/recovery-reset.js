import { json, Errors } from "../_shared/json.js";
import { corsAuthHeaders, handlePreflight } from "../_shared/cors.js";
import {
  validatePassword,
  hashPassword,
  loadRecovery,
  saveRecovery,
  loadUser,
  saveUser,
  isExpired,
} from "../_shared/auth.js";

function withCors(res, request, env) {
  const cors = corsAuthHeaders(request, env);
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
}

/**
 * POST /api/auth/recovery-reset
 *   body: { token, newPassword, confirmPassword }
 *
 * Consumes a one-time recovery token: rewrites password_hash + salt on
 * the user record, marks the recovery record as used, and best-effort
 * expires any existing sessions for that user.
 */
async function expireUserSessions(bucket, username) {
  // Walk data/sessions/ and delete any that belong to this user.
  let cursor;
  try {
    do {
      const page = await bucket.list({ prefix: "data/sessions/", cursor, limit: 1000 });
      for (const obj of page.objects ?? []) {
        const rec = await bucket.get(obj.key);
        if (!rec) continue;
        try {
          const parsed = JSON.parse(await rec.text());
          if (parsed?.username === username) {
            await bucket.delete(obj.key);
          }
        } catch { /* skip */ }
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
  } catch { /* best-effort */ }
}

async function handleRecoveryReset({ request, env }) {
  if (!env?.MEDIA_ASSETS_BUCKET) return Errors.MISSING_BINDING("MEDIA_ASSETS_BUCKET");

  let body;
  try {
    body = await request.json();
  } catch {
    return Errors.BAD_REQUEST("Invalid JSON body");
  }

  const token = String(body?.token ?? "").trim();
  const newPassword = body?.newPassword;
  const confirmPassword = body?.confirmPassword;

  if (!/^[a-f0-9]{16,128}$/i.test(token)) return Errors.BAD_REQUEST("Invalid recovery token");
  if (!validatePassword(newPassword)) return Errors.BAD_REQUEST("Password must be 8–128 characters");
  if (newPassword !== confirmPassword) return Errors.BAD_REQUEST("Passwords do not match");

  const recovery = await loadRecovery(env.MEDIA_ASSETS_BUCKET, token);
  if (!recovery) return Errors.UNAUTHORIZED("Recovery token not found");
  if (recovery.used) return Errors.UNAUTHORIZED("Recovery token already used");
  if (isExpired(recovery)) return Errors.UNAUTHORIZED("Recovery token expired");

  const user = await loadUser(env.MEDIA_ASSETS_BUCKET, recovery.username);
  if (!user) return Errors.UNAUTHORIZED("User not found");

  const { hash, salt } = await hashPassword(newPassword);
  user.password_hash = hash;
  user.salt = salt;
  user.password_updated_at = Date.now();
  await saveUser(env.MEDIA_ASSETS_BUCKET, user);

  recovery.used = true;
  recovery.used_at = Date.now();
  await saveRecovery(env.MEDIA_ASSETS_BUCKET, recovery);

  // Best-effort: drop any active sessions so the old password really is dead.
  await expireUserSessions(env.MEDIA_ASSETS_BUCKET, user.username);

  return json({ ok: true, username: user.username });
}

export async function onRequestPost(ctx) {
  const res = await handleRecoveryReset(ctx);
  return withCors(res, ctx.request, ctx.env);
}

export function onRequestOptions(ctx) {
  return handlePreflight(ctx.request, ctx.env);
}
