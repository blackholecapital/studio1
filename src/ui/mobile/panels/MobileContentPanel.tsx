import type { Dispatch, RefObject, SetStateAction } from "react";
import type { ContentItem } from "../../../core/contentCatalog";
import { contentCatalog } from "../../../core/contentCatalog";
import { skinCatalog } from "../../../core/skinCatalog";
import { mediaTiles } from "../lib/mobileConstants";

export type ContentPanelType = "content" | "media" | "skins" | "exclusive" | null;

type ExclusiveTileState = { url: string; price: string; locked: boolean };

export function MobileContentPanel(props: {
  contentPanel: ContentPanelType;
  contentPanelSide: "left" | "right";
  userUploads: ContentItem[];
  uploading: boolean;
  mediaUrls: Record<string, string>;
  exclusiveTiles: ExclusiveTileState[];
  contentFileInputRef: RefObject<HTMLInputElement>;
  mediaAddInputRef: RefObject<HTMLInputElement>;
  setContentPanel: (next: ContentPanelType) => void;
  setContentPanelSide: Dispatch<SetStateAction<"left" | "right">>;
  setMediaUrls: Dispatch<SetStateAction<Record<string, string>>>;
  setExclusiveTiles: Dispatch<SetStateAction<ExclusiveTileState[]>>;
  applyContentToCard: (url: string, code?: string) => void;
  applySkinToCard: (skinId: string) => void;
  applyMediaToCard: (url: string, type: "image" | "video") => void;
  handleContentDragStart: (e: React.DragEvent, url: string, code?: string) => void;
  handleSkinDragStart: (e: React.DragEvent, skinId: string) => void;
}) {
  if (!props.contentPanel) return null;

  return (
    <div className={`mobileToolOverlay ${props.contentPanelSide === "left" ? "isLeft" : "isRight"}`}>
      <div className="mobToolHeader">
        <button
          className="mobToolArrowBtn"
          onClick={() => props.setContentPanelSide((s) => s === "right" ? "left" : "right")}
          title={props.contentPanelSide === "right" ? "Move panel left" : "Move panel right"}
        >
          <svg viewBox="0 0 10 16" width="9" height="14" fill="none">
            {props.contentPanelSide === "right" ? (
              <path d="M8 2L2 8l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            ) : (
              <path d="M2 2l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            )}
          </svg>
        </button>
        <span className="mobToolTitle">{props.contentPanel.toUpperCase()}</span>
        {props.contentPanel === "content" && (
          <button
            className="mobToolHeaderPlus mobToolHeaderPlusFlat"
            onClick={() => props.contentFileInputRef.current?.click()}
            title="Upload photo"
            disabled={props.uploading}
          >{props.uploading ? "..." : "+"}</button>
        )}
        {props.contentPanel === "media" && (
          <button
            className="mobToolHeaderPlus mobToolHeaderPlusFlat"
            onClick={() => props.mediaAddInputRef.current?.click()}
            title="Add media tile"
          >+</button>
        )}
        {props.contentPanel === "exclusive" && (
          <button
            className="mobToolHeaderPlus mobToolHeaderPlusFlat"
            onClick={() => props.setExclusiveTiles((prev) => [...prev, { url: "", price: "", locked: false }])}
            title="Add exclusive card"
          >+</button>
        )}
        <button className="mobToolClose" onClick={() => props.setContentPanel(null)}>✕</button>
      </div>
      <div className="mobToolBody">
        {props.contentPanel === "content" && (
          <div className="contentTray">
            {props.userUploads.map((item) => (
              <div key={item.code} className="contentThumb contentThumbUser" draggable
                onDragStart={(e) => props.handleContentDragStart(e, item.url, item.code)}
                onClick={() => props.applyContentToCard(item.url, item.code)} title={item.code}>
                <img src={item.url} alt={item.code} draggable={false} loading="lazy" decoding="async"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                <span className="contentThumbCode">{item.code}</span>
              </div>
            ))}
            {contentCatalog.map((item) => (
              <div key={item.code} className="contentThumb" draggable
                onDragStart={(e) => props.handleContentDragStart(e, item.url, item.code)}
                onClick={() => props.applyContentToCard(item.url, item.code)} title={item.code}>
                <img src={item.url} alt={item.code} draggable={false} loading="lazy" decoding="async"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              </div>
            ))}
          </div>
        )}
        {props.contentPanel === "media" && (
          <>
            {mediaTiles.map((item) => (
              <div key={item.id} className="mobMediaTile">
                <div className="mobMediaPreview">
                  <img src="/stickers/xyzlabs.png" alt="XYZ Labs" draggable={false} />
                </div>
                <input className="mobMediaInput" value={props.mediaUrls[item.id] ?? ""}
                  onChange={(e) => props.setMediaUrls((prev) => ({ ...prev, [item.id]: e.target.value.trim() }))}
                  placeholder={item.placeholder} />
                <button className="mobApplyBtn" disabled={!props.mediaUrls[item.id]}
                  onClick={() => props.applyMediaToCard(props.mediaUrls[item.id], item.type)}>
                  {item.buttonLabel}
                </button>
              </div>
            ))}
          </>
        )}
        {props.contentPanel === "skins" && (
          <div className="skinTray">
            {skinCatalog.map((skin) => (
              <div key={skin.id} className="skinThumb" draggable
                onDragStart={(e) => props.handleSkinDragStart(e, skin.id)}
                onClick={() => props.applySkinToCard(skin.id)} title={skin.name}>
                <img src={skin.thumbnail} alt={skin.name} draggable={false}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                <span className="skinThumbLabel">{skin.name}</span>
              </div>
            ))}
          </div>
        )}
        {props.contentPanel === "exclusive" && (
          <div className="mobExclusiveTray">
            {props.exclusiveTiles.length === 0 && (
              <p className="mobExclusiveEmpty">Tap + to add an exclusive card</p>
            )}
            {props.exclusiveTiles.map((tile, idx) => (
              <div key={idx} className={`mobExclusiveCard ${tile.locked ? "isLocked" : ""}`}>
                {tile.url ? (
                  <img src={tile.url} alt={`Exclusive ${idx + 1}`} className="mobExclusiveThumb"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="mobExclusiveThumbEmpty">No image</div>
                )}
                <input
                  className="mobMediaInput"
                  value={tile.url}
                  placeholder="Image URL"
                  onChange={(e) => props.setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, url: e.target.value } : t))}
                />
                <input
                  className="mobMediaInput"
                  value={tile.price}
                  placeholder="Price (e.g. $9.99)"
                  onChange={(e) => props.setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, price: e.target.value } : t))}
                />
                <div className="mobExclusiveActions">
                  <button
                    className={`mobExclusiveLockBtn ${tile.locked ? "isLocked" : ""}`}
                    onClick={() => props.setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, locked: !t.locked } : t))}
                  >
                    {tile.locked ? "Locked" : "Unlocked"}
                  </button>
                  <button
                    className="mobExclusiveDeleteBtn"
                    onClick={() => props.setExclusiveTiles((prev) => prev.filter((_, i) => i !== idx))}
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
