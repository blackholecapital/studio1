import { json, Errors } from "../_shared/json.js";
import { corsAuthHeaders, handlePreflight } from "../_shared/cors.js";
import { sanitizeSlug } from "../_shared/validate.js";
import {
  bearerToken,
  loadSession,
  loadUser,
  saveUser,
  savePageOwnership,
  isExpired,
  deleteSession,
  publicUser,
} from "../_shared/auth.js";

function withCors(res, request, env) {
  const cors = corsAuthHeaders(request, env);
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
}

/**
 * POST /api/auth/link-page
 *   Authorization: Bearer <session-token>
 *   body: { pageSlug }
 *
 * Associates a saved page with the logged-in user:
 *   1. Writes data/pages/<slug>.json  { slug, user_id, username, linked_at }
 *   2. Appends slug to user.page_ids (deduped)
 */
async function handleLinkPage({ request, env }) {
  if (!env?.MEDIA_ASSETS) return Errors.MISSING_BINDING("MEDIA_ASSETS");

  const token = bearerToken(request);
  if (!token) return Errors.UNAUTHORIZED("Missing bearer token");

  const session = await loadSession(env.MEDIA_ASSETS, token);
  if (!session) return Errors.UNAUTHORIZED("Session not found");
  if (isExpired(session)) {
    await deleteSession(env.MEDIA_ASSETS, token);
    return Errors.UNAUTHORIZED("Session expired");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Errors.BAD_REQUEST("Invalid JSON body");
  }

  const pageSlug = sanitizeSlug(body?.pageSlug);
  if (!pageSlug) return Errors.BAD_REQUEST("Missing or invalid pageSlug");

  const user = await loadUser(env.MEDIA_ASSETS, session.username);
  if (!user) return Errors.UNAUTHORIZED("User not found");

  await savePageOwnership(env.MEDIA_ASSETS, {
    slug: pageSlug,
    user_id: user.user_id,
    username: user.username,
    linked_at: Date.now(),
  });

  const pageIds = Array.isArray(user.page_ids) ? user.page_ids.slice() : [];
  if (!pageIds.includes(pageSlug)) pageIds.push(pageSlug);
  user.page_ids = pageIds;
  await saveUser(env.MEDIA_ASSETS, user);

  return json({ ok: true, pageSlug, user: publicUser(user) });
}

export async function onRequestPost(ctx) {
  const res = await handleLinkPage(ctx);
  return withCors(res, ctx.request, ctx.env);
}

export function onRequestOptions(ctx) {
  return handlePreflight(ctx.request, ctx.env);
}
