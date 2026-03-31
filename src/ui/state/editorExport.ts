import type { CardModel } from "../hooks/useCardInteractions";
import { DEFAULT_WALLPAPER_URL } from "../../core/wallpaperCatalog";

/* ── Per-page snapshot ── */
export type PageData = {
  wallpaper: string;
  cards: CardModel[];
  selectedCardId: string;
  lockSize: boolean;
  lockPosition: boolean;
  lockPage: boolean;
  instructions: string;
};

/* ── Full project (all pages + slug) ── */
export type ProjectData = {
  version: 1;
  slug: string;
  pages: Record<string, PageData>;
};

const STORAGE_PREFIX = "drip-studio:project:";
const DEFAULT_WALLPAPER = DEFAULT_WALLPAPER_URL;

/* ── Blank page ── */
export function makeEmptyPage(): PageData {
  return {
    wallpaper: DEFAULT_WALLPAPER,
    cards: [],
    selectedCardId: "",
    lockSize: false,
    lockPosition: false,
    lockPage: false,
    instructions: "Add content, skins, media"
  };
}

/* ── Blank project ── */
export function makeEmptyProject(slug: string): ProjectData {
  return {
    version: 1,
    slug,
    pages: {
      p1: makeEmptyPage(),
      p2: makeEmptyPage(),
      p3: makeEmptyPage(),
      p4: makeEmptyPage()
    }
  };
}

/* ── Local storage helpers ── */
function storageKey(slug: string): string {
  return `${STORAGE_PREFIX}${slug}`;
}

export function loadProject(slug: string): ProjectData | null {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProjectData;
    if (parsed?.version !== 1) return null;
    for (const key of Object.keys(parsed.pages ?? {})) {
      const page = parsed.pages[key];
      if (!page) continue;
      if (typeof page.instructions !== "string" || !page.instructions.trim()) {
        page.instructions = makeEmptyPage().instructions;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveProject(project: ProjectData): string {
  const serialized = JSON.stringify(project, null, 2);
  try {
    localStorage.setItem(storageKey(project.slug), serialized);
  } catch {
    // Storage full or unavailable – still return serialized for console
  }
  return serialized;
}

export function listSavedSlugs(): string[] {
  const slugs: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        slugs.push(key.slice(STORAGE_PREFIX.length));
      }
    }
  } catch {
    // Ignore
  }
  return slugs;
}

/* ── Deploy to R2 ── */
export type DeployResult = {
  ok: boolean;
  primaryUrl?: string;
  holidayUrl?: string;
  error?: string;
};

export async function deployGateway(
  project: ProjectData,
  deployPayload?: Record<string, unknown>
): Promise<DeployResult> {
  const R2_DEPLOY_ENDPOINT = `https://tenant-cdn.cryptocapitalgroupfl.workers.dev/deploy-demo`;

  // Payload shape: { slug, data: { main, holiday } }
  const body = JSON.stringify({
    slug: project.slug,
    data: deployPayload ?? project
  });

  try {
    const res = await fetch(R2_DEPLOY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({})) as Record<string, unknown>;
      const serverMsg = (errBody.error as string) ?? `${res.status} ${res.statusText}`;
      return { ok: false, error: `Deploy failed: ${serverMsg}` };
    }

    const resBody = await res.json().catch(() => ({})) as Record<string, unknown>;
    return {
      ok: true,
      primaryUrl: resBody.primaryUrl as string | undefined,
      holidayUrl: resBody.holidayUrl as string | undefined
    };
  } catch (err) {
    console.error("[deploy] network error:", err);
    saveProject(project);
    return { ok: false, error: `Network error: ${(err as Error).message}` };
  }
}

/* ── Download project JSON as file ── */
export function downloadProjectJson(project: ProjectData): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.slug}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
