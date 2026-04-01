/**
 * Pure selector/helper functions shared by desktop and mobile editors.
 *
 * Extracted from:
 *   - src/ui/App.tsx (pageDataToCardState, cardStateToPageData, hasAnyOverlap)
 *   - src/ui/MobileApp.tsx (pageDataToCardState, cardStateToPageData, hasAnyOverlap)
 */

import type { CardModel, CardInteractionState, ExclusiveTile, PageData } from "../project/types";

/**
 * Convert a persisted PageData into the runtime CardInteractionState.
 * Identical in both desktop and mobile.
 */
export function pageDataToCardState(pd: PageData): CardInteractionState {
  return {
    cards: pd.cards,
    selectedCardId: pd.selectedCardId,
    lockSize: pd.lockSize,
    lockPosition: pd.lockPosition,
    lockPage: pd.lockPage ?? false,
  };
}

/**
 * Convert a runtime CardInteractionState back to a persistable PageData.
 *
 * Desktop passes an explicit instructions string; mobile passes "" (no instructions).
 * The optional `instructions` parameter defaults to "" to preserve mobile semantics.
 */
export function cardStateToPageData(
  cs: CardInteractionState,
  wallpaper: string,
  instructions = "",
  exclusiveTiles?: ExclusiveTile[],
): PageData {
  const page: PageData = {
    wallpaper,
    cards: cs.cards,
    selectedCardId: cs.selectedCardId,
    lockSize: cs.lockSize,
    lockPosition: cs.lockPosition,
    lockPage: cs.lockPage,
    instructions,
  };
  if (exclusiveTiles) page.exclusiveTiles = exclusiveTiles;
  return page;
}

/**
 * Check whether any pair of cards in the array overlaps.
 * Used to block save/deploy/lock when tiles intersect.
 *
 * Duplicated identically in App.tsx and MobileApp.tsx.
 */
export function hasAnyOverlap(cards: CardModel[]): boolean {
  for (let i = 0; i < cards.length; i++) {
    const a = cards[i];
    for (let j = i + 1; j < cards.length; j++) {
      const b = cards[j];
      if (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Find the selected card in the current state.
 * Falls back to the first card, or null if no cards exist.
 */
export function getSelectedCard(state: CardInteractionState): CardModel | null {
  return (
    state.cards.find((c) => c.id === state.selectedCardId) ??
    state.cards[0] ??
    null
  );
}

/**
 * Extract the highest numeric card counter from an array of cards.
 * Used after page switch to avoid ID collisions.
 */
export function maxCardCounter(cards: CardModel[]): number {
  return cards.reduce((max, c) => {
    const num = parseInt(c.id.replace("card-", ""), 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
}
