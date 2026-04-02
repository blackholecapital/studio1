/**
 * Pure derived state helpers for the mobile editor.
 *
 * Mirrors src/ui/desktop/lib/derivedState.ts for the mobile side.
 * Extracted from MobileApp.tsx inline computations.
 */

import type { CardInteractionState, CardModel, PageKey, ProjectData } from "../../../domain/project/types";
import { PAGE_KEYS } from "../../../domain/project/defaults";

export function getSelectedCard(cardState: CardInteractionState): CardModel | null {
  return cardState.cards.find((c) => c.id === cardState.selectedCardId) ?? cardState.cards[0] ?? null;
}

export function getPageNavigation(page: PageKey) {
  const pageIndex = PAGE_KEYS.indexOf(page);
  return {
    pageIndex,
    canGoPrevPage: pageIndex > 0,
    canGoNextPage: pageIndex < PAGE_KEYS.length - 1,
    prevPage: pageIndex > 0 ? PAGE_KEYS[pageIndex - 1] : null,
    nextPage: pageIndex < PAGE_KEYS.length - 1 ? PAGE_KEYS[pageIndex + 1] : null,
  };
}

export function isPageLocked(
  project: ProjectData,
  currentPage: PageKey,
  cardState: CardInteractionState,
  key: PageKey,
): boolean {
  if (key === currentPage) return cardState.lockPage;
  return project.pages[key]?.lockPage ?? false;
}

export function getAllPagesLocked(
  project: ProjectData,
  currentPage: PageKey,
  cardState: CardInteractionState,
): boolean {
  return PAGE_KEYS.every((k) => isPageLocked(project, currentPage, cardState, k));
}
