import type { CardKind, DemoSpecBundle, PageSpec, PageStyle } from "./types";
import { layoutPresets, type LayoutId } from "./layoutPresets";
import { makeDefaultLines } from "./defaultContent";

const contentCardIds = ["card1", "card2", "card3", "card4", "card5", "card6", "card7", "card8"] as const;
export type ContentCardId = (typeof contentCardIds)[number];

const DEFAULT_WALLPAPER = "/wallpapers/wp-001-holographic-cosmos.png";

export function allContentCardIds(): ContentCardId[] {
  return [...contentCardIds];
}

export function makeInitialPage(page: PageSpec["page"]): PageSpec {
  const layoutId: LayoutId = "L6";
  const blocks = layoutPresets[layoutId].map((b) => ({ ...b }));

  const content: Record<string, string[]> = {};
  const cardKinds: Record<string, CardKind> = {};
  for (const id of contentCardIds) {
    content[id] = makeDefaultLines(`${page.toUpperCase()} / ${id.replace("card", "Card ")}`);
    cardKinds[id] = "text";
  }

  const style: PageStyle = {
    fontId: "F1",
    cardBgId: "BG1",
    wallpaperUrl: DEFAULT_WALLPAPER
  };

  return { version: 1, page, layoutId, blocks, content, cardKinds, style };
}

export function makeInitialBundle(slug: string): DemoSpecBundle {
  return {
    version: 1,
    slug,
    pages: {
      gate: makeInitialPage("gate"),
      vip: makeInitialPage("vip"),
      perks: makeInitialPage("perks"),
      account: makeInitialPage("account"),
      socials: makeInitialPage("socials")
    }
  };
}

export function setLayout(page: PageSpec, layoutId: LayoutId): PageSpec {
  return { ...page, layoutId, blocks: layoutPresets[layoutId].map((b) => ({ ...b })) };
}

export function setBlocks(page: PageSpec, blocks: PageSpec["blocks"], templateId?: string): PageSpec {
  return { ...page, blocks, templateId };
}

export function setCardLine(page: PageSpec, cardId: string, lineIndex: number, value: string): PageSpec {
  const existing = page.content[cardId] ?? Array.from({ length: 10 }, () => "");
  const next = [...existing];
  next[lineIndex] = value;
  return { ...page, content: { ...page.content, [cardId]: next } };
}

export function setCardKind(page: PageSpec, cardId: string, kind: CardKind): PageSpec {
  const existing = page.cardKinds ?? {};
  return { ...page, cardKinds: { ...existing, [cardId]: kind } };
}

export function setPageStyle(page: PageSpec, next: Partial<PageStyle>): PageSpec {
  return { ...page, style: { ...(page.style ?? {}), ...next } };
}
