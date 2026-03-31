import type { PageSpec } from "../../core/types";
import { toMobileBlocks } from "../mobileLayoutPresets";
import { PreviewPane } from "../../ui/components/PreviewPane";

export function MobilePreviewPane({ page }: { page: PageSpec }) {
  const mobilePage: PageSpec = {
    ...page,
    blocks: toMobileBlocks(page.blocks)
  };

  return <PreviewPane page={mobilePage} mode="mobile" />;
}
