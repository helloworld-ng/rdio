export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

/** Performs an API request with the Better Auth session cookie included. */
export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    credentials: 'include',
  })
}

/** Resolves API-relative media paths into browser-ready URLs. */
export function mediaUrl(url: string) {
  return url.startsWith('http') ? url : `${apiBaseUrl}${url}`
}
