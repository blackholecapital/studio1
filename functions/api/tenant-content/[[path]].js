function guessContentType(path) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const types = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    mp4: "video/mp4",
    webm: "video/webm",
  };
  return types[ext] ?? "application/octet-stream";
}

export async function onRequestGet({ params, env }) {
  if (!env?.DEMO_BUCKET) {
    return new Response("Missing DEMO_BUCKET binding", { status: 500 });
  }

  const segments = Array.isArray(params.path) ? params.path : [params.path ?? ""];
  const key = `tenant-content/${segments.join("/")}`;

  if (!key || key === "tenant-content/") return new Response("Not found", { status: 404 });

  const object = await env.DEMO_BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const contentType = object.httpMetadata?.contentType || guessContentType(key);

  return new Response(object.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
