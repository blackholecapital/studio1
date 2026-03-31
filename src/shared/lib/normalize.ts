/**
 * Normalization utilities shared across desktop and mobile editors.
 *
 * Extracted from:
 *   - src/ui/MobileApp.tsx (convertToPng)
 *   - src/ui/App.tsx (inline PNG conversion in handleContentFileUpload)
 */

import { MAX_IMAGE_DIMENSION } from "../../domain/project/schema";

/**
 * Convert any image File to a PNG Blob, scaling down to MAX_IMAGE_DIMENSION
 * on the longest side.
 *
 * Falls back to the original file if canvas conversion fails.
 *
 * Extracted from MobileApp.tsx convertToPng() — identical logic was also
 * inline in App.tsx handleContentFileUpload().
 */
export function convertToPng(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      const MAX = MAX_IMAGE_DIMENSION;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > MAX || h > MAX) {
        const scale = MAX / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        resolve(blob ?? file);
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      resolve(file);
    };
    img.src = blobUrl;
  });
}
