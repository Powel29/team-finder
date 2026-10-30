import { useSyncExternalStore } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';
const SLOW_AFTER_MS = 3000;

export class ApiError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Free-tier hosts sleep when idle; surface a hint if a request is still pending after a few seconds.
let slowRequests = 0;
const listeners = new Set();
const setSlow = (delta) => {
  slowRequests += delta;
  listeners.forEach((l) => l());
};
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useServerWaking = () => useSyncExternalStore(subscribe, () => slowRequests > 0);

/**
 * JSON fetch wrapper for the Team Finder API. Throws ApiError for non-2xx responses.
 * @param {string} path path starting with /api
 * @param {{ method?: string, body?: unknown, signal?: AbortSignal }} [options]
 */
export async function api(path, { method = 'GET', body, signal } = {}) {
  let flaggedSlow = false;
  const timer = setTimeout(() => {
    flaggedSlow = true;
    setSlow(1);
  }, SLOW_AFTER_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      signal,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = data?.error;
      throw new ApiError(res.status, err?.code ?? 'INTERNAL', err?.message ?? 'Something went wrong', err?.details);
    }
    return data;
  } catch (err) {
    if (err instanceof ApiError || err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
    if (flaggedSlow) setSlow(-1);
  }
}

export const apiUrl = (path) => `${BASE_URL}${path}`;

/** Builds a query string, skipping empty values. */
export function toQuery(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) continue;
    search.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/** Maps API validation details onto react-hook-form fields; returns true when something was mapped. */
export function applyServerErrors(error, setError) {
  if (!(error instanceof ApiError) || !error.details?.length) return false;
  for (const d of error.details) setError(d.path || 'root', { type: 'server', message: d.message });
  return true;
}
