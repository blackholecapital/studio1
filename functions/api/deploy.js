import { json, Errors } from "./_shared/json.js";
import { sanitizeSlug, MAX_DEPLOY_BODY_SIZE } from "./_shared/validate.js";
import { corsWriteHeaders, handlePreflight } from "./_shared/cors.js";
import { putJson } from "./_shared/storage.js";

function withCors(response, request, env) {
  const cors = corsWriteHeaders(request, env);
  for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
  return response;
}

async function handleDeploy({ request, env }) {
  if (!env?.DEMO_BUCKET) return Errors.MISSING_BINDING("DEMO_BUCKET");

  // Guard request size
  const contentLength = parseInt(request.headers.get("Content-Length") || "0", 10);
  if (contentLength > MAX_DEPLOY_BODY_SIZE) {
    return Errors.PAYLOAD_TOO_LARGE(`Body exceeds ${MAX_DEPLOY_BODY_SIZE / 1024}KB limit`);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Errors.BAD_REQUEST("Invalid JSON body");
  }

  if (typeof body !== "object" || body === null) {
    return Errors.BAD_REQUEST("Body must be a JSON object");
  }

  // Dual-deploy format: { main: {...}, holiday: {...} }
  if (!body.main || !body.holiday) {
    return Errors.BAD_REQUEST("Expected dual-deploy payload { main, holiday }");
  }

  if (typeof body.main !== "object" || typeof body.holiday !== "object") {
    return Errors.BAD_REQUEST("main and holiday must be objects");
  }

  const slug = sanitizeSlug(body.main?.slug ?? body.holiday?.slug ?? "");
  if (!slug) return Errors.BAD_REQUEST("Missing or invalid slug");

  const mainKey    = `json/${slug}/main.json`;
  const siteKey    = `json/${slug}/site.json`;
  const holidayKey = `json/${slug}/holiday.json`;

  await putJson(env.DEMO_BUCKET, mainKey, body.main);
  // Compatibility: receiver expects site.json
  await putJson(env.DEMO_BUCKET, siteKey, body.main);
  await putJson(env.DEMO_BUCKET, holidayKey, body.holiday);

  const base = String(env.DEMO_BASE_URL || "https://gateway.xyz-labs.xyz").replace(/\/$/, "");
  return json({
    ok: true,
    slug,
    primaryUrl: `${base}/${slug}/gate`,
    holidayUrl: `${base}/${slug}/holiday`,
    keys: { main: mainKey, site: siteKey, holiday: holidayKey },
  });
}

export async function onRequestPost(ctx) {
  const res = await handleDeploy(ctx);
  return withCors(res, ctx.request, ctx.env);
}

export async function onRequestPut(ctx) {
  const res = await handleDeploy(ctx);
  return withCors(res, ctx.request, ctx.env);
}

export function onRequestOptions(ctx) {
  return handlePreflight(ctx.request, ctx.env);
}
