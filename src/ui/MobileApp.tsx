import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import "./mobile.css";
import { mobileWallpaperCatalog } from "../core/mobileWallpaperCatalog";
import { thumbnailUrl } from "../core/assetResolver";
import { contentCatalog } from "../core/contentCatalog";
import { skinCatalog } from "../core/skinCatalog";
import { loadProject } from "./state/editorExport";
import { useCardInteractions } from "./hooks/useCardInteractions";

// Domain imports
import type { CardInteractionState, ProjectData } from "../domain/project/types";
import type { PageKey } from "../domain/project/types";
import { PAGE_KEYS, makeEmptyPage, makeEmptyProject } from "../domain/project/defaults";
import { pageDataToCardState, cardStateToPageData, maxCardCounter } from "../domain/editor/selectors";
import { getOrCreateMobileSlug } from "../services/runtime/urlState";

// Mobile-extracted modules
import { INSTRUCTIONS_IMAGE, DEFAULT_WALLPAPER, PAGE_TITLES, mediaTiles } from "./mobile/lib/mobileConstants";
import { getMobDims, makeMobDefaultCard, getMobCardCounter, setMobCardCounter } from "./mobile/lib/mobileHelpers";
import { getSelectedCard, getPageNavigation, isPageLocked, getAllPagesLocked } from "./mobile/lib/derivedState";
import {
  setSelectedCardLockSize, setSelectedCardLockPosition, togglePageLockState,
  deleteSelectedCard as deleteSelectedCardReducer, addMobileCard as addMobileCardReducer,
  applyCubeLayout as applyCubeLayoutReducer,
  lockAllPagesProject, unlockAllPagesProject, resetAllPagesProject,
  applyContentToSelectedCard, applySkinToSelectedCard, applyMediaToSelectedCard,
  applyDropToCard, applySkinDropToCard,
} from "./mobile/state/mobileReducers";
import { useMobileDeployFlow } from "./mobile/hooks/useMobileDeployFlow";
import { useMobileUploadFlow } from "./mobile/hooks/useMobileUploadFlow";

// ─── Component ───────────────────────────────────────────────────────────────
export function MobileApp() {
  // ── Workspace dimensions (reactive to orientation changes) ──
  const [wsDims, setWsDims] = useState(getMobDims);

  useEffect(() => {
    const update = () => setWsDims(getMobDims());
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ── Studio state ──
  const initialSlug = useMemo(() => getOrCreateMobileSlug(), []);
  const [slug, setSlug] = useState(initialSlug);
  const [page, setPageRaw] = useState<PageKey>("p1");
  const [wallpaper, setWallpaper] = useState(DEFAULT_WALLPAPER);
  const [deploying, setDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [deployModal, setDeployModal] = useState<{ primaryUrl: string; holidayUrl: string; ok: boolean; error?: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({
    "media-video-1": "",
    "media-image-1": "",
  });
  const [exclusiveTiles, setExclusiveTiles] = useState<{ url: string; price: string; locked: boolean }[]>([]);
  const contentFileInputRef = useRef<HTMLInputElement>(null);
  const mediaAddInputRef = useRef<HTMLInputElement>(null);

  // ── Panel state ──
  // createPanel: null=closed, "wallpaper"=left panel, "portals"=left panel
  // contentPanel: null=closed, "content"|"media"|"skins"=right panel
  type CreatePanelType = "wallpaper" | "portals" | null;
  type ContentPanelType = "content" | "media" | "skins" | "exclusive" | null;
  const [createPanel, setCreatePanel] = useState<CreatePanelType>(null);
  const [contentPanel, setContentPanel] = useState<ContentPanelType>(null);
  const [contentPanelSide, setContentPanelSide] = useState<"left" | "right">("right");

  // ── Project ──
  // Normalize all page wallpapers to the mobile default when loading:
  // pages saved from the desktop editor (or brand-new empty pages) carry the
  // desktop wallpaper URL — replace those with the mobile default so every
  // page starts with the correct mobile background.
  const [project, setProject] = useState<ProjectData>(() => {
    const loaded = loadProject(initialSlug) ?? makeEmptyProject(initialSlug);
    const mobileWallpaperUrls = new Set(mobileWallpaperCatalog.map((w) => w.url));
    const normalizedPages = Object.fromEntries(
      Object.entries(loaded.pages).map(([key, page]) => [
        key,
        {
          ...page,
          wallpaper: mobileWallpaperUrls.has(page.wallpaper) ? page.wallpaper : DEFAULT_WALLPAPER,
        },
      ])
    );
    return { ...loaded, pages: normalizedPages };
  });

  // ── Card state — initialised with a mobile-sized default card ──
  const [cardState, setCardState] = useState<CardInteractionState>(() => {
    const dims = getMobDims();
    const card = makeMobDefaultCard(dims);
    return {
      cards: [card],
      selectedCardId: card.id,
      lockSize: false,
      lockPosition: false,
      lockPage: false,
    };
  });

  // ── Card interactions (uses mobile workspace dims for bounds) ──
  const mobileLc = useMemo(
    () => ({ workspace: { width: wsDims.width, height: wsDims.height } }),
    [wsDims.width, wsDims.height]
  );

  const {
    workspaceRef,
    activeResizeCardIdRef,
    activeDragCardIdRef,
    overlappingCardIds,
    handleCardPointerDown,
    handleResizePointerDown,
  } = useCardInteractions({ cardState, setCardState, layoutConfig: mobileLc });

  const selectedCard = useMemo(
    () => getSelectedCard(cardState),
    [cardState.cards, cardState.selectedCardId]
  );
  const selectedCardLockSize = selectedCard?.lockSize ?? false;
  const selectedCardLockPosition = selectedCard?.lockPosition ?? false;

  const { pageIndex, canGoPrevPage, canGoNextPage } = getPageNavigation(page);

  // ── Auto-save page state on changes ──
  useEffect(() => {
    setProject((prev) => ({
      ...prev,
      slug,
      pages: {
        ...prev.pages,
        [page]: cardStateToPageData(cardState, wallpaper),
      },
    }));
  }, [cardState, wallpaper, page, slug]);

  // ── Page switching ──
  function switchPage(nextPage: PageKey) {
    if (nextPage === page) return;

    setProject((prev) => {
      const updated: ProjectData = {
        ...prev,
        slug,
        pages: {
          ...prev.pages,
          [page]: cardStateToPageData(cardState, wallpaper),
        },
      };

      const target = updated.pages[nextPage] ?? makeEmptyPage();
      const nextHasCards = (target.cards?.length ?? 0) > 0;

      if (!nextHasCards) {
        const dims = getMobDims();
        const card = makeMobDefaultCard(dims);
        setWallpaper(target.wallpaper || DEFAULT_WALLPAPER);
        setCardState({ cards: [card], selectedCardId: card.id, lockSize: false, lockPosition: false, lockPage: false });
      } else {
        setWallpaper(target.wallpaper || DEFAULT_WALLPAPER);
        setCardState(pageDataToCardState(target));
        const maxId = maxCardCounter(target.cards);
        if (maxId >= getMobCardCounter()) setMobCardCounter(maxId);
      }

      return updated;
    });

    setPageRaw(nextPage);
  }

  // ── Deploy/save flow (extracted hook) ──
  const { handleSave, handleDeploy } = useMobileDeployFlow({
    slug, page, project, cardState, wallpaper, exclusiveTiles,
    workspaceRef, wsDims,
    setProject, setDeploying, setDeployStatus, setJustSaved, setDeployModal,
  });

  // ── Upload flow (extracted hook) ──
  const { userUploads, uploading, handleMobilePhotoUpload } = useMobileUploadFlow({
    slug, selectedCard, lockPage: cardState.lockPage,
    setCardState, setDeployStatus,
  });

  // ── Card operations (via extracted reducers) ──
  function addMobileCard() {
    setCardState((cur) => addMobileCardReducer(cur));
  }

  function deleteSelectedCard() {
    if (!selectedCard || cardState.lockPage) return;
    setCardState((cur) => deleteSelectedCardReducer(cur));
  }

  function applyCubeLayout(count: 1 | 2 | 3 | 4) {
    setCardState((cur) => applyCubeLayoutReducer(cur, count));
  }

  // ── Lock operations (via extracted reducers) ──
  function setLockSize(next: boolean) {
    activeResizeCardIdRef.current = null;
    setCardState((cur) => setSelectedCardLockSize(cur, next));
  }

  function setLockPosition(next: boolean) {
    activeDragCardIdRef.current = null;
    setCardState((cur) => setSelectedCardLockPosition(cur, next));
  }

  function toggleLockPage() {
    setCardState((cur) => togglePageLockState(cur));
    if (!cardState.lockPage) {
      activeResizeCardIdRef.current = null;
      activeDragCardIdRef.current = null;
    }
  }

  function resetAllPages() {
    activeResizeCardIdRef.current = null;
    activeDragCardIdRef.current = null;
    const dims = getMobDims();
    const card = makeMobDefaultCard(dims);
    setProject((prev) => resetAllPagesProject(prev));
    setCardState({ cards: [card], selectedCardId: card.id, lockSize: false, lockPosition: false, lockPage: false });
  }

  const allPagesLocked = getAllPagesLocked(project, page, cardState);

  function lockAllPages() {
    setCardState((cur) => ({ ...cur, lockPage: true }));
    setProject((prev) => lockAllPagesProject(prev));
  }

  function unlockAllPages() {
    setCardState((cur) => ({ ...cur, lockPage: false }));
    setProject((prev) => unlockAllPagesProject(prev));
  }

  // ── Apply content / skin / media to selected card (via extracted reducers) ──
  const applyContentToCard = useCallback(
    (contentUrl: string, contentCode?: string) => {
      if (!selectedCard || cardState.lockPage) return;
      setCardState((cur) => applyContentToSelectedCard(cur, selectedCard.id, contentUrl, contentCode));
    },
    [selectedCard, cardState.lockPage]
  );

  const applySkinToCard = useCallback(
    (skinId: string) => {
      if (!selectedCard) return;
      setCardState((cur) => applySkinToSelectedCard(cur, selectedCard.id, skinId));
    },
    [selectedCard]
  );

  const applyMediaToCard = useCallback(
    (mediaUrl: string, mediaType: "image" | "video") => {
      if (!selectedCard || !mediaUrl || cardState.lockPage) return;
      setCardState((cur) => applyMediaToSelectedCard(cur, selectedCard.id, mediaUrl, mediaType));
    },
    [selectedCard, cardState.lockPage]
  );

  // ── Drag-and-drop from tool overlay to cards ──
  const handleContentDragStart = useCallback((e: React.DragEvent, contentUrl: string, contentCode?: string) => {
    e.dataTransfer.setData("text/plain", contentUrl);
    e.dataTransfer.setData("application/x-drag-source", "content");
    if (contentCode) e.dataTransfer.setData("application/x-content-code", contentCode);
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  const handleSkinDragStart = useCallback((e: React.DragEvent, skinId: string) => {
    e.dataTransfer.setData("text/plain", skinId);
    e.dataTransfer.setData("application/x-skin-id", skinId);
    e.dataTransfer.setData("application/x-drag-source", "skin");
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  const handleCardDrop = useCallback((e: React.DragEvent, cardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (cardState.lockPage) return;
    const dragSource = e.dataTransfer.getData("application/x-drag-source");
    if (dragSource === "skin") {
      const skinId = e.dataTransfer.getData("application/x-skin-id");
      if (!skinId) return;
      setCardState((cur) => applySkinDropToCard(cur, cardId, skinId));
      return;
    }
    const contentUrl = e.dataTransfer.getData("text/plain");
    if (!contentUrl) return;
    const contentCode = e.dataTransfer.getData("application/x-content-code") || undefined;
    setCardState((cur) => applyDropToCard(cur, cardId, contentUrl, contentCode));
  }, [cardState.lockPage]);

  // ── Page nav ──
  function goPrevPage() { if (canGoPrevPage) switchPage(PAGE_KEYS[pageIndex - 1]); }
  function goNextPage() { if (canGoNextPage) switchPage(PAGE_KEYS[pageIndex + 1]); }

  // ── Create button: cycles wallpaper(left) → portals(left) → close ──
  function handleCreateClick() {
    setContentPanel(null);
    if (createPanel === null) setCreatePanel("wallpaper");
    else if (createPanel === "wallpaper") setCreatePanel("portals");
    else setCreatePanel(null);
  }

  // ── Content button: cycles content → media → skins → close (right panel) ──
  function handleContentClick() {
    setCreatePanel(null);
    if (contentPanel === null) setContentPanel("content");
    else if (contentPanel === "content") setContentPanel("media");
    else if (contentPanel === "media") setContentPanel("skins");
    else if (contentPanel === "skins") setContentPanel("exclusive");
    else setContentPanel(null);
  }

  function collapseAll() {
    setCreatePanel(null);
    setContentPanel(null);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="mobileStudio" style={{ backgroundImage: `url(${wallpaper})`, backgroundSize: "cover", backgroundPosition: "center" }}>

      {/* ── Top nav ── */}
      <nav className="mobileNav">
        <button
          className={`mobBtn mobNavCreate ${createPanel ? "isActive" : ""}`}
          onClick={handleCreateClick}
        >
          Create
        </button>

        <div className="mobCenterPill">
          <div className="mobCenterPillArrows">
            <button className="mobArrowBtn" onClick={goPrevPage} disabled={!canGoPrevPage} aria-label="Previous page">
              <svg viewBox="0 0 10 16" width="9" height="15" fill="none">
                <path d="M8 2L2 8l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="mobArrowBtn" onClick={goNextPage} disabled={!canGoNextPage} aria-label="Next page">
              <svg viewBox="0 0 10 16" width="9" height="15" fill="none">
                <path d="M2 2l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <span className="mobCenterPillPage">{PAGE_TITLES[page]}</span>
          <button
            className="mobPlusBtn"
            onClick={() => page === "p4" ? setExclusiveTiles((prev) => [...prev, { url: "", price: "", locked: false }]) : addMobileCard()}
            disabled={page !== "p4" && cardState.lockPage}
            aria-label="Add tile"
          >+</button>
          <button
            className="mobMinusBtn"
            onClick={() => page === "p4" ? setExclusiveTiles((prev) => prev.slice(0, -1)) : deleteSelectedCard()}
            disabled={page !== "p4" ? (!selectedCard || cardState.lockPage) : exclusiveTiles.length === 0}
            aria-label="Remove tile"
          >−</button>
        </div>

        <button className={`mobBtn mobContentBtn ${contentPanel ? "isActive" : ""}`} onClick={handleContentClick}>
          Content
        </button>
      </nav>

      {/* ── Deploy toast ── */}
      {deployStatus && <div className={`mobDeployStatus ${deployStatus.includes("⚠") ? "isWarning" : ""}`}>{deployStatus}</div>}



      {/* ── Workspace ── */}
      {page === "p4" ? (
        /* ── EXCLUSIVE WORKSPACE (p4) ── */
        <section
          className="mobileWorkspace mobExclusiveWorkspaceArea"
          style={{ backgroundImage: `url(${wallpaper})`, touchAction: "pan-y", overflowY: "auto" }}
          onClick={collapseAll}
        >
          <div className="mobExclusiveWsInner">
            <div className="mobExclusiveWsHeader">
              <div className="mobExclusiveWsTitle">Exclusive Content</div>
              <div className="mobExclusiveWsDesc">Add image URL, set price, and lock to make purchaseable. Tap <strong>+</strong> to add tiles.</div>
            </div>
            {exclusiveTiles.length === 0 ? (
              <div className="mobExclusiveWsEmpty">Tap + to add exclusive content tiles</div>
            ) : (
              <div className="mobExclusiveWsGrid">
                {exclusiveTiles.map((tile, idx) => (
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
                      onChange={(e) => { e.stopPropagation(); setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, url: e.target.value } : t)); }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="mobExclusiveWsTileControls">
                      <button
                        className={`exclusiveTileLockBtn ${tile.locked ? "isLocked" : "isUnlocked"}`}
                        onClick={(e) => { e.stopPropagation(); setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, locked: !t.locked } : t)); }}
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
                          onChange={(e) => { e.stopPropagation(); tile.locked && setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, price: e.target.value } : t)); }}
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
      ) : (
        /* ── REGULAR CARD CANVAS (p1–p3) ── */
        <section
          className="mobileWorkspace"
          ref={workspaceRef}
          style={{ backgroundImage: `url(${wallpaper})`, touchAction: "none" }}
          onClick={collapseAll}
        >
          {cardState.cards.map((card) => {
            const isSelected = card.id === cardState.selectedCardId;
            const isOverlapping = overlappingCardIds.has(card.id);

            return (
              <button
                key={card.id}
                className={[
                  "floatingCard",
                  isSelected ? "isSelected" : "",
                  card.lockPosition ? "isPositionLocked" : "",
                  isOverlapping ? "isOverlapping" : "",
                  cardState.lockPage ? "isPageLocked" : "",
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
                  if (cardState.lockPage) return;
                  const maxZ = cardState.cards.reduce((max, c) => Math.max(max, c.zIndex ?? 1), 1);
                  setCardState((cur) => ({
                    ...cur,
                    selectedCardId: card.id,
                    lockSize: card.lockSize ?? false,
                    lockPosition: card.lockPosition ?? false,
                    cards: cur.cards.map((c) => (c.id === card.id ? { ...c, zIndex: maxZ + 1 } : c)),
                  }));
                  handleCardPointerDown(e, card.id);
                  collapseAll();
                }}
                onDrop={(e) => handleCardDrop(e, card.id)}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
              >
                {/* Card content */}
                {card.contentDisplay === "video" && card.contentUrl ? (
                  <video
                    className="cardContentImage"
                    src={card.contentUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls={false}
                  />
                ) : card.contentImage || card.contentUrl ? (
                  <img
                    className={`cardContentImage${card.contentImage === INSTRUCTIONS_IMAGE ? " isInstructionsImage" : ""}`}
                    src={card.contentImage || card.contentUrl}
                    alt="content"
                    draggable={false}
                  />
                ) : null}

                {/* Skin overlay */}
                {card.skinId && <div className={`cardSkin skin-${card.skinId.toLowerCase()}`} />}

                {/* Top-left padlock: combined lock for size + position */}
                {!cardState.lockPage && (
                  <button
                    className={`cardLockBtn mobCardPadlock ${(card.lockSize && card.lockPosition) ? "isLocked" : "isUnlocked"}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      const newLocked = !(card.lockSize && card.lockPosition);
                      setCardState((cur) => ({
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

                {/* Size badge — always visible, to the left of the resize handle */}
                <span className="cardSizeBadge mobCardSizeBadge">
                  {Math.round(card.w)} × {Math.round(card.h)}
                </span>

                {/* Resize handle */}
                <span
                  className={`resizeHandle ${(card.lockSize && card.lockPosition) ? "isLocked" : ""}`}
                  onPointerDown={(e) => handleResizePointerDown(e, card.id)}
                />
              </button>
            );
          })}
        </section>
      )}

      {/* ── Create panel (always left): wallpaper or portals ── */}
      {createPanel && (
        <div className="mobileToolOverlay isLeft">
          <div className="mobToolHeader">
            <span className="mobToolTitle">{createPanel === "portals" ? "PAGES" : "WALLPAPER"}</span>
            <button className="mobToolClose" onClick={() => setCreatePanel(null)}>✕</button>
          </div>
          <div className="mobToolBody">
            {/* ─ Wallpaper ─ */}
            {createPanel === "wallpaper" && (
              <div className="wallpaperTray">
                {mobileWallpaperCatalog.map((item) => (
                  <button
                    key={item.code}
                    className={`wallpaperThumb ${wallpaper === item.url ? "isActive" : ""}`}
                    onClick={() => { if (!cardState.lockPage) { setWallpaper(item.url); setCreatePanel(null); } }}
                    title={item.code}
                  >
                    <img src={thumbnailUrl(item.url)} alt={item.code} draggable={false}
                      onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }} />
                  </button>
                ))}
              </div>
            )}

            {/* ─ Portals ─ */}
            {createPanel === "portals" && (
              <>
                {/* Row 1: P1-P4 page selector cubes */}
                <div className="mobPageCubes">
                  {PAGE_KEYS.map((k, idx) => (
                    <button
                      key={k}
                      className={`mobPageCube ${page === k ? "isActivePage" : ""} ${isPageLocked(project, page, cardState, k) ? "isLockedPage" : ""}`}
                      onClick={() => { switchPage(k); }}
                    >
                      P{idx + 1}
                    </button>
                  ))}
                </div>

                {/* Row 2: Layout cubes (1-4 tiles) */}
                <div className="mobCubeButtons">
                  {([1, 2, 3, 4] as const).map((n) => (
                    <button key={n} className="mobCubeBtn" onClick={() => applyCubeLayout(n)} aria-label={`${n} tile layout`}>
                      {Array.from({ length: n }).map((_, i) => <span key={i} className="mobCubeDot" />)}
                    </button>
                  ))}
                </div>

                {/* Lock Portals */}
                <button
                  className={`mobLockPortalsBtn ${allPagesLocked ? "isLocked" : ""}`}
                  onClick={allPagesLocked ? unlockAllPages : lockAllPages}
                >
                  {allPagesLocked ? "Unlock Pages" : "Lock Pages"}
                </button>

                {/* Reset */}
                <button className="mobResetBtn" onClick={resetAllPages}>Reset</button>

                {/* Tile list */}
                <div className="mobCardTabList">
                  {cardState.cards.map((card, idx) => (
                    <button
                      key={card.id}
                      className={`mobCardTab ${card.id === cardState.selectedCardId ? "isActive" : ""}`}
                      onClick={() => setCardState((cur) => ({ ...cur, selectedCardId: card.id, lockSize: card.lockSize ?? false, lockPosition: card.lockPosition ?? false }))}
                    >
                      Tile {idx + 1} • {Math.round(card.w)} × {Math.round(card.h)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Hidden file inputs ── */}
      <input
        ref={contentFileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          handleMobilePhotoUpload(file);
        }}
      />
      <input
        ref={mediaAddInputRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const url = URL.createObjectURL(file);
          const newId = `media-custom-${Date.now()}`;
          setMediaUrls((prev) => ({ ...prev, [newId]: url }));
          e.target.value = "";
        }}
      />

      {/* ── Content panel: content, media, skins, or exclusive ── */}
      {contentPanel && (
        <div className={`mobileToolOverlay ${contentPanelSide === "left" ? "isLeft" : "isRight"}`}>
          <div className="mobToolHeader">
            <button
              className="mobToolArrowBtn"
              onClick={() => setContentPanelSide((s) => s === "right" ? "left" : "right")}
              title={contentPanelSide === "right" ? "Move panel left" : "Move panel right"}
            >
              <svg viewBox="0 0 10 16" width="9" height="14" fill="none">
                {contentPanelSide === "right" ? (
                  <path d="M8 2L2 8l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                ) : (
                  <path d="M2 2l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                )}
              </svg>
            </button>
            <span className="mobToolTitle">{contentPanel.toUpperCase()}</span>
            {contentPanel === "content" && (
              <button
                className="mobToolHeaderPlus mobToolHeaderPlusFlat"
                onClick={() => contentFileInputRef.current?.click()}
                title="Upload photo"
                disabled={uploading}
              >{uploading ? "..." : "+"}</button>
            )}
            {contentPanel === "media" && (
              <button
                className="mobToolHeaderPlus mobToolHeaderPlusFlat"
                onClick={() => mediaAddInputRef.current?.click()}
                title="Add media tile"
              >+</button>
            )}
            {contentPanel === "exclusive" && (
              <button
                className="mobToolHeaderPlus mobToolHeaderPlusFlat"
                onClick={() => setExclusiveTiles((prev) => [...prev, { url: "", price: "", locked: false }])}
                title="Add exclusive card"
              >+</button>
            )}
            <button className="mobToolClose" onClick={() => setContentPanel(null)}>✕</button>
          </div>
          <div className="mobToolBody">
            {contentPanel === "content" && (
              <div className="contentTray">
                {/* User uploads first */}
                {userUploads.map((item) => (
                  <div key={item.code} className="contentThumb contentThumbUser" draggable
                    onDragStart={(e) => handleContentDragStart(e, item.url, item.code)}
                    onClick={() => applyContentToCard(item.url, item.code)} title={item.code}>
                    <img src={item.url} alt={item.code} draggable={false}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    <span className="contentThumbCode">{item.code}</span>
                  </div>
                ))}
                {/* Catalog content */}
                {contentCatalog.map((item) => (
                  <div key={item.code} className="contentThumb" draggable
                    onDragStart={(e) => handleContentDragStart(e, item.url, item.code)}
                    onClick={() => applyContentToCard(item.url, item.code)} title={item.code}>
                    <img src={item.url} alt={item.code} draggable={false}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  </div>
                ))}
              </div>
            )}
            {contentPanel === "media" && (
              <>
                {mediaTiles.map((item) => (
                  <div key={item.id} className="mobMediaTile">
                    <div className="mobMediaPreview">
                      <img src="/stickers/xyzlabs.png" alt="XYZ Labs" draggable={false} />
                    </div>
                    <input className="mobMediaInput" value={mediaUrls[item.id] ?? ""}
                      onChange={(e) => setMediaUrls((prev) => ({ ...prev, [item.id]: e.target.value.trim() }))}
                      placeholder={item.placeholder} />
                    <button className="mobApplyBtn" disabled={!mediaUrls[item.id]}
                      onClick={() => applyMediaToCard(mediaUrls[item.id], item.type)}>
                      {item.buttonLabel}
                    </button>
                  </div>
                ))}
              </>
            )}
            {contentPanel === "skins" && (
              <div className="skinTray">
                {skinCatalog.map((skin) => (
                  <div key={skin.id} className="skinThumb" draggable
                    onDragStart={(e) => handleSkinDragStart(e, skin.id)}
                    onClick={() => applySkinToCard(skin.id)} title={skin.name}>
                    <img src={skin.thumbnail} alt={skin.name} draggable={false}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    <span className="skinThumbLabel">{skin.name}</span>
                  </div>
                ))}
              </div>
            )}
            {contentPanel === "exclusive" && (
              <div className="mobExclusiveTray">
                {exclusiveTiles.length === 0 && (
                  <p className="mobExclusiveEmpty">Tap + to add an exclusive card</p>
                )}
                {exclusiveTiles.map((tile, idx) => (
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
                      onChange={(e) => setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, url: e.target.value } : t))}
                    />
                    <input
                      className="mobMediaInput"
                      value={tile.price}
                      placeholder="Price (e.g. $9.99)"
                      onChange={(e) => setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, price: e.target.value } : t))}
                    />
                    <div className="mobExclusiveActions">
                      <button
                        className={`mobExclusiveLockBtn ${tile.locked ? "isLocked" : ""}`}
                        onClick={() => setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, locked: !t.locked } : t))}
                      >
                        {tile.locked ? "Locked" : "Unlocked"}
                      </button>
                      <button
                        className="mobExclusiveDeleteBtn"
                        onClick={() => setExclusiveTiles((prev) => prev.filter((_, i) => i !== idx))}
                      >✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Floating bottom-right: Save | Deploy Gateway ── */}
      <div className="mobFloatingActions">
        <button className={`mobFloatBtn mobFloatSave ${justSaved ? "isSaved" : ""}`} onClick={handleSave}>
          Save
        </button>
        <button className="mobFloatBtn mobFloatDeploy deployGlow" onClick={handleDeploy} disabled={deploying}>
          {deploying ? "..." : "Deploy Gateway"}
        </button>
      </div>

      {/* ── Deploy modal ── */}
      {deployModal && (() => {
        const gatewayUrl = deployModal.primaryUrl;
        const holidayUrl = deployModal.holidayUrl;
        function copyUrl(key: string, url: string) {
          navigator.clipboard.writeText(url).then(() => {
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 1800);
          });
        }
        return (
          <div className="deployModalOverlay" onClick={() => setDeployModal(null)}>
            <div className="deployModalCard" onClick={(e) => e.stopPropagation()}>
              <button className="deployModalClose" onClick={() => setDeployModal(null)}>×</button>
              <div className="deployModalTitle">Welcome to Gateway</div>
              {deployModal.ok ? (
                <div className="deployModalSubtitle">Your page has been deployed. Share these links:</div>
              ) : (
                <div className="deployModalSubtitle" style={{ color: "#ff6b6b" }}>
                  Deploy failed — links are not live yet.<br />
                  <span style={{ fontSize: "0.82em", opacity: 0.85 }}>{deployModal.error ?? "Unknown error"}</span>
                </div>
              )}
              <div className="deployModalUrls">
                <div className="deployModalUrlRow">
                  <span className="deployModalUrlLabel">Gateway URL</span>
                  <div className="deployModalUrlBox">
                    <a className="deployModalUrlLink" href={gatewayUrl} target="_blank" rel="noopener noreferrer">{gatewayUrl}</a>
                    <button className="deployModalCopyBtn" onClick={() => copyUrl("gateway", gatewayUrl)} title="Copy link">
                      {copiedKey === "gateway" ? "✓" : (
                        <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                          <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                          <path d="M3 11H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.4"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="deployModalUrlRow">
                  <span className="deployModalUrlLabel">Holiday Page</span>
                  <div className="deployModalUrlBox">
                    <a className="deployModalUrlLink" href={holidayUrl} target="_blank" rel="noopener noreferrer">{holidayUrl}</a>
                    <button className="deployModalCopyBtn" onClick={() => copyUrl("holiday", holidayUrl)} title="Copy link">
                      {copiedKey === "holiday" ? "✓" : (
                        <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                          <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                          <path d="M3 11H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.4"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="deployModalExpire">Demo links expire in 24 hours</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
