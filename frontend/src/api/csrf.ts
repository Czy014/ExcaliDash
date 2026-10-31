import type { InternalAxiosRequestConfig } from "axios";
import { API_URL, api, axios } from "./client";

let csrfToken: string | null = null;
let csrfHeaderName = "x-csrf-token";
let csrfTokenPromise: Promise<void> | null = null;

export const fetchCsrfToken = async (): Promise<void> => {
  const response = await axios.get<{ token: string; header: string }>(
    `${API_URL}/csrf-token`,
    { withCredentials: true },
  );
  csrfToken = response.data.token;
  csrfHeaderName = response.data.header || "x-csrf-token";
};

export const clearCsrfToken = (): void => {
  csrfToken = null;
};

// Exposes the current CSRF header/token so keepalive/sendBeacon saves fired
// during pagehide (where the axios interceptor pipeline can't run) can still
// satisfy the CSRF middleware.
export const getCsrfHeader = (): { name: string; token: string } | null => {
  if (!csrfToken) return null;
  return { name: csrfHeaderName, token: csrfToken };
};

export const ensureCsrfToken = async (): Promise<void> => {
  if (csrfToken) return;
  csrfTokenPromise ||= fetchCsrfToken().finally(() => {
    csrfTokenPromise = null;
  });
  await csrfTokenPromise;
};

api.interceptors.request.use(async (request) => {
  if (
    ["POST", "PUT", "DELETE", "PATCH"].includes(
      request.method?.toUpperCase() || "",
    )
  ) {
    await ensureCsrfToken();
    request.headers[csrfHeaderName] = csrfToken;
  }
  return request;
});

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 403 &&
      typeof error.response.data?.error === "string" &&
      error.response.data.error.includes("CSRF")
    ) {
      const request = error.config as
        (InternalAxiosRequestConfig & { _csrfRetry?: boolean }) | undefined;
      if (request && !request._csrfRetry) {
        request._csrfRetry = true;
        clearCsrfToken();
        await ensureCsrfToken();
        request.headers[csrfHeaderName] = csrfToken;
        return api(request);
      }
    }
    return Promise.reject(error);
  },
);
