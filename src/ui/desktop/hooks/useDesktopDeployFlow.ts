import { useCallback } from "react";
import type { PageKey, ProjectData, ExclusiveTile, CardInteractionState } from "../../../domain/project/types";
import { cardStateToPageData, hasAnyOverlap } from "../../../domain/editor/selectors";
import { ensureUniqueSlug } from "../../../domain/editor/actions";
import { buildDesktopDeployBundle } from "../../../services/deploy/buildPayload";
import { saveProject, deployGateway, downloadProjectJson } from "../../state/editorExport";
import { wallpaperCatalog } from "../../../core/wallpaperCatalog";

type Args = {
  slug: string;
  setSlug: (next: string) => void;
  page: PageKey;
  project: ProjectData;
  cardState: CardInteractionState;
  wallpaper: string;
  pageInstructions: string;
  isGlobalWallpaper: boolean;
  exclusiveTiles: ExclusiveTile[];
  setDeploying: (next: boolean) => void;
  setDeployStatus: (next: string | null) => void;
  setProject: (next: ProjectData) => void;
  setIsSaved: (next: boolean) => void;
  setDeployModal: (next: { slug: string; primaryUrl: string; holidayUrl: string; ok: boolean; error?: string } | null) => void;
  /** Product key for routing deploys (biz / ad / web3). */
  productKey: string;
  /** Base URL for the selected product (biz / ad / web3). */
  deployBase: string;
};

export function useDesktopDeployFlow(args: Args) {
  const handleSave = useCallback(() => {
    if (hasAnyOverlap(args.cardState.cards)) {
      args.setDeployStatus("⚠ Cannot save — overlapping tiles detected. Move tiles apart first.");
      setTimeout(() => args.setDeployStatus(null), 3500);
      return;
    }
    const currentPageData = cardStateToPageData(args.cardState, args.wallpaper, args.pageInstructions, args.page === "p4" ? args.exclusiveTiles : undefined);
    const updatedPages = { ...args.project.pages, [args.page]: currentPageData };
    if (args.isGlobalWallpaper) {
      for (const key of Object.keys(updatedPages)) {
        updatedPages[key as PageKey] = { ...updatedPages[key as PageKey], wallpaper: args.wallpaper };
      }
    }
    const full: ProjectData = { ...args.project, slug: args.slug, pages: updatedPages };
    saveProject(full);
    args.setProject(full);
    args.setIsSaved(true);
    args.setDeployStatus("Saved locally");
    setTimeout(() => args.setDeployStatus(null), 2000);
  }, [args]);

  const handleDeployGateway = useCallback(async () => {
    if (hasAnyOverlap(args.cardState.cards)) {
      args.setDeployStatus("⚠ Cannot deploy — overlapping tiles detected. Move tiles apart first.");
      setTimeout(() => args.setDeployStatus(null), 3500);
      return;
    }

    const effectiveSlug = ensureUniqueSlug(args.slug);
    if (effectiveSlug !== args.slug) args.setSlug(effectiveSlug);

    const full: ProjectData = {
      ...args.project,
      slug: effectiveSlug,
      pages: {
        ...args.project.pages,
        [args.page]: cardStateToPageData(args.cardState, args.wallpaper, args.pageInstructions, args.page === "p4" ? args.exclusiveTiles : undefined),
      },
    };

    const { main: mainPayload, holiday: holidayPayload } = buildDesktopDeployBundle(effectiveSlug, full.pages, {
      slug: effectiveSlug,
      wallpaperCatalog,
      exclusiveTiles: full.pages.p4?.exclusiveTiles ?? args.exclusiveTiles,
    });

    saveProject(full);
    args.setProject(full);
    args.setIsSaved(false);
     args.setDeploying(true);
    args.setDeployStatus("Deploying...");

    const result = await deployGateway(
      full,
      { main: mainPayload, holiday: holidayPayload },
      { productKey: args.productKey, deployBase: args.deployBase },
    );
    args.setDeploying(false);

    // Always display the URL for the selected product mode (worker return URLs may be legacy)
    const primaryUrl = `${args.deployBase}/${effectiveSlug}/gate`;
    const holidayUrl = `${args.deployBase}/${effectiveSlug}/holiday`;
    if (result.ok) args.setDeployStatus(null);
    args.setDeployModal({ slug: effectiveSlug, primaryUrl, holidayUrl, ok: result.ok, error: result.error });
  }, [args]);

  const handleDownload = useCallback(() => {
    const full: ProjectData = {
      ...args.project,
      slug: args.slug,
      pages: {
        ...args.project.pages,
        [args.page]: cardStateToPageData(args.cardState, args.wallpaper, args.pageInstructions, args.page === "p4" ? args.exclusiveTiles : undefined),
      },
    };
    downloadProjectJson(full);
  }, [args]);

  return { handleSave, handleDeployGateway, handleDownload };
}
