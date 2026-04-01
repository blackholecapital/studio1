/**
 * Runtime type guards for localStorage payloads and external data.
 *
 * These complement the validators in domain/project/validators.ts
 * with lower-level checks that can be reused across the app.
 */

/** Check that a value is a non-null object (not an array). */
export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Check that a value is a finite number. */
export function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && isFinite(v);
}

/** Check that a value is a non-empty string. */
export function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

/**
 * Safely parse a JSON string. Returns null on failure.
 */
export function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Safely read a value from localStorage. Returns null on any error.
 */
export function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safely write a value to localStorage. Returns true on success.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
