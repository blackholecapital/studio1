import { useCallback } from "react";
import type { ChangeEvent } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { convertToPng } from "../../../shared/lib/normalize";
import { uploadFile } from "../../../services/upload/api";

export type UploadedContentItem = { name: string; url: string; code: string };

export function useDesktopUploadFlow(
  slug: string,
  uploadCounterRef: MutableRefObject<number>,
  setUploadedContents: Dispatch<SetStateAction<UploadedContentItem[]>>,
) {
  const handleContentFileUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      window.alert("File must be 5MB or less.");
      e.target.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    uploadCounterRef.current += 1;
    const xn = uploadCounterRef.current;
    const code = `x${String(xn).padStart(3, "0")}`;
    const filename = `${code}.png`;

    setUploadedContents((prev) => [...prev, { name: code, url: objectUrl, code }]);
    e.target.value = "";

    try {
      const pngBlob = await convertToPng(file);
      const result = await uploadFile(pngBlob, filename, slug);
      if (result.ok && result.remoteUrl) {
        setUploadedContents((prev) => prev.map((u) => (u.code === code ? { ...u, url: result.remoteUrl! } : u)));
      }
    } catch {
      // Upload failure is non-fatal for studio preview; code is still set
    }
  }, [setUploadedContents, slug, uploadCounterRef]);

  return { handleContentFileUpload };
}
