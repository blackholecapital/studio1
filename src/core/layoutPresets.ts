import type { BlockSpec, LayoutId } from "./types";
export type { LayoutId };

export const layoutPresets: Record<LayoutId, BlockSpec[]> = {
  // 2 big cards centered
  L1: [
    { id: "card1", x: 60, y: 120, w: 520, h: 280 },
    { id: "card2", x: 640, y: 120, w: 520, h: 280 }
  ],
  // 2-card L-ish offset
  L2: [
    { id: "card1", x: 60, y: 110, w: 520, h: 300 },
    { id: "card2", x: 620, y: 170, w: 560, h: 240 }
  ],
  // 3 cards: 2 top + 1 bottom wide
  L3: [
    { id: "card1", x: 60, y: 120, w: 520, h: 250 },
    { id: "card2", x: 640, y: 120, w: 520, h: 250 },
    { id: "card3", x: 160, y: 400, w: 900, h: 230 }
  ],
  // 3 cards: two stacked left + tall right
  L4: [
    { id: "card1", x: 60, y: 120, w: 540, h: 190 },
    { id: "card2", x: 60, y: 330, w: 540, h: 190 },
    { id: "card3", x: 640, y: 120, w: 520, h: 400 }
  ],
// L5: three cards (one wide top, two bottom)
L5: [
  { id: "card1", x: 160, y: 120, w: 900, h: 220 },
  { id: "card2", x: 60, y: 360, w: 540, h: 260 },
  { id: "card3", x: 620, y: 360, w: 540, h: 260 }
],
  // NEW DEFAULT: 3 cards — big left half + two stacked right quarters
  L6: [
    { id: "card1", x: 60, y: 120, w: 620, h: 520 },
    { id: "card2", x: 720, y: 120, w: 520, h: 250 },
    { id: "card3", x: 720, y: 390, w: 520, h: 250 }
  ],
  // 2 cards side-by-side (half + half)
  L7: [
    { id: "card1", x: 60, y: 120, w: 590, h: 520 },
    { id: "card2", x: 670, y: 120, w: 570, h: 520 }
  ],
  // 3 cards: one long left, two small right
  L8: [
    { id: "card1", x: 60, y: 120, w: 760, h: 520 },
    { id: "card2", x: 840, y: 120, w: 400, h: 250 },
    { id: "card3", x: 840, y: 390, w: 400, h: 250 }
  ]

};
