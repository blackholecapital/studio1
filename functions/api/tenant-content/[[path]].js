import { sanitizePathSegments } from "../_shared/validate.js";
import { guessContentType } from "../_shared/storage.js";
import { corsReadHeaders } from "../_shared/cors.js";

export async function onRequestGet({ params, env }) {
  if (!env?.DEMO_BUCKET) {
    return new Response("Missing DEMO_BUCKET binding", { status: 500 });
  }

  const segments = Array.isArray(params.path) ? params.path : [params.path ?? ""];
  const subPath = sanitizePathSegments(segments);
  if (!subPath) return new Response("Not found", { status: 404 });

  const key = `tenant-content/${subPath}`;
  const object = await env.DEMO_BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const contentType = object.httpMetadata?.contentType || guessContentType(key);

  return new Response(object.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
      ...corsReadHeaders(),
    },
  });
}
