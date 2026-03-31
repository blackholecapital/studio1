const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "content-type": "application/json" }
  });

const bad = (msg, status = 400) => json({ ok: false, error: msg }, status);

const sanitize = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

async function putJson(env, key, value) {
  await env.DEMO_BUCKET.put(key, JSON.stringify(value), {
    httpMetadata: { contentType: "application/json" }
  });
}

async function handleDeploy({ request, env }) {
  if (!env?.DEMO_BUCKET) return bad("Missing DEMO_BUCKET binding", 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Invalid body");
  }

  // Dual-deploy format: { main: {...}, holiday: {...} }
  if (body?.main && body?.holiday) {
    const slug = sanitize(body.main?.slug ?? body.holiday?.slug ?? "");
    if (!slug) return bad("Missing slug");

    const mainKey    = `json/${slug}/main.json`;
    const siteKey    = `json/${slug}/site.json`;
    const holidayKey = `json/${slug}/holiday.json`;

    await putJson(env, mainKey,    body.main);
    // Compatibility: receiver expects site.json
    await putJson(env, siteKey,    body.main);
    await putJson(env, holidayKey, body.holiday);

    const base = String(env.DEMO_BASE_URL || "https://gateway.xyz-labs.xyz").replace(/\/$/, "");
    return json({
      ok: true,
      slug,
      primaryUrl: `${base}/${slug}/gate`,
      holidayUrl: `${base}/${slug}/holiday`,
      keys: { main: mainKey, site: siteKey, holiday: holidayKey }
    });
  }

  return bad("Expected dual-deploy payload { main, holiday }");
}

export const onRequestPost = handleDeploy;
export const onRequestPut  = handleDeploy;
