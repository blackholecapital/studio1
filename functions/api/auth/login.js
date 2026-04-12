import { json, Errors } from "../_shared/json.js";
import { corsAuthHeaders, handlePreflight } from "../_shared/cors.js";
import {
  sanitizeUsername,
  verifyPassword,
  loadUser,
  saveSession,
  makeSession,
  publicUser,
} from "../_shared/auth.js";

function withCors(res, request, env) {
  const cors = corsAuthHeaders(request, env);
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
}

async function handleLogin({ request, env }) {
  if (!env?.MEDIA_ASSETS_BUCKET) return Errors.MISSING_BINDING("MEDIA_ASSETS_BUCKET");

  let body;
  try {
    body = await request.json();
  } catch {
    return Errors.BAD_REQUEST("Invalid JSON body");
  }

  const username = sanitizeUsername(body?.username);
  const password = body?.password;
  if (!username || typeof password !== "string") {
    return Errors.UNAUTHORIZED("Invalid username or password");
  }

  const user = await loadUser(env.MEDIA_ASSETS_BUCKET, username);
  if (!user || user.status && user.status !== "active") {
    return Errors.UNAUTHORIZED("Invalid username or password");
  }

  const ok = await verifyPassword(password, user.password_hash, user.salt);
  if (!ok) return Errors.UNAUTHORIZED("Invalid username or password");

  const session = makeSession(user);
  await saveSession(env.MEDIA_ASSETS_BUCKET, session);

  return json({ ok: true, session, user: publicUser(user) });
}

export async function onRequestPost(ctx) {
  const res = await handleLogin(ctx);
  return withCors(res, ctx.request, ctx.env);
}

export function onRequestOptions(ctx) {
  return handlePreflight(ctx.request, ctx.env);
}
