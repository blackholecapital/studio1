import type { Dispatch, PointerEvent, RefObject, SetStateAction } from "react";
import type { CardInteractionState } from "../../../domain/project/types";
import { INSTRUCTIONS_IMAGE } from "../lib/mobileConstants";

type ExclusiveTileState = { url: string; price: string; locked: boolean };

export function MobileWorkspace(props: {
  page: string;
  wallpaper: string;
  exclusiveTiles: ExclusiveTileState[];
  setExclusiveTiles: Dispatch<SetStateAction<ExclusiveTileState[]>>;
  cardState: CardInteractionState;
  setCardState: Dispatch<SetStateAction<CardInteractionState>>;
  workspaceRef: RefObject<HTMLElement>;
  overlappingCardIds: Set<string>;
  onCollapseAll: () => void;
  handleCardPointerDown: (e: PointerEvent, cardId: string) => void;
  handleCardDrop: (e: React.DragEvent, cardId: string) => void;
  handleResizePointerDown: (e: PointerEvent, cardId: string) => void;
}) {
  if (props.page === "p4") {
    return (
      <section
        className="mobileWorkspace mobExclusiveWorkspaceArea"
        style={{ backgroundImage: `url(${props.wallpaper})`, touchAction: "pan-y", overflowY: "auto" }}
        onClick={props.onCollapseAll}
      >
        <div className="mobExclusiveWsInner">
          <div className="mobExclusiveWsHeader">
            <div className="mobExclusiveWsTitle">Exclusive Content</div>
            <div className="mobExclusiveWsDesc">Add image URL, set price, and lock to make purchaseable. Tap <strong>+</strong> to add tiles.</div>
          </div>
          {props.exclusiveTiles.length === 0 ? (
            <div className="mobExclusiveWsEmpty">Tap + to add exclusive content tiles</div>
          ) : (
            <div className="mobExclusiveWsGrid">
              {props.exclusiveTiles.map((tile, idx) => (
                <div key={idx} className={`mobExclusiveWsTile ${tile.locked ? "isLocked" : ""}`}>
                  <div className="mobExclusiveWsTilePlaceholder">Content {idx + 1}</div>
                  <div className="mobExclusiveWsTileImageArea">
                    {tile.url ? (
                      <img src={tile.url} alt={`Exclusive ${idx + 1}`} draggable={false}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    ) : null}
                  </div>
                  <input
                    className="mobExclusiveWsTileUrlInput"
                    value={tile.url}
                    placeholder="Image URL"
                    onChange={(e) => { e.stopPropagation(); props.setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, url: e.target.value } : t)); }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="mobExclusiveWsTileControls">
                    <button
                      className={`exclusiveTileLockBtn ${tile.locked ? "isLocked" : "isUnlocked"}`}
                      onClick={(e) => { e.stopPropagation(); props.setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, locked: !t.locked } : t)); }}
                      title={tile.locked ? "Unlock tile" : "Lock tile"}
                    >
                      {tile.locked ? (
                        <svg viewBox="0 0 26 26" width="26" height="26" fill="none">
                          <circle cx="13" cy="13" r="12" stroke="currentColor" strokeWidth="1.5" fill="rgba(0,0,0,0.25)"/>
                          <rect x="7.5" y="12" width="11" height="8" rx="1.5" fill="currentColor"/>
                          <path d="M10 12V9.5a3 3 0 0 1 6 0V12" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 26 26" width="26" height="26" fill="none">
                          <circle cx="13" cy="13" r="12" stroke="currentColor" strokeWidth="1.5" fill="rgba(0,0,0,0.25)"/>
                          <rect x="7.5" y="12" width="11" height="8" rx="1.5" fill="currentColor"/>
                          <path d="M10 12V9a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                        </svg>
                      )}
                    </button>
                    <div className="exclusiveTilePriceRow">
                      <span className={`exclusiveTilePriceLabel ${tile.locked ? "isPaid" : "isFree"}`}>
                        {tile.locked ? "Paid" : "Free"}
                      </span>
                      <input
                        className={`exclusiveTilePriceInput ${!tile.locked ? "isFree" : ""}`}
                        value={tile.locked ? tile.price : ""}
                        onChange={(e) => { e.stopPropagation(); tile.locked && props.setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, price: e.target.value } : t)); }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder={tile.locked ? "$1.00" : "Free"}
                        disabled={!tile.locked}
                      />
                    </div>
                  </div>
                  <div className="exclusiveTileTitle">Exclusive Content-{idx + 1}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // Regular card canvas (p1-p3)
  return (
    <section
      className="mobileWorkspace"
      ref={props.workspaceRef as RefObject<HTMLDivElement>}
      style={{ backgroundImage: `url(${props.wallpaper})`, touchAction: "none" }}
      onClick={props.onCollapseAll}
    >
      {props.cardState.cards.map((card) => {
        const isSelected = card.id === props.cardState.selectedCardId;
        const isOverlapping = props.overlappingCardIds.has(card.id);

        return (
          <button
            key={card.id}
            className={[
              "floatingCard",
              isSelected ? "isSelected" : "",
              card.lockPosition ? "isPositionLocked" : "",
              isOverlapping ? "isOverlapping" : "",
              props.cardState.lockPage ? "isPageLocked" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              left: card.x,
              top: card.y,
              width: card.w,
              height: card.h,
              zIndex: card.zIndex ?? 1,
            }}
            onPointerDown={(e) => {
              if (props.cardState.lockPage) return;
              const maxZ = props.cardState.cards.reduce((max, c) => Math.max(max, c.zIndex ?? 1), 1);
              props.setCardState((cur) => ({
                ...cur,
                selectedCardId: card.id,
                lockSize: card.lockSize ?? false,
                lockPosition: card.lockPosition ?? false,
                cards: cur.cards.map((c) => (c.id === card.id ? { ...c, zIndex: maxZ + 1 } : c)),
              }));
              props.handleCardPointerDown(e, card.id);
              props.onCollapseAll();
            }}
            onDrop={(e) => props.handleCardDrop(e, card.id)}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
          >
            {card.contentDisplay === "video" && card.contentUrl ? (
              <video className="cardContentImage" src={card.contentUrl} autoPlay loop muted playsInline controls={false} />
            ) : card.contentImage || card.contentUrl ? (
              <img
                className={`cardContentImage${card.contentImage === INSTRUCTIONS_IMAGE ? " isInstructionsImage" : ""}`}
                src={card.contentImage || card.contentUrl}
                alt="content"
                draggable={false}
              />
            ) : null}

            {card.skinId && <div className={`cardSkin skin-${card.skinId.toLowerCase()}`} />}

            {!props.cardState.lockPage && (
              <button
                className={`cardLockBtn mobCardPadlock ${(card.lockSize && card.lockPosition) ? "isLocked" : "isUnlocked"}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  const newLocked = !(card.lockSize && card.lockPosition);
                  props.setCardState((cur) => ({
                    ...cur,
                    cards: cur.cards.map((c) =>
                      c.id === card.id ? { ...c, lockSize: newLocked, lockPosition: newLocked } : c
                    ),
                  }));
                }}
                title={(card.lockSize && card.lockPosition) ? "Unlock card" : "Lock card"}
              >
                {(card.lockSize && card.lockPosition) ? (
                  <svg viewBox="0 0 14 14" width="13" height="13" fill="none">
                    <rect x="2" y="6" width="10" height="7" rx="1.5" fill="currentColor"/>
                    <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 14 14" width="13" height="13" fill="none">
                    <rect x="2" y="6" width="10" height="7" rx="1.5" fill="currentColor"/>
                    <path d="M4.5 6V4a2.5 2.5 0 0 1 5 0" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  </svg>
                )}
              </button>
            )}

            <span className="cardSizeBadge mobCardSizeBadge">
              {Math.round(card.w)} × {Math.round(card.h)}
            </span>

            <span
              className={`resizeHandle ${(card.lockSize && card.lockPosition) ? "isLocked" : ""}`}
              onPointerDown={(e) => props.handleResizePointerDown(e, card.id)}
            />
          </button>
        );
      })}
    </section>
  );
}
