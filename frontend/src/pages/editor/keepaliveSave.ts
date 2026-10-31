import { API_URL, getCsrfHeader } from "../../api";

/**
 * Fire a best-effort scene save that survives page unload.
 *
 * The normal axios save pipeline cannot run reliably from a `pagehide`
 * handler (async interceptors, connection teardown), so we use `fetch` with
 * `keepalive: true` as a best effort during unload. Browser limits still apply.
 * `navigator.sendBeacon` can't be used here
 * because it cannot set the CSRF header nor issue a PUT.
 *
 * Returns true if the request was dispatched, false if it could not be.
 */
export const saveDrawingKeepalive = (
  drawingId: string,
  body: Record<string, unknown>,
): boolean => {
  if (
    !drawingId ||
    typeof fetch !== "function" ||
    !Number.isSafeInteger(body.version)
  )
    return false;
  try {
    const csrf = getCsrfHeader();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (csrf) headers[csrf.name] = csrf.token;
    void fetch(`${API_URL}/drawings/${drawingId}`, {
      method: "PUT",
      credentials: "include",
      keepalive: true,
      headers,
      body: JSON.stringify(body),
    }).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
};
