import { json, Errors } from "../_shared/json.js";
import { corsAuthHeaders, handlePreflight } from "../_shared/cors.js";
import {
  bearerToken,
  loadSession,
  loadUser,
  deleteSession,
  isExpired,
  publicUser,
} from "../_shared/auth.js";

function withCors(res, request, env) {
  const cors = corsAuthHeaders(request, env);
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
}

/**
 * Resolve the current session.
 *
 * GET /api/auth/session
 *   Authorization: Bearer <token>
 *
 * Both Studio and Gateway hit this endpoint to resolve the shared session.
 * Cross-origin is allowed via corsAuthHeaders (origin must be allow-listed).
 */
async function handleSession({ request, env }) {
  if (!env?.MEDIA_ASSETS_BUCKET) return Errors.MISSING_BINDING("MEDIA_ASSETS_BUCKET");

  const token = bearerToken(request);
  if (!token) return Errors.UNAUTHORIZED("Missing bearer token");

  const session = await loadSession(env.MEDIA_ASSETS_BUCKET, token);
  if (!session) return Errors.UNAUTHORIZED("Session not found");
  if (isExpired(session)) {
    await deleteSession(env.MEDIA_ASSETS_BUCKET, token);
    return Errors.UNAUTHORIZED("Session expired");
  }

  const user = await loadUser(env.MEDIA_ASSETS_BUCKET, session.username);
  if (!user) return Errors.UNAUTHORIZED("User not found");

  return json({ ok: true, session, user: publicUser(user) });
}

export async function onRequestGet(ctx) {
  const res = await handleSession(ctx);
  return withCors(res, ctx.request, ctx.env);
}

export function onRequestOptions(ctx) {
  return handlePreflight(ctx.request, ctx.env);
}
