/**
 * Mobile deploy/save orchestration hook.
 *
 * Mirrors src/ui/desktop/hooks/useDesktopDeployFlow.ts for the mobile side.
 * Extracted from MobileApp.tsx: handleSave, handleDeploy.
 */

import { useCallback } from "react";
import type { RefObject } from "react";
import type { CardInteractionState, PageKey, ProjectData } from "../../../domain/project/types";
import { cardStateToPageData, hasAnyOverlap } from "../../../domain/editor/selectors";
import { GATEWAY_BASE } from "../../../domain/editor/constants";
import { saveProject, deployGateway } from "../../state/editorExport";
import { buildMobileDeployBundle } from "../../../services/deploy/buildPayload";
import { wallpaperCatalog } from "../../../core/wallpaperCatalog";
import { mobileWallpaperCatalog } from "../../../core/mobileWallpaperCatalog";

function inferProductPrefix(base: string) {
  const value = String(base || "").toLowerCase();
  if (value.includes("biz")) return "biz";
  if (value.includes("ad")) return "ad";
  return "gate";
}

function normalizeDeploySlug(rawSlug: string, base: string) {
  const slug = String(rawSlug || "").trim().toLowerCase();
  if (/^(xyz-(biz|ad|gate)-|biz-|ad-|gate-)/.test(slug)) return slug;
  return `${inferProductPrefix(base)}-${slug}`;
}

type ExclusiveTileState = { url: string; price: string; locked: boolean }[];

type Args = {
  slug: string;
  page: PageKey;
  project: ProjectData;
  cardState: CardInteractionState;
  wallpaper: string;
  exclusiveTiles: ExclusiveTileState;
  workspaceRef: RefObject<HTMLElement>;
  wsDims: { width: number; height: number };
  setProject: (updater: (prev: ProjectData) => ProjectData) => void;
  setDeploying: (next: boolean) => void;
  setDeployStatus: (next: string | null) => void;
  setJustSaved: (next: boolean) => void;
  setDeployModal: (next: { primaryUrl: string; holidayUrl: string; ok: boolean; error?: string } | null) => void;
};

export function useMobileDeployFlow(args: Args) {
  const handleSave = useCallback(() => {
    if (hasAnyOverlap(args.cardState.cards)) {
      args.setDeployStatus("⚠ Cannot save — overlapping tiles. Move tiles apart first.");
      setTimeout(() => args.setDeployStatus(null), 3500);
      return;
    }
    const normalizedSlug = normalizeDeploySlug(args.slug, GATEWAY_BASE);
    const full: ProjectData = {
      ...args.project,
      slug: normalizedSlug,
      pages: { ...args.project.pages, [args.page]: cardStateToPageData(args.cardState, args.wallpaper) },
    };
    saveProject(full);
    args.setProject(() => full);
    args.setJustSaved(true);
    args.setDeployStatus("Saved");
    setTimeout(() => { args.setDeployStatus(null); args.setJustSaved(false); }, 2000);
  }, [args]);

  const handleDeploy = useCallback(async () => {
    if (hasAnyOverlap(args.cardState.cards)) {
      args.setDeployStatus("⚠ Cannot deploy — overlapping tiles. Move tiles apart first.");
      setTimeout(() => args.setDeployStatus(null), 3000);
      return;
    }
    const full: ProjectData = {
      ...args.project,
      slug: args.slug,
      pages: { ...args.project.pages, [args.page]: cardStateToPageData(args.cardState, args.wallpaper) },
    };
    saveProject(full);
    args.setProject(() => full);

    const actualWsW = args.workspaceRef.current?.offsetWidth ?? args.wsDims.width;
    const actualWsH = args.wsDims.height;
    const { main: mainPayload, holiday: holidayPayload } = buildMobileDeployBundle(
      normalizedSlug,
      full.pages,
      {
        slug: normalizedSlug,
        scaleParams: { actualWsW, actualWsH },
        wallpaperCatalog,
        mobileWallpaperCatalog,
        exclusiveTiles: args.exclusiveTiles,
      },
    );

    args.setDeploying(true);
    args.setDeployStatus("Deploying...");
    const result = await deployGateway(full, { main: mainPayload, holiday: holidayPayload });
    args.setDeploying(false);
    args.setDeployStatus(null);
    const primaryUrl = result.primaryUrl ?? `${GATEWAY_BASE}/${normalizedSlug}/home`;
    const holidayUrl = result.holidayUrl ?? `${GATEWAY_BASE}/${normalizedSlug}/holiday`;
    args.setDeployModal({ primaryUrl, holidayUrl, ok: result.ok, error: result.error });
  }, [args]);

  return { handleSave, handleDeploy };
}
