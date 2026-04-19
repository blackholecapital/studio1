import { json, Errors } from "./_shared/json.js";
import { sanitizeSlug, MAX_DEPLOY_BODY_SIZE } from "./_shared/validate.js";
import { corsWriteHeaders, handlePreflight } from "./_shared/cors.js";
import { putJson } from "./_shared/storage.js";

function withCors(response, request, env) {
  const cors = corsWriteHeaders(request, env);
  for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
  return response;
}

function parseSlugInfo(slug) {
  const value = String(slug || "").trim().toLowerCase();
  const paid = value.startsWith("xyz-");
  const product =
    value.startsWith("xyz-biz-") || value.startsWith("biz-") ? "biz" :
    value.startsWith("xyz-ad-") || value.startsWith("ad-") ? "ad" :
    "gate";
  return { slug: value, paid, product };
}

function pickBucket(env, info) {
  if (!info.paid) return env?.DEMO_BUCKET || null;
  if (info.product === "biz") return env?.BIZPAGES_TENANTS || null;
  if (info.product === "ad") return env?.ADPAGES_TENANTS || null;
  return env?.TENANTS_BUCKET || null;
}

function pickBaseUrl(env, info) {
  const biz  = String(env?.BIZ_BASE_URL  || "https://bizpages.xyz-labs.xyz").replace(/\/$/, "");
  const ad   = String(env?.AD_BASE_URL   || "https://ad-pages.xyz-labs.xyz").replace(/\/$/, "");
  const gate = String(env?.GATE_BASE_URL || "https://gateway.xyz-labs.xyz").replace(/\/$/, "");
  if (info.product === "biz") return biz;
  if (info.product === "ad") return ad;
  return gate;
}

async function handleDeploy({ request, env }) {
  if (!env?.DEMO_BUCKET) return Errors.MISSING_BINDING("DEMO_BUCKET");

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

  const mainPayload =
    body?.main ??
    body?.data?.main ??
    body?.data ??
    null;

  const holidayPayload =
    body?.holiday ??
    body?.data?.holiday ??
    null;

  const rawSlug =
    body?.slug ??
    mainPayload?.slug ??
    holidayPayload?.slug ??
    "";

  const slug = sanitizeSlug(rawSlug);
  if (!slug) return Errors.BAD_REQUEST("Missing or invalid slug");

  const slugInfo = parseSlugInfo(slug);
  const bucket = pickBucket(env, slugInfo);
  if (!bucket) {
    return Errors.BAD_REQUEST(`Missing bucket binding for product '${slugInfo.product}'`);
  }

  if (!mainPayload || typeof mainPayload !== "object") {
    return Errors.BAD_REQUEST("Missing deploy payload");
  }

  const normalizedMain = { ...mainPayload, slug: slugInfo.slug };
  const normalizedHoliday =
    holidayPayload && typeof holidayPayload === "object"
      ? { ...holidayPayload, slug: slugInfo.slug }
      : null;

  const root = slugInfo.paid ? `tenants/${slugInfo.slug}` : `json/${slugInfo.slug}`;
  const siteKey = `${root}/site.json`;
  const holidayKey = `${root}/holiday.json`;

  await putJson(bucket, siteKey, normalizedMain);
  if (normalizedHoliday) {
    await putJson(bucket, holidayKey, normalizedHoliday);
  }

  if (slugInfo.paid && slugInfo.product === "gate") {
    await putJson(bucket, `${root}/gate.json`, normalizedMain);
  }

  const base = pickBaseUrl(env, slugInfo);

  return json({
    ok: true,
    slug: slugInfo.slug,
    product: slugInfo.product,
    paid: slugInfo.paid,
    primaryUrl: `${base}/${slugInfo.slug}/home`,
    holidayUrl: `${base}/${slugInfo.slug}/holiday`,
    keys: { site: siteKey, holiday: holidayKey },
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
