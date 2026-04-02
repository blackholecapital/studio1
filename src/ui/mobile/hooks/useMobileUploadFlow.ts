/**
 * Mobile photo upload flow hook.
 *
 * Mirrors src/ui/desktop/hooks/useDesktopUploadFlow.ts for the mobile side.
 * Extracted from MobileApp.tsx: handleMobilePhotoUpload.
 */

import { useCallback, useState, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ContentItem } from "../../../core/contentCatalog";
import type { CardInteractionState, CardModel } from "../../../domain/project/types";
import { convertToPng } from "../../../shared/lib/normalize";
import { uploadFile } from "../../../services/upload/api";
import { saveUserUploads, saveUploadCounter, loadUserUploads, loadUploadCounter } from "../../../services/storage/projectStore";

type Args = {
  slug: string;
  selectedCard: CardModel | null;
  lockPage: boolean;
  setCardState: Dispatch<SetStateAction<CardInteractionState>>;
  setDeployStatus: (next: string | null) => void;
};

export function useMobileUploadFlow(args: Args) {
  const [userUploads, setUserUploads] = useState<ContentItem[]>(() => loadUserUploads<ContentItem>());
  const [uploadCounter, setUploadCounter] = useState(loadUploadCounter);
  const [uploading, setUploading] = useState(false);

  // Persist uploads to localStorage
  useEffect(() => { saveUserUploads(userUploads); }, [userUploads]);
  useEffect(() => { saveUploadCounter(uploadCounter); }, [uploadCounter]);

  const handleMobilePhotoUpload = useCallback(async (file: File) => {
    if (!file) return;
    if (uploading) { args.setDeployStatus("Upload already in progress..."); return; }
    setUploading(true);
    args.setDeployStatus("Converting image...");
    try {
      const pngBlob = await convertToPng(file);
      const nextNum = uploadCounter + 1;
      const xCode = `x${String(nextNum).padStart(3, "0")}`;
      const filename = `${xCode}.png`;

      const localUrl = URL.createObjectURL(pngBlob);
      const item: ContentItem = { code: xCode, url: localUrl };
      setUserUploads((prev) => [...prev, item]);
      setUploadCounter(nextNum);

      // Auto-apply to selected card immediately
      if (args.selectedCard && !args.lockPage) {
        args.setCardState((cur) => ({
          ...cur,
          cards: cur.cards.map((c) =>
            c.id === args.selectedCard!.id
              ? { ...c, contentImage: localUrl, contentUrl: localUrl, contentDisplay: "image" as const, contentType: "image" as const, contentCode: xCode }
              : c
          ),
        }));
      }

      // Upload to R2
      const sizeKB = (pngBlob.size / 1024).toFixed(0);
      args.setDeployStatus(`Uploading ${xCode} (${sizeKB} KB)...`);
      const uploadResult = await uploadFile(pngBlob, filename, args.slug);
      if (uploadResult.ok && uploadResult.remoteUrl) {
        const remoteUrl = uploadResult.remoteUrl;
        setUserUploads((prev) => prev.map((u) => u.code === xCode ? { ...u, url: remoteUrl } : u));
        args.setCardState((cur) => ({
          ...cur,
          cards: cur.cards.map((c) =>
            c.contentCode === xCode
              ? { ...c, contentImage: remoteUrl, contentUrl: remoteUrl }
              : c
          ),
        }));
        args.setDeployStatus(`${xCode} uploaded`);
        setTimeout(() => args.setDeployStatus(null), 2000);
      } else {
        args.setDeployStatus(`Upload failed: ${uploadResult.error ?? "unknown"}`);
        setTimeout(() => args.setDeployStatus(null), 4000);
      }
    } catch (err) {
      args.setDeployStatus(`Convert error: ${(err as Error).message}`);
      setTimeout(() => args.setDeployStatus(null), 5000);
    } finally {
      setUploading(false);
    }
  }, [args, uploading, uploadCounter]);

  return { userUploads, uploading, handleMobilePhotoUpload };
}
