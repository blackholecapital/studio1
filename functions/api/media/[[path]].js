function guessContentType(path) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const types = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    webm: "video/webm",
    json: "application/json"
  };
  return types[ext] ?? "application/octet-stream";
}

export async function onRequestGet({ params, env }) {
  if (!env?.MEDIA_ASSETS_BUCKET) {
    return new Response("Missing MEDIA_ASSETS_BUCKET binding", { status: 500 });
  }

  // params.path is an array of path segments from the [[path]] wildcard
  const segments = Array.isArray(params.path) ? params.path : [params.path ?? ""];
  const key = segments.join("/");

  if (!key) return new Response("Not found", { status: 404 });

  const object = await env.MEDIA_ASSETS_BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const contentType = object.httpMetadata?.contentType || guessContentType(key);

  return new Response(object.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
      "ETag": object.etag ?? ""
    }
  });
}
