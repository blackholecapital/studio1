import type { CardInteractionState, CardModel } from "../../../domain/project/types";

export function patchSelectedCard(
  current: CardInteractionState,
  selectedCardId: string,
  patch: Partial<CardModel>,
): CardInteractionState {
  return {
    ...current,
    cards: current.cards.map((card) => (card.id === selectedCardId ? { ...card, ...patch } : card)),
  };
}

export function setSelectedCardLockSize(current: CardInteractionState, next: boolean): CardInteractionState {
  return {
    ...current,
    lockSize: next,
    cards: current.cards.map((c) => (c.id === current.selectedCardId ? { ...c, lockSize: next } : c)),
  };
}

export function setSelectedCardLockPosition(current: CardInteractionState, next: boolean): CardInteractionState {
  return {
    ...current,
    lockPosition: next,
    cards: current.cards.map((c) => (c.id === current.selectedCardId ? { ...c, lockPosition: next } : c)),
  };
}

export function togglePageLockState(current: CardInteractionState): CardInteractionState {
  const next = !current.lockPage;
  return {
    ...current,
    lockPage: next,
    lockSize: next ? true : current.lockSize,
    lockPosition: next ? true : current.lockPosition,
    cards: current.cards.map((c) => ({
      ...c,
      lockSize: next ? true : c.lockSize,
      lockPosition: next ? true : c.lockPosition,
    })),
  };
}

export function deleteSelectedCardState(current: CardInteractionState): CardInteractionState {
  const remaining = current.cards.filter((c) => c.id !== current.selectedCardId);
  return {
    ...current,
    cards: remaining,
    selectedCardId: remaining.length > 0 ? remaining[remaining.length - 1].id : "",
  };
}
