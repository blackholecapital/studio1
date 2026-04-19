import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, DragEvent } from "react";
import { DEFAULT_WALLPAPER_URL } from "../core/wallpaperCatalog";
import {
  loadProject,
  saveProject,
} from "./state/editorExport";
import { layoutConfig } from "./state/layoutConfig";
import { useCardInteractions } from "./hooks/useCardInteractions";
import { DesktopPremiumStage } from "./desktop/stage/DesktopPremiumStage";

// Domain imports — shared types, constants, selectors, actions
import type { CardModel, CardInteractionState, PageData, ProjectData, ExclusiveTile } from "../domain/project/types";
import type { PageKey } from "../domain/project/types";
import { PAGE_KEYS, PAGE_SHORT_TITLES, PAGE_ROUTES, makeEmptyPage, makeEmptyProject, DEFAULT_INSTRUCTIONS, DEFAULT_EXCLUSIVE_TILES, HOLIDAY_WALLPAPER_CODES } from "../domain/project/defaults";
import { pageDataToCardState, cardStateToPageData, hasAnyOverlap, maxCardCounter } from "../domain/editor/selectors";
import { sanitizeSlug } from "../domain/editor/actions";
import { DESKTOP_INSTRUCTIONS_IMAGE, CATALOG_PAGE_SIZE, WORKSPACE_W, WORKSPACE_H, PRODUCT_CONFIG } from "../domain/editor/constants";
import type { ProductKey } from "../domain/editor/constants";

// Service imports — side-effecting operations
import { saveDesktopSlug, markGhostFlowSeen, resetGhostFlow as resetGhostFlowStorage } from "../services/storage/projectStore";
import { getOrCreateDesktopSlug } from "../services/runtime/urlState";
import { useDesktopDeployFlow } from "./desktop/hooks/useDesktopDeployFlow";
import { useDesktopUploadFlow } from "./desktop/hooks/useDesktopUploadFlow";
import { getAllPagesLocked, getPageNavigation, getSelectedCard } from "./desktop/lib/derivedState";
import { deleteSelectedCardState, patchSelectedCard, setSelectedCardLockPosition, setSelectedCardLockSize, togglePageLockState } from "./desktop/state/desktopReducers";
import { DesktopAppShell } from "./desktop/DesktopAppShell";
import { DesktopTopBar } from "./desktop/sections/DesktopTopBar";
import { WallpaperRail } from "./desktop/panels/WallpaperRail";
import { DesktopWorkspace } from "./desktop/sections/DesktopWorkspace";
import { ContentRail } from "./desktop/panels/ContentRail";
import { AuthModal } from "./modals/AuthModal";
import { PackageInfoModal, type PackageKey } from "./modals/PackageInfoModal";
import { useAuthSession } from "./hooks/useAuthSession";

type SurfaceTab = "cards" | "content" | "wallpaper" | "media" | "skins" | "exclusive";
type LeftRailTab = "wallpaper" | "pages";

const pages: Array<{ key: PageKey; label: string }> = PAGE_KEYS.map((key) => ({
  key,
  label: PAGE_SHORT_TITLES[key],
}));

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
  const w = wsW ?? WORKSPACE_W;
  const h = wsH ?? WORKSPACE_H;
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
    contentImage: "https://media.xyz-labs.xyz/content/c77.png",
    contentCode: "c77",
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
  const [exclusiveTiles, setExclusiveTiles] = useState<ExclusiveTile[]>(() => {
    const existing = loadProject("user");
    return existing?.pages?.p4?.exclusiveTiles ?? [...DEFAULT_EXCLUSIVE_TILES];
  });
  const [uploadedContents, setUploadedContents] = useState<Array<{ name: string; url: string; code: string }>>([]);
  const contentFileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadCounterRef = useRef(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isGlobalWallpaper, setIsGlobalWallpaper] = useState(false);
  const [tileShapeMode, setTileShapeMode] = useState<"sharp" | "rounded" | "circle">("rounded");
  const [stageScale, setStageScale] = useState(1);

  // Auth session (shared across Studio + Gateway via /api/auth/session).
  const auth = useAuthSession();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup" | "forgot" | "reset">("login");
  const openAuthModal = useCallback((mode: "login" | "signup" | "forgot" | "reset") => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);
  const [packageInfo, setPackageInfo] = useState<PackageKey | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductKey>("biz");
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
  const [cubeLayoutCycle, setCubeLayoutCycle] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });

  // ── Ghost Flow (first-time user onboarding — runs on every page load) ──
  const [ghostStep, setGhostStep] = useState<number | null>(0);
  const ghostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const endGhostFlow = useCallback(() => {
    setGhostStep(null);
    if (ghostTimerRef.current) { clearTimeout(ghostTimerRef.current); ghostTimerRef.current = null; }
    // Leave pages tile open at end of preview
    setLeftRailTab("pages");
    setLeftMode("gateway");
    setActiveTab("content");
    markGhostFlowSeen();
  }, []);

  // Start ghost flow on mount — 2 second delay so the landing
  // wireframe (w9 + c77 centered card) is clearly visible before the
  // demo kicks in.
  useEffect(() => {
    if (ghostStep !== 0) return;
    const t = setTimeout(() => setGhostStep(1), 2000);
    return () => clearTimeout(t);
  }, [ghostStep]);

  // Auto-advance steps (5 steps total)
  useEffect(() => {
    if (ghostStep === null || ghostStep === 0) return;

    // Step 1: landing — the wireframe (w9 wallpaper + c77 center tile)
    // has already been visible for 2s. Switch wallpaper to w1.13 at 4s
    // and advance at 4.5s. The card is already c77 because
    // makeDefaultCard seeds new pages with c77, so no override needed.
    if (ghostStep === 1) {
      setWallpaper("https://media.xyz-labs.xyz/wallpaper/w9.png");
      const wallpaperTimer = setTimeout(() => {
        setWallpaper("https://media.xyz-labs.xyz/wallpaper/w1.13.png");
      }, 4000);
      ghostTimerRef.current = setTimeout(() => setGhostStep(2), 4500);
      return () => { clearTimeout(wallpaperTimer); if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current); };
    }

    // Step 2 (2.5s): cycle left rail button — Wallpaper → Pages (stays on pages)
    if (ghostStep === 2) {
      const toPages = setTimeout(() => {
        setLeftRailTab("pages");
        setLeftMode("gateway");
      }, 1000);
      ghostTimerRef.current = setTimeout(() => setGhostStep(3), 2500);
      return () => { clearTimeout(toPages); if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current); };
    }

    // Step 3 (3s): drag content — the finger visibly drags c813 from the
    // right rail onto the c77 center tile, then drops + locks it. After
    // the drop the card has contentCode "c813" AND lockSize +
    // lockPosition set so it cannot be moved or resized.
    if (ghostStep === 3) {
      ghostTimerRef.current = setTimeout(() => {
        setCardState((curr) => ({
          ...curr,
          lockSize: true,
          lockPosition: true,
          cards: curr.cards.map((c) =>
            c.contentCode === "c77"
              ? {
                  ...c,
                  contentImage: "https://media.xyz-labs.xyz/content/c813.png",
                  contentCode: "c813",
                  lockSize: true,
                  lockPosition: true,
                }
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
  } = useCardInteractions({ cardState, setCardState, layoutConfig, scale: stageScale });

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
        c.contentCode === "c77" || c.contentCode === "c813"
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
        [page]: cardStateToPageData(cardState, wallpaper, pageInstructions, page === "p4" ? exclusiveTiles : undefined)
      }
    }));
    setIsSaved(false);
  }, [cardState, wallpaper, page, slug, pageInstructions, exclusiveTiles]);

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
          [page]: cardStateToPageData(cardState, wallpaper, pageInstructions, page === "p4" ? exclusiveTiles : undefined)
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
            c.contentCode === "c77" || c.contentCode === "c813"
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

      // Load exclusive tiles when switching to p4
      if (nextPage === "p4") {
        setExclusiveTiles(target.exclusiveTiles ?? [...DEFAULT_EXCLUSIVE_TILES]);
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
          [page]: cardStateToPageData(cardState, wallpaper, pageInstructions, page === "p4" ? exclusiveTiles : undefined)
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
          c.contentCode === "c77" || c.contentCode === "c813"
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

    // Load exclusive tiles from the new project's p4
    const p4Data = loaded.pages?.p4;
    setExclusiveTiles(p4Data?.exclusiveTiles ?? [...DEFAULT_EXCLUSIVE_TILES]);

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
            ? cardStateToPageData(cardState, wallpaper, pageInstructions, k === "p4" ? exclusiveTiles : undefined)
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
            ? cardStateToPageData(cardState, wallpaper, pageInstructions, k === "p4" ? exclusiveTiles : undefined)
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
        const pageData: Record<string, unknown> = {
          wallpaper: DEFAULT_WALLPAPER,
          cards: def.cardState.cards,
          selectedCardId: def.cardState.selectedCardId ?? "",
          lockSize: false,
          lockPosition: false,
          lockPage: false,
          instructions: DEFAULT_INSTRUCTIONS,
        };
        if (k === "p4") pageData.exclusiveTiles = [...DEFAULT_EXCLUSIVE_TILES];
        return [k, pageData];
      })
    );
    setProject((prev) => {
      const updated = { ...prev, pages: freshPages };
      saveProject(updated);
      return updated;
    });
    // Reset current page — use actual workspace dimensions so the card lands centered
    const wsW = workspaceRef.current?.offsetWidth  ?? WORKSPACE_W;
    const wsH = workspaceRef.current?.offsetHeight ?? WORKSPACE_H;
    const centeredCard = makeDefaultCard(wsW, wsH);
    centeredCard.contentImage = "https://media.xyz-labs.xyz/content/c77.png";
    centeredCard.contentCode = "c77";
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

  function applyCubeLayout(count: 1 | 2 | 3 | 4 | 5 | 6) {
    if (cardState.lockPage) return;
    const baseW = 560;
    const baseH = 320;
    const margin = 16;
    const wsW = workspaceRef.current?.offsetWidth  ?? WORKSPACE_W;
    const wsH = workspaceRef.current?.offsetHeight ?? WORKSPACE_H;
    const leftX   = Math.round(wsW * 0.06);
    const rightX  = Math.round(wsW * 0.94 - baseW);
    const centerX = Math.round((wsW - baseW) / 2);
    const topY    = margin;
    const bottomY = Math.round(wsH - baseH - margin);
    const centerY = Math.round((wsH - baseH) / 2);
    const midLeftX  = Math.round(wsW * 0.32 - baseW / 2);
    const midRightX = Math.round(wsW * 0.68 - baseW / 2);
    const thirdY    = Math.round(wsH * 0.33 - baseH / 2);
    const twoThirdY = Math.round(wsH * 0.67 - baseH / 2);

    // Each button cycles through arrangement presets with randomized sizing.
    const ARRANGEMENTS: Record<1|2|3|4|5|6, Array<Array<{x:number;y:number}>>> = {
      1: [
        [{ x: centerX, y: centerY }],
        [{ x: leftX,   y: topY }],
        [{ x: rightX,  y: topY }],
        [{ x: rightX,  y: bottomY }],
        [{ x: leftX,   y: bottomY }],
      ],
      2: [
        [{ x: leftX, y: topY },    { x: rightX, y: topY }],
        [{ x: leftX, y: centerY }, { x: rightX, y: centerY }],
        [{ x: leftX, y: bottomY }, { x: rightX, y: bottomY }],
        [{ x: leftX, y: topY },    { x: leftX,  y: bottomY }],
        [{ x: rightX, y: topY },   { x: rightX, y: bottomY }],
      ],
      3: [
        [{ x: leftX,  y: topY },    { x: rightX, y: topY },    { x: leftX,   y: bottomY }],
        [{ x: leftX,  y: topY },    { x: rightX, y: topY },    { x: rightX,  y: bottomY }],
        [{ x: leftX,  y: topY },    { x: leftX,  y: bottomY }, { x: rightX,  y: bottomY }],
        [{ x: rightX, y: topY },    { x: leftX,  y: bottomY }, { x: rightX,  y: bottomY }],
        [{ x: centerX, y: topY },   { x: leftX,  y: bottomY }, { x: rightX,  y: bottomY }],
      ],
      4: [
        [{ x: leftX,   y: topY },    { x: rightX,  y: topY },    { x: leftX,   y: bottomY }, { x: rightX,  y: bottomY }],
        [{ x: leftX,   y: topY },    { x: rightX,  y: topY },    { x: leftX,   y: centerY }, { x: rightX,  y: centerY }],
        [{ x: leftX,   y: centerY }, { x: rightX,  y: centerY }, { x: leftX,   y: bottomY }, { x: rightX,  y: bottomY }],
        [{ x: centerX, y: topY },    { x: leftX,   y: centerY }, { x: rightX,  y: centerY }, { x: centerX, y: bottomY }],
        [{ x: leftX,   y: topY },    { x: leftX,   y: bottomY }, { x: rightX,  y: topY },    { x: rightX,  y: bottomY }],
      ],
      5: [
        [{ x: leftX, y: topY }, { x: rightX, y: topY }, { x: leftX, y: bottomY }, { x: rightX, y: bottomY }, { x: centerX, y: centerY }],
        [{ x: leftX, y: topY }, { x: centerX, y: topY }, { x: rightX, y: topY }, { x: midLeftX, y: bottomY }, { x: midRightX, y: bottomY }],
        [{ x: midLeftX, y: topY }, { x: midRightX, y: topY }, { x: leftX, y: bottomY }, { x: centerX, y: bottomY }, { x: rightX, y: bottomY }],
        [{ x: centerX, y: topY }, { x: leftX, y: centerY }, { x: rightX, y: centerY }, { x: midLeftX, y: bottomY }, { x: midRightX, y: bottomY }],
        [{ x: leftX, y: thirdY }, { x: rightX, y: thirdY }, { x: leftX, y: twoThirdY }, { x: rightX, y: twoThirdY }, { x: centerX, y: centerY }],
      ],
      6: [
        [{ x: leftX, y: topY }, { x: centerX, y: topY }, { x: rightX, y: topY }, { x: leftX, y: bottomY }, { x: centerX, y: bottomY }, { x: rightX, y: bottomY }],
        [{ x: leftX, y: topY }, { x: rightX, y: topY }, { x: leftX, y: centerY }, { x: rightX, y: centerY }, { x: leftX, y: bottomY }, { x: rightX, y: bottomY }],
        [{ x: midLeftX, y: topY }, { x: midRightX, y: topY }, { x: leftX, y: centerY }, { x: rightX, y: centerY }, { x: midLeftX, y: bottomY }, { x: midRightX, y: bottomY }],
        [{ x: leftX, y: topY }, { x: centerX, y: topY }, { x: rightX, y: centerY }, { x: leftX, y: centerY }, { x: centerX, y: bottomY }, { x: rightX, y: bottomY }],
        [{ x: centerX, y: topY }, { x: leftX, y: thirdY }, { x: rightX, y: thirdY }, { x: leftX, y: twoThirdY }, { x: rightX, y: twoThirdY }, { x: centerX, y: bottomY }],
      ],
    };

    const cycleIdx = cubeLayoutCycle[count] ?? 0;
    const positions = ARRANGEMENTS[count][cycleIdx];
    setCubeLayoutCycle((prev) => ({ ...prev, [count]: (cycleIdx + 1) % ARRANGEMENTS[count].length }));

    // Randomize sizes per card — vary from 0.7x to 1.3x base size
    const sizeScales = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3];
    const cards: CardModel[] = positions.map((pos, idx) => {
      cardCounter += 1;
      const scale = sizeScales[Math.floor(Math.random() * sizeScales.length)];
      return {
        id: `card-${cardCounter}`,
        label: `Card ${cardCounter}`,
        x: pos.x + Math.round((Math.random() - 0.5) * 30),
        y: pos.y + Math.round((Math.random() - 0.5) * 20),
        w: Math.round(baseW * scale),
        h: Math.round(baseH * scale),
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
    exclusiveTiles,
    setDeploying,
    setDeployStatus,
    setProject,
    setIsSaved,
    setDeployModal,
    deployBase: PRODUCT_CONFIG[selectedProduct].base,
  });

  const shellLayoutStyle = {
    "--layout-sidebar-width": `${layoutConfig.sidebar.width}px`,
    "--layout-workspace-height": `${layoutConfig.workspace.height}px`,
    "--layout-floating-pill-gap": `${layoutConfig.polish.floatingPillGap}px`,
    "--layout-header-strip-gap": `${layoutConfig.polish.headerStripGap}px`,
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
    <DesktopPremiumStage onScaleChange={setStageScale}>
    <DesktopAppShell
      shellLayoutStyle={shellLayoutStyle}
      tooltipOpen={tooltipOpen}
      setTooltipOpen={setTooltipOpen}
      deployStatus={deployStatus}
      topBar={(
        <DesktopTopBar
          applyCubeLayout={applyCubeLayout}
          canGoPrevPage={canGoPrevPage}
          canGoNextPage={canGoNextPage}
          goPrevPage={goPrevPage}
          goNextPage={goNextPage}
          pageTitle={PAGE_SHORT_TITLES[page]}
          addCard={addCard}
          deleteSelectedCard={deleteSelectedCard}
          isPageLocked={cardState.lockPage}
          hasSelectedCard={!!selectedCard}
          onDeploy={handleDeployGateway}
          deploying={deploying}
          tooltipOpen={tooltipOpen}
          setTooltipOpen={setTooltipOpen}
          tileShapeMode={tileShapeMode}
          setTileShapeMode={setTileShapeMode}
        />
      )}
      leftRail={(
        <WallpaperRail
          leftRailTab={leftRailTab}
          setLeftRailTab={setLeftRailTab}
          leftMode={leftMode}
          setLeftMode={setLeftMode}
          tooltipOpen={tooltipOpen}
          setTooltipOpen={setTooltipOpen}
          tooltipHelp={TOOLTIP_HELP}
          wallpaper={wallpaper}
          isPageLocked={cardState.lockPage}
          setWallpaper={setWallpaper}
          setWallpaperPreview={setWallpaperPreview}
          pages={pages}
          page={page}
          cardState={cardState}
          project={project}
          switchPage={switchPage}
          togglePageLock={togglePageLock}
          allPagesLocked={allPagesLocked}
          lockAllPages={lockAllPages}
          unlockAllPages={unlockAllPages}
          resetWorkspace={resetWorkspace}
          isSaved={isSaved}
          onSave={() => {
            handleSave();
            // Associate the saved page with the logged-in user, if any.
            if (auth.isAuthenticated && slug) {
              void auth.linkPage(slug);
            }
          }}
          currentUser={auth.user}
          onOpenJoin={() => openAuthModal("signup")}
          onOpenLogin={() => openAuthModal("login")}
          onOpenForgot={() => openAuthModal("forgot")}
          onOpenPackageInfo={(key) => setPackageInfo(key)}
          selectedProduct={selectedProduct}
          setSelectedProduct={setSelectedProduct}
        />
      )}
      workspace={(
        <DesktopWorkspace
          workspaceRef={workspaceRef}
          page={page}
          exclusiveTiles={exclusiveTiles}
          setExclusiveTiles={setExclusiveTiles}
          cardState={cardState}
          setCardState={setCardState}
          wallpaper={wallpaper}
          wallpaperPreview={wallpaperPreview}
          workspaceUrlPreview={workspaceUrlPreview}
          overlappingCardIds={overlappingCardIds}
          pageInstructions={pageInstructions}
          handleCardPointerDown={handleCardPointerDown}
          handleCardDrop={handleCardDrop}
          handleCardDragOver={handleCardDragOver}
          handleResizePointerDown={handleResizePointerDown}
          tileShapeMode={tileShapeMode}
        />
      )}
      rightRail={(
        <ContentRail
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tooltipOpen={tooltipOpen}
          setTooltipOpen={setTooltipOpen}
          tooltipHelp={TOOLTIP_HELP}
          railScrollRef={railScrollRef}
          handleRailScroll={handleRailScroll}
          contentFileInputRef={contentFileInputRef}
          handleContentFileUpload={handleContentFileUpload}
          uploadedContents={uploadedContents}
          handleContentDragStart={handleContentDragStart}
          exclusiveTiles={exclusiveTiles}
          setExclusiveTiles={setExclusiveTiles}
          mediaTiles={mediaTiles}
          visibleMediaCount={visibleMediaCount}
          cardStateLocked={cardState.lockPage}
          mediaUrls={mediaUrls}
          setMediaUrls={setMediaUrls}
          handleMediaDragStart={handleMediaDragStart}
          setWorkspaceUrlPreview={setWorkspaceUrlPreview}
          handleSkinDragStart={handleSkinDragStart}
        />
      )}
    >

      {/* ══ AUTH MODAL ══
          Mounted at the app root so it is NOT clipped by the left rail's
          overflow: hidden. This is the "Join modal bug" fix. */}
      <AuthModal
        open={authModalOpen}
        initialMode={authModalMode}
        currentUser={auth.user}
        onClose={() => setAuthModalOpen(false)}
        onSignup={(input) => auth.signup(input)}
        onLogin={(input) => auth.login(input)}
        onRequestRecovery={(identifier) => auth.requestRecovery(identifier)}
        onResetPassword={(input) => auth.resetPassword(input)}
        onLogout={async () => { await auth.logout(); }}
      />

      {/* ══ PACKAGE INFO MODAL (Biz Pages / AD Pages / Web-3 Pages) ══ */}
      <PackageInfoModal open={packageInfo} onClose={() => setPackageInfo(null)} />

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
        return createPortal(
          <div className="deployModalOverlay" onClick={() => setDeployModal(null)}>
            <div className="deployModalCard" onClick={(e) => e.stopPropagation()}>
              <button className="deployModalClose" onClick={() => setDeployModal(null)}>×</button>
              <div className="deployModalTitle">Welcome to {PRODUCT_CONFIG[selectedProduct].label.toUpperCase()}</div>
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
                  <span className="deployModalUrlLabel">{PRODUCT_CONFIG[selectedProduct].label} URL</span>
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
          </div>,
          document.body
        );
      })()}

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
                <img className="ghostTileImg" src="https://media.xyz-labs.xyz/content/c813.png" alt="" draggable={false} />
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

          {/* Step 5: Save + Publish — finger points at SAVE then slides to Publish Pages */}
          {ghostStep === 5 && (
            <>
              <div className="ghostLabel ghostLabelDeploy">
                <div>SAVE</div>
                <div>Publish Pages</div>
              </div>
              <div className="ghostFingerAbs ghostFingerSave">
                <svg className="ghostFingerSvg" viewBox="0 0 24 24" width="32" height="32" fill="none"><path d="M12 1a3 3 0 0 0-3 3v7.27l-1.54-1.55a2.1 2.1 0 0 0-2.97 2.97l5.22 5.22A5 5 0 0 0 13.24 20H16a5 5 0 0 0 5-5v-4a3 3 0 0 0-3-3h-.5a2.5 2.5 0 0 0-2.5 2v-.5A2.5 2.5 0 0 0 12.5 7H12V4a3 3 0 0 0-3-3h3z" fill="rgba(255,255,255,0.92)" stroke="rgba(0,0,0,0.25)" strokeWidth="0.5"/></svg>
              </div>
            </>
          )}
        </div>
      )}
    </DesktopAppShell>
    </DesktopPremiumStage>
  );
}
