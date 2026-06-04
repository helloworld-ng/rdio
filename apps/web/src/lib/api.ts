import { API_BASE_URL } from "@/lib/constants";

const apiBaseUrl = API_BASE_URL;

/** Resolves API-relative paths against the configured backend origin. */
export function apiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
}

/** Performs an API request with the Better Auth session cookie included. */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), {
    ...init,
    credentials: "include",
  });
}

/** Resolves API-relative media paths into browser-ready URLs. */
export function mediaUrl(url: string): string {
  return url.startsWith("http") ? url : `${apiBaseUrl}${url}`;
}
