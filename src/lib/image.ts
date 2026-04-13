const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");

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

  const normalized = rawUrl.trim();
  if (!normalized) {
    return null;
  }

  const absoluteUrl = toAbsoluteImageUrl(normalized);
  if (shouldUseProxyByDefault(absoluteUrl)) {
    return `${API_BASE_URL}/api/public/image-proxy?url=${encodeURIComponent(absoluteUrl)}`;
  }

  return absoluteUrl;
};
