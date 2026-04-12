import { useState } from "react";
import { wallpaperCatalog } from "../../../core/wallpaperCatalog";
import { thumbnailUrl } from "../../../core/assetResolver";
import { pageDataToCardState } from "../../../domain/editor/selectors";
import { makeEmptyPage } from "../../../domain/project/defaults";
import type { CardInteractionState, ProjectData, PageKey } from "../../../domain/project/types";
import { LEFT_AD_IMAGE } from "../../../domain/editor/constants";
import type { AuthUser } from "../../../services/auth/types";

export function WallpaperRail(props: {
  leftRailTab: "wallpaper" | "pages";
  setLeftRailTab: (tab: "wallpaper" | "pages") => void;
  leftMode: "create" | "gateway";
  setLeftMode: (mode: "create" | "gateway") => void;
  tooltipOpen: string | null;
  setTooltipOpen: (value: string | null) => void;
  tooltipHelp: Record<string, string[]>;
  wallpaper: string;
  isPageLocked: boolean;
  setWallpaper: (url: string) => void;
  setWallpaperPreview: (url: string | null) => void;
  pages: Array<{ key: PageKey; label: string }>;
  page: PageKey;
  cardState: CardInteractionState;
  project: ProjectData;
  switchPage: (page: PageKey) => void;
  togglePageLock: (page: PageKey) => void;
  allPagesLocked: boolean;
  lockAllPages: () => void;
  unlockAllPages: () => void;
  resetWorkspace: () => void;
  isSaved: boolean;
  onSave: () => void;
  /** Auth wiring — owned by App.tsx so the modal renders at the overlay layer. */
  currentUser: AuthUser | null;
  onOpenJoin: () => void;
  onOpenLogin: () => void;
  onOpenForgot: () => void;
  onLoginSubmit: (input: { username: string; password: string }) => Promise<void>;
}) {
  const tabs: Array<"wallpaper" | "pages"> = ["wallpaper", "pages"];
  const [railLoginUsername, setRailLoginUsername] = useState("");
  const [railLoginPassword, setRailLoginPassword] = useState("");
  const [railLoginBusy, setRailLoginBusy] = useState(false);
  const [railLoginError, setRailLoginError] = useState<string | null>(null);

  async function handleRailLogin() {
    if (!railLoginUsername || !railLoginPassword) { props.onOpenLogin(); return; }
    setRailLoginBusy(true);
    setRailLoginError(null);
    try {
      await props.onLoginSubmit({ username: railLoginUsername.trim(), password: railLoginPassword });
      setRailLoginPassword("");
    } catch (e) {
      setRailLoginError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setRailLoginBusy(false);
    }
  }

  return (
    <aside className="leftRail">
      <div className="railHeader">
        <button
          className="railHeaderBtn"
          onClick={() => {
            const next = tabs[(tabs.indexOf(props.leftRailTab) + 1) % tabs.length];
            props.setLeftRailTab(next);
            props.setLeftMode(next === "wallpaper" ? "create" : "gateway");
          }}
        >
          {props.leftRailTab === "wallpaper" ? "WALLPAPER" : "BIZ PAGES"}
        </button>
        {props.tooltipOpen === "all" && (
          <div className="tooltipCard">
            {(props.tooltipHelp[props.leftRailTab] ?? []).map((line, i) => <div key={i} className="tooltipLine">{line}</div>)}
          </div>
        )}
      </div>

      {props.leftMode === "create" && (
        <div className="railScrollRegion">
          <section className="wallpaperTray" aria-label="Wallpaper picker">
            {wallpaperCatalog.map((item) => (
              <button
                key={item.code}
                className={`wallpaperThumb ${props.wallpaper === item.url ? "isActive" : ""}`}
                onClick={() => { if (props.isPageLocked) return; props.setWallpaper(item.url); props.setWallpaperPreview(null); }}
                title={item.code}
              >
                <img src={thumbnailUrl(item.url)} alt={item.code} draggable={false} loading="lazy" decoding="async" onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }} />
              </button>
            ))}
          </section>
        </div>
      )}

      {props.leftMode === "gateway" && (
        <>
          <div className="leftRailTabList">
            {props.pages.map((item) => {
              const isCurrentPage = props.page === item.key;
              const pd = isCurrentPage ? props.cardState : pageDataToCardState(props.project.pages[item.key] ?? makeEmptyPage());
              const isLocked = pd.lockPage;
              return (
                <div key={item.key} className="leftRailPageRow">
                  <button className={`leftRailTabBtn leftRailTabBtnFlex ${isCurrentPage ? "isActive" : ""} ${isLocked ? "isPageLocked" : ""}`} onClick={() => props.switchPage(item.key)}>{item.label}</button>
                  <button className={`cardLockBtn ${isLocked ? "isLocked" : "isUnlocked"}`} onClick={(e) => { e.stopPropagation(); props.togglePageLock(item.key); }} title={isLocked ? "Unlock page" : "Lock page"}>
                    {isLocked ? <svg viewBox="0 0 14 14" width="13" height="13" fill="none"><rect x="2" y="6" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg> : <svg viewBox="0 0 14 14" width="13" height="13" fill="none"><rect x="2" y="6" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M4.5 6V4a2.5 2.5 0 0 1 5 0" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                  </button>
                </div>
              );
            })}

            {/* Row: Lock | Save */}
            <div className="leftRailActionRow">
              <button className={`leftRailTabBtn leftRailTabBtnHalf ${props.allPagesLocked ? "isPageLocked" : ""}`} onClick={props.allPagesLocked ? props.unlockAllPages : props.lockAllPages}>{props.allPagesLocked ? "Unlock" : "Lock"}</button>
              <button className={`leftRailTabBtn leftRailTabBtnHalf ${props.isSaved ? "isSavedState" : ""}`} onClick={props.onSave}>Save</button>
            </div>

            {/* Row: Join / Sign out | Reset */}
            <div className="leftRailActionRow">
              {props.currentUser ? (
                <button className="leftRailTabBtn leftRailTabBtnHalf" onClick={props.onOpenLogin} title={`Signed in as ${props.currentUser.username}`}>Account</button>
              ) : (
                <button className="leftRailTabBtn leftRailTabBtnHalf" onClick={props.onOpenJoin}>Join</button>
              )}
              <button className="leftRailTabBtn leftRailTabBtnHalf" onClick={props.resetWorkspace}>Reset</button>
            </div>

            {/* Always-open login inputs (quick sign-in from the rail) */}
            <div className="loginPanel">
              <input
                className="loginPillInput"
                type="text"
                placeholder={props.currentUser ? props.currentUser.username : "username"}
                value={props.currentUser ? props.currentUser.username : railLoginUsername}
                onChange={(e) => setRailLoginUsername(e.target.value)}
                disabled={!!props.currentUser || railLoginBusy}
              />
              <input
                className="loginPillInput"
                type="password"
                placeholder="********************"
                value={railLoginPassword}
                onChange={(e) => setRailLoginPassword(e.target.value)}
                disabled={!!props.currentUser || railLoginBusy}
                onKeyDown={(e) => { if (e.key === "Enter") handleRailLogin(); }}
              />
            </div>
            {railLoginError && <div className="railLoginError">{railLoginError}</div>}

            {/* Row: Login | ? (below inputs) */}
            <div className="leftRailActionRow">
              <button
                className="leftRailTabBtn leftRailTabBtnHalf"
                onClick={props.currentUser ? props.onOpenLogin : handleRailLogin}
                disabled={railLoginBusy}
              >
                {props.currentUser ? "Profile" : (railLoginBusy ? "…" : "Login")}
              </button>
              <button className="leftRailTabBtn leftRailTabBtnHalf leftRailBigHelp" onClick={(e) => { e.stopPropagation(); props.setTooltipOpen(props.tooltipOpen === "all" ? null : "all"); }} title="Help">?</button>
            </div>
          </div>

          {/* Forgot Password launcher — opens the overlay AuthModal (no longer trapped inside this tile) */}
          <div className="forgotPwWrap">
            {props.tooltipOpen === "all" && (
              <div className="forgotPwCard">
                <div className="forgotPwTitle">Forgot Password</div>
                <button className="forgotPwSubmit" onClick={props.onOpenForgot}>Recover account</button>
              </div>
            )}
          </div>

          <div className="gatewayInfoCard gatewayInfoCardBottom">
            <img src={LEFT_AD_IMAGE} alt="XYZ Labs" className="gatewayInfoImage" draggable={false} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          </div>
        </>
      )}

    </aside>
  );
}
