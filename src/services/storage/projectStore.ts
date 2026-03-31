/**
 * Centralized project persistence via localStorage.
 *
 * Extracted from:
 *   - src/ui/state/editorExport.ts (loadProject, saveProject, listSavedSlugs, storageKey)
 *   - src/ui/App.tsx (slug read/write via drip-studio:desktop-slug)
 *   - src/ui/MobileApp.tsx (slug read/write via drip-studio:mob-slug, upload state)
 *
 * All localStorage access for project data goes through this module.
 */

import type { ProjectData } from "../../domain/project/types";
import { parseProject } from "../../domain/project/validators";

// ── Storage keys ─────────────────────────────────────────────────────────────

const PROJECT_PREFIX = "drip-studio:project:";
const DESKTOP_SLUG_KEY = "drip-studio:desktop-slug";
const MOBILE_SLUG_KEY = "drip-studio:mob-slug";
const USER_UPLOADS_KEY = "drip-studio:user-uploads";
const UPLOAD_COUNTER_KEY = "drip-studio:upload-counter";
const GHOST_FLOW_KEY = "ghostFlowSeen";

function projectKey(slug: string): string {
  return `${PROJECT_PREFIX}${slug}`;
}

// ── Project CRUD ─────────────────────────────────────────────────────────────

/** Load and validate a project from localStorage. Returns null if missing or corrupt. */
export function loadProject(slug: string): ProjectData | null {
  try {
    const raw = localStorage.getItem(projectKey(slug));
    if (!raw) return null;
    return parseProject(raw);
  } catch {
    return null;
  }
}

/** Persist a project to localStorage. Returns the serialized JSON string. */
export function saveProject(project: ProjectData): string {
  const serialized = JSON.stringify(project, null, 2);
  try {
    localStorage.setItem(projectKey(project.slug), serialized);
  } catch {
    // Storage full or unavailable — still return serialized for console
  }
  return serialized;
}

/** List all saved project slugs. */
export function listSavedSlugs(): string[] {
  const slugs: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PROJECT_PREFIX)) {
        slugs.push(key.slice(PROJECT_PREFIX.length));
      }
    }
  } catch {
    // Ignore
  }
  return slugs;
}

// ── Slug persistence ─────────────────────────────────────────────────────────

/** Read the stored desktop slug (or null). */
export function loadDesktopSlug(): string | null {
  try { return localStorage.getItem(DESKTOP_SLUG_KEY); } catch { return null; }
}

/** Write the desktop slug. */
export function saveDesktopSlug(slug: string): void {
  try { localStorage.setItem(DESKTOP_SLUG_KEY, slug); } catch { /* ignore */ }
}

/** Read the stored mobile slug (or null). */
export function loadMobileSlug(): string | null {
  try { return localStorage.getItem(MOBILE_SLUG_KEY); } catch { return null; }
}

/** Write the mobile slug. */
export function saveMobileSlug(slug: string): void {
  try { localStorage.setItem(MOBILE_SLUG_KEY, slug); } catch { /* ignore */ }
}

// ── Upload state persistence ─────────────────────────────────────────────────

/** Load the user-uploads array from localStorage. */
export function loadUserUploads<T>(): T[] {
  try {
    const raw = localStorage.getItem(USER_UPLOADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/** Save the user-uploads array to localStorage. */
export function saveUserUploads(uploads: unknown[]): void {
  try { localStorage.setItem(USER_UPLOADS_KEY, JSON.stringify(uploads)); } catch { /* full */ }
}

/** Load the upload counter. */
export function loadUploadCounter(): number {
  try {
    return parseInt(localStorage.getItem(UPLOAD_COUNTER_KEY) ?? "0", 10) || 0;
  } catch { return 0; }
}

/** Save the upload counter. */
export function saveUploadCounter(count: number): void {
  try { localStorage.setItem(UPLOAD_COUNTER_KEY, String(count)); } catch { /* full */ }
}

// ── Ghost flow ───────────────────────────────────────────────────────────────

/** Check if the ghost flow onboarding has been seen. */
export function hasSeenGhostFlow(): boolean {
  try { return localStorage.getItem(GHOST_FLOW_KEY) === "true"; } catch { return false; }
}

/** Mark the ghost flow as seen. */
export function markGhostFlowSeen(): void {
  try { localStorage.setItem(GHOST_FLOW_KEY, "true"); } catch { /* ignore */ }
}

/** Reset the ghost flow (dev helper). */
export function resetGhostFlow(): void {
  try { localStorage.removeItem(GHOST_FLOW_KEY); } catch { /* ignore */ }
}
