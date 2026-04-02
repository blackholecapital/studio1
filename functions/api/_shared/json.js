/**
 * Structured JSON response helpers.
 */

/** Return a JSON response with the given status. */
export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Return a structured error response. */
export function errorResponse(code, message, status = 400) {
  return json({ ok: false, error: { code, message } }, status);
}

/** Shorthand for common error codes. */
export const Errors = {
  BAD_REQUEST:    (msg) => errorResponse("BAD_REQUEST", msg, 400),
  UNAUTHORIZED:   (msg) => errorResponse("UNAUTHORIZED", msg || "Unauthorized", 401),
  NOT_FOUND:      (msg) => errorResponse("NOT_FOUND", msg || "Not found", 404),
  PAYLOAD_TOO_LARGE: (msg) => errorResponse("PAYLOAD_TOO_LARGE", msg, 413),
  MISSING_BINDING:(name) => errorResponse("SERVER_ERROR", `Missing ${name} binding`, 500),
};
