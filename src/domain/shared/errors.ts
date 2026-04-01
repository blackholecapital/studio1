/**
 * Shared result/error model for operations that can fail.
 *
 * Used by deploy, upload, and save operations.
 */

/** A result that is either successful with a value, or failed with an error message. */
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/** Create a successful result. */
export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

/** Create a failed result. */
export function err<T>(error: string): Result<T> {
  return { ok: false, error };
}
