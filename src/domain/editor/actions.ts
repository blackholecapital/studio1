/**
 * Pure action helpers shared by desktop and mobile editors.
 *
 * Extracted from:
 *   - src/ui/App.tsx (ensureUniqueSlug, sanitizeSlug)
 *   - src/ui/MobileApp.tsx (slug sanitization inline)
 */

import { SLUG_PATTERN } from "../project/schema";

/**
 * Sanitize a slug to only contain safe characters.
 * Falls back to "user" if the result is empty.
 */
export function sanitizeSlug(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "");
  return cleaned || "user";
}

/**
 * Ensure a slug is non-empty and non-default.
 * If the slug is blank or "user", appends a random hex suffix.
 *
 * Extracted from App.tsx ensureUniqueSlug().
 */
export function ensureUniqueSlug(current: string): string {
  if (current.trim() === "" || current === "user") {
    const suffix = Math.random().toString(16).slice(2, 6);
    return `user-${suffix}`;
  }
  return current;
}

/**
 * Generate a random slug (8-char base36).
 * Used by both desktop and mobile on first visit.
 */
export function generateSlug(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Validate that a string matches the slug pattern.
 */
export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && slug.length > 0;
}
