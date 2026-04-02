import type { Dispatch, SetStateAction } from "react";
import type { CardInteractionState, PageKey, ProjectData } from "../../../domain/project/types";
import { PAGE_KEYS } from "../../../domain/project/defaults";
import { mobileWallpaperCatalog } from "../../../core/mobileWallpaperCatalog";
import { thumbnailUrl } from "../../../core/assetResolver";
import { isPageLocked } from "../lib/derivedState";

export type CreatePanelType = "wallpaper" | "portals" | null;

export function MobileCreatePanel(props: {
  createPanel: CreatePanelType;
  page: PageKey;
  project: ProjectData;
  cardState: CardInteractionState;
  wallpaper: string;
  allPagesLocked: boolean;
  setCreatePanel: (next: CreatePanelType) => void;
  setWallpaper: (url: string) => void;
  switchPage: (key: PageKey) => void;
  applyCubeLayout: (count: 1 | 2 | 3 | 4) => void;
  lockAllPages: () => void;
  unlockAllPages: () => void;
  resetAllPages: () => void;
  setCardState: Dispatch<SetStateAction<CardInteractionState>>;
}) {
  if (!props.createPanel) return null;

  return (
    <div className="mobileToolOverlay isLeft">
      <div className="mobToolHeader">
        <span className="mobToolTitle">{props.createPanel === "portals" ? "PAGES" : "WALLPAPER"}</span>
        <button className="mobToolClose" onClick={() => props.setCreatePanel(null)}>✕</button>
      </div>
      <div className="mobToolBody">
        {props.createPanel === "wallpaper" && (
          <div className="wallpaperTray">
            {mobileWallpaperCatalog.map((item) => (
              <button
                key={item.code}
                className={`wallpaperThumb ${props.wallpaper === item.url ? "isActive" : ""}`}
                onClick={() => { if (!props.cardState.lockPage) { props.setWallpaper(item.url); props.setCreatePanel(null); } }}
                title={item.code}
              >
                <img src={thumbnailUrl(item.url)} alt={item.code} draggable={false}
                  onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }} />
              </button>
            ))}
          </div>
        )}

        {props.createPanel === "portals" && (
          <>
            <div className="mobPageCubes">
              {PAGE_KEYS.map((k, idx) => (
                <button
                  key={k}
                  className={`mobPageCube ${props.page === k ? "isActivePage" : ""} ${isPageLocked(props.project, props.page, props.cardState, k) ? "isLockedPage" : ""}`}
                  onClick={() => props.switchPage(k)}
                >
                  P{idx + 1}
                </button>
              ))}
            </div>

            <div className="mobCubeButtons">
              {([1, 2, 3, 4] as const).map((n) => (
                <button key={n} className="mobCubeBtn" onClick={() => props.applyCubeLayout(n)} aria-label={`${n} tile layout`}>
                  {Array.from({ length: n }).map((_, i) => <span key={i} className="mobCubeDot" />)}
                </button>
              ))}
            </div>

            <button
              className={`mobLockPortalsBtn ${props.allPagesLocked ? "isLocked" : ""}`}
              onClick={props.allPagesLocked ? props.unlockAllPages : props.lockAllPages}
            >
              {props.allPagesLocked ? "Unlock Pages" : "Lock Pages"}
            </button>

            <button className="mobResetBtn" onClick={props.resetAllPages}>Reset</button>

            <div className="mobCardTabList">
              {props.cardState.cards.map((card, idx) => (
                <button
                  key={card.id}
                  className={`mobCardTab ${card.id === props.cardState.selectedCardId ? "isActive" : ""}`}
                  onClick={() => props.setCardState((cur) => ({ ...cur, selectedCardId: card.id, lockSize: card.lockSize ?? false, lockPosition: card.lockPosition ?? false }))}
                >
                  Tile {idx + 1} • {Math.round(card.w)} × {Math.round(card.h)}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
