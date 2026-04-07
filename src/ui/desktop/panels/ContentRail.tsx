import type { ChangeEvent, Dispatch, DragEvent, RefObject, SetStateAction } from "react";
import { contentCatalog } from "../../../core/contentCatalog";
import { skinCatalog } from "../../../core/skinCatalog";
import { thumbnailUrl } from "../../../core/assetResolver";
import { LEFT_AD_IMAGE } from "../../../domain/editor/constants";
import type { ExclusiveTile } from "../../../domain/project/types";

export function ContentRail(props: {
  activeTab: "cards" | "content" | "wallpaper" | "media" | "skins" | "exclusive";
  setActiveTab: (tab: "cards" | "content" | "wallpaper" | "media" | "skins" | "exclusive") => void;
  tooltipOpen: string | null;
  setTooltipOpen: (value: string | null) => void;
  tooltipHelp: Record<string, string[]>;
  railScrollRef: RefObject<HTMLDivElement>;
  handleRailScroll: () => void;
  contentFileInputRef: RefObject<HTMLInputElement>;
  handleContentFileUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  uploadedContents: Array<{ name: string; url: string; code: string }>;
  handleContentDragStart: (e: DragEvent, contentUrl: string, contentCode?: string) => void;
  exclusiveTiles: ExclusiveTile[];
  setExclusiveTiles: Dispatch<SetStateAction<ExclusiveTile[]>>;
  mediaTiles: Array<{ id: string; label: string; type: "video" | "image"; placeholder: string; buttonLabel: string }>;
  visibleMediaCount: number;
  cardStateLocked: boolean;
  mediaUrls: Record<string, string>;
  setMediaUrls: Dispatch<SetStateAction<Record<string, string>>>;
  handleMediaDragStart: (e: DragEvent, mediaUrl: string, mediaType: "image" | "video") => void;
  setWorkspaceUrlPreview: (url: string | null) => void;
  handleSkinDragStart: (e: DragEvent, skinId: string) => void;
}) {
  return (
    <aside className="rightRail">
      <div className="railHeader">
        <button
          className="railHeaderBtn"
          onClick={() => {
            const order: Array<"content" | "exclusive" | "media" | "skins"> = ["content", "exclusive", "media", "skins"];
            const idx = order.indexOf(props.activeTab as "content" | "exclusive" | "media" | "skins");
            props.setActiveTab(order[(idx + 1) % order.length]);
          }}
        >
          {props.activeTab === "content" ? "CONTENT" : props.activeTab === "exclusive" ? "EXCLUSIVE" : props.activeTab === "media" ? "MEDIA" : "SKINS"}
        </button>
        {props.tooltipOpen === "all" && (
          <div className="tooltipCard">
            {(props.tooltipHelp[props.activeTab] ?? []).map((line, i) => <div key={i} className="tooltipLine">{line}</div>)}
          </div>
        )}
      </div>

      <div className="railScrollRegion" ref={props.railScrollRef} onScroll={props.handleRailScroll}>
        <input ref={props.contentFileInputRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={props.handleContentFileUpload} />

        {props.activeTab === "content" && (
          <section className="contentTray" aria-label="Content picker">
            <button className="contentThumb contentThumbUpload" title="Add Image" onClick={() => props.contentFileInputRef.current?.click()}>
              <span style={{ fontSize: 24, lineHeight: 1 }}>+</span>
              <span>Add Image</span>
            </button>
            {props.uploadedContents.map((item) => (
              <div key={item.url} className="contentThumb contentThumbUploaded" draggable onDragStart={(e) => props.handleContentDragStart(e, item.url, item.code)} title={item.name}>
                <img src={item.url} alt={item.name} draggable={false} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              </div>
            ))}
            {contentCatalog.map((item) => (
              <div key={item.code} className="contentThumb" draggable onDragStart={(e) => props.handleContentDragStart(e, item.url, item.code)} title={item.code}>
                <img src={thumbnailUrl(item.url)} alt={item.code} draggable={false} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              </div>
            ))}
          </section>
        )}

        {props.activeTab === "exclusive" && (
          <section className="mediaTray exclusiveRailTray" aria-label="Exclusive content">
            {props.exclusiveTiles.map((tile, idx) => (
              <div key={idx} className="mediaTile exclusiveRailTile">
                <div className="exclusiveRailTileHeader">
                  <span className="exclusiveRailTileNum">Exclusive Content-{idx + 1}</span>
                  <button className={`cardLockBtn ${tile.locked ? "isLocked" : "isUnlocked"}`} onClick={() => props.setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, locked: !t.locked } : t))} title={tile.locked ? "Unlock tile" : "Lock tile"}>
                    {tile.locked ? <svg viewBox="0 0 14 14" width="13" height="13" fill="none"><rect x="2" y="6" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg> : <svg viewBox="0 0 14 14" width="13" height="13" fill="none"><rect x="2" y="6" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M4.5 6V4a2.5 2.5 0 0 1 5 0" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                  </button>
                </div>
                <label className="mediaUrlField"><input value={tile.url} onChange={(e) => props.setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, url: e.target.value.trim(), contentCode: undefined } : t))} placeholder="https://..." /></label>
                <input className="exclusivePriceInput" value={tile.price} onChange={(e) => props.setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, price: e.target.value.trim() } : t))} placeholder="Purchase Price" />
              </div>
            ))}
          </section>
        )}

        {props.activeTab === "media" && (
          <section className="mediaTray" aria-label="Media picker">
            {props.mediaTiles.slice(0, props.visibleMediaCount).map((item) => (
              <div key={item.id} className="mediaTile">
                <div className="mediaPreview" draggable={!props.cardStateLocked && !!props.mediaUrls[item.id]} onDragStart={(e) => { if (!props.mediaUrls[item.id]) return; props.handleMediaDragStart(e, props.mediaUrls[item.id], item.type); }} onDragEnd={() => props.setWorkspaceUrlPreview(null)}>
                  <img className="mediaPreviewLogo" src="/stickers/xyzlabs.png" alt="XYZ Labs" draggable={false} />
                </div>
                <label className="mediaUrlField"><input value={props.mediaUrls[item.id]} onChange={(e) => props.setMediaUrls((prev) => ({ ...prev, [item.id]: e.target.value.trim() }))} placeholder={item.placeholder} disabled={props.cardStateLocked} /></label>
                <button className="pillButton" disabled>{item.buttonLabel}</button>
              </div>
            ))}
          </section>
        )}

        {props.activeTab === "skins" && (
          <section className="skinTray" aria-label="Skin picker">
            {skinCatalog.map((skin) => (
              <div key={skin.id} className="skinThumb" draggable={!props.cardStateLocked} onDragStart={(e) => props.handleSkinDragStart(e as unknown as DragEvent, skin.id)} title={skin.name}>
                <img src={thumbnailUrl(skin.thumbnail)} alt={skin.name} draggable={false} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                <span className="skinThumbLabel">{skin.name}</span>
              </div>
            ))}
          </section>
        )}
      </div>

      <div className="rightRailLogoSection">
        <img src={LEFT_AD_IMAGE} alt="XYZ Labs" className="rightRailLogoImage" draggable={false} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
      </div>
    </aside>
  );
}
