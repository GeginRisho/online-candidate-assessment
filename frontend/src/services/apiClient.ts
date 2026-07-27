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
  // If the URL already ends with /api/v1 or /api/v1/ leave it as-is
  if (/\/api\/v\d+$/.test(raw)) return raw;
  // Otherwise append /api/v1
  return `${raw}/api/v1`;
}

const API_URL = buildApiUrl();

/**
 * The access token lives only in memory (module scope), never in
 * localStorage/sessionStorage, to keep it out of reach of XSS-based token
 * theft. It's rehydrated on page load via a silent call to /auth/refresh,
 * which relies on the httpOnly refresh-token cookie the browser already
 * holds.
 */
let inMemoryAccessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
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
  if (inMemoryAccessToken) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
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
