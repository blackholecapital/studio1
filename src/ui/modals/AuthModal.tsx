/**
 * AuthModal — unified overlay for Join / Login / Forgot Password / Reset.
 *
 * Rendered at the application root so it is not clipped by the left rail's
 * `overflow: hidden`. The previous inline <div className="signUpOverlay">
 * inside WallpaperRail was a child of `.leftRail`, which is exactly why
 * the Join tile got trapped/clipped — reported as the "Join modal bug".
 */

import { useCallback, useEffect, useState } from "react";
import type { AuthUser } from "../../services/auth/types";

type Mode = "login" | "signup" | "forgot" | "reset";

export type AuthModalProps = {
  open: boolean;
  initialMode?: Mode;
  currentUser?: AuthUser | null;
  onClose: () => void;
  onSignup: (input: {
    username: string;
    password: string;
    confirmPassword: string;
    recoveryEmail: string;
  }) => Promise<unknown>;
  onLogin: (input: { username: string; password: string }) => Promise<unknown>;
  onRequestRecovery: (identifier: string) => Promise<{
    ok: true;
    token?: string;
    message?: string;
    recovery_email?: string;
  }>;
  onResetPassword: (input: {
    token: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<{ ok: true; username: string }>;
  onLogout?: () => Promise<void> | void;
};

export function AuthModal(props: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(props.initialMode ?? "login");

  // login form
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // signup form
  const [suUsername, setSuUsername] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suConfirm, setSuConfirm] = useState("");

  // forgot form
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [issuedMessage, setIssuedMessage] = useState<string | null>(null);

  // reset form
  const [resetToken, setResetToken] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Reset local form state when the modal is opened/closed or mode changes.
  useEffect(() => {
    if (!props.open) return;
    setError(null);
    setNotice(null);
    setBusy(false);
  }, [props.open, mode]);

  useEffect(() => {
    if (props.open && props.initialMode) setMode(props.initialMode);
  }, [props.open, props.initialMode]);

  // Escape to close
  useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") props.onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props.open, props.onClose]);

  const runAsync = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }, []);

  if (!props.open) return null;

  const handleLogin = () => runAsync(async () => {
    await props.onLogin({ username: loginUsername.trim(), password: loginPassword });
    props.onClose();
  });

  const handleSignup = () => runAsync(async () => {
    await props.onSignup({
      username: suUsername.trim(),
      password: suPassword,
      confirmPassword: suConfirm,
      recoveryEmail: suEmail.trim(),
    });
    props.onClose();
  });

  const handleForgot = () => runAsync(async () => {
    const res = await props.onRequestRecovery(forgotIdentifier.trim());
    if (res.token) {
      setIssuedToken(res.token);
      setIssuedMessage(res.message || "Recovery token issued.");
    } else {
      setNotice(res.message || "If an account matched, a recovery token was issued.");
    }
  });

  const handleReset = () => runAsync(async () => {
    const res = await props.onResetPassword({
      token: resetToken.trim(),
      newPassword: resetPassword,
      confirmPassword: resetConfirm,
    });
    setNotice(`Password updated for ${res.username}. You can log in now.`);
    setMode("login");
  });

  const handleLogout = () => runAsync(async () => {
    if (props.onLogout) await props.onLogout();
    props.onClose();
  });

  return (
    <div className="authModalOverlay" onClick={props.onClose}>
      <div className="authModalCard" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Authentication">
        <button className="authModalClose" onClick={props.onClose} aria-label="Close">×</button>

        {props.currentUser ? (
          <div className="authModalBody">
            <div className="authModalTitle">Signed in</div>
            <div className="authModalSubtitle">
              You are logged in as <strong>{props.currentUser.username}</strong>.
            </div>
            <button className="authModalPrimary" onClick={handleLogout} disabled={busy}>
              {busy ? "Signing out…" : "Sign out"}
            </button>
          </div>
        ) : (
          <>
            <div className="authModalTabs" role="tablist">
              <button
                className={`authModalTab ${mode === "login" ? "isActive" : ""}`}
                onClick={() => setMode("login")}
                role="tab"
                aria-selected={mode === "login"}
              >Login</button>
              <button
                className={`authModalTab ${mode === "signup" ? "isActive" : ""}`}
                onClick={() => setMode("signup")}
                role="tab"
                aria-selected={mode === "signup"}
              >Create Account</button>
              <button
                className={`authModalTab ${mode === "forgot" || mode === "reset" ? "isActive" : ""}`}
                onClick={() => setMode("forgot")}
                role="tab"
                aria-selected={mode === "forgot" || mode === "reset"}
              >Recovery</button>
            </div>

            <div className="authModalBody">
              {mode === "login" && (
                <>
                  <div className="authModalTitle">Welcome back</div>
                  <input className="authModalInput" type="text" placeholder="Username" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} autoComplete="username" />
                  <input className="authModalInput" type="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} autoComplete="current-password" />
                  <button className="authModalPrimary" onClick={handleLogin} disabled={busy || !loginUsername || !loginPassword}>
                    {busy ? "Signing in…" : "Sign in"}
                  </button>
                  <button className="authModalLink" onClick={() => setMode("forgot")} type="button">Forgot password?</button>
                </>
              )}

              {mode === "signup" && (
                <>
                  <div className="authModalTitle">Create your account</div>
                  <input className="authModalInput" type="text" placeholder="Username" value={suUsername} onChange={(e) => setSuUsername(e.target.value)} autoComplete="username" />
                  <input className="authModalInput" type="email" placeholder="Recovery email" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} autoComplete="email" />
                  <input className="authModalInput" type="password" placeholder="Password" value={suPassword} onChange={(e) => setSuPassword(e.target.value)} autoComplete="new-password" />
                  <input className="authModalInput" type="password" placeholder="Confirm password" value={suConfirm} onChange={(e) => setSuConfirm(e.target.value)} autoComplete="new-password" />
                  <button className="authModalPrimary" onClick={handleSignup} disabled={busy || !suUsername || !suEmail || !suPassword || !suConfirm}>
                    {busy ? "Creating account…" : "Create account"}
                  </button>
                </>
              )}

              {mode === "forgot" && (
                <>
                  <div className="authModalTitle">Recover your account</div>
                  <div className="authModalSubtitle">Enter your username or the recovery email you registered with.</div>
                  <input className="authModalInput" type="text" placeholder="Username or recovery email" value={forgotIdentifier} onChange={(e) => setForgotIdentifier(e.target.value)} />
                  <button className="authModalPrimary" onClick={handleForgot} disabled={busy || !forgotIdentifier}>
                    {busy ? "Requesting…" : "Request recovery"}
                  </button>
                  {issuedToken && (
                    <div className="authModalTokenBox">
                      <div className="authModalTokenLabel">Recovery token (copy this):</div>
                      <code className="authModalTokenValue">{issuedToken}</code>
                      <button className="authModalSecondary" onClick={() => {
                        setResetToken(issuedToken);
                        setMode("reset");
                      }}>Use token to reset password</button>
                    </div>
                  )}
                  <button className="authModalLink" onClick={() => setMode("reset")} type="button">I already have a recovery token</button>
                </>
              )}

              {mode === "reset" && (
                <>
                  <div className="authModalTitle">Set a new password</div>
                  <input className="authModalInput" type="text" placeholder="Recovery token" value={resetToken} onChange={(e) => setResetToken(e.target.value)} />
                  <input className="authModalInput" type="password" placeholder="New password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} autoComplete="new-password" />
                  <input className="authModalInput" type="password" placeholder="Confirm new password" value={resetConfirm} onChange={(e) => setResetConfirm(e.target.value)} autoComplete="new-password" />
                  <button className="authModalPrimary" onClick={handleReset} disabled={busy || !resetToken || !resetPassword || !resetConfirm}>
                    {busy ? "Resetting…" : "Reset password"}
                  </button>
                </>
              )}

              {error && <div className="authModalError">{error}</div>}
              {notice && !error && <div className="authModalNotice">{notice}</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
