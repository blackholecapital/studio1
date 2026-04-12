/**
 * Thin fetch wrappers around /api/auth/* endpoints. Errors come back as
 * `{ ok: false, error: { code, message } }` matching the server helpers
 * in functions/api/_shared/json.js.
 */

import type {
  AuthSession,
  AuthUser,
  AuthSuccess,
  AuthErrorBody,
  RecoveryRequestResult,
} from "./types";

const AUTH_BASE = "/api/auth";

type Fetchable = {
  signal?: AbortSignal;
  token?: string;
};

async function postJson<T>(
  path: string,
  body: unknown,
  opts: Fetchable = {},
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${AUTH_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  const parsed = (await res.json().catch(() => null)) as T | AuthErrorBody | null;
  if (!parsed || (parsed as AuthErrorBody).ok === false) {
    const msg =
      (parsed as AuthErrorBody)?.error?.message ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return parsed as T;
}

async function getJson<T>(path: string, opts: Fetchable = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${AUTH_BASE}${path}`, {
    method: "GET",
    headers,
    signal: opts.signal,
  });
  const parsed = (await res.json().catch(() => null)) as T | AuthErrorBody | null;
  if (!parsed || (parsed as AuthErrorBody).ok === false) {
    const msg =
      (parsed as AuthErrorBody)?.error?.message ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return parsed as T;
}

export async function signup(input: {
  username: string;
  password: string;
  confirmPassword: string;
  recoveryEmail: string;
}): Promise<AuthSuccess> {
  return postJson<AuthSuccess>("/signup", input);
}

export async function login(input: {
  username: string;
  password: string;
}): Promise<AuthSuccess> {
  return postJson<AuthSuccess>("/login", input);
}

export async function resolveSession(token: string): Promise<{
  ok: true;
  session: AuthSession;
  user: AuthUser;
}> {
  return getJson("/session", { token });
}

export async function logout(token: string): Promise<void> {
  try { await postJson("/logout", {}, { token }); } catch { /* ignore */ }
}

export async function requestRecovery(identifier: string): Promise<RecoveryRequestResult> {
  return postJson<RecoveryRequestResult>("/recovery-request", { identifier });
}

export async function resetPassword(input: {
  token: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ ok: true; username: string }> {
  return postJson("/recovery-reset", input);
}

export async function linkPage(token: string, pageSlug: string): Promise<{
  ok: true;
  pageSlug: string;
  user: AuthUser;
}> {
  return postJson("/link-page", { pageSlug }, { token });
}
