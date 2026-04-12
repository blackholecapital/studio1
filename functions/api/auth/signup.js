import { json, Errors } from "../_shared/json.js";
import { corsAuthHeaders, handlePreflight } from "../_shared/cors.js";
import {
  sanitizeUsername,
  sanitizeEmail,
  validatePassword,
  hashPassword,
  loadUser,
  saveUser,
  saveSession,
  makeSession,
  randomHex,
  publicUser,
} from "../_shared/auth.js";

function withCors(res, request, env) {
  const cors = corsAuthHeaders(request, env);
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
}

async function handleSignup({ request, env }) {
  if (!env?.MEDIA_ASSETS) return Errors.MISSING_BINDING("MEDIA_ASSETS");

  let body;
  try {
    body = await request.json();
  } catch {
    return Errors.BAD_REQUEST("Invalid JSON body");
  }

  const username = sanitizeUsername(body?.username);
  if (!username) return Errors.BAD_REQUEST("Username must be 3–32 chars (a–z, 0–9, . _ -)");

  const recoveryEmail = sanitizeEmail(body?.recoveryEmail);
  if (!recoveryEmail) return Errors.BAD_REQUEST("Recovery email is required and must look like an email");

  const password = body?.password;
  const confirm = body?.confirmPassword;
  if (!validatePassword(password)) return Errors.BAD_REQUEST("Password must be 8–128 characters");
  if (password !== confirm) return Errors.BAD_REQUEST("Passwords do not match");

  const existing = await loadUser(env.MEDIA_ASSETS, username);
  if (existing) return Errors.BAD_REQUEST("Username is already taken");

  const { hash, salt } = await hashPassword(password);

  const user = {
    user_id: `u_${randomHex(8)}`,
    username,
    password_hash: hash,
    salt,
    recovery_email: recoveryEmail,
    created_at: Date.now(),
    status: "active",
    app_access: ["studio", "gateway"],
    page_ids: [],
  };

  await saveUser(env.MEDIA_ASSETS, user);

  const session = makeSession(user);
  await saveSession(env.MEDIA_ASSETS, session);

  return json({ ok: true, session, user: publicUser(user) });
}

export async function onRequestPost(ctx) {
  const res = await handleSignup(ctx);
  return withCors(res, ctx.request, ctx.env);
}

export function onRequestOptions(ctx) {
  return handlePreflight(ctx.request, ctx.env);
}
