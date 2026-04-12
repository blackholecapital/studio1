/**
 * Shared auth contract used by the Studio client and the Gateway runtime.
 *
 * Both apps should resolve the same session via GET /api/auth/session
 * (origin: pages.xyz-labs.xyz) with an `Authorization: Bearer <token>`
 * header. Session tokens are persisted in localStorage under
 * XYZ_LABS_SESSION_KEY so the user stays logged in across reloads.
 */

export const XYZ_LABS_SESSION_KEY = "xyz-labs:auth:session";

export type AuthSession = {
  token: string;
  user_id: string;
  username: string;
  issued_at: number;
  expires_at: number;
};

export type AuthUser = {
  user_id: string;
  username: string;
  recovery_email: string;
  created_at: number;
  status?: string;
  app_access?: string[];
  page_ids?: string[];
};

export type AuthSuccess = {
  ok: true;
  session: AuthSession;
  user: AuthUser;
};

export type AuthErrorBody = {
  ok: false;
  error: { code: string; message: string };
};

export type RecoveryRequestResult = {
  ok: true;
  delivered: boolean;
  message: string;
  token?: string;
  expires_at?: number;
  recovery_email?: string;
};
