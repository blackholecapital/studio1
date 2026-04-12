/**
 * Shared-session persistence.
 *
 * Both Studio and Gateway should read/write the session record under the
 * same localStorage key (XYZ_LABS_SESSION_KEY) so they can hand off the
 * token to /api/auth/session and resolve the same user. localStorage is
 * per-origin, so Studio ↔ Gateway handoff happens via the server-side
 * session endpoint — the stored record here is just the local cache.
 */

import { XYZ_LABS_SESSION_KEY, type AuthSession, type AuthUser } from "./types";

export type StoredSession = {
  session: AuthSession;
  user: AuthUser;
};

export function loadStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(XYZ_LABS_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.session?.token || !parsed?.user?.username) return null;
    if (typeof parsed.session.expires_at !== "number" || parsed.session.expires_at < Date.now()) {
      clearStoredSession();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredSession(stored: StoredSession): void {
  try {
    localStorage.setItem(XYZ_LABS_SESSION_KEY, JSON.stringify(stored));
  } catch {
    /* storage full / unavailable — session stays in-memory only */
  }
}

export function clearStoredSession(): void {
  try { localStorage.removeItem(XYZ_LABS_SESSION_KEY); } catch { /* ignore */ }
}
