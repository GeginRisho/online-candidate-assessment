import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import type { ApiErrorResponse, ApiSuccessResponse } from '@/types/auth';

/**
 * Normalize the API base URL so it always ends with /api/v1.
 *
 * On Vercel, NEXT_PUBLIC_API_URL may be set to just the Render origin
 * (e.g. https://online-candidate-assessment.onrender.com) without the
 * /api/v1 path prefix. This causes every service call like
 * apiClient.get('/exams') to hit /exams instead of /api/v1/exams.
 *
 * We detect both forms and normalise to the correct base URL:
 *   https://...onrender.com          → https://...onrender.com/api/v1
 *   https://...onrender.com/api/v1   → https://...onrender.com/api/v1  (unchanged)
 */
function buildApiUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/$/, '');
  if (/\/api\/v\d+$/.test(raw)) return raw;
  return `${raw}/api/v1`;
}

const API_URL = buildApiUrl();

// Storage key for persisting the access token across full-page reloads.
// Cross-domain httpOnly cookies cannot travel from Render → Vercel, so we
// persist the short-lived access token in sessionStorage instead.
// sessionStorage is cleared when the browser tab is closed, which gives us
// a reasonable security boundary without requiring refresh-cookie support.
const TOKEN_KEY = 'at';

function readPersistedToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function persistToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // sessionStorage unavailable (e.g. private-browsing restrictions)
  }
}

/**
 * The access token lives in module memory for the current JS execution and
 * is also persisted to sessionStorage so it survives full-page reloads
 * within the same browser tab.
 *
 * It is NEVER stored in localStorage (persists indefinitely) to limit
 * exposure window. sessionStorage is cleared when the tab closes.
 */
let inMemoryAccessToken: string | null = readPersistedToken();

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
  persistToken(token);
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send/receive the httpOnly refresh-token cookie
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = inMemoryAccessToken ?? readPersistedToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    // Sync in-memory if it was read from storage
    if (!inMemoryAccessToken) inMemoryAccessToken = token;
  }
  return config;
});

// --- Refresh-token rotation with request queueing ---------------------------
// If multiple requests 401 simultaneously, only one /auth/refresh call is
// made; the rest wait on the same in-flight promise and retry afterward.

let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  try {
    const response = await axios.post<ApiSuccessResponse<{ accessToken: string }>>(
      `${API_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    const newToken = response.data.data.accessToken;
    setAccessToken(newToken);
    return newToken;
  } catch {
    setAccessToken(null);
    return null;
  }
}

interface RetriableConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh');
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/admin/login') ||
      originalRequest?.url?.includes('/auth/candidate/login') ||
      originalRequest?.url?.includes('/auth/candidate/register');

    if (status === 401 && !isRefreshCall && !isAuthEndpoint && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      refreshPromise ??= performRefresh().finally(() => {
        refreshPromise = null;
      });

      const newToken = await refreshPromise;

      if (newToken) {
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newToken}`,
        };
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  },
);

/** Extracts a human-readable message from a caught Axios error. */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    return data?.message ?? fallback;
  }
  return fallback;
}
