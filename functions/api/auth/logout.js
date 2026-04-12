import { json, Errors } from "../_shared/json.js";
import { corsAuthHeaders, handlePreflight } from "../_shared/cors.js";
import { bearerToken, deleteSession } from "../_shared/auth.js";

function withCors(res, request, env) {
  const cors = corsAuthHeaders(request, env);
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
}

async function handleLogout({ request, env }) {
  if (!env?.MEDIA_ASSETS) return Errors.MISSING_BINDING("MEDIA_ASSETS");
  const token = bearerToken(request);
  if (token) {
    try { await deleteSession(env.MEDIA_ASSETS, token); } catch { /* best-effort */ }
  }
  return json({ ok: true });
}

export async function onRequestPost(ctx) {
  const res = await handleLogout(ctx);
  return withCors(res, ctx.request, ctx.env);
}

export function onRequestOptions(ctx) {
  return handlePreflight(ctx.request, ctx.env);
}
