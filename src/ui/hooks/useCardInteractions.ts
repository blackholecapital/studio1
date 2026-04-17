import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

// Types are now defined in the domain layer; re-export for backwards compat.
export type { CardModel, CardInteractionState } from "../../domain/project/types";
import type { CardModel, CardInteractionState } from "../../domain/project/types";
import { GRID_SNAP } from "../../domain/editor/constants";

type Params = {
  cardState: CardInteractionState;
  setCardState: React.Dispatch<React.SetStateAction<CardInteractionState>>;
  layoutConfig: { workspace: { width: number; height: number } };
  /** CSS transform scale of the stage. Pointer deltas are divided by this to get stage-space movement. */
  scale?: number;
};

function snapToGrid(v: number): number {
  return Math.round(v / GRID_SNAP) * GRID_SNAP;
}

export function useCardInteractions(params: Params) {
  const { cardState, setCardState, layoutConfig } = params;

  const workspaceRef = useRef<HTMLElement | null>(null);
  const activeDragCardIdRef = useRef<string | null>(null);
  const activeResizeCardIdRef = useRef<string | null>(null);
  const [overlappingCardIds, setOverlappingCardIds] = useState<Set<string>>(new Set());

  // Keep a ref to the current scale so the pointer handlers always read the latest value
  const scaleRef = useRef(params.scale ?? 1);
  useEffect(() => {
    scaleRef.current = params.scale ?? 1;
  }, [params.scale]);

  const dragRef = useRef<null | {
    id: string;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  }>(null);

  const resizeRef = useRef<null | {
    id: string;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startW: number;
    startH: number;
  }>(null);

  function clearActiveInteraction() {
    activeDragCardIdRef.current = null;
    activeResizeCardIdRef.current = null;
    dragRef.current = null;
    resizeRef.current = null;
  }

  function rectsOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function isOverlapping(next: { id: string; x: number; y: number; w: number; h: number }, cards: CardModel[]) {
    for (const c of cards) {
      if (c.id === next.id) continue;
      if (rectsOverlap(next, c)) return true;
    }
    return false;
  }

  function clampToWorkspace(next: { x: number; y: number; w: number; h: number }) {
    const maxW = workspaceRef.current?.offsetWidth ?? layoutConfig.workspace.width;
    const maxH = workspaceRef.current?.offsetHeight ?? layoutConfig.workspace.height;
    const edgeInset = 2;
    const x = Math.max(edgeInset, Math.min(next.x, maxW - next.w - edgeInset));
    const y = Math.max(edgeInset, Math.min(next.y, maxH - next.h - edgeInset));
    // Also cap w/h so the card's right/bottom edge never escapes the workspace
    const w = Math.min(next.w, maxW - x - edgeInset);
    const h = Math.min(next.h, maxH - y - edgeInset);
    return { ...next, x, y, w, h };
  }

  function handleCardPointerDown(e: ReactPointerEvent, cardId: string) {
    const target = e.target as HTMLElement | null;
    if (target?.closest?.(".resizeHandle")) return;

    const card = cardState.cards.find((c) => c.id === cardId);
    if (!card) return;

    // Block all interaction when page is locked
    if (cardState.lockPage) return;
    // Can drag while position is not locked.
    if (card.lockPosition) return;

    activeDragCardIdRef.current = cardId;
    dragRef.current = {
      id: cardId,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: card.x,
      startY: card.y
    };
  }

  function handleResizePointerDown(e: ReactPointerEvent, cardId: string) {
    e.preventDefault();
    e.stopPropagation();

    const card = cardState.cards.find((c) => c.id === cardId);
    if (!card) return;

    // Block all interaction when page is locked
    if (cardState.lockPage) return;
    // Can resize ONLY while size is NOT locked.
    if (card.lockSize) return;

    activeResizeCardIdRef.current = cardId;
    resizeRef.current = {
      id: cardId,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startW: card.w,
      startH: card.h
    };
  }

  useEffect(() => {
    function onMove(ev: PointerEvent) {
      const drag = dragRef.current;
      const resize = resizeRef.current;
      const scale = scaleRef.current;

      if (drag && ev.pointerId === drag.pointerId) {
        setCardState((current) => {
          const moving = current.cards.find((c) => c.id === drag.id);
          if (!moving) return current;

          // Convert viewport-pixel delta to stage-pixel delta
          const dx = (ev.clientX - drag.startClientX) / scale;
          const dy = (ev.clientY - drag.startClientY) / scale;

          const candidate = clampToWorkspace({
            x: snapToGrid(drag.startX + dx),
            y: snapToGrid(drag.startY + dy),
            w: moving.w,
            h: moving.h
          });

          const hasOverlap = isOverlapping({ id: moving.id, ...candidate }, current.cards);
          setOverlappingCardIds(hasOverlap ? new Set([moving.id]) : new Set());

          return {
            ...current,
            cards: current.cards.map((c) => (c.id === moving.id ? { ...c, x: candidate.x, y: candidate.y } : c))
          };
        });
      }

      if (resize && ev.pointerId === resize.pointerId) {
        setCardState((current) => {
          const moving = current.cards.find((c) => c.id === resize.id);
          if (!moving) return current;

          const scale = scaleRef.current;
          // Convert viewport-pixel delta to stage-pixel delta
          const dx = (ev.clientX - resize.startClientX) / scale;
          const dy = (ev.clientY - resize.startClientY) / scale;

          const maxW = workspaceRef.current?.offsetWidth ?? layoutConfig.workspace.width;
          const maxH = workspaceRef.current?.offsetHeight ?? layoutConfig.workspace.height;
          const edgeInset = 2;
          const nextW = snapToGrid(Math.max(120, Math.min(Math.round(resize.startW + dx), maxW - moving.x - edgeInset)));
          const nextH = snapToGrid(Math.max(80,  Math.min(Math.round(resize.startH + dy), maxH - moving.y - edgeInset)));

          const candidate = clampToWorkspace({
            x: moving.x,
            y: moving.y,
            w: nextW,
            h: nextH
          });

          const hasOverlap = isOverlapping({ id: moving.id, ...candidate }, current.cards);
          setOverlappingCardIds(hasOverlap ? new Set([moving.id]) : new Set());

          return {
            ...current,
            cards: current.cards.map((c) =>
              c.id === moving.id ? { ...c, x: candidate.x, y: candidate.y, w: candidate.w, h: candidate.h } : c
            )
          };
        });
      }
    }

    function onUp(ev: PointerEvent) {
      const drag = dragRef.current;
      const resize = resizeRef.current;

      if (drag && ev.pointerId === drag.pointerId) {
        dragRef.current = null;
        activeDragCardIdRef.current = null;
        setOverlappingCardIds(new Set());
      }

      if (resize && ev.pointerId === resize.pointerId) {
        resizeRef.current = null;
        activeResizeCardIdRef.current = null;
        setOverlappingCardIds(new Set());
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [layoutConfig.workspace.height, layoutConfig.workspace.width, setCardState]);

  return {
    workspaceRef,
    activeDragCardIdRef,
    activeResizeCardIdRef,
    overlappingCardIds,
    clearActiveInteraction,
    handleCardPointerDown,
    handleResizePointerDown
  };
}
