import type { BlockSpec } from "../core/types";

export const MOBILE_CANVAS = { width: 430, height: 860 } as const;

export function toMobileBlocks(blocks: BlockSpec[]): BlockSpec[] {
  const spacing = 18;
  const margin = 18;
  const cardWidth = MOBILE_CANVAS.width - margin * 2;

  const out: BlockSpec[] = [];
  let cursorY = margin;
  for (const block of blocks) {
    const scaledHeight = Math.max(80, Math.round((block.h / Math.max(block.w, 1)) * cardWidth));
    out.push({
      id: block.id,
      x: margin,
      y: cursorY,
      w: cardWidth,
      h: scaledHeight,
    });
    cursorY += scaledHeight + spacing;
  }
  return out;
}
