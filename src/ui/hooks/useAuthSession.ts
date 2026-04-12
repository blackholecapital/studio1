/**
 * useAuthSession — React hook that owns the logged-in session for the
 * Studio client. Persists to localStorage under the shared key so the
 * Gateway can later resolve the same session via /api/auth/session.
 */

import { useCallback, useEffect, useState } from "react";
import type { AuthSession, AuthUser } from "../../services/auth/types";
import {
  loadStoredSession,
  saveStoredSession,
  clearStoredSession,
} from "../../services/auth/sessionStore";
import {
  signup as apiSignup,
  login as apiLogin,
  logout as apiLogout,
  resolveSession as apiResolveSession,
  requestRecovery as apiRequestRecovery,
  resetPassword as apiResetPassword,
  linkPage as apiLinkPage,
} from "../../services/auth/authClient";

export type AuthState = {
  session: AuthSession | null;
  user: AuthUser | null;
};

export function useAuthSession() {
  const [state, setState] = useState<AuthState>(() => {
    const stored = loadStoredSession();
    if (!stored) return { session: null, user: null };
    return { session: stored.session, user: stored.user };
  });

  // Rehydrate/validate session with the server on mount (once).
  useEffect(() => {
    let cancelled = false;
    const stored = loadStoredSession();
    if (!stored) return;
    (async () => {
      try {
        const res = await apiResolveSession(stored.session.token);
        if (cancelled) return;
        saveStoredSession({ session: res.session, user: res.user });
        setState({ session: res.session, user: res.user });
      } catch {
        if (cancelled) return;
        clearStoredSession();
        setState({ session: null, user: null });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const applySuccess = useCallback((session: AuthSession, user: AuthUser) => {
    saveStoredSession({ session, user });
    setState({ session, user });
  }, []);

  const signup = useCallback(async (input: {
    username: string;
    password: string;
    confirmPassword: string;
    recoveryEmail: string;
  }) => {
    const res = await apiSignup(input);
    applySuccess(res.session, res.user);
    return res;
  }, [applySuccess]);

  const login = useCallback(async (input: { username: string; password: string }) => {
    const res = await apiLogin(input);
    applySuccess(res.session, res.user);
    return res;
  }, [applySuccess]);

  const logout = useCallback(async () => {
    const token = state.session?.token;
    if (token) await apiLogout(token);
    clearStoredSession();
    setState({ session: null, user: null });
  }, [state.session?.token]);

  const requestRecovery = useCallback(async (identifier: string) => {
    return await apiRequestRecovery(identifier);
  }, []);

  const resetPassword = useCallback(async (input: {
    token: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    return await apiResetPassword(input);
  }, []);

  const linkPage = useCallback(async (pageSlug: string) => {
    const token = state.session?.token;
    if (!token) return;
    try {
      const res = await apiLinkPage(token, pageSlug);
      // Keep the local user record in sync with updated page_ids.
      setState((cur) => (cur.session ? { session: cur.session, user: res.user } : cur));
      saveStoredSession({ session: state.session!, user: res.user });
    } catch {
      /* non-fatal — save still succeeds locally */
    }
  }, [state.session]);

  return {
    session: state.session,
    user: state.user,
    isAuthenticated: !!state.session,
    signup,
    login,
    logout,
    requestRecovery,
    resetPassword,
    linkPage,
  };
}
