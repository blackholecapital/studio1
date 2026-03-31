export const MOBILE_CANVAS = { width: 430, height: 860 };

function normalizeImageCode(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw.includes(".") ? raw : `${raw}.png`;
}

export function toMobileRuntimePageSpec(runtimePage, studioPage, opts = {}) {
  const lockCard1 = !!opts.lockCard1;
  const blocks = Array.isArray(studioPage?.blocks) ? studioPage.blocks : [];
  const content = studioPage?.content && typeof studioPage.content === "object" ? studioPage.content : {};
  const kinds = studioPage?.cardKinds && typeof studioPage.cardKinds === "object" ? studioPage.cardKinds : {};
  const style = studioPage?.style && typeof studioPage.style === "object" ? studioPage.style : {};
  const margin = 18;
  const spacing = 18;
  const cardWidth = MOBILE_CANVAS.width - margin * 2;
  let cursorY = margin;

  const outBlocks = [];

  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;
    if (lockCard1 && b.id === "card1") continue;

    const kind = kinds[b.id] || "text";
    const lines = Array.isArray(content[b.id]) ? content[b.id] : [];
    const title = String(lines[0] ?? "").trim() || `${runtimePage.toUpperCase()} / ${b.id}`;
    const bodyLines = lines.slice(1, 10).map((x) => String(x ?? ""));
    const bw = Math.max(Number(b.w ?? 400), 1);
    const bh = Number(b.h ?? 220);
    const minH = kind === "image" ? 120 : 80;
    const nextHeight = Math.max(minH, Math.round((bh / bw) * cardWidth));

    outBlocks.push({
      id: String(b.id),
      kind,
      x: margin,
      y: cursorY,
      w: cardWidth,
      h: nextHeight,
      title,
      lines: bodyLines,
      image: kind === "image" ? normalizeImageCode(lines[0]) : ""
    });

    cursorY += nextHeight + spacing;
  }

  return {
    version: 1,
    page: runtimePage,
    viewport: MOBILE_CANVAS,
    wallpaperUrl: style.wallpaperUrl || "",
    style,
    blocks: outBlocks
  };
}
