import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import "./mobile.css";
import { wallpaperCatalog } from "../core/wallpaperCatalog";
import { mobileWallpaperCatalog, DEFAULT_MOBILE_WALLPAPER_URL } from "../core/mobileWallpaperCatalog";
import { thumbnailUrl, MEDIA_BASE } from "../core/assetResolver";
import { contentCatalog, type ContentItem } from "../core/contentCatalog";
import { skinCatalog } from "../core/skinCatalog";
import {
  makeEmptyPage,
  loadProject,
  saveProject,
  deployGateway,
  makeEmptyProject,
  type ProjectData,
  type PageData,
} from "./state/editorExport";
import {
  useCardInteractions,
  type CardModel,
  type CardInteractionState,
} from "./hooks/useCardInteractions";

// ─── Types ───────────────────────────────────────────────────────────────────
type SurfaceTab = "cards" | "content" | "wallpaper" | "media" | "skins";
type PageKey = "p1" | "p2" | "p3" | "p4";

// ─── Constants ───────────────────────────────────────────────────────────────
const MOB_NAV_H = 63;
const INSTRUCTIONS_IMAGE = "https://media.xyz-labs.xyz/content/c4444.png";
const DEFAULT_WALLPAPER = DEFAULT_MOBILE_WALLPAPER_URL;

const PAGE_KEYS: PageKey[] = ["p1", "p2", "p3", "p4"];

const PAGE_TITLES: Record<PageKey, string> = {
  p1: "GATEWAY",
  p2: "MEMBERS",
  p3: "ACCESS",
  p4: "EXCLUSIVE",
};

const mediaTiles = [
  { id: "media-video-1", type: "video" as const, placeholder: "https://...mp4", buttonLabel: "Video File" },
  { id: "media-image-1", type: "image" as const, placeholder: "https://...",    buttonLabel: "Media File" },
];

const UPLOAD_ENDPOINT = "/api/upload";
const DEMO_CONTENT_BASE = "https://demo-content.xyz-labs.xyz";

/** Convert any image file to PNG via canvas, scaling down to max 1200px on longest side. */
function convertToPng(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      const MAX = 1200;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > MAX || h > MAX) {
        const scale = MAX / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        resolve(blob ?? file);
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      // Fall back to original file if conversion fails
      resolve(file);
    };
    img.src = blobUrl;
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getMobDims() {
  return {
    width: window.innerWidth,
    height: Math.max(window.innerHeight - MOB_NAV_H, 300),
  };
}

let mobCardCounter = 0;

function makeMobDefaultCard(dims: { width: number; height: number }): CardModel {
  mobCardCounter += 1;
  const w = Math.round(Math.min(dims.width * 0.86, 360));
  const h = Math.round(Math.min(dims.height * 0.52, 260));
  return {
    id: `card-${mobCardCounter}`,
    label: `Card ${mobCardCounter}`,
    x: Math.round((dims.width - w) / 2),
    y: Math.round((dims.height - h) / 2),
    w,
    h,
    zIndex: 1,
    lockSize: false,
    lockPosition: false,
    contentImage: INSTRUCTIONS_IMAGE,
    contentCode: "c4444",
    contentDisplay: "image",
  };
}

function pageDataToCardState(pd: PageData): CardInteractionState {
  return {
    cards: pd.cards,
    selectedCardId: pd.selectedCardId,
    lockSize: pd.lockSize,
    lockPosition: pd.lockPosition,
    lockPage: pd.lockPage ?? false,
  };
}

function cardStateToPageData(cs: CardInteractionState, wallpaper: string): PageData {
  return {
    wallpaper,
    cards: cs.cards,
    selectedCardId: cs.selectedCardId,
    lockSize: cs.lockSize,
    lockPosition: cs.lockPosition,
    lockPage: cs.lockPage,
    instructions: "",
  };
}

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
  const initialSlug = useMemo(() => {
    const stored = localStorage.getItem("drip-studio:mob-slug");
    if (stored) return stored;
    const id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem("drip-studio:mob-slug", id);
    return id;
  }, []);
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

  // ── User uploads (x-designation) ──
  const [userUploads, setUserUploads] = useState<ContentItem[]>(() => {
    try {
      const raw = localStorage.getItem("drip-studio:user-uploads");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [uploadCounter, setUploadCounter] = useState(() => {
    try {
      return parseInt(localStorage.getItem("drip-studio:upload-counter") ?? "0", 10) || 0;
    } catch { return 0; }
  });
  const [uploading, setUploading] = useState(false);

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
          wallpaper: mobileWallpaperUrls.has(page.wallpaper) ? page.wallpaper : DEFAULT_MOBILE_WALLPAPER_URL,
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
    () => cardState.cards.find((c) => c.id === cardState.selectedCardId) ?? cardState.cards[0] ?? null,
    [cardState.cards, cardState.selectedCardId]
  );
  const selectedCardLockSize = selectedCard?.lockSize ?? false;
  const selectedCardLockPosition = selectedCard?.lockPosition ?? false;

  const pageIndex = PAGE_KEYS.indexOf(page);
  const canGoPrevPage = pageIndex > 0;
  const canGoNextPage = pageIndex < PAGE_KEYS.length - 1;

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
        const maxId = target.cards.reduce((max, c) => {
          const num = parseInt(c.id.replace("card-", ""), 10);
          return isNaN(num) ? max : Math.max(max, num);
        }, 0);
        if (maxId >= mobCardCounter) mobCardCounter = maxId;
      }

      return updated;
    });

    setPageRaw(nextPage);
  }

  // ── Overlap check ──
  function hasAnyOverlap(cards: CardModel[]) {
    for (let i = 0; i < cards.length; i++) {
      const a = cards[i];
      for (let j = i + 1; j < cards.length; j++) {
        const b = cards[j];
        if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) return true;
      }
    }
    return false;
  }

  // ── Save ──
  function handleSave() {
    if (hasAnyOverlap(cardState.cards)) {
      setDeployStatus("⚠ Cannot save — overlapping tiles. Move tiles apart first.");
      setTimeout(() => setDeployStatus(null), 3500);
      return;
    }
    const full: ProjectData = {
      ...project,
      slug,
      pages: { ...project.pages, [page]: cardStateToPageData(cardState, wallpaper) },
    };
    saveProject(full);
    setProject(full);
    setJustSaved(true);
    setDeployStatus("Saved");
    setTimeout(() => { setDeployStatus(null); setJustSaved(false); }, 2000);
  }

  // ── Deploy ──
  const PAGE_ROUTES: Record<string, string> = { p1: "gate", p2: "members", p3: "access", p4: "tier-2" };

  async function handleDeploy() {
    if (hasAnyOverlap(cardState.cards)) {
      setDeployStatus("⚠ Cannot deploy — overlapping tiles. Move tiles apart first.");
      setTimeout(() => setDeployStatus(null), 3000);
      return;
    }
    const full: ProjectData = {
      ...project,
      slug,
      pages: { ...project.pages, [page]: cardStateToPageData(cardState, wallpaper) },
    };
    saveProject(full);
    setProject(full);

    // ── Deploy coordinate scaling ──────────────────────────────────────────
    // Scale mobile pixel coords → native 430×860 mobile canvas.
    // The gateway uses these coords with `mobile: true` to render absolutely
    // positioned cards scaled to the device screen width.
    const MOBILE_DEPLOY_W = 430;
    const MOBILE_DEPLOY_H = 860;
    const actualWsW = workspaceRef.current?.offsetWidth ?? wsDims.width;
    const actualWsH = wsDims.height;
    const dsx = MOBILE_DEPLOY_W / actualWsW;
    const dsy = MOBILE_DEPLOY_H / actualWsH;
    function scaleForDeploy(card: { x: number; y: number; w: number; h: number }) {
      return {
        x: Math.round(card.x * dsx),
        y: Math.round(card.y * dsy),
        w: Math.round(card.w * dsx),
        h: Math.round(card.h * dsy),
      };
    }

    // Build deploy payload with backend route names as page keys
    const HOLIDAY_CODES: Record<PageKey, string> = { p1: "w1", p2: "w2", p3: "w4", p4: "w5" };

    function buildPagePayload(pageKey: string, pd: PageData, overrideWallpaperCode?: string) {
      const wpItem = mobileWallpaperCatalog.find((w) => w.url === pd.wallpaper)
        ?? wallpaperCatalog.find((w) => w.url === pd.wallpaper);
      const wallpaper = overrideWallpaperCode ?? wpItem?.code ?? "";

      // p4 (Exclusive): emit wallpaper + exclusive tiles, no block canvas
      if (pageKey === "p4") {
        const activeTiles = exclusiveTiles
          .map((tile, i) => {
            if (!tile.url && !tile.price && !tile.locked) return null;
            return {
              tileNumber: i + 1,
              contentCode: `EC-${String(i + 1).padStart(3, "0")}`,
              tileName: `Exclusive Content-${i + 1}`,
              lockStatus: tile.locked ? "locked" : "unlocked",
              purchasePrice: tile.price || null,
              contentUrl: tile.url || null,
            };
          })
          .filter(Boolean);
        const payload: Record<string, unknown> = {
          mobile: true,
          viewport: { width: MOBILE_DEPLOY_W, height: MOBILE_DEPLOY_H },
          wallpaper,
        };
        if (activeTiles.length > 0) payload.exclusiveTiles = activeTiles;
        return payload;
      }

      // Build blocks array in the gateway-native format
      const blocks = pd.cards.map((card) => {
        const { x, y, w, h } = scaleForDeploy(card);
        const code = card.contentCode ?? null;
        const isGif = code && /^g\d+$/i.test(code);
        const block: Record<string, unknown> = {
          id: card.id,
          x, y, w, h,
          kind: card.contentDisplay === "video" ? "video" : "image",
          title: card.label ?? "",
          lines: [],
        };
        const isUserUpload = code && /^x\d+$/i.test(code);
        if (isGif) {
          block.gif = code;
        } else if (isUserUpload) {
          // User-uploaded content: include full URL for gateway resolution
          block.image = code;
          block.contentUrl = card.contentUrl || card.contentImage || `https://demo-content.xyz-labs.xyz/tenant-content/${slug}/${code}.png`;
        } else if (code) {
          block.image = code;
        }
        if (card.contentDisplay === "video" && card.contentUrl) {
          block.contentUrl = card.contentUrl;
        } else if (!code && (card.contentImage || card.contentUrl)) {
          block.contentUrl = card.contentImage || card.contentUrl;
        }
        if (card.skinId) block.skin = card.skinId.toLowerCase();
        if (card.isExclusive) {
          block.isExclusive = true;
          block.exclusivePrice = card.exclusivePrice ?? null;
        }
        return block;
      });

      return {
        mobile: true,
        viewport: { width: MOBILE_DEPLOY_W, height: MOBILE_DEPLOY_H },
        wallpaper,
        blocks,
      };
    }

    const mainPayload = {
      version: 1,
      slug,
      mobile: true,
      pages: Object.fromEntries(
        Object.entries(full.pages).map(([pk, pd]) => [PAGE_ROUTES[pk] ?? pk, buildPagePayload(pk, pd)])
      ),
    };

    const holidayPayload = {
      version: 1,
      slug,
      mobile: true,
      pages: Object.fromEntries(
        Object.entries(full.pages).map(([pk, pd]) => [PAGE_ROUTES[pk] ?? pk, buildPagePayload(pk, pd, HOLIDAY_CODES[pk as PageKey])])
      ),
    };

    setDeploying(true);
    setDeployStatus("Deploying...");
    const result = await deployGateway(full, { main: mainPayload, holiday: holidayPayload });
    setDeploying(false);
    setDeployStatus(null);
    const primaryUrl = result.primaryUrl ?? `https://gateway.xyz-labs.xyz/${slug}/gate`;
    const holidayUrl = result.holidayUrl ?? `https://gateway.xyz-labs.xyz/${slug}/holiday`;
    setDeployModal({ primaryUrl, holidayUrl, ok: result.ok, error: result.error });
  }

  // ── Card operations ──
  function addMobileCard() {
    if (cardState.lockPage) return;
    mobCardCounter += 1;
    const newId = `card-${mobCardCounter}`;
    const maxZ = cardState.cards.reduce((max, c) => Math.max(max, c.zIndex ?? 1), 1);
    const dims = getMobDims();
    const cardW = Math.round(Math.min(dims.width * 0.76, 300));
    const cardH = Math.round(Math.min(dims.height * 0.42, 220));
    const offset = ((mobCardCounter - 1) % 5) * 18;
    const newCard: CardModel = {
      id: newId,
      label: `Card ${mobCardCounter}`,
      x: 16 + offset,
      y: 16 + offset,
      w: cardW,
      h: cardH,
      zIndex: maxZ + 1,
      lockSize: false,
      lockPosition: false,
    };
    setCardState((cur) => ({ ...cur, cards: [...cur.cards, newCard], selectedCardId: newId }));
  }

  function deleteSelectedCard() {
    if (!selectedCard || cardState.lockPage) return;
    setCardState((cur) => {
      const remaining = cur.cards.filter((c) => c.id !== cur.selectedCardId);
      return {
        ...cur,
        cards: remaining,
        selectedCardId: remaining.length > 0 ? remaining[remaining.length - 1].id : "",
      };
    });
  }

  function applyCubeLayout(count: 1 | 2 | 3 | 4) {
    if (cardState.lockPage) return;
    const { width, height } = getMobDims();
    const margin = 14;
    const gap = 10;
    const colW = Math.floor((width - margin * 2 - gap) / 2);
    const rowH = Math.floor((height - margin * 2 - gap) / 2);

    type Pos = { x: number; y: number; w: number; h: number };
    let positions: Pos[];

    if (count === 1) {
      // Center of workspace
      const w = Math.min(width - 28, 340);
      const h = Math.min(height - 28, 280);
      positions = [{ x: Math.round((width - w) / 2), y: Math.round((height - h) / 2), w, h }];
    } else if (count === 2) {
      // Top-left and top-right corners
      positions = [
        { x: margin, y: margin, w: colW, h: rowH },
        { x: margin + colW + gap, y: margin, w: colW, h: rowH },
      ];
    } else if (count === 3) {
      // TL, TR, BL
      positions = [
        { x: margin, y: margin, w: colW, h: rowH },
        { x: margin + colW + gap, y: margin, w: colW, h: rowH },
        { x: margin, y: margin + rowH + gap, w: colW, h: rowH },
      ];
    } else {
      // All four corners (2×2 grid)
      positions = [
        { x: margin, y: margin, w: colW, h: rowH },
        { x: margin + colW + gap, y: margin, w: colW, h: rowH },
        { x: margin, y: margin + rowH + gap, w: colW, h: rowH },
        { x: margin + colW + gap, y: margin + rowH + gap, w: colW, h: rowH },
      ];
    }

    const cards: CardModel[] = positions.map((pos, idx) => {
      mobCardCounter += 1;
      return {
        id: `card-${mobCardCounter}`,
        label: `Card ${mobCardCounter}`,
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        w: Math.round(pos.w),
        h: Math.round(pos.h),
        zIndex: idx + 1,
        lockSize: false,
        lockPosition: false,
      };
    });

    setCardState((cur) => ({
      ...cur,
      cards,
      selectedCardId: cards[0]?.id ?? "",
      lockSize: false,
      lockPosition: false,
    }));
  }

  // ── Lock operations ──
  function setLockSize(next: boolean) {
    activeResizeCardIdRef.current = null;
    setCardState((cur) => ({
      ...cur,
      lockSize: next,
      cards: cur.cards.map((c) => (c.id === cur.selectedCardId ? { ...c, lockSize: next } : c)),
    }));
  }

  function setLockPosition(next: boolean) {
    activeDragCardIdRef.current = null;
    setCardState((cur) => ({
      ...cur,
      lockPosition: next,
      cards: cur.cards.map((c) => (c.id === cur.selectedCardId ? { ...c, lockPosition: next } : c)),
    }));
  }

  function toggleLockPage() {
    setCardState((cur) => {
      const next = !cur.lockPage;
      return {
        ...cur,
        lockPage: next,
        lockSize: next ? true : cur.lockSize,
        lockPosition: next ? true : cur.lockPosition,
        cards: cur.cards.map((c) => ({
          ...c,
          lockSize: next ? true : c.lockSize,
          lockPosition: next ? true : c.lockPosition,
        })),
      };
    });
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
    // Reset all pages in project to empty
    setProject((prev) => ({
      ...prev,
      pages: Object.fromEntries(PAGE_KEYS.map((k) => [k, makeEmptyPage()])),
    }));
    setCardState({ cards: [card], selectedCardId: card.id, lockSize: false, lockPosition: false, lockPage: false });
  }

  function isPageLocked(key: PageKey): boolean {
    if (key === page) return cardState.lockPage;
    return project.pages[key]?.lockPage ?? false;
  }

  const allPagesLocked = PAGE_KEYS.every((k) => isPageLocked(k));

  function lockAllPages() {
    setCardState((cur) => ({ ...cur, lockPage: true }));
    setProject((prev) => ({
      ...prev,
      pages: Object.fromEntries(
        PAGE_KEYS.map((k) => [k, { ...(prev.pages[k] ?? makeEmptyPage()), lockPage: true }])
      ),
    }));
  }

  function unlockAllPages() {
    setCardState((cur) => ({ ...cur, lockPage: false }));
    setProject((prev) => ({
      ...prev,
      pages: Object.fromEntries(
        PAGE_KEYS.map((k) => [k, { ...(prev.pages[k] ?? makeEmptyPage()), lockPage: false }])
      ),
    }));
  }

  // ── Persist user uploads ──
  useEffect(() => {
    try {
      localStorage.setItem("drip-studio:user-uploads", JSON.stringify(userUploads));
    } catch { /* storage full */ }
  }, [userUploads]);
  useEffect(() => {
    try {
      localStorage.setItem("drip-studio:upload-counter", String(uploadCounter));
    } catch { /* storage full */ }
  }, [uploadCounter]);

  // ── Mobile photo upload → PNG → R2 with x-designation ──
  async function handleMobilePhotoUpload(file: File) {
    if (!file) return;
    if (uploading) { setDeployStatus("Upload already in progress..."); return; }
    setUploading(true);
    setDeployStatus("Converting image...");
    try {
      const pngBlob = await convertToPng(file);
      const nextNum = uploadCounter + 1;
      const xCode = `x${String(nextNum).padStart(3, "0")}`;
      const filename = `${xCode}.png`;

      // Create a local blob URL so the image is visible immediately
      const localUrl = URL.createObjectURL(pngBlob);
      const item: ContentItem = { code: xCode, url: localUrl };
      setUserUploads((prev) => [...prev, item]);
      setUploadCounter(nextNum);

      // Auto-apply to selected card immediately
      if (selectedCard && !cardState.lockPage) {
        setCardState((cur) => ({
          ...cur,
          cards: cur.cards.map((c) =>
            c.id === selectedCard.id
              ? { ...c, contentImage: localUrl, contentUrl: localUrl, contentDisplay: "image" as const, contentType: "image" as const, contentCode: xCode }
              : c
          ),
        }));
      }

      // Upload to R2 — update URL if successful
      const sizeKB = (pngBlob.size / 1024).toFixed(0);
      setDeployStatus(`Uploading ${xCode} (${sizeKB} KB)...`);
      try {
        const form = new FormData();
        form.append("file", new File([pngBlob], filename, { type: "image/png" }));
        form.append("slug", slug);
        const res = await fetch(UPLOAD_ENDPOINT, { method: "POST", body: form });
        if (!res.ok && res.status === 404) {
          setDeployStatus(`Upload failed: /api/upload not found (404) — redeploy Pages`);
          setTimeout(() => setDeployStatus(null), 5000);
          return;
        }
        const text = await res.text();
        let data: { ok: boolean; key?: string; error?: string };
        try { data = JSON.parse(text); } catch {
          setDeployStatus(`Upload failed: non-JSON response (${res.status}): ${text.slice(0, 80)}`);
          setTimeout(() => setDeployStatus(null), 5000);
          return;
        }
        if (data.ok) {
          const remoteUrl = `${DEMO_CONTENT_BASE}/tenant-content/${slug}/${filename}`;
          setUserUploads((prev) => prev.map((u) => u.code === xCode ? { ...u, url: remoteUrl } : u));
          setCardState((cur) => ({
            ...cur,
            cards: cur.cards.map((c) =>
              c.contentCode === xCode
                ? { ...c, contentImage: remoteUrl, contentUrl: remoteUrl }
                : c
            ),
          }));
          setDeployStatus(`${xCode} uploaded`);
          setTimeout(() => setDeployStatus(null), 2000);
        } else {
          setDeployStatus(`Upload failed: ${data.error ?? res.status}`);
          setTimeout(() => setDeployStatus(null), 4000);
        }
      } catch (err) {
        setDeployStatus(`Upload error: ${(err as Error).message}`);
        setTimeout(() => setDeployStatus(null), 5000);
      }
    } catch (err) {
      setDeployStatus(`Convert error: ${(err as Error).message}`);
      setTimeout(() => setDeployStatus(null), 5000);
    } finally {
      setUploading(false);
    }
  }

  // ── Apply content / skin / media to selected card ──
  const applyContentToCard = useCallback(
    (contentUrl: string, contentCode?: string) => {
      if (!selectedCard || cardState.lockPage) return;
      setCardState((cur: typeof cardState) => ({
        ...cur,
        cards: cur.cards.map((c) =>
          c.id === selectedCard.id
            ? { ...c, contentImage: contentUrl, contentUrl, contentDisplay: "image", contentType: "image", contentCode: contentCode ?? c.contentCode }
            : c
        ),
      }));
      // Content panel stays open after selecting content
    },
    [selectedCard, cardState.lockPage]
  );

  const applySkinToCard = useCallback(
    (skinId: string) => {
      if (!selectedCard) return;
      setCardState((cur) => ({
        ...cur,
        cards: cur.cards.map((c) => (c.id === selectedCard.id ? { ...c, skinId } : c)),
      }));
      // Content panel stays open after selecting skin
    },
    [selectedCard]
  );

  const applyMediaToCard = useCallback(
    (mediaUrl: string, mediaType: "image" | "video") => {
      if (!selectedCard || !mediaUrl || cardState.lockPage) return;
      const contentDisplay = mediaType === "video" ? "video" : "image";
      setCardState((cur) => ({
        ...cur,
        cards: cur.cards.map((c) =>
          c.id === selectedCard.id
            ? {
                ...c,
                contentImage: contentDisplay === "image" ? mediaUrl : undefined,
                contentUrl: mediaUrl,
                contentDisplay,
                contentType: mediaType,
              }
            : c
        ),
      }));
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
      setCardState((cur) => ({
        ...cur,
        cards: cur.cards.map((c) => (c.id === cardId ? { ...c, skinId } : c)),
      }));
      return;
    }
    const contentUrl = e.dataTransfer.getData("text/plain");
    if (!contentUrl) return;
    const contentCode = e.dataTransfer.getData("application/x-content-code") || undefined;
    setCardState((cur) => ({
      ...cur,
      cards: cur.cards.map((c) =>
        c.id === cardId
          ? { ...c, contentImage: contentUrl, contentUrl, contentDisplay: "image", contentType: "image", contentCode }
          : c
      ),
    }));
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
                      className={`mobPageCube ${page === k ? "isActivePage" : ""} ${isPageLocked(k) ? "isLockedPage" : ""}`}
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
          // Reset uploading guard in case previous upload errored
          setUploading(false);
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
