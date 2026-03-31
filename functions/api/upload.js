const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "content-type": "application/json" }
  });

const bad = (msg, status = 400) => json({ ok: false, error: msg }, status);

const sanitizeFilename = (name) =>
  String(name || "upload.bin")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 128);

const sanitizeSlug = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

async function handleUpload({ request, env }) {
  if (!env?.DEMO_BUCKET) return bad("Missing DEMO_BUCKET binding", 500);

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return bad("Invalid form data");
  }

  const file = formData.get("file");
  const slug = sanitizeSlug(formData.get("slug") ?? "");

  if (!file || typeof file === "string") return bad("Missing file");
  if (!slug) return bad("Missing slug");
  if (file.size > 5 * 1024 * 1024) return bad("File must be 5MB or less", 413);

  const filename = sanitizeFilename(file.name);
  // Store in tenant-content (correctly spelled) under the demo bucket
  const key = `tenant-content/${slug}/${filename}`;

  await env.DEMO_BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" }
  });

  return json({ ok: true, key });
}

export const onRequestPost = handleUpload;
