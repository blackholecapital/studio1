import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { wallpaperCatalog } from "../../../core/wallpaperCatalog";
import { thumbnailUrl } from "../../../core/assetResolver";
import { pageDataToCardState } from "../../../domain/editor/selectors";
import { makeEmptyPage } from "../../../domain/project/defaults";
import type { CardInteractionState, ProjectData, PageKey } from "../../../domain/project/types";
import { LEFT_AD_IMAGE } from "../../../domain/editor/constants";
import type { AuthUser } from "../../../services/auth/types";
import { uploadFile } from "../../../services/upload/api";
import { convertToPng } from "../../../shared/lib/normalize";

type UploadedWallpaper = { code: string; url: string; name: string };

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
  onOpenPackageInfo: (key: "biz" | "ad" | "web3") => void;
}) {
  const tabs: Array<"wallpaper" | "pages"> = ["wallpaper", "pages"];

  // Uploaded wallpapers are logged-in-only. Local state keeps them for the
  // session; on reload the user re-uploads (v1 simplicity).
  const [uploadedWallpapers, setUploadedWallpapers] = useState<UploadedWallpaper[]>([]);
  const wallpaperFileInputRef = useRef<HTMLInputElement | null>(null);
  const wallpaperUploadCounterRef = useRef(0);

  const isLoggedIn = !!props.currentUser;

  async function handleWallpaperFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      window.alert("Wallpaper must be 5MB or less.");
      e.target.value = "";
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    wallpaperUploadCounterRef.current += 1;
    const code = `w-usr-${String(wallpaperUploadCounterRef.current).padStart(3, "0")}`;
    const filename = `${code}.png`;

    // Optimistic: show the local preview immediately AND apply it as the
    // current wallpaper so the user sees the result before the upload
    // round-trip completes.
    setUploadedWallpapers((prev) => [{ code, url: objectUrl, name: file.name }, ...prev]);
    if (!props.isPageLocked) {
      props.setWallpaper(objectUrl);
      props.setWallpaperPreview(null);
    }
    e.target.value = "";

    try {
      const pngBlob = await convertToPng(file);
      const uploadSlug = props.currentUser?.username || props.project.slug;
      const result = await uploadFile(pngBlob, filename, uploadSlug);
      if (result.ok && result.remoteUrl) {
        const remote = result.remoteUrl;
        setUploadedWallpapers((prev) => prev.map((u) => (u.code === code ? { ...u, url: remote } : u)));
        // Only swap the active wallpaper across to the remote URL if the
        // user hasn't already picked a different one in the meantime.
        if (!props.isPageLocked) props.setWallpaper(remote);
      }
    } catch {
      /* Upload failed — the local object URL still works for this session. */
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
            {/* Logged-in users get an "Add Image" button as the first tile
                so they can upload their own wallpaper. */}
            {isLoggedIn && (
              <>
                <input
                  ref={wallpaperFileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleWallpaperFileUpload}
                />
                <button
                  type="button"
                  className="wallpaperThumb wallpaperThumbUpload"
                  title="Upload wallpaper"
                  onClick={() => wallpaperFileInputRef.current?.click()}
                  disabled={props.isPageLocked}
                >
                  <span className="wallpaperThumbUploadPlus">+</span>
                  <span className="wallpaperThumbUploadLabel">Add Image</span>
                </button>
              </>
            )}
            {uploadedWallpapers.map((item) => (
              <button
                key={item.code}
                className={`wallpaperThumb wallpaperThumbUploaded ${props.wallpaper === item.url ? "isActive" : ""}`}
                onClick={() => { if (props.isPageLocked) return; props.setWallpaper(item.url); props.setWallpaperPreview(null); }}
                title={item.name}
              >
                <img src={item.url} alt={item.name} draggable={false} loading="lazy" decoding="async" onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }} />
              </button>
            ))}
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

            {/* Row: Join / Account | Reset */}
            <div className="leftRailActionRow">
              {props.currentUser ? (
                <button className="leftRailTabBtn leftRailTabBtnHalf" onClick={props.onOpenLogin} title={`Signed in as ${props.currentUser.username}`}>Account</button>
              ) : (
                <button className="leftRailTabBtn leftRailTabBtnHalf" onClick={props.onOpenJoin}>Join</button>
              )}
              <button className="leftRailTabBtn leftRailTabBtnHalf" onClick={props.resetWorkspace}>Reset</button>
            </div>

            {/* Row: Profile | ? */}
            <div className="leftRailActionRow">
              <button
                className="leftRailTabBtn leftRailTabBtnHalf"
                onClick={props.currentUser ? props.onOpenLogin : props.onOpenJoin}
              >
                {props.currentUser ? "Profile" : "Login"}
              </button>
              <button className="leftRailTabBtn leftRailTabBtnHalf leftRailBigHelp" onClick={(e) => { e.stopPropagation(); props.setTooltipOpen(props.tooltipOpen === "all" ? null : "all"); }} title="Help">?</button>
            </div>

            {/* Three page-category rows under the Profile row.
                Each opens a package-info popup mounted at the app overlay. */}
            <div className="leftRailPageCategoryList">
              <button type="button" className="leftRailPageCategoryRow" onClick={() => props.onOpenPackageInfo("biz")}>Biz Pages</button>
              <button type="button" className="leftRailPageCategoryRow" onClick={() => props.onOpenPackageInfo("ad")}>AD Pages</button>
              <button type="button" className="leftRailPageCategoryRow" onClick={() => props.onOpenPackageInfo("web3")}>Web-3 Pages</button>
            </div>
          </div>

          <div className="gatewayInfoCard gatewayInfoCardBottom">
            <img src={LEFT_AD_IMAGE} alt="XYZ Labs" className="gatewayInfoImage" draggable={false} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          </div>
        </>
      )}

    </aside>
  );
}
