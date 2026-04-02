import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import "./mobile.css";
import { mobileWallpaperCatalog } from "../core/mobileWallpaperCatalog";
import { loadProject } from "./state/editorExport";
import { useCardInteractions } from "./hooks/useCardInteractions";

// Domain imports
import type { CardInteractionState, ProjectData } from "../domain/project/types";
import type { PageKey } from "../domain/project/types";
import { PAGE_KEYS, makeEmptyPage, makeEmptyProject } from "../domain/project/defaults";
import { pageDataToCardState, cardStateToPageData, maxCardCounter } from "../domain/editor/selectors";
import { getOrCreateMobileSlug } from "../services/runtime/urlState";

// Mobile-extracted modules
import { DEFAULT_WALLPAPER } from "./mobile/lib/mobileConstants";
import { getMobDims, makeMobDefaultCard, getMobCardCounter, setMobCardCounter } from "./mobile/lib/mobileHelpers";
import { getSelectedCard, getPageNavigation, getAllPagesLocked } from "./mobile/lib/derivedState";
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

// Mobile UI components
import { MobileTopBar } from "./mobile/sections/MobileTopBar";
import { MobileWorkspace } from "./mobile/sections/MobileWorkspace";
import { MobileCreatePanel, type CreatePanelType } from "./mobile/panels/MobileCreatePanel";
import { MobileContentPanel, type ContentPanelType } from "./mobile/panels/MobileContentPanel";
import { MobileDeployControls } from "./mobile/sections/MobileDeployControls";
import { MobileDeployModal } from "./mobile/sections/MobileDeployModal";

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
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({
    "media-video-1": "",
    "media-image-1": "",
  });
  const [exclusiveTiles, setExclusiveTiles] = useState<{ url: string; price: string; locked: boolean }[]>([]);
  const contentFileInputRef = useRef<HTMLInputElement>(null);
  const mediaAddInputRef = useRef<HTMLInputElement>(null);

  // ── Panel state ──
  const [createPanel, setCreatePanel] = useState<CreatePanelType>(null);
  const [contentPanel, setContentPanel] = useState<ContentPanelType>(null);
  const [contentPanelSide, setContentPanelSide] = useState<"left" | "right">("right");

  // ── Project ──
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

  const { canGoPrevPage, canGoNextPage } = getPageNavigation(page);

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
  function goPrevPage() {
    const nav = getPageNavigation(page);
    if (nav.prevPage) switchPage(nav.prevPage);
  }
  function goNextPage() {
    const nav = getPageNavigation(page);
    if (nav.nextPage) switchPage(nav.nextPage);
  }

  // ── Panel toggles ──
  function handleCreateClick() {
    setContentPanel(null);
    if (createPanel === null) setCreatePanel("wallpaper");
    else if (createPanel === "wallpaper") setCreatePanel("portals");
    else setCreatePanel(null);
  }

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
      <MobileTopBar
        page={page}
        createPanelActive={!!createPanel}
        contentPanelActive={!!contentPanel}
        canGoPrevPage={canGoPrevPage}
        canGoNextPage={canGoNextPage}
        isExclusivePage={page === "p4"}
        lockPage={cardState.lockPage}
        hasSelectedCard={!!selectedCard}
        exclusiveTilesCount={exclusiveTiles.length}
        onCreateClick={handleCreateClick}
        onContentClick={handleContentClick}
        onPrevPage={goPrevPage}
        onNextPage={goNextPage}
        onAddTile={() => page === "p4" ? setExclusiveTiles((prev) => [...prev, { url: "", price: "", locked: false }]) : addMobileCard()}
        onRemoveTile={() => page === "p4" ? setExclusiveTiles((prev) => prev.slice(0, -1)) : deleteSelectedCard()}
      />

      {deployStatus && <div className={`mobDeployStatus ${deployStatus.includes("⚠") ? "isWarning" : ""}`}>{deployStatus}</div>}

      <MobileWorkspace
        page={page}
        wallpaper={wallpaper}
        exclusiveTiles={exclusiveTiles}
        setExclusiveTiles={setExclusiveTiles}
        cardState={cardState}
        setCardState={setCardState}
        workspaceRef={workspaceRef}
        overlappingCardIds={overlappingCardIds}
        onCollapseAll={collapseAll}
        handleCardPointerDown={handleCardPointerDown}
        handleCardDrop={handleCardDrop}
        handleResizePointerDown={handleResizePointerDown}
      />

      <MobileCreatePanel
        createPanel={createPanel}
        page={page}
        project={project}
        cardState={cardState}
        wallpaper={wallpaper}
        allPagesLocked={allPagesLocked}
        setCreatePanel={setCreatePanel}
        setWallpaper={setWallpaper}
        switchPage={switchPage}
        applyCubeLayout={applyCubeLayout}
        lockAllPages={lockAllPages}
        unlockAllPages={unlockAllPages}
        resetAllPages={resetAllPages}
        setCardState={setCardState}
      />

      {/* Hidden file inputs */}
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

      <MobileContentPanel
        contentPanel={contentPanel}
        contentPanelSide={contentPanelSide}
        userUploads={userUploads}
        uploading={uploading}
        mediaUrls={mediaUrls}
        exclusiveTiles={exclusiveTiles}
        contentFileInputRef={contentFileInputRef}
        mediaAddInputRef={mediaAddInputRef}
        setContentPanel={setContentPanel}
        setContentPanelSide={setContentPanelSide}
        setMediaUrls={setMediaUrls}
        setExclusiveTiles={setExclusiveTiles}
        applyContentToCard={applyContentToCard}
        applySkinToCard={applySkinToCard}
        applyMediaToCard={applyMediaToCard}
        handleContentDragStart={handleContentDragStart}
        handleSkinDragStart={handleSkinDragStart}
      />

      <MobileDeployControls
        justSaved={justSaved}
        deploying={deploying}
        onSave={handleSave}
        onDeploy={handleDeploy}
      />

      {deployModal && (
        <MobileDeployModal
          modal={deployModal}
          onClose={() => setDeployModal(null)}
        />
      )}
    </div>
  );
}
