import { getApiBaseUrl, getMediaBaseUrl } from "./runtimeConfig";

const API_BASE_URL = getApiBaseUrl();
const MEDIA_BASE_URL = getMediaBaseUrl();
const LEGACY_STORAGE_PATH_PREFIX = "/net-truyen/";
const API_STORAGE_PATH_PREFIX = "/api/public/storage/";

const normalizeHost = (host: string) => host.toLowerCase().replace(/^www\./, "");

const isTrustedHost = (host: string) => {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost) {
    return false;
  }

  if (typeof window !== "undefined") {
    const currentHost = normalizeHost(window.location.hostname);
    if (
      normalizedHost === currentHost ||
      normalizedHost.endsWith(`.${currentHost}`) ||
      currentHost.endsWith(`.${normalizedHost}`)
    ) {
      return true;
    }
  }

  if (!MEDIA_BASE_URL) {
    return false;
  }

  try {
    const mediaHost = normalizeHost(new URL(MEDIA_BASE_URL).hostname);
    return (
      normalizedHost === mediaHost ||
      normalizedHost.endsWith(`.${mediaHost}`) ||
      mediaHost.endsWith(`.${normalizedHost}`)
    );
  } catch {
    return false;
  }
};

const mapStorageUrlToMediaBase = (rawUrl: string) => {
  if (!MEDIA_BASE_URL) {
    return rawUrl;
  }

  const normalized = rawUrl.trim();
  if (!normalized) {
    return normalized;
  }

  if (normalized.startsWith(API_STORAGE_PATH_PREFIX)) {
    return `${MEDIA_BASE_URL}/${normalized.substring(API_STORAGE_PATH_PREFIX.length)}`;
  }

  try {
    const baseOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const parsed = new URL(normalized, baseOrigin);
    if (!parsed.pathname.startsWith(API_STORAGE_PATH_PREFIX)) {
      return normalized;
    }

    const mappedPath = `${MEDIA_BASE_URL}/${parsed.pathname.substring(API_STORAGE_PATH_PREFIX.length)}`;
    return `${mappedPath}${parsed.search}${parsed.hash}`;
  } catch {
    return normalized;
  }
};

const normalizeStoragePath = (rawUrl: string) => {
  const normalized = rawUrl.trim();
  if (!normalized) {
    return normalized;
  }

  if (normalized.startsWith(LEGACY_STORAGE_PATH_PREFIX)) {
    return `${API_STORAGE_PATH_PREFIX}${normalized.substring(LEGACY_STORAGE_PATH_PREFIX.length)}`;
  }

  try {
    const baseOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const parsed = new URL(normalized, baseOrigin);
    const currentHost = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
    if (currentHost && parsed.hostname.toLowerCase() !== currentHost) {
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
    const baseOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const parsed = new URL(rawUrl, baseOrigin);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") {
      return false;
    }

    return !isTrustedHost(parsed.hostname);
  } catch {
    return false;
  }
};

export const resolvePublicImageUrl = (rawUrl: string | null | undefined) => {
  if (!rawUrl) {
    return null;
  }

  const normalized = mapStorageUrlToMediaBase(normalizeStoragePath(rawUrl));
  if (!normalized) {
    return null;
  }

  const absoluteUrl = toAbsoluteImageUrl(normalized);
  if (shouldUseProxyByDefault(absoluteUrl)) {
    return `${API_BASE_URL}/api/public/image-proxy?url=${encodeURIComponent(absoluteUrl)}`;
  }

  return absoluteUrl;
};
