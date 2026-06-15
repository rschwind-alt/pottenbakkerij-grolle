const explicitApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

function normalizeExplicitApiBaseUrl() {
  if (!explicitApiBaseUrl || typeof window === "undefined") {
    return explicitApiBaseUrl;
  }

  try {
    const url = new URL(explicitApiBaseUrl);
    const isLocalHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const isRemoteBrowserHost = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";

    if (isLocalHost && isRemoteBrowserHost) {
      url.hostname = window.location.hostname;
      return url.toString().replace(/\/$/, "");
    }
  } catch {
    // Fall back to configured value when parsing fails.
  }

  return explicitApiBaseUrl;
}

export function getApiBaseUrls() {
  const normalizedExplicitApiBaseUrl = normalizeExplicitApiBaseUrl();

  if (normalizedExplicitApiBaseUrl) {
    return [normalizedExplicitApiBaseUrl];
  }

  if (typeof window === "undefined") {
    return ["http://localhost:8000"];
  }

  const sameOriginBaseUrl = window.location.origin;
  const directBackendBaseUrl = `${window.location.protocol}//${window.location.hostname}:8000`;

  if (sameOriginBaseUrl === directBackendBaseUrl) {
    return [sameOriginBaseUrl];
  }

  return [sameOriginBaseUrl, directBackendBaseUrl];
}
const LANGUAGE_STORAGE_KEY = "grolle_language";

export function getPreferredLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "de" || stored === "nl") {
      return stored;
    }
  } catch {
    // ignore storage access issues
  }

  if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("de")) {
    return "de";
  }

  return "nl";
}

export function buildApiHeaders(headersInit) {
  const headers = new Headers(headersInit || {});
  if (!headers.has("Accept-Language")) {
    headers.set("Accept-Language", getPreferredLanguage());
  }
  return headers;
}

export async function apiFetch(path, options = {}) {
  const headers = buildApiHeaders(options.headers);
  const isFormDataBody = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!headers.has("Content-Type") && options.body && !isFormDataBody) {
    headers.set("Content-Type", "application/json");
  }

  const baseUrls = getApiBaseUrls();
  let lastResponse = null;
  let lastError = null;

  for (const baseUrl of baseUrls) {
    try {
      const response = await fetch(new URL(path, baseUrl).toString(), {
        ...options,
        headers,
      });
      lastResponse = response;
      if (response.ok || baseUrls.length === 1) {
        return response;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError && !lastResponse) {
    throw lastError;
  }

  return lastResponse;
}

export async function parseApiError(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    return `HTTP ${response.status}`;
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (payload?.detail) {
    return payload.detail;
  }

  const firstEntry = Object.entries(payload || {})[0];
  if (firstEntry) {
    const [field, value] = firstEntry;
    if (Array.isArray(value) && value.length > 0) {
      return `${field}: ${value[0]}`;
    }
    if (typeof value === "string") {
      return `${field}: ${value}`;
    }
  }

  return getPreferredLanguage() === "de"
    ? "Beim Verarbeiten deiner Anfrage ist etwas schiefgelaufen."
    : "Er is iets misgegaan bij het verwerken van je verzoek.";
}

export function getApiBaseUrl() {
  return getApiBaseUrls()[0];
}
