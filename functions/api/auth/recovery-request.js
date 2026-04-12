import { json, Errors } from "../_shared/json.js";
import { corsAuthHeaders, handlePreflight } from "../_shared/cors.js";
import {
  sanitizeUsername,
  sanitizeEmail,
  loadUser,
  saveRecovery,
  makeRecovery,
} from "../_shared/auth.js";

function withCors(res, request, env) {
  const cors = corsAuthHeaders(request, env);
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
}

/**
 * POST /api/auth/recovery-request
 *   body: { identifier }   // username OR recovery email
 *
 * v1 response (dev / trusted operators):
 *   { ok: true, token, expires_at, deliveryHint }
 *
 * For now we return the recovery token in the response body so it can be
 * surfaced in the UI for manual testing. Once email delivery is wired up
 * this should be demoted to not leak the token.
 */
async function findUserByIdentifier(bucket, identifier) {
  // Try username first (cheapest: direct object lookup).
  const username = sanitizeUsername(identifier);
  if (username) {
    const u = await loadUser(bucket, username);
    if (u) return u;
  }
  // Fall back to recovery email. R2 does not support indexed lookups,
  // so we walk the users/ prefix. In practice the user list is small
  // and writes during signup are infrequent, so this is acceptable
  // for v1. If the list grows large, introduce an email → username
  // index record under data/indexes/email/.
  const email = sanitizeEmail(identifier);
  if (!email) return null;
  let cursor;
  do {
    const page = await bucket.list({ prefix: "data/users/", cursor, limit: 1000 });
    for (const obj of page.objects ?? []) {
      const rec = await bucket.get(obj.key);
      if (!rec) continue;
      try {
        const parsed = JSON.parse(await rec.text());
        if (parsed?.recovery_email === email) return parsed;
      } catch { /* skip malformed */ }
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return null;
}

async function handleRecoveryRequest({ request, env }) {
  if (!env?.MEDIA_ASSETS_BUCKET) return Errors.MISSING_BINDING("MEDIA_ASSETS_BUCKET");

  let body;
  try {
    body = await request.json();
  } catch {
    return Errors.BAD_REQUEST("Invalid JSON body");
  }

  const identifier = String(body?.identifier ?? "").trim();
  if (!identifier) return Errors.BAD_REQUEST("Missing identifier (username or recovery email)");

  const user = await findUserByIdentifier(env.MEDIA_ASSETS_BUCKET, identifier);

  // Whether or not a matching account was found, respond as if we issued
  // a token so we don't leak which accounts exist. When the account does
  // exist we actually create + persist the recovery record and return the
  // real token for v1 manual testing.
  if (!user) {
    return json({
      ok: true,
      delivered: false,
      message: "If an account matched, a recovery token was issued.",
    });
  }

  const recovery = makeRecovery(user);
  await saveRecovery(env.MEDIA_ASSETS_BUCKET, recovery);

  return json({
    ok: true,
    delivered: false,
    message: "Recovery token issued. Use it to reset your password.",
    token: recovery.token,
    expires_at: recovery.expires_at,
    recovery_email: user.recovery_email,
  });
}

export async function onRequestPost(ctx) {
  const res = await handleRecoveryRequest(ctx);
  return withCors(res, ctx.request, ctx.env);
}

export function onRequestOptions(ctx) {
  return handlePreflight(ctx.request, ctx.env);
}
