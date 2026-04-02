/**
 * R2 storage helpers.
 */

/** Put a JSON object to R2. */
export async function putJson(bucket, key, value) {
  await bucket.put(key, JSON.stringify(value), {
    httpMetadata: { contentType: "application/json" },
  });
}

/** Guess content type from file extension. */
export function guessContentType(path) {
  const ext = String(path || "").split(".").pop()?.toLowerCase() ?? "";
  const types = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    webm: "video/webm",
    json: "application/json",
  };
  return types[ext] ?? "application/octet-stream";
}
