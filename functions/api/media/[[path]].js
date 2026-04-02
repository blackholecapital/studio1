import { sanitizePathSegments } from "../_shared/validate.js";
import { guessContentType } from "../_shared/storage.js";
import { corsReadHeaders } from "../_shared/cors.js";

export async function onRequestGet({ params, env }) {
  if (!env?.MEDIA_ASSETS_BUCKET) {
    return new Response("Missing MEDIA_ASSETS_BUCKET binding", { status: 500 });
  }

  const segments = Array.isArray(params.path) ? params.path : [params.path ?? ""];
  const key = sanitizePathSegments(segments);
  if (!key) return new Response("Not found", { status: 404 });

  const object = await env.MEDIA_ASSETS_BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const contentType = object.httpMetadata?.contentType || guessContentType(key);

  return new Response(object.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
      "ETag": object.etag ?? "",
      ...corsReadHeaders(),
    },
  });
}
