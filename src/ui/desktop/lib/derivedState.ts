import type { CardInteractionState, CardModel, PageData, PageKey, ProjectData } from "../../../domain/project/types";
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

export function getAllPagesLocked(project: ProjectData, page: PageKey, cardState: CardInteractionState) {
  return PAGE_KEYS.every((k) => (k === page ? cardState.lockPage : (project.pages[k]?.lockPage ?? false)));
}

export function getCurrentPageData(project: ProjectData, page: PageKey): PageData | null {
  return project.pages[page] ?? null;
}
