/**
 * Pure state mutation functions for the mobile editor.
 *
 * Mirrors src/ui/desktop/state/desktopReducers.ts for the mobile side.
 * Each function takes the current state and returns a new state — no side effects.
 *
 * Extracted from MobileApp.tsx: setLockSize, setLockPosition, toggleLockPage,
 * deleteSelectedCard, addMobileCard, applyCubeLayout, lockAllPages, unlockAllPages.
 */

import type { CardModel, CardInteractionState, PageKey, ProjectData } from "../../../domain/project/types";
import { PAGE_KEYS, makeEmptyPage } from "../../../domain/project/defaults";
import { getMobDims, incrementMobCardCounter } from "../lib/mobileHelpers";

// ── Lock operations ─────────────────────────────────────────────────────────

export function setSelectedCardLockSize(
  current: CardInteractionState,
  next: boolean,
): CardInteractionState {
  return {
    ...current,
    lockSize: next,
    cards: current.cards.map((c) =>
      c.id === current.selectedCardId ? { ...c, lockSize: next } : c,
    ),
  };
}

export function setSelectedCardLockPosition(
  current: CardInteractionState,
  next: boolean,
): CardInteractionState {
  return {
    ...current,
    lockPosition: next,
    cards: current.cards.map((c) =>
      c.id === current.selectedCardId ? { ...c, lockPosition: next } : c,
    ),
  };
}

export function togglePageLockState(
  current: CardInteractionState,
): CardInteractionState {
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

// ── Card operations ─────────────────────────────────────────────────────────

export function deleteSelectedCard(
  current: CardInteractionState,
): CardInteractionState {
  const remaining = current.cards.filter((c) => c.id !== current.selectedCardId);
  return {
    ...current,
    cards: remaining,
    selectedCardId: remaining.length > 0 ? remaining[remaining.length - 1].id : "",
  };
}

export function addMobileCard(
  current: CardInteractionState,
): CardInteractionState {
  if (current.lockPage) return current;
  const counter = incrementMobCardCounter();
  const newId = `card-${counter}`;
  const maxZ = current.cards.reduce((max, c) => Math.max(max, c.zIndex ?? 1), 1);
  const dims = getMobDims();
  const cardW = Math.round(Math.min(dims.width * 0.76, 300));
  const cardH = Math.round(Math.min(dims.height * 0.42, 220));
  const offset = ((counter - 1) % 5) * 18;
  const newCard: CardModel = {
    id: newId,
    label: `Card ${counter}`,
    x: 16 + offset,
    y: 16 + offset,
    w: cardW,
    h: cardH,
    zIndex: maxZ + 1,
    lockSize: false,
    lockPosition: false,
  };
  return {
    ...current,
    cards: [...current.cards, newCard],
    selectedCardId: newId,
  };
}

// ── Layout presets ──────────────────────────────────────────────────────────

export function applyCubeLayout(
  current: CardInteractionState,
  count: 1 | 2 | 3 | 4,
): CardInteractionState {
  if (current.lockPage) return current;
  const { width, height } = getMobDims();
  const margin = 14;
  const gap = 10;
  const colW = Math.floor((width - margin * 2 - gap) / 2);
  const rowH = Math.floor((height - margin * 2 - gap) / 2);

  type Pos = { x: number; y: number; w: number; h: number };
  let positions: Pos[];

  if (count === 1) {
    const w = Math.min(width - 28, 340);
    const h = Math.min(height - 28, 280);
    positions = [{ x: Math.round((width - w) / 2), y: Math.round((height - h) / 2), w, h }];
  } else if (count === 2) {
    positions = [
      { x: margin, y: margin, w: colW, h: rowH },
      { x: margin + colW + gap, y: margin, w: colW, h: rowH },
    ];
  } else if (count === 3) {
    positions = [
      { x: margin, y: margin, w: colW, h: rowH },
      { x: margin + colW + gap, y: margin, w: colW, h: rowH },
      { x: margin, y: margin + rowH + gap, w: colW, h: rowH },
    ];
  } else {
    positions = [
      { x: margin, y: margin, w: colW, h: rowH },
      { x: margin + colW + gap, y: margin, w: colW, h: rowH },
      { x: margin, y: margin + rowH + gap, w: colW, h: rowH },
      { x: margin + colW + gap, y: margin + rowH + gap, w: colW, h: rowH },
    ];
  }

  const cards: CardModel[] = positions.map((pos, idx) => {
    const counter = incrementMobCardCounter();
    return {
      id: `card-${counter}`,
      label: `Card ${counter}`,
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      w: Math.round(pos.w),
      h: Math.round(pos.h),
      zIndex: idx + 1,
      lockSize: false,
      lockPosition: false,
    };
  });

  return {
    ...current,
    cards,
    selectedCardId: cards[0]?.id ?? "",
    lockSize: false,
    lockPosition: false,
  };
}

// ── Multi-page lock operations ──────────────────────────────────────────────

export function lockAllPagesProject(project: ProjectData): ProjectData {
  return {
    ...project,
    pages: Object.fromEntries(
      PAGE_KEYS.map((k) => [k, { ...(project.pages[k] ?? makeEmptyPage()), lockPage: true }]),
    ),
  };
}

export function unlockAllPagesProject(project: ProjectData): ProjectData {
  return {
    ...project,
    pages: Object.fromEntries(
      PAGE_KEYS.map((k) => [k, { ...(project.pages[k] ?? makeEmptyPage()), lockPage: false }]),
    ),
  };
}

export function resetAllPagesProject(project: ProjectData): ProjectData {
  return {
    ...project,
    pages: Object.fromEntries(PAGE_KEYS.map((k) => [k, makeEmptyPage()])),
  };
}

// ── Card content application ────────────────────────────────────────────────

export function applyContentToSelectedCard(
  current: CardInteractionState,
  selectedCardId: string,
  contentUrl: string,
  contentCode?: string,
): CardInteractionState {
  return {
    ...current,
    cards: current.cards.map((c) =>
      c.id === selectedCardId
        ? { ...c, contentImage: contentUrl, contentUrl, contentDisplay: "image" as const, contentType: "image" as const, contentCode: contentCode ?? c.contentCode }
        : c,
    ),
  };
}

export function applySkinToSelectedCard(
  current: CardInteractionState,
  selectedCardId: string,
  skinId: string,
): CardInteractionState {
  return {
    ...current,
    cards: current.cards.map((c) =>
      c.id === selectedCardId ? { ...c, skinId } : c,
    ),
  };
}

export function applyMediaToSelectedCard(
  current: CardInteractionState,
  selectedCardId: string,
  mediaUrl: string,
  mediaType: "image" | "video",
): CardInteractionState {
  const contentDisplay = mediaType === "video" ? "video" : "image";
  return {
    ...current,
    cards: current.cards.map((c) =>
      c.id === selectedCardId
        ? {
            ...c,
            contentImage: contentDisplay === "image" ? mediaUrl : undefined,
            contentUrl: mediaUrl,
            contentDisplay,
            contentType: mediaType,
          }
        : c,
    ),
  };
}

export function applyDropToCard(
  current: CardInteractionState,
  cardId: string,
  contentUrl: string,
  contentCode?: string,
): CardInteractionState {
  return {
    ...current,
    cards: current.cards.map((c) =>
      c.id === cardId
        ? { ...c, contentImage: contentUrl, contentUrl, contentDisplay: "image" as const, contentType: "image" as const, contentCode }
        : c,
    ),
  };
}

export function applySkinDropToCard(
  current: CardInteractionState,
  cardId: string,
  skinId: string,
): CardInteractionState {
  return {
    ...current,
    cards: current.cards.map((c) =>
      c.id === cardId ? { ...c, skinId } : c,
    ),
  };
}
