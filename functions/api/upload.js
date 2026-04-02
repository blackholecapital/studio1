import { json, Errors } from "./_shared/json.js";
import { sanitizeSlug, sanitizeFilename, MAX_UPLOAD_FILE_SIZE, ALLOWED_UPLOAD_TYPES } from "./_shared/validate.js";
import { corsWriteHeaders, handlePreflight } from "./_shared/cors.js";

function withCors(response, request, env) {
  const cors = corsWriteHeaders(request, env);
  for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
  return response;
}

async function handleUpload({ request, env }) {
  if (!env?.DEMO_BUCKET) return Errors.MISSING_BINDING("DEMO_BUCKET");

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Errors.BAD_REQUEST("Invalid form data");
  }

  const file = formData.get("file");
  const slug = sanitizeSlug(formData.get("slug") ?? "");

  if (!file || typeof file === "string") return Errors.BAD_REQUEST("Missing file");
  if (!slug) return Errors.BAD_REQUEST("Missing or invalid slug");
  if (file.size > MAX_UPLOAD_FILE_SIZE) {
    return Errors.PAYLOAD_TOO_LARGE(`File must be ${MAX_UPLOAD_FILE_SIZE / (1024 * 1024)}MB or less`);
  }

  // Validate MIME type
  const mimeType = (file.type || "").toLowerCase();
  if (mimeType && !ALLOWED_UPLOAD_TYPES.has(mimeType)) {
    return Errors.BAD_REQUEST(`File type "${mimeType}" is not allowed. Accepted: ${[...ALLOWED_UPLOAD_TYPES].join(", ")}`);
  }

  const filename = sanitizeFilename(file.name);
  const key = `tenant-content/${slug}/${filename}`;

  await env.DEMO_BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: mimeType || "application/octet-stream" },
  });

  const remoteUrl = `https://demo-content.xyz-labs.xyz/${key}`;

  return json({ ok: true, key, remoteUrl });
}

export async function onRequestPost(ctx) {
  const res = await handleUpload(ctx);
  return withCors(res, ctx.request, ctx.env);
}

export function onRequestOptions(ctx) {
  return handlePreflight(ctx.request, ctx.env);
}
