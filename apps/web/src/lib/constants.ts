const devApiBaseUrl = "http://localhost:3001/api";
const trailingSlashPattern = /\/+$/;

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(
  trailingSlashPattern,
  ""
);

export const API_BASE_URL =
  configuredApiBaseUrl || (import.meta.env.DEV ? devApiBaseUrl : "/api");

function authBaseUrlFromApiBaseUrl(apiBaseUrl: string) {
  if (apiBaseUrl === "/api") {
    return window.location.origin;
  }

  if (apiBaseUrl.endsWith("/api")) {
    return apiBaseUrl.slice(0, -"/api".length);
  }

  return apiBaseUrl;
}

export const AUTH_BASE_URL = authBaseUrlFromApiBaseUrl(API_BASE_URL);

export const MOBILE_SIDEBAR_QUERY = "(max-width: 620px)";

export const SIDEBAR_STORAGE_KEY = "rdio.sidebar.visible";
