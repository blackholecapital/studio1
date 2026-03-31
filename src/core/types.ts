export type TabKey = "gate" | "vip" | "perks" | "account" | "socials" | "scraper" | "prototype";

export type CardKind = "text" | "video" | "social" | "image";

export type LayoutId = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7" | "L8";

export type BlockSpec = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type TextStylePatch = {
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
};

export type LineAlign = "left" | "center" | "right";

export type PageStyle = {
  fontId?: string;
  cardBgId?: string;
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  wallpaperUrl?: string;
  wallpaperCode?: string;
  cardTextStyle?: Record<string, TextStylePatch>;
  lineAlign?: Record<string, Record<number, LineAlign>>;
};

export type PageSpec = {
  version: 1;
  page: Exclude<TabKey, "scraper" | "prototype">;
  layoutId: LayoutId;
  blocks: BlockSpec[];
  content: Record<string, string[]>;
  cardKinds?: Record<string, CardKind>;
  style?: PageStyle;
  templateId?: string;
};

export type DemoSpecBundle = {
  version: 1;
  slug: string;
  pages: Record<PageSpec["page"], PageSpec>;
};
