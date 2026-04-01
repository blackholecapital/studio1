/**
 * URL-derived state helpers — slug generation and initialization.
 *
 * Extracted from:
 *   - src/ui/App.tsx (slug initialization in useState)
 *   - src/ui/MobileApp.tsx (slug initialization in useMemo)
 */

import { loadDesktopSlug, saveDesktopSlug, loadMobileSlug, saveMobileSlug } from "../storage/projectStore";
import { generateSlug } from "../../domain/editor/actions";

/**
 * Get or create the desktop slug.
 * Reads from localStorage; generates and saves a new one if absent.
 */
export function getOrCreateDesktopSlug(): string {
  const stored = loadDesktopSlug();
  if (stored) return stored;
  const id = generateSlug();
  saveDesktopSlug(id);
  return id;
}

/**
 * Get or create the mobile slug.
 * Reads from localStorage; generates and saves a new one if absent.
 */
export function getOrCreateMobileSlug(): string {
  const stored = loadMobileSlug();
  if (stored) return stored;
  const id = generateSlug();
  saveMobileSlug(id);
  return id;
}
