import { getApiBaseUrl } from "./runtimeConfig";

const API_BASE_URL = getApiBaseUrl();
const LEGACY_STORAGE_PATH_PREFIX = "/net-truyen/";
const API_STORAGE_PATH_PREFIX = "/api/public/storage/";

const normalizeStoragePath = (rawUrl: string) => {
  const normalized = rawUrl.trim();
  if (!normalized) {
    return normalized;
  }

  if (normalized.startsWith(LEGACY_STORAGE_PATH_PREFIX)) {
    return `${API_STORAGE_PATH_PREFIX}${normalized.substring(LEGACY_STORAGE_PATH_PREFIX.length)}`;
  }

  try {
    const parsed = new URL(normalized, window.location.origin);
    const currentHost = window.location.hostname.toLowerCase();
    if (parsed.hostname.toLowerCase() !== currentHost) {
      return normalized;
    }

    if (!parsed.pathname.startsWith(LEGACY_STORAGE_PATH_PREFIX)) {
      return normalized;
    }

    const mappedPath = `${API_STORAGE_PATH_PREFIX}${parsed.pathname.substring(LEGACY_STORAGE_PATH_PREFIX.length)}`;
    if (/^https?:\/\//i.test(normalized)) {
      return `${parsed.protocol}//${parsed.host}${mappedPath}${parsed.search}${parsed.hash}`;
    }

    return `${mappedPath}${parsed.search}${parsed.hash}`;
  } catch {
    return normalized;
  }
};

const toAbsoluteImageUrl = (rawUrl: string) => {
  if (rawUrl.startsWith("/")) {
    return `${API_BASE_URL}${rawUrl}`;
  }

  try {
    return new URL(rawUrl).toString();
  } catch {
    return rawUrl;
  }
};

const shouldUseProxyByDefault = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl, window.location.origin);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") {
      return false;
    }

    const currentHost = window.location.hostname.toLowerCase();
    return parsed.hostname.toLowerCase() !== currentHost;
  } catch {
    return false;
  }
};

export const resolvePublicImageUrl = (rawUrl: string | null | undefined) => {
  if (!rawUrl) {
    return null;
  }

  const normalized = normalizeStoragePath(rawUrl);
  if (!normalized) {
    return null;
  }

  const absoluteUrl = toAbsoluteImageUrl(normalized);
  if (shouldUseProxyByDefault(absoluteUrl)) {
    return `${API_BASE_URL}/api/public/image-proxy?url=${encodeURIComponent(absoluteUrl)}`;
  }

  return absoluteUrl;
};
