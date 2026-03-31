/**
 * Upload network service — sends files to R2 via the upload endpoint.
 *
 * Extracted from:
 *   - src/ui/App.tsx (handleContentFileUpload — fetch call)
 *   - src/ui/MobileApp.tsx (handleMobilePhotoUpload — fetch call)
 *
 * Isolates the network call so UI code only handles state updates.
 */

import { UPLOAD_ENDPOINT, DEMO_CONTENT_BASE } from "../../domain/editor/constants";

export type UploadResult = {
  ok: boolean;
  remoteUrl?: string;
  error?: string;
};

/**
 * Upload a PNG blob to the R2 bucket for a given slug.
 *
 * @param blob The PNG blob to upload.
 * @param filename The filename (e.g. "x001.png").
 * @param slug The tenant slug.
 * @returns UploadResult with the remote URL on success.
 */
export async function uploadFile(
  blob: Blob,
  filename: string,
  slug: string,
): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", new File([blob], filename, { type: "image/png" }));
  form.append("slug", slug);

  try {
    const res = await fetch(UPLOAD_ENDPOINT, { method: "POST", body: form });

    if (!res.ok && res.status === 404) {
      return { ok: false, error: "/api/upload not found (404) — redeploy Pages" };
    }

    const text = await res.text();
    let data: { ok: boolean; key?: string; error?: string };
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, error: `non-JSON response (${res.status}): ${text.slice(0, 80)}` };
    }

    if (data.ok) {
      const remoteUrl = `${DEMO_CONTENT_BASE}/tenant-content/${slug}/${filename}`;
      return { ok: true, remoteUrl };
    }

    return { ok: false, error: data.error ?? String(res.status) };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Build the remote URL for an uploaded file.
 */
export function tenantContentUrl(slug: string, filename: string): string {
  return `${DEMO_CONTENT_BASE}/tenant-content/${slug}/${filename}`;
}
