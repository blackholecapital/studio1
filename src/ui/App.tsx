import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import type { CSSProperties, DragEvent } from "react";
import { wallpaperCatalog, DEFAULT_WALLPAPER_URL } from "../core/wallpaperCatalog";
import { contentCatalog } from "../core/contentCatalog";
import { skinCatalog } from "../core/skinCatalog";
import { thumbnailUrl } from "../core/assetResolver";
import {
  loadProject,
  saveProject,
} from "./state/editorExport";
import { layoutConfig } from "./state/layoutConfig";
import { useCardInteractions } from "./hooks/useCardInteractions";

// Domain imports — shared types, constants, selectors, actions
import type { CardModel, CardInteractionState, PageData, ProjectData, ExclusiveTile } from "../domain/project/types";
import type { PageKey } from "../domain/project/types";
import { PAGE_KEYS, PAGE_SHORT_TITLES, PAGE_ROUTES, makeEmptyPage, makeEmptyProject, DEFAULT_INSTRUCTIONS, DEFAULT_EXCLUSIVE_TILES, HOLIDAY_WALLPAPER_CODES } from "../domain/project/defaults";
import { pageDataToCardState, cardStateToPageData, hasAnyOverlap, maxCardCounter } from "../domain/editor/selectors";
import { sanitizeSlug } from "../domain/editor/actions";
import { DEPLOY_W, DEPLOY_H, DEPLOY_X_OFFSET, DEPLOY_Y_OFFSET, DESKTOP_INSTRUCTIONS_IMAGE, LEFT_AD_IMAGE, RIGHT_AD_IMAGE, CATALOG_PAGE_SIZE, DEMO_CONTENT_BASE } from "../domain/editor/constants";

// Service imports — side-effecting operations
import { saveDesktopSlug, markGhostFlowSeen, resetGhostFlow as resetGhostFlowStorage } from "../services/storage/projectStore";
import { getOrCreateDesktopSlug } from "../services/runtime/urlState";
import { useDesktopDeployFlow } from "./desktop/hooks/useDesktopDeployFlow";
import { useDesktopUploadFlow } from "./desktop/hooks/useDesktopUploadFlow";
import { getAllPagesLocked, getPageNavigation, getSelectedCard } from "./desktop/lib/derivedState";
import { deleteSelectedCardState, patchSelectedCard, setSelectedCardLockPosition, setSelectedCardLockSize, togglePageLockState } from "./desktop/state/desktopReducers";

type SurfaceTab = "cards" | "content" | "wallpaper" | "media" | "skins" | "exclusive";
type LeftRailTab = "wallpaper" | "pages";

const pages: Array<{ key: PageKey; label: string }> = PAGE_KEYS.map((key) => ({
  key,
  label: PAGE_SHORT_TITLES[key],
}));

const rightRailTabs: Array<{ key: SurfaceTab; label: string }> = [
  { key: "content", label: "Content" },
  { key: "exclusive", label: "Exclusive Content" },
  { key: "media", label: "Media" },
  { key: "skins", label: "Skins" }
];

const LEFT_RAIL_TABS: LeftRailTab[] = ["wallpaper", "pages"];

const TOOLTIP_HELP: Record<string, string[]> = {
  wallpaper: ["Select background", "Tap to cycle styles", "Applies to workspace"],
  pages: ["Switch between pages", "Lock pages when ready", "Preview deployment"],
  content: ["Choose content type", "Drag into workspace", "Edit after placement"],
  exclusive: ["Add exclusive items", "Set pricing per tile", "Lock to make purchaseable"],
  media: ["Add video or image URLs", "Drag media into cards", "Supports mp4 and images"],
  skins: ["Apply card frames", "Drag skin onto a card", "Rainbow, Steel, Flame, Corporate"]
};

type MediaTileItem = { id: string; label: string; type: "video" | "image"; placeholder: string; buttonLabel: string };
const DEFAULT_MEDIA_TILES: MediaTileItem[] = [
  { id: "media-video-1", label: "Video", type: "video", placeholder: "https://...mp4", buttonLabel: "Video File" },
  { id: "media-image-1", label: "Media", type: "image", placeholder: "https://...",    buttonLabel: "Media File" },
];
let cardCounter = 0;

const INSTRUCTIONS_IMAGE = DESKTOP_INSTRUCTIONS_IMAGE;

function makeDefaultCard(wsW?: number, wsH?: number): CardModel {
  cardCounter += 1;
  const w = wsW ?? layoutConfig.workspace.width;
  const h = wsH ?? layoutConfig.workspace.height;
  return {
    id: `card-${cardCounter}`,
    label: `Card ${cardCounter}`,
    x: Math.round((w - 460) / 2),
    y: Math.round((h - 480) / 2),
    w: 460,
    h: 480,
    zIndex: 1,
    lockSize: false,
    lockPosition: false,
    contentImage: INSTRUCTIONS_IMAGE,
    contentCode: "c5555",
    contentDisplay: "image"
  };
}

const DEFAULT_WALLPAPER = DEFAULT_WALLPAPER_URL;

function makeDefaultPageState(wallpaper: string): { cardState: CardInteractionState; instructions: string; wallpaper: string } {
  const card = makeDefaultCard();
  return {
    wallpaper,
    instructions: DEFAULT_INSTRUCTIONS,
    cardState: {
      cards: [card],
      selectedCardId: card.id,
      lockSize: false,
      lockPosition: false,
      lockPage: false
    }
  };
}

export function App() {
  const [slug, setSlug] = useState(getOrCreateDesktopSlug);
  const [page, setPageRaw] = useState<PageKey>("p1");
  const [activeTab, setActiveTab] = useState<SurfaceTab>("content");
  const [leftMode, setLeftMode] = useState<"create" | "gateway">("create");
  const [leftRailTab, setLeftRailTab] = useState<LeftRailTab>("wallpaper");
  const [tooltipOpen, setTooltipOpen] = useState<string | null>(null);
  const [pageDropOpen, setPageDropOpen] = useState(false);
  const [exclusiveTiles, setExclusiveTiles] = useState<ExclusiveTile[]>([...DEFAULT_EXCLUSIVE_TILES]);
  const [uploadedContents, setUploadedContents] = useState<Array<{ name: string; url: string; code: string }>>([]);
  const contentFileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadCounterRef = useRef(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isGlobalWallpaper, setIsGlobalWallpaper] = useState(false);
  const [deployModal, setDeployModal] = useState<{ slug: string; primaryUrl: string; holidayUrl: string; ok: boolean; error?: string } | null>(null);
  const [wallpaperPreview, setWallpaperPreview] = useState<string | null>(null);
  const [topAdDropLabel, setTopAdDropLabel] = useState("Ad Slot");
  const [midAdDropLabel, setMidAdDropLabel] = useState("Ad Slot");
  const [topAdImage, setTopAdImage] = useState("https://media.xyz-labs.xyz/content/c5.png");
  const [midAdImage, setMidAdImage] = useState<string | null>(null);
  const [workspaceUrlPreview, setWorkspaceUrlPreview] = useState<string | null>(null);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({
    "media-video-1": "",
    "media-image-1": ""
  });
  const [mediaTiles, setMediaTiles] = useState<MediaTileItem[]>(DEFAULT_MEDIA_TILES);
  const mediaTileCounterRef = useRef(2);
  const [visibleMediaCount, setVisibleMediaCount] = useState(CATALOG_PAGE_SIZE);
  const railScrollRef = useRef<HTMLDivElement | null>(null);
  // Tracks arrangement cycle index for each cube-button count (wraps every 5)
  const [cubeLayoutCycle, setCubeLayoutCycle] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });

  // ── Ghost Flow (first-time user onboarding — runs on every page load) ──
  const [ghostStep, setGhostStep] = useState<number | null>(0);
  const ghostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const endGhostFlow = useCallback(() => {
    setGhostStep(null);
    if (ghostTimerRef.current) { clearTimeout(ghostTimerRef.current); ghostTimerRef.current = null; }
    // Restore rails to default state in case ghost flow interrupted mid-cycle
    setLeftRailTab("wallpaper");
    setLeftMode("create");
    setActiveTab("content");
    markGhostFlowSeen();
  }, []);

  // Start ghost flow on mount
  useEffect(() => {
    if (ghostStep !== 0) return;
    const t = setTimeout(() => setGhostStep(1), 400);
    return () => clearTimeout(t);
  }, [ghostStep]);

  // Auto-advance steps (5 steps total)
  useEffect(() => {
    if (ghostStep === null || ghostStep === 0) return;

    // Step 1: wallpaper selection — switch to w33 after 2.5s, advance at 3.5s
    if (ghostStep === 1) {
      const wallpaperTimer = setTimeout(() => {
        setWallpaper("https://media.xyz-labs.xyz/wallpaper/w33.png");
      }, 2500);
      ghostTimerRef.current = setTimeout(() => setGhostStep(2), 3500);
      return () => { clearTimeout(wallpaperTimer); if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current); };
    }

    // Step 2 (3s): cycle left rail button — Wallpaper → Pages → Wallpaper
    if (ghostStep === 2) {
      const toPages = setTimeout(() => {
        setLeftRailTab("pages");
        setLeftMode("gateway");
      }, 1000);
      const backToWallpaper = setTimeout(() => {
        setLeftRailTab("wallpaper");
        setLeftMode("create");
      }, 1800);
      ghostTimerRef.current = setTimeout(() => setGhostStep(3), 3000);
      return () => { clearTimeout(toPages); clearTimeout(backToWallpaper); if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current); };
    }

    // Step 3 (3s): drag content — apply c4444 to center tile on completion
    if (ghostStep === 3) {
      ghostTimerRef.current = setTimeout(() => {
        setCardState((curr) => ({
          ...curr,
          cards: curr.cards.map((c) =>
            c.contentCode === "c5555"
              ? { ...c, contentImage: "https://media.xyz-labs.xyz/content/c4444.png", contentCode: "c4444" }
              : c
          )
        }));
        setGhostStep(4);
      }, 3000);
      return () => { if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current); };
    }

    // Step 4 (3.5s): cycle right rail button — Content → Exclusive → Media → Skins → Content
    if (ghostStep === 4) {
      const order: SurfaceTab[] = ["exclusive", "media", "skins", "content"];
      const timers = order.map((tab, i) => setTimeout(() => setActiveTab(tab), 600 + i * 600));
      ghostTimerRef.current = setTimeout(() => setGhostStep(5), 3500);
      return () => { timers.forEach(clearTimeout); if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current); };
    }

    // Step 5: save + deploy
    if (ghostStep === 5) {
      ghostTimerRef.current = setTimeout(() => endGhostFlow(), 3500);
      return () => { if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current); };
    }
  }, [ghostStep, endGhostFlow]);

  // Exit on any interaction
  useEffect(() => {
    if (ghostStep === null) return;
    const dismiss = () => endGhostFlow();
    window.addEventListener("pointerdown", dismiss, { once: true });
    window.addEventListener("scroll", dismiss, { once: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("scroll", dismiss);
    };
  }, [ghostStep, endGhostFlow]);

  // Dev reset
  useEffect(() => {
    (window as any).resetGhostFlow = () => { resetGhostFlowStorage(); location.reload(); };
  }, []);

  // Per-page state stored in a project map
  const [project, setProject] = useState<ProjectData>(() => {
    const existing = loadProject("user");
    return existing ?? makeEmptyProject("user");
  });

  // Current page's wallpaper
  const currentPageData = project.pages[page] ?? makeEmptyPage();
  const initialPageState = useMemo(() => {
    const hasCards = (currentPageData.cards?.length ?? 0) > 0;
    if (!hasCards) return makeDefaultPageState(currentPageData.wallpaper || DEFAULT_WALLPAPER);
    return {
      wallpaper: currentPageData.wallpaper || DEFAULT_WALLPAPER,
      instructions: currentPageData.instructions || DEFAULT_INSTRUCTIONS,
      cardState: pageDataToCardState(currentPageData)
    };
  }, [currentPageData]);
  const [wallpaper, setWallpaper] = useState(initialPageState.wallpaper);
  const [pageInstructions, setPageInstructions] = useState(initialPageState.instructions);

  // Current page's card state
  const [cardState, setCardState] = useState<CardInteractionState>(() => initialPageState.cardState);

  // Track the previous page so we can save on switch
  const prevPageRef = useRef<PageKey>(page);

  const {
    workspaceRef,
    activeResizeCardIdRef,
    activeDragCardIdRef,
    overlappingCardIds,
    handleCardPointerDown,
    handleResizePointerDown
  } = useCardInteractions({ cardState, setCardState, layoutConfig });

  const selectedCard = useMemo(() => getSelectedCard(cardState), [cardState]);
  const selectedCardLockSize = selectedCard?.lockSize ?? false;
  const selectedCardLockPosition = selectedCard?.lockPosition ?? false;

  useEffect(() => {
    if (activeTab === "media") setVisibleMediaCount(CATALOG_PAGE_SIZE);
    if (railScrollRef.current) railScrollRef.current.scrollTop = 0;
  }, [activeTab]);

  // Re-center the default card on mount AND on every page change
  useEffect(() => {
    const ws = workspaceRef.current;
    if (!ws) return;
    const wsW = ws.offsetWidth;
    const wsH = ws.offsetHeight;
    setCardState((curr) => ({
      ...curr,
      cards: curr.cards.map((c) =>
        c.contentCode === "c5555"
          ? { ...c, x: Math.round((wsW - c.w) / 2), y: Math.round((wsH - c.h) / 2) }
          : c
      )
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // ── Save current page into project whenever cardState or wallpaper changes ──
  useEffect(() => {
    setProject((prev) => ({
      ...prev,
      slug,
      pages: {
        ...prev.pages,
        [page]: cardStateToPageData(cardState, wallpaper, pageInstructions)
      }
    }));
    setIsSaved(false);
  }, [cardState, wallpaper, page, slug, pageInstructions]);

  // ── Switch page: save old, load new ──
  function switchPage(nextPage: PageKey) {
    if (nextPage === page) return;

    // Save current page into project
    setProject((prev) => {
      const updated = {
        ...prev,
        slug,
        pages: {
          ...prev.pages,
          [page]: cardStateToPageData(cardState, wallpaper, pageInstructions)
        }
      };

      // Load target page
      const target = updated.pages[nextPage] ?? makeEmptyPage();
      const nextHasCards = (target.cards?.length ?? 0) > 0;
      if (!nextHasCards) {
        const fallback = makeDefaultPageState(target.wallpaper || DEFAULT_WALLPAPER);
        const ws = workspaceRef.current;
        if (ws) {
          const wsW = ws.offsetWidth;
          const wsH = ws.offsetHeight;
          fallback.cardState.cards = fallback.cardState.cards.map((c) =>
            c.contentCode === "c5555"
              ? { ...c, x: Math.round((wsW - c.w) / 2), y: Math.round((wsH - c.h) / 2) }
              : c
          );
        }
        setWallpaper(fallback.wallpaper);
        setPageInstructions(fallback.instructions);
        setCardState(fallback.cardState);
      } else {
        setWallpaper(target.wallpaper || DEFAULT_WALLPAPER);
        setPageInstructions(target.instructions || DEFAULT_INSTRUCTIONS);
        setCardState(pageDataToCardState(target));
      }

      // Update cardCounter to avoid ID collisions
      const maxId = maxCardCounter(target.cards);
      if (maxId >= cardCounter) cardCounter = maxId;

      return updated;
    });

    prevPageRef.current = nextPage;
    setPageRaw(nextPage);
  }

  // ── Load project when slug changes ──
  function handleSlugChange(newSlug: string) {
    const sanitized = sanitizeSlug(newSlug);
    setSlug(sanitized);
    saveDesktopSlug(sanitized);

    // Save current project first
    setProject((prev) => {
      const current = {
        ...prev,
        slug: prev.slug,
        pages: {
          ...prev.pages,
          [page]: cardStateToPageData(cardState, wallpaper, pageInstructions)
        }
      };
      saveProject(current);
      return current;
    });

    // Load or create for new slug
    const existing = loadProject(sanitized);
    const loaded = existing ?? makeEmptyProject(sanitized);
    setProject(loaded);

    // Load current page from new project
    const pageData = loaded.pages[page] ?? makeEmptyPage();
    if ((pageData.cards?.length ?? 0) === 0) {
      const fallback = makeDefaultPageState(pageData.wallpaper || DEFAULT_WALLPAPER);
      const ws = workspaceRef.current;
      if (ws) {
        const wsW = ws.offsetWidth;
        const wsH = ws.offsetHeight;
        fallback.cardState.cards = fallback.cardState.cards.map((c) =>
          c.contentCode === "c5555"
            ? { ...c, x: Math.round((wsW - c.w) / 2), y: Math.round((wsH - c.h) / 2) }
            : c
        );
      }
      setWallpaper(fallback.wallpaper);
      setPageInstructions(fallback.instructions);
      setCardState(fallback.cardState);
    } else {
      setWallpaper(pageData.wallpaper || DEFAULT_WALLPAPER);
      setPageInstructions(pageData.instructions || DEFAULT_INSTRUCTIONS);
      setCardState(pageDataToCardState(pageData));
    }

    const maxId = maxCardCounter(pageData.cards);
    if (maxId >= cardCounter) cardCounter = maxId;
  }

  // ── Card operations ──
  function updateSelectedCard(patch: Partial<CardModel>) {
    if (!selectedCard || cardState.lockPage) return;
    setCardState((current) => patchSelectedCard(current, selectedCard.id, patch));
  }

  function setLockSize(next: boolean) {
    activeResizeCardIdRef.current = null;
    setCardState((current) => setSelectedCardLockSize(current, next));
  }

  function setLockPosition(next: boolean) {
    activeDragCardIdRef.current = null;
    setCardState((current) => setSelectedCardLockPosition(current, next));
  }

  function toggleLockPage() {
    if (!cardState.lockPage && hasAnyOverlap(cardState.cards)) {
      setDeployStatus("⚠ Cannot lock page — overlapping tiles detected. Move tiles apart first.");
      setTimeout(() => setDeployStatus(null), 3500);
      return;
    }
    setCardState((current) => togglePageLockState(current));
    if (!cardState.lockPage) {
      activeResizeCardIdRef.current = null;
      activeDragCardIdRef.current = null;
    }
  }

  // ── Per-page lock toggle (for non-current pages in Portals panel) ──
  function togglePageLock(pageKey: PageKey) {
    if (pageKey === page) {
      toggleLockPage();
      return;
    }
    setProject((prev) => {
      const pd = prev.pages[pageKey] ?? makeEmptyPage();
      const next = !pd.lockPage;
      return {
        ...prev,
        pages: {
          ...prev.pages,
          [pageKey]: {
            ...pd,
            lockPage: next,
            lockSize: next ? true : pd.lockSize,
            lockPosition: next ? true : pd.lockPosition,
            cards: pd.cards.map((c) => ({
              ...c,
              lockSize: next ? true : c.lockSize,
              lockPosition: next ? true : c.lockPosition
            }))
          }
        }
      };
    });
  }

  // ── Lock / Unlock all pages at once ──
  function lockAllPages() {
    if (hasAnyOverlap(cardState.cards)) {
      setDeployStatus("⚠ Cannot lock pages — overlapping tiles on this page. Move tiles apart first.");
      setTimeout(() => setDeployStatus(null), 3500);
      return;
    }
    setProject((prev) => ({
      ...prev,
      pages: Object.fromEntries(
        PAGE_KEYS.map((k) => {
          const pd = k === page
            ? cardStateToPageData(cardState, wallpaper, pageInstructions)
            : (prev.pages[k] ?? makeEmptyPage());
          return [k, { ...pd, lockPage: true, lockSize: true, lockPosition: true, cards: pd.cards.map((c) => ({ ...c, lockSize: true, lockPosition: true })) }];
        })
      )
    }));
    setCardState((current) => ({
      ...current,
      lockPage: true,
      lockSize: true,
      lockPosition: true,
      cards: current.cards.map((c) => ({ ...c, lockSize: true, lockPosition: true }))
    }));
    activeResizeCardIdRef.current = null;
    activeDragCardIdRef.current = null;
  }

  function unlockAllPages() {
    setProject((prev) => ({
      ...prev,
      pages: Object.fromEntries(
        PAGE_KEYS.map((k) => {
          const pd = k === page
            ? cardStateToPageData(cardState, wallpaper, pageInstructions)
            : (prev.pages[k] ?? makeEmptyPage());
          return [k, { ...pd, lockPage: false, lockSize: false, lockPosition: false, cards: pd.cards.map((c) => ({ ...c, lockSize: false, lockPosition: false })) }];
        })
      )
    }));
    setCardState((current) => ({
      ...current,
      lockPage: false,
      lockSize: false,
      lockPosition: false,
      cards: current.cards.map((c) => ({ ...c, lockSize: false, lockPosition: false }))
    }));
  }

  const allPagesLocked = useMemo(() => getAllPagesLocked(project, page, cardState), [project, page, cardState]);
  const { pageIndex, canGoPrevPage, canGoNextPage } = useMemo(() => getPageNavigation(page), [page]);

  function goPrevPage() {
    if (!canGoPrevPage) return;
    switchPage(PAGE_KEYS[pageIndex - 1]);
  }

  function goNextPage() {
    if (!canGoNextPage) return;
    switchPage(PAGE_KEYS[pageIndex + 1]);
  }

  function resetWorkspace() {
    activeResizeCardIdRef.current = null;
    activeDragCardIdRef.current = null;
    // Reset ALL pages to default state, fully unlocked
    const freshPages = Object.fromEntries(
      PAGE_KEYS.map((k) => {
        const def = makeDefaultPageState(DEFAULT_WALLPAPER);
        return [k, {
          wallpaper: DEFAULT_WALLPAPER,
          cards: def.cardState.cards,
          selectedCardId: def.cardState.selectedCardId ?? "",
          lockSize: false,
          lockPosition: false,
          lockPage: false,
          instructions: DEFAULT_INSTRUCTIONS
        }];
      })
    );
    setProject((prev) => {
      const updated = { ...prev, pages: freshPages };
      saveProject(updated);
      return updated;
    });
    // Reset current page — use actual workspace dimensions so the card lands centered
    const wsW = workspaceRef.current?.offsetWidth  ?? layoutConfig.workspace.width;
    const wsH = workspaceRef.current?.offsetHeight ?? layoutConfig.workspace.height;
    const centeredCard = makeDefaultCard(wsW, wsH);
    centeredCard.contentImage = INSTRUCTIONS_IMAGE;
    centeredCard.contentCode = "c5555";
    centeredCard.contentDisplay = "image";
    setCardState({ cards: [centeredCard], selectedCardId: centeredCard.id, lockSize: false, lockPosition: false, lockPage: false });
    setWallpaper(DEFAULT_WALLPAPER);
    setPageInstructions(DEFAULT_INSTRUCTIONS);
    setWallpaperPreview(null);
    setExclusiveTiles([...DEFAULT_EXCLUSIVE_TILES]);
  }

  function addCard() {
    if (cardState.lockPage) return;
    cardCounter += 1;
    const newId = `card-${cardCounter}`;
    const maxZ = cardState.cards.reduce((max, c) => Math.max(max, c.zIndex ?? 1), 1);
    const offsetX = (cardCounter - 1) * 40;
    const offsetY = (cardCounter - 1) * 40;
    const newCard: CardModel = {
      id: newId,
      label: `Card ${cardCounter}`,
      x: 90 + (offsetX % 400),
      y: 90 + (offsetY % 300),
      w: 390,
      h: 220,
      zIndex: maxZ + 1,
      lockSize: false,
      lockPosition: false
    };
    setCardState((current) => ({
      ...current,
      cards: [...current.cards, newCard],
      selectedCardId: newId
    }));
  }

  function applyCubeLayout(count: 1 | 2 | 3 | 4) {
    if (cardState.lockPage) return;
    const baseW = 260;
    const baseH = 180;
    const margin = 16;
    const wsW = workspaceRef.current?.offsetWidth  ?? layoutConfig.workspace.width;
    const wsH = workspaceRef.current?.offsetHeight ?? layoutConfig.workspace.height;
    const leftX   = Math.round(wsW * 0.06);
    const rightX  = Math.round(wsW * 0.94 - baseW);
    const centerX = Math.round((wsW - baseW) / 2);
    const topY    = margin;
    const bottomY = Math.round(wsH - baseH - margin);
    const centerY = Math.round((wsH - baseH) / 2);

    // Each button cycles through 5 arrangement presets (wraps back on 6th click).
    // Default (0) for each count is corner-based.
    const ARRANGEMENTS: Record<1|2|3|4, Array<Array<{x:number;y:number}>>> = {
      1: [
        [{ x: centerX, y: centerY }],                             // 0 center
        [{ x: leftX,   y: topY }],                               // 1 top-left
        [{ x: rightX,  y: topY }],                               // 2 top-right
        [{ x: rightX,  y: bottomY }],                            // 3 bottom-right
        [{ x: leftX,   y: bottomY }],                            // 4 bottom-left
      ],
      2: [
        [{ x: leftX, y: topY },    { x: rightX, y: topY }],     // 0 TL TR (top corners)
        [{ x: leftX, y: centerY }, { x: rightX, y: centerY }],  // 1 H-center
        [{ x: leftX, y: bottomY }, { x: rightX, y: bottomY }],  // 2 H-bottom
        [{ x: leftX, y: topY },    { x: leftX,  y: bottomY }],  // 3 V-left
        [{ x: rightX, y: topY },   { x: rightX, y: bottomY }],  // 4 V-right
      ],
      3: [
        [{ x: leftX,  y: topY },    { x: rightX, y: topY },    { x: leftX,   y: bottomY }],  // 0 TL TR BL
        [{ x: leftX,  y: topY },    { x: rightX, y: topY },    { x: rightX,  y: bottomY }],  // 1 TL TR BR
        [{ x: leftX,  y: topY },    { x: leftX,  y: bottomY }, { x: rightX,  y: bottomY }],  // 2 TL BL BR
        [{ x: rightX, y: topY },    { x: leftX,  y: bottomY }, { x: rightX,  y: bottomY }],  // 3 TR BL BR
        [{ x: centerX, y: topY },   { x: leftX,  y: bottomY }, { x: rightX,  y: bottomY }],  // 4 top-center BL BR
      ],
      4: [
        [{ x: leftX,   y: topY },    { x: rightX,  y: topY },    { x: leftX,   y: bottomY }, { x: rightX,  y: bottomY }],  // 0 four corners
        [{ x: leftX,   y: topY },    { x: rightX,  y: topY },    { x: leftX,   y: centerY }, { x: rightX,  y: centerY }],  // 1 top+mid
        [{ x: leftX,   y: centerY }, { x: rightX,  y: centerY }, { x: leftX,   y: bottomY }, { x: rightX,  y: bottomY }],  // 2 mid+bot
        [{ x: centerX, y: topY },    { x: leftX,   y: centerY }, { x: rightX,  y: centerY }, { x: centerX, y: bottomY }],  // 3 diamond
        [{ x: leftX,   y: topY },    { x: leftX,   y: bottomY }, { x: rightX,  y: topY },    { x: rightX,  y: bottomY }],  // 4 V-columns
      ],
    };

    const cycleIdx = cubeLayoutCycle[count] ?? 0;
    const positions = ARRANGEMENTS[count][cycleIdx];
    setCubeLayoutCycle((prev) => ({ ...prev, [count]: (cycleIdx + 1) % ARRANGEMENTS[count].length }));

    const cards: CardModel[] = positions.map((pos, idx) => {
      cardCounter += 1;
      return {
        id: `card-${cardCounter}`,
        label: `Card ${cardCounter}`,
        x: pos.x,
        y: pos.y,
        w: baseW,
        h: baseH,
        zIndex: idx + 1,
        lockSize: false,
        lockPosition: false
      };
    });

    setCardState((current) => ({
      ...current,
      cards,
      selectedCardId: cards[0]?.id ?? "",
      lockSize: false,
      lockPosition: false
    }));
  }

  function deleteSelectedCard() {
    if (!selectedCard || cardState.lockPage) return;
    setCardState((current) => deleteSelectedCardState(current));
  }

  const { handleContentFileUpload } = useDesktopUploadFlow(slug, uploadCounterRef, setUploadedContents);

  const handleContentDragStart = useCallback((e: DragEvent, contentUrl: string, contentCode?: string) => {
    e.dataTransfer.setData("text/plain", contentUrl);
    e.dataTransfer.setData("application/x-media-type", "image");
    e.dataTransfer.setData("application/x-drag-source", "content");
    if (contentCode) e.dataTransfer.setData("application/x-content-code", contentCode);
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  const handleMediaDragStart = useCallback((e: DragEvent, mediaUrl: string, mediaType: "image" | "video") => {
    e.dataTransfer.setData("text/plain", mediaUrl);
    e.dataTransfer.setData("application/x-media-type", mediaType);
    e.dataTransfer.setData("application/x-drag-source", "media");
    e.dataTransfer.effectAllowed = "copy";
    setWorkspaceUrlPreview(mediaUrl);
  }, []);

  const handleSkinDragStart = useCallback((e: DragEvent, skinId: string) => {
    e.dataTransfer.setData("text/plain", skinId);
    e.dataTransfer.setData("application/x-skin-id", skinId);
    e.dataTransfer.setData("application/x-drag-source", "skin");
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  const handleExclusiveDragStart = useCallback((e: DragEvent, url: string, price: string) => {
    e.dataTransfer.setData("text/plain", url);
    e.dataTransfer.setData("application/x-drag-source", "exclusive");
    e.dataTransfer.setData("application/x-exclusive-price", price);
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  const handleCardDrop = useCallback((e: DragEvent, cardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (cardState.lockPage) return;
    const dragSource = e.dataTransfer.getData("application/x-drag-source");
    if (dragSource === "wallpaper") return;

    // Exclusive content drop — requires price
    if (dragSource === "exclusive") {
      const contentUrl = e.dataTransfer.getData("text/plain");
      const price = e.dataTransfer.getData("application/x-exclusive-price");
      if (!contentUrl || !price) return;
      setCardState((current) => ({
        ...current,
        cards: current.cards.map((c) =>
          c.id === cardId
            ? { ...c, contentImage: contentUrl, contentUrl, contentDisplay: "image", contentType: "image", isExclusive: true, exclusivePrice: price }
            : c
        )
      }));
      return;
    }

    // Skin drop — apply overlay without touching content
    if (dragSource === "skin") {
      const skinId = e.dataTransfer.getData("application/x-skin-id");
      if (!skinId) return;
      setCardState((current) => ({
        ...current,
        cards: current.cards.map((c) => c.id === cardId ? { ...c, skinId } : c)
      }));
      return;
    }

    const contentUrl = e.dataTransfer.getData("text/plain");
    const mediaType = (e.dataTransfer.getData("application/x-media-type") || "image") as "image" | "video";
    const contentCode = e.dataTransfer.getData("application/x-content-code") || undefined;
    if (!contentUrl) return;
    const targetCard = cardState.cards.find((c) => c.id === cardId);
    if (!targetCard) return;
    const isInstructions = targetCard.contentImage === INSTRUCTIONS_IMAGE;
    const hasExistingContent = !isInstructions && !!(targetCard.contentImage || targetCard.contentUrl);
    if (targetCard.lockPosition && hasExistingContent) return;
    const contentDisplay = mediaType === "video" ? "video" : dragSource === "media" ? "url" : "image";
    setCardState((current) => ({
      ...current,
      cards: current.cards.map((c) =>
        c.id === cardId
          ? {
              ...c,
              contentImage: contentDisplay === "image" ? contentUrl : undefined,
              contentUrl,
              contentType: mediaType,
              contentDisplay,
              contentCode
            }
          : c
      )
    }));
  }, [cardState.cards, cardState.lockPage]);

  const handleCardDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const { handleSave, handleDeployGateway, handleDownload } = useDesktopDeployFlow({
    slug,
    setSlug,
    page,
    project,
    cardState,
    wallpaper,
    pageInstructions,
    isGlobalWallpaper,
    layout: layoutConfig,
    workspaceWidth: workspaceRef.current?.offsetWidth,
    exclusiveTiles,
    setDeploying,
    setDeployStatus,
    setProject,
    setIsSaved,
    setDeployModal,
  });

  const shellLayoutStyle = {
    "--studio-wallpaper": `url(${wallpaper})`,
    "--layout-sidebar-width": `${layoutConfig.sidebar.width}px`,
    "--layout-top-strip-min-height": `${layoutConfig.header.topStripMinHeight}px`,
    "--layout-header-strip-min-height": `${layoutConfig.header.headerStripMinHeight}px`,
    "--layout-workspace-width": `${layoutConfig.workspace.width}px`,
    "--layout-workspace-height": `${layoutConfig.workspace.height}px`,
    "--layout-workspace-max-width": `${layoutConfig.workspace.maxWidth}px`,
    "--layout-workspace-max-height": `${layoutConfig.workspace.maxHeight}px`,
    "--layout-page-gutter": `${layoutConfig.gutter.page}px`,
    "--layout-row-gutter": `${layoutConfig.gutter.row}px`,
    "--layout-column-gutter": `${layoutConfig.gutter.column}px`,
    "--layout-floating-pill-gap": `${layoutConfig.polish.floatingPillGap}px`,
    "--layout-header-strip-gap": `${layoutConfig.polish.headerStripGap}px`,
    "--layout-workspace-inset-start": `${layoutConfig.polish.workspaceInsetStart}px`
  } as CSSProperties;

  const handleRailScroll = useCallback(() => {
    const node = railScrollRef.current;
    if (!node) return;
    const nearBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 80;
    if (!nearBottom) return;
    if (activeTab === "media") {
      setVisibleMediaCount((prev) => Math.min(prev + CATALOG_PAGE_SIZE, mediaTiles.length));
    }
  }, [activeTab]);

  return (
    <div className="studioApp" style={shellLayoutStyle} onClick={() => tooltipOpen && setTooltipOpen(null)}>
      <header className="topStrip glassPanel">
        <div className="topStripLeft">
          <span className="brandMark">Drip Studio V8</span>
          <div className="cubeButtonsHeader">
            <button className="cubeButton cubeButtonHeader cubeButtonOne" onClick={() => applyCubeLayout(1)} aria-label="Add 1 cube"><span className="cubeDot" /></button>
            <button className="cubeButton cubeButtonHeader cubeButtonTwo" onClick={() => applyCubeLayout(2)} aria-label="Add 2 cubes"><span className="cubeDot" /><span className="cubeDot" /></button>
            <button className="cubeButton cubeButtonHeader cubeButtonThree" onClick={() => applyCubeLayout(3)} aria-label="Add 3 cubes"><span className="cubeDot" /><span className="cubeDot" /><span className="cubeDot" /></button>
            <button className="cubeButton cubeButtonHeader cubeButtonFour" onClick={() => applyCubeLayout(4)} aria-label="Add 4 cubes"><span className="cubeDot" /><span className="cubeDot" /><span className="cubeDot" /><span className="cubeDot" /></button>
          </div>
        </div>
        <div className="topStripCenter">
          <button className="pageNavArrowBtn" onClick={goPrevPage} disabled={!canGoPrevPage} title="Previous page">
            <svg viewBox="0 0 10 16" width="11" height="17" fill="none">
              <path d="M8 2L2 8l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="pageNavArrowBtn" onClick={goNextPage} disabled={!canGoNextPage} title="Next page">
            <svg viewBox="0 0 10 16" width="11" height="17" fill="none">
              <path d="M2 2l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className="topStripTitle">{PAGE_SHORT_TITLES[page]}</span>
          <button className="pageNavCardBtn pageNavCardBtnAdd" onClick={addCard} disabled={cardState.lockPage} title="Add card">
            <svg viewBox="0 0 14 14" width="14" height="14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="pageNavCardBtn pageNavCardBtnDelete" onClick={deleteSelectedCard} disabled={!selectedCard || cardState.lockPage} title="Delete selected card">
            <svg viewBox="0 0 14 14" width="14" height="14" fill="none">
              <path d="M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="topStripRight">
          <span className="topStripIdLabel">ID</span>
          <input
            className="topStripIdInput"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value || "user")}
          />
          <button className={`topStripSaveBtn ${isSaved ? "isSavedState" : ""}`} onClick={handleSave}>
            SAVE
          </button>
          <div className="topStripHelpWrap">
            <button
              className="topStripHelpBtn"
              onClick={(e) => { e.stopPropagation(); setTooltipOpen(tooltipOpen === "deploy-help" ? null : "deploy-help"); }}
              title="Help"
            >?</button>
            {tooltipOpen === "deploy-help" && (
              <div className="tooltipCard tooltipCardDeploy">
                <div className="tooltipLine">Position your tiles</div>
                <div className="tooltipLine">Add your content</div>
                <div className="tooltipLine">Save</div>
                <div className="tooltipLine">Deploy Gateway</div>
                <div className="tooltipLine">Links pop up for your live 24-hour demo</div>
              </div>
            )}
          </div>
          <button
            className={`pillButton walletButton isPrimary ${isSaved ? "isReadyToDeploy" : ""}`}
            onClick={handleDeployGateway}
            disabled={deploying}
          >
            {deploying ? "Deploying..." : "Deploy Gateway"}
          </button>
        </div>
      </header>

      {deployStatus && (
        <div className={`deployStatusBanner ${deployStatus?.includes("⚠") ? "isWarning" : ""}`}>{deployStatus}</div>
      )}

      {/* ══ DEPLOY MODAL ══ */}
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

      <aside className="leftRail">
        {/* ══ LEFT RAIL HEADER ══ */}
        <div className="railHeader">
          <button
            className="railHeaderBtn"
            onClick={() => {
              const next = LEFT_RAIL_TABS[(LEFT_RAIL_TABS.indexOf(leftRailTab) + 1) % LEFT_RAIL_TABS.length];
              setLeftRailTab(next);
              setLeftMode(next === "wallpaper" ? "create" : "gateway");
              if (next === "pages") setPageDropOpen(true);
              else setPageDropOpen(false);
            }}
          >
            {leftRailTab === "wallpaper" ? "Wallpaper" : "Pages"}
          </button>
          <button
            className="railHelpBtn"
            onClick={(e) => { e.stopPropagation(); setTooltipOpen(tooltipOpen === leftRailTab ? null : leftRailTab); }}
            title="Help"
          >?</button>
          {tooltipOpen === leftRailTab && (
            <div className="tooltipCard">
              {(TOOLTIP_HELP[leftRailTab] ?? []).map((line, i) => <div key={i} className="tooltipLine">{line}</div>)}
            </div>
          )}
        </div>

        {/* ══ CREATE PANEL ══ */}
        {leftMode === "create" && (
          <>
            <div className="railScrollRegion">
              <section className="wallpaperTray" aria-label="Wallpaper picker">
                {wallpaperCatalog.map((item) => (
                  <button
                    key={item.code}
                    className={`wallpaperThumb ${wallpaper === item.url ? "isActive" : ""}`}
                    onClick={() => { if (cardState.lockPage) return; setWallpaper(item.url); setWallpaperPreview(null); }}
                    title={item.code}
                  >
                    <img src={thumbnailUrl(item.url)} alt={item.code} draggable={false} onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }} />
                  </button>
                ))}
              </section>
            </div>
          </>
        )}

        {/* ══ GATEWAY PANEL ══ */}
        {leftMode === "gateway" && (
          <>
            {/* Always-visible page selector */}
            <div className="leftRailTabList">
              {pages.map((item) => {
                const isCurrentPage = page === item.key;
                const pd = isCurrentPage ? cardState : pageDataToCardState(project.pages[item.key] ?? makeEmptyPage());
                const isLocked = pd.lockPage;
                return (
                  <div key={item.key} className="leftRailPageRow">
                    <button
                      className={`leftRailTabBtn leftRailTabBtnFlex ${isCurrentPage ? "isActive" : ""} ${isLocked ? "isPageLocked" : ""}`}
                      onClick={() => { switchPage(item.key); }}
                    >
                      {item.label}
                    </button>
                    <button
                      className={`cardLockBtn ${isLocked ? "isLocked" : "isUnlocked"}`}
                      onClick={(e) => { e.stopPropagation(); togglePageLock(item.key); }}
                      title={isLocked ? "Unlock page" : "Lock page"}
                    >
                      {isLocked ? (
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
                  </div>
                );
              })}
              <button
                className={`leftRailTabBtn ${allPagesLocked ? "isPageLocked" : ""}`}
                onClick={allPagesLocked ? unlockAllPages : lockAllPages}
              >
                {allPagesLocked ? "Unlock All Pages" : "Lock All Pages"}
              </button>
              <button className="leftRailTabBtn" onClick={resetWorkspace}>
                Reset
              </button>
            </div>

            {/* XYZ Labs sticker — pushed to bottom */}
            <div className="gatewayInfoCard gatewayInfoCardBottom">
              <img
                src={LEFT_AD_IMAGE}
                alt="XYZ Labs"
                className="gatewayInfoImage"
                draggable={false}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          </>
        )}
      </aside>

      <section
        className="workspaceShell"
        ref={workspaceRef}
      >
        <div className="workspaceTint" />

        {/* ══ EXCLUSIVE PAGE WORKSPACE (p4) ══ */}
        {page === "p4" && (
          <div className="exclusiveWorkspace">
            <div className="exclusiveWorkspaceHeader">
              <div className="exclusiveWorkspaceTitle">Exclusive Content</div>
              <div className="exclusiveWorkspaceDesc">Add content or media link, add price, and lock to make item purchaseable in the exclusive content area. Unlock to make it available for free.</div>
            </div>
            <div className="exclusiveWorkspaceGrid">
              {exclusiveTiles.map((tile, idx) => (
                <div
                  key={idx}
                  className="exclusiveWorkspaceTile"
                  onDragOver={(e) => {
                    const types = e.dataTransfer.types;
                    if (types.includes("application/x-wallpaper")) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (cardState.lockPage) return;
                    const dragSource = e.dataTransfer.getData("application/x-drag-source");
                    if (dragSource === "wallpaper") return;
                    const contentUrl = e.dataTransfer.getData("text/plain");
                    if (!contentUrl) return;
                    setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, url: contentUrl } : t));
                  }}
                >
                  <div className="exclusiveTilePlaceholderLabel">Placeholder: add image here ({idx + 1})</div>
                  <div className="exclusiveTileImageArea">
                    {tile.url ? (
                      <img src={tile.url} alt={`Content ${idx + 1}`} className="exclusiveTileImage" draggable={false} />
                    ) : null}
                  </div>
                  <div className="exclusiveTileCenter">
                    <button
                      className={`exclusiveTileLockBtn ${tile.locked ? "isLocked" : "isUnlocked"}`}
                      onClick={() => { if (cardState.lockPage) return; setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, locked: !t.locked } : t)); }}
                      title={cardState.lockPage ? "Page is locked" : tile.locked ? "Unlock tile" : "Lock tile"}
                      disabled={cardState.lockPage}
                    >
                      {tile.locked ? (
                        <svg viewBox="0 0 26 26" width="28" height="28" fill="none">
                          <circle cx="13" cy="13" r="12" stroke="currentColor" strokeWidth="1.5" fill="rgba(0,0,0,0.25)"/>
                          <rect x="7.5" y="12" width="11" height="8" rx="1.5" fill="currentColor"/>
                          <path d="M10 12V9.5a3 3 0 0 1 6 0V12" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 26 26" width="28" height="28" fill="none">
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
                        onChange={(e) => tile.locked && setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, price: e.target.value } : t))}
                        placeholder={tile.locked ? "$1.00" : "Free"}
                        disabled={!tile.locked || cardState.lockPage}
                      />
                    </div>
                  </div>
                  <div className="exclusiveTileTitle">Exclusive Content-{idx + 1}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {wallpaperPreview && (
          <div
            className="wallpaperPreviewOverlay"
            style={{ backgroundImage: `url(${wallpaperPreview})` }}
          />
        )}
        {workspaceUrlPreview && (
          <div className="workspaceUrlDragPreview">
            <span>Media URL Preview</span>
            <p>{workspaceUrlPreview}</p>
          </div>
        )}
        {page !== "p4" && cardState.cards.map((card) => {
          const isSelected = card.id === cardState.selectedCardId;
          const isOverlapping = overlappingCardIds.has(card.id);

          return (
            <button
              key={card.id}
              className={`floatingCard ${isSelected ? "isSelected" : ""} ${card.lockPosition ? "isPositionLocked" : ""} ${isOverlapping ? "isOverlapping" : ""} ${cardState.lockPage ? "isPageLocked" : ""}`}
              style={{
                left: card.x,
                top: card.y,
                width: card.w,
                height: card.h,
                zIndex: card.zIndex ?? 1
              }}
              onPointerDown={(e) => {
                if (cardState.lockPage) return;
                const maxZ = cardState.cards.reduce((max, c) => Math.max(max, c.zIndex ?? 1), 1);
                setCardState((current) => ({
                  ...current,
                  selectedCardId: card.id,
                  lockSize: card.lockSize ?? false,
                  lockPosition: card.lockPosition ?? false,
                  cards: current.cards.map((c) =>
                    c.id === card.id ? { ...c, zIndex: maxZ + 1 } : c
                  )
                }));
                handleCardPointerDown(e, card.id);
              }}
              onDrop={(e) => handleCardDrop(e, card.id)}
              onDragOver={handleCardDragOver}
            >
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
              ) : card.contentDisplay === "url" && card.contentUrl ? (
                <div className="cardUrlPreview">
                  <span>Media URL Preview</span>
                  <p>{card.contentUrl}</p>
                </div>
              ) : card.contentImage || card.contentUrl ? (
                <img
                  className={`cardContentImage${card.contentCode === "c5555" ? " isDefaultImage" : ""}`}
                  src={card.contentImage || card.contentUrl}
                  alt="content"
                  draggable={false}
                />
              ) : (
                <div className="cardInstructions">
                  {pageInstructions.split("\n").map((line, idx) => (
                    <p key={`${card.id}-${idx}`}>{line}</p>
                  ))}
                </div>
              )}

              {card.skinId && (
                <div className={`cardSkin skin-${card.skinId.toLowerCase()}`} />
              )}

              {card.isExclusive && (
                <div className="exclusiveLockOverlay">
                  <span className="exclusiveLockLabel">Click to Buy</span>
                  {card.exclusivePrice && <span className="exclusivePriceTag">{card.exclusivePrice}</span>}
                </div>
              )}

              {/* Top-left: Combined padlock (locks both size AND position) */}
              {!cardState.lockPage && (
                <div className="cardTopLeftControls">
                  <button
                    className={`cardLockBtn ${(card.lockSize && card.lockPosition) ? "isLocked" : "isUnlocked"}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      const newLocked = !(card.lockSize && card.lockPosition);
                      setCardState((current) => ({
                        ...current,
                        cards: current.cards.map((c) =>
                          c.id === card.id ? { ...c, lockSize: newLocked, lockPosition: newLocked } : c
                        )
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
                </div>
              )}

              {/* Bottom-right: size badge + resize handle */}
              <div className="cardBottomRightControls">
                <div className="cardBottomRightBtns">
                  <span className="cardSizeBadge">{Math.round(card.w)} × {Math.round(card.h)}</span>
                  <span
                    className={`resizeHandle ${(card.lockSize && card.lockPosition) ? "isLocked" : ""}`}
                    onPointerDown={(e) => handleResizePointerDown(e, card.id)}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </section>

      <aside className="rightRail">
        {/* ══ RIGHT RAIL HEADER ══ */}
        <div className="railHeader">
          <button
            className="railHeaderBtn"
            onClick={() => {
              const order: SurfaceTab[] = ["content", "exclusive", "media", "skins"];
              const idx = order.indexOf(activeTab);
              setActiveTab(order[(idx + 1) % order.length]);
            }}
          >
            {activeTab === "content" ? "Content" : activeTab === "exclusive" ? "Exclusive" : activeTab === "media" ? "Media" : "Skins"}
          </button>
          <button
            className="railHelpBtn"
            onClick={(e) => { e.stopPropagation(); setTooltipOpen(tooltipOpen === `right-${activeTab}` ? null : `right-${activeTab}`); }}
            title="Help"
          >?</button>
          {tooltipOpen === `right-${activeTab}` && (
            <div className="tooltipCard">
              {(TOOLTIP_HELP[activeTab] ?? []).map((line, i) => <div key={i} className="tooltipLine">{line}</div>)}
            </div>
          )}
        </div>

        {/* ══ RIGHT RAIL SCROLLABLE CONTENT ══ */}
        <div className="railScrollRegion" ref={railScrollRef} onScroll={handleRailScroll}>
          <input
            ref={contentFileInputRef}
            type="file"
            accept="image/*,video/*"
            style={{ display: "none" }}
            onChange={handleContentFileUpload}
          />

          {activeTab === "content" && (
            <section className="contentTray" aria-label="Content picker">
              {uploadedContents.map((item) => (
                <div key={item.url} className="contentThumb contentThumbUploaded" draggable onDragStart={(e) => handleContentDragStart(e, item.url, item.code)} title={item.name}>
                  <img src={item.url} alt={item.name} draggable={false} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                </div>
              ))}
              {contentCatalog.map((item) => (
                <div key={item.code} className="contentThumb" draggable onDragStart={(e) => handleContentDragStart(e, item.url, item.code)} title={item.code}>
                  <img src={thumbnailUrl(item.url)} alt={item.code} draggable={false} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                </div>
              ))}
            </section>
          )}

          {activeTab === "exclusive" && (
            <section className="mediaTray exclusiveRailTray" aria-label="Exclusive content">
              {exclusiveTiles.map((tile, idx) => (
                <div key={idx} className="mediaTile exclusiveRailTile">
                  <div className="exclusiveRailTileHeader">
                    <span className="exclusiveRailTileNum">Exclusive Content-{idx + 1}</span>
                    <button
                      className={`cardLockBtn ${tile.locked ? "isLocked" : "isUnlocked"}`}
                      onClick={() => setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, locked: !t.locked } : t))}
                      title={tile.locked ? "Unlock tile" : "Lock tile"}
                    >
                      {tile.locked ? (
                        <svg viewBox="0 0 14 14" width="13" height="13" fill="none">
                          <rect x="2" y="6" width="10" height="7" rx="1.5" fill="currentColor"/>
                          <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 14 14" width="13" height="13" fill="none">
                          <rect x="2" y="6" width="10" height="7" rx="1.5" fill="currentColor"/>
                          <path d="M4.5 6V4a2.5 2.5 0 0 1 5 0" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  <label className="mediaUrlField">
                    <input
                      value={tile.url}
                      onChange={(e) => setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, url: e.target.value.trim() } : t))}
                      placeholder="https://..."
                    />
                  </label>
                  <input
                    className="exclusivePriceInput"
                    value={tile.price}
                    onChange={(e) => setExclusiveTiles((prev) => prev.map((t, i) => i === idx ? { ...t, price: e.target.value.trim() } : t))}
                    placeholder="Purchase Price"
                  />
                </div>
              ))}
            </section>
          )}

          {activeTab === "media" && (
            <section className="mediaTray" aria-label="Media picker">
              {mediaTiles.slice(0, visibleMediaCount).map((item) => (
                <div key={item.id} className="mediaTile">
                  <div
                    className="mediaPreview"
                    draggable={!cardState.lockPage && !!mediaUrls[item.id]}
                    onDragStart={(e) => { if (!mediaUrls[item.id]) return; handleMediaDragStart(e, mediaUrls[item.id], item.type); }}
                    onDragEnd={() => setWorkspaceUrlPreview(null)}
                  >
                    <img className="mediaPreviewLogo" src="/stickers/xyzlabs.png" alt="XYZ Labs" draggable={false} />
                  </div>
                  <label className="mediaUrlField">
                    <input value={mediaUrls[item.id]} onChange={(e) => setMediaUrls((prev) => ({ ...prev, [item.id]: e.target.value.trim() }))} placeholder={item.placeholder} disabled={cardState.lockPage} />
                  </label>
                  <button className="pillButton" disabled>{item.buttonLabel}</button>
                </div>
              ))}
            </section>
          )}

          {activeTab === "skins" && (
            <section className="skinTray" aria-label="Skin picker">
              {skinCatalog.map((skin) => (
                <div key={skin.id} className="skinThumb" draggable={!cardState.lockPage} onDragStart={(e) => handleSkinDragStart(e as unknown as DragEvent, skin.id)} title={skin.name}>
                  <img src={thumbnailUrl(skin.thumbnail)} alt={skin.name} draggable={false} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  <span className="skinThumbLabel">{skin.name}</span>
                </div>
              ))}
            </section>
          )}
        </div>

        {/* ══ XYZ LABS LOGO ══ */}
        <div className="rightRailLogoSection">
          <img
            src={LEFT_AD_IMAGE}
            alt="XYZ Labs"
            className="rightRailLogoImage"
            draggable={false}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      </aside>

      {/* ══ GHOST FLOW OVERLAY (4 steps) ══ */}
      {ghostStep !== null && ghostStep >= 1 && (
        <div className="ghostOverlay" onClick={endGhostFlow}>
          <div className="ghostDim" />

          {/* Step 1: Select wallpaper — finger taps tile, wallpaper switches to w33 */}
          {ghostStep === 1 && (
            <>
              <div className="ghostLabel ghostLabelLeft">
                <div>Select a wallpaper</div>
                <div className="ghostLabelSub">Tap tiles to change background</div>
              </div>
              <div className="ghostFingerAbs ghostFingerWallpaper">
                <svg className="ghostFingerSvg" viewBox="0 0 24 24" width="32" height="32" fill="none"><path d="M12 1a3 3 0 0 0-3 3v7.27l-1.54-1.55a2.1 2.1 0 0 0-2.97 2.97l5.22 5.22A5 5 0 0 0 13.24 20H16a5 5 0 0 0 5-5v-4a3 3 0 0 0-3-3h-.5a2.5 2.5 0 0 0-2.5 2v-.5A2.5 2.5 0 0 0 12.5 7H12V4a3 3 0 0 0-3-3h3z" fill="rgba(255,255,255,0.92)" stroke="rgba(0,0,0,0.25)" strokeWidth="0.5"/></svg>
              </div>
            </>
          )}

          {/* Step 2: Cycle left rail button — finger taps Wallpaper button, cycles to Pages and back */}
          {ghostStep === 2 && (
            <>
              <div className="ghostLabel ghostLabelLeft">
                <div>Cycle tool selector</div>
                <div className="ghostLabelSub">Switch between Wallpaper and Pages</div>
              </div>
              <div className="ghostFingerAbs ghostFingerRailBtn">
                <svg className="ghostFingerSvg" viewBox="0 0 24 24" width="32" height="32" fill="none"><path d="M12 1a3 3 0 0 0-3 3v7.27l-1.54-1.55a2.1 2.1 0 0 0-2.97 2.97l5.22 5.22A5 5 0 0 0 13.24 20H16a5 5 0 0 0 5-5v-4a3 3 0 0 0-3-3h-.5a2.5 2.5 0 0 0-2.5 2v-.5A2.5 2.5 0 0 0 12.5 7H12V4a3 3 0 0 0-3-3h3z" fill="rgba(255,255,255,0.92)" stroke="rgba(0,0,0,0.25)" strokeWidth="0.5"/></svg>
              </div>
            </>
          )}

          {/* Step 3: Drag content — finger drags c4444 from right rail to center card */}
          {ghostStep === 3 && (
            <>
              <div className="ghostLabel ghostLabelRight">
                <div>Drag content to center</div>
                <div className="ghostLabelSub">Drop images onto your cards</div>
              </div>
              <div className="ghostDragComposite">
                <img className="ghostTileImg" src="https://media.xyz-labs.xyz/content/c4444.png" alt="" draggable={false} />
                <svg className="ghostFingerSvg ghostFingerDrag" viewBox="0 0 24 24" width="32" height="32" fill="none"><path d="M12 1a3 3 0 0 0-3 3v7.27l-1.54-1.55a2.1 2.1 0 0 0-2.97 2.97l5.22 5.22A5 5 0 0 0 13.24 20H16a5 5 0 0 0 5-5v-4a3 3 0 0 0-3-3h-.5a2.5 2.5 0 0 0-2.5 2v-.5A2.5 2.5 0 0 0 12.5 7H12V4a3 3 0 0 0-3-3h3z" fill="rgba(255,255,255,0.92)" stroke="rgba(0,0,0,0.25)" strokeWidth="0.5"/></svg>
              </div>
            </>
          )}

          {/* Step 4: Cycle right rail button — Content → Exclusive → Media → Skins → Content */}
          {ghostStep === 4 && (
            <>
              <div className="ghostLabel ghostLabelRight">
                <div>Select content type</div>
                <div className="ghostLabelSub">Cycle through content options</div>
              </div>
              <div className="ghostFingerAbs ghostFingerRightRailBtn">
                <svg className="ghostFingerSvg" viewBox="0 0 24 24" width="32" height="32" fill="none"><path d="M12 1a3 3 0 0 0-3 3v7.27l-1.54-1.55a2.1 2.1 0 0 0-2.97 2.97l5.22 5.22A5 5 0 0 0 13.24 20H16a5 5 0 0 0 5-5v-4a3 3 0 0 0-3-3h-.5a2.5 2.5 0 0 0-2.5 2v-.5A2.5 2.5 0 0 0 12.5 7H12V4a3 3 0 0 0-3-3h3z" fill="rgba(255,255,255,0.92)" stroke="rgba(0,0,0,0.25)" strokeWidth="0.5"/></svg>
              </div>
            </>
          )}

          {/* Step 5: Save + Deploy — finger points at SAVE then slides to Deploy Gateway */}
          {ghostStep === 5 && (
            <>
              <div className="ghostLabel ghostLabelDeploy">
                <div>SAVE</div>
                <div>Deploy Gateway</div>
              </div>
              <div className="ghostFingerAbs ghostFingerSave">
                <svg className="ghostFingerSvg" viewBox="0 0 24 24" width="32" height="32" fill="none"><path d="M12 1a3 3 0 0 0-3 3v7.27l-1.54-1.55a2.1 2.1 0 0 0-2.97 2.97l5.22 5.22A5 5 0 0 0 13.24 20H16a5 5 0 0 0 5-5v-4a3 3 0 0 0-3-3h-.5a2.5 2.5 0 0 0-2.5 2v-.5A2.5 2.5 0 0 0 12.5 7H12V4a3 3 0 0 0-3-3h3z" fill="rgba(255,255,255,0.92)" stroke="rgba(0,0,0,0.25)" strokeWidth="0.5"/></svg>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
