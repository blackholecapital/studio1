import type { Dispatch, DragEvent, PointerEvent, RefObject, SetStateAction } from "react";
import type { CardInteractionState, ExclusiveTile } from "../../../domain/project/types";

export function DesktopWorkspace(props: {
  workspaceRef: RefObject<HTMLElement>;
  page: string;
  exclusiveTiles: ExclusiveTile[];
  setExclusiveTiles: Dispatch<SetStateAction<ExclusiveTile[]>>;
  cardState: CardInteractionState;
  setCardState: Dispatch<SetStateAction<CardInteractionState>>;
  wallpaperPreview: string | null;
  workspaceUrlPreview: string | null;
  overlappingCardIds: Set<string>;
  pageInstructions: string;
  handleCardPointerDown: (e: PointerEvent, cardId: string) => void;
  handleCardDrop: (e: DragEvent, cardId: string) => void;
  handleCardDragOver: (e: DragEvent) => void;
  handleResizePointerDown: (e: PointerEvent, cardId: string) => void;
}) {
  return (
    <section className="workspaceShell" ref={props.workspaceRef as RefObject<HTMLDivElement>}>
      <div className="workspaceTint" />

      {props.page === "p4" && (
        <div className="exclusiveWorkspace">
          <div className="exclusiveWorkspaceHeader">
            <div className="exclusiveWorkspaceTitle">Exclusive Content</div>
            <div className="exclusiveWorkspaceDesc">Add content or media link, add price, and lock to make item purchaseable in the exclusive content area. Unlock to make it available for free.</div>
          </div>
          <div className="exclusiveWorkspaceGrid">
            {props.exclusiveTiles.map((tile, idx) => (
              <div key={idx} className="exclusiveWorkspaceTile" onDragOver={(e) => {
                const types = e.dataTransfer.types;
                if (types.includes("application/x-wallpaper")) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }} onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (props.cardState.lockPage) return;
                const dragSource = e.dataTransfer.getData("application/x-drag-source");
                if (dragSource === "wallpaper") return;
                const contentUrl = e.dataTransfer.getData("text/plain");
                if (!contentUrl) return;
                const code = e.dataTransfer.getData("application/x-content-code") || undefined;
                props.setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, url: contentUrl, contentCode: code } : t));
              }}>
                <div className="exclusiveTilePlaceholderLabel">Placeholder: add image here ({idx + 1})</div>
                <div className="exclusiveTileImageArea">{tile.url ? <img src={tile.url} alt={`Content ${idx + 1}`} className="exclusiveTileImage" draggable={false} /> : null}</div>
                <div className="exclusiveTileCenter">
                  <button className={`exclusiveTileLockBtn ${tile.locked ? "isLocked" : "isUnlocked"}`} onClick={() => { if (props.cardState.lockPage) return; props.setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, locked: !t.locked } : t)); }} title={props.cardState.lockPage ? "Page is locked" : tile.locked ? "Unlock tile" : "Lock tile"} disabled={props.cardState.lockPage}>
                    {tile.locked ? <svg viewBox="0 0 26 26" width="28" height="28" fill="none"><circle cx="13" cy="13" r="12" stroke="currentColor" strokeWidth="1.5" fill="rgba(0,0,0,0.25)"/><rect x="7.5" y="12" width="11" height="8" rx="1.5" fill="currentColor"/><path d="M10 12V9.5a3 3 0 0 1 6 0V12" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg> : <svg viewBox="0 0 26 26" width="28" height="28" fill="none"><circle cx="13" cy="13" r="12" stroke="currentColor" strokeWidth="1.5" fill="rgba(0,0,0,0.25)"/><rect x="7.5" y="12" width="11" height="8" rx="1.5" fill="currentColor"/><path d="M10 12V9a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                  </button>
                  <div className="exclusiveTilePriceRow">
                    <span className={`exclusiveTilePriceLabel ${tile.locked ? "isPaid" : "isFree"}`}>{tile.locked ? "Paid" : "Free"}</span>
                    <input className={`exclusiveTilePriceInput ${!tile.locked ? "isFree" : ""}`} value={tile.locked ? tile.price : ""} onChange={(e) => tile.locked && props.setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, price: e.target.value } : t))} placeholder={tile.locked ? "$1.00" : "Free"} disabled={!tile.locked || props.cardState.lockPage} />
                  </div>
                </div>
                <div className="exclusiveTileTitle">Exclusive Content-{idx + 1}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {props.wallpaperPreview && <div className="wallpaperPreviewOverlay" style={{ backgroundImage: `url(${props.wallpaperPreview})` }} />}
      {props.workspaceUrlPreview && <div className="workspaceUrlDragPreview"><span>Media URL Preview</span><p>{props.workspaceUrlPreview}</p></div>}
      {props.page !== "p4" && props.cardState.cards.map((card) => {
        const isSelected = card.id === props.cardState.selectedCardId;
        const isOverlapping = props.overlappingCardIds.has(card.id);

        return (
          <button
            key={card.id}
            className={`floatingCard ${isSelected ? "isSelected" : ""} ${card.lockPosition ? "isPositionLocked" : ""} ${isOverlapping ? "isOverlapping" : ""} ${props.cardState.lockPage ? "isPageLocked" : ""}`}
            style={{ left: card.x, top: card.y, width: card.w, height: card.h, zIndex: card.zIndex ?? 1 }}
            onPointerDown={(e) => {
              if (props.cardState.lockPage) return;
              const maxZ = props.cardState.cards.reduce((max, c) => Math.max(max, c.zIndex ?? 1), 1);
              props.setCardState((current) => ({ ...current, selectedCardId: card.id, lockSize: card.lockSize ?? false, lockPosition: card.lockPosition ?? false, cards: current.cards.map((c) => c.id === card.id ? { ...c, zIndex: maxZ + 1 } : c) }));
              props.handleCardPointerDown(e, card.id);
            }}
            onDrop={(e) => props.handleCardDrop(e, card.id)}
            onDragOver={props.handleCardDragOver}
          >
            {card.contentDisplay === "video" && card.contentUrl ? <video className="cardContentImage" src={card.contentUrl} autoPlay loop muted playsInline controls={false} /> : card.contentDisplay === "url" && card.contentUrl ? <div className="cardUrlPreview"><span>Media URL Preview</span><p>{card.contentUrl}</p></div> : card.contentImage || card.contentUrl ? <img className={`cardContentImage${card.contentCode === "c5555" ? " isDefaultImage" : ""}`} src={card.contentImage || card.contentUrl} alt="content" draggable={false} /> : <div className="cardInstructions">{props.pageInstructions.split("\n").map((line, idx) => (<p key={`${card.id}-${idx}`}>{line}</p>))}</div>}
            {card.skinId && <div className={`cardSkin skin-${card.skinId.toLowerCase()}`} />}
            {card.isExclusive && <div className="exclusiveLockOverlay"><span className="exclusiveLockLabel">Click to Buy</span>{card.exclusivePrice && <span className="exclusivePriceTag">{card.exclusivePrice}</span>}</div>}
            {!props.cardState.lockPage && <div className="cardTopLeftControls"><button className={`cardLockBtn ${(card.lockSize && card.lockPosition) ? "isLocked" : "isUnlocked"}`} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); const newLocked = !(card.lockSize && card.lockPosition); props.setCardState((current) => ({ ...current, cards: current.cards.map((c) => c.id === card.id ? { ...c, lockSize: newLocked, lockPosition: newLocked } : c) })); }} title={(card.lockSize && card.lockPosition) ? "Unlock card" : "Lock card"}>{(card.lockSize && card.lockPosition) ? <svg viewBox="0 0 14 14" width="13" height="13" fill="none"><rect x="2" y="6" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg> : <svg viewBox="0 0 14 14" width="13" height="13" fill="none"><rect x="2" y="6" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M4.5 6V4a2.5 2.5 0 0 1 5 0" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>}</button></div>}
            <div className="cardBottomRightControls"><div className="cardBottomRightBtns"><span className="cardSizeBadge">{Math.round(card.w)} × {Math.round(card.h)}</span><span className={`resizeHandle ${(card.lockSize && card.lockPosition) ? "isLocked" : ""}`} onPointerDown={(e) => props.handleResizePointerDown(e, card.id)} /></div></div>
          </button>
        );
      })}
    </section>
  );
}
