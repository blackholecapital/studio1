import { MEDIA_BASE } from "./assetResolver";

export type ContentItem = {
  code: string;
  url: string;
};

// Actual filenames in the media-assets/content/ R2 folder
const CONTENT_CODES = [
  "c1", "c2", "c3", "c4", "c5", "c6",
  "c2222", "c2232", "c2233", "c2244",
  "c4444", "c5555",
  "c8886", "c8887", "c8888", "c9998",
] as const;

export const contentCatalog: ContentItem[] = CONTENT_CODES.map((code) => ({
  code,
  url: `${MEDIA_BASE}/content/${code}.png`
}));
