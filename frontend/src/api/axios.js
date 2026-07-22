import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5080";

const axiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  // Needed so the browser sends/receives the httpOnly _csrf cookie set by
  // GET /api/csrf-token. The backend's CORS allowlist + credentials:true
  // is what makes this safe (see backend/src/app.js).
  withCredentials: true,
});

/**
 * ---------------------------------------------------------------------------
 * CSRF token handling (client side of the double-submit cookie pattern)
 * ---------------------------------------------------------------------------
 * The backend requires every mutating request (POST/PUT/PATCH/DELETE) to
 * carry an `X-CSRF-Token` header that matches the secret in its `_csrf`
 * cookie. We fetch a token once, cache it in memory (NOT localStorage -
 * it doesn't need to survive a refresh, and there's no benefit to
 * persisting it), and attach it to every mutating request. If the backend
 * ever rejects a request with EBADCSRFTOKEN (e.g. the token rotated), we
 * fetch a fresh one and retry exactly once.
 */
let csrfToken = null;
let csrfTokenPromise = null;

const fetchCsrfToken = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/api/csrf-token`, { withCredentials: true });
  csrfToken = data.csrfToken;
  return csrfToken;
};

const getCsrfToken = async () => {
  if (csrfToken) return csrfToken;
  if (!csrfTokenPromise) csrfTokenPromise = fetchCsrfToken().finally(() => (csrfTokenPromise = null));
  return csrfTokenPromise;
};

const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);

axiosInstance.interceptors.request.use(async (config) => {
  // No Authorization header needed anymore - the access token lives in an
  // httpOnly cookie (see backend/src/controllers/auth.controller.js) and is
  // attached automatically by the browser because withCredentials is set.
  if (MUTATING_METHODS.has((config.method || "get").toLowerCase())) {
    const token = await getCsrfToken();
    if (token) config.headers["X-CSRF-Token"] = token;
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // CSRF token expired/rotated -> refresh once and retry the same request.
    if (
      error.response?.status === 403 &&
      error.response?.data?.message?.toLowerCase().includes("csrf") &&
      original &&
      !original._csrfRetried
    ) {
      original._csrfRetried = true;
      csrfToken = null;
      const freshToken = await getCsrfToken();
      original.headers["X-CSRF-Token"] = freshToken;
      return axiosInstance(original);
    }

    if (error.response?.status === 401) {
      // Let calling code decide whether to redirect; just pass error through
    }
    return Promise.reject(error);
  }
);

export const getMediaUrl = (folder, filename) => {
  if (!filename) return null;
  if (filename.startsWith("http") || filename.startsWith("/public")) {
    return filename.startsWith("http") ? filename : `${API_BASE_URL}${filename}`;
  }
  return `${API_BASE_URL}/public/${folder}/${filename}`;
};

export default axiosInstance;