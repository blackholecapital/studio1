// Types are now defined in the domain layer; re-export for backwards compat.
export type { PageData, ProjectData, DeployResult } from "../../domain/project/types";
import type { ProjectData } from "../../domain/project/types";

// Factory functions are now in the domain layer; re-export for backwards compat.
export { makeEmptyPage, makeEmptyProject } from "../../domain/project/defaults";

// Validator provides safe parse for persisted state.
import { parseProject } from "../../domain/project/validators";

import { R2_DEPLOY_ENDPOINT } from "../../domain/editor/constants";

const STORAGE_PREFIX = "drip-studio:project:";

/* ── Local storage helpers ── */
function storageKey(slug: string): string {
  return `${STORAGE_PREFIX}${slug}`;
}

export function loadProject(slug: string): ProjectData | null {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return null;
    return parseProject(raw);
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
import type { DeployResult } from "../../domain/project/types";

export async function deployGateway(
  project: ProjectData,
  deployPayload?: Record<string, unknown>
): Promise<DeployResult> {

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
