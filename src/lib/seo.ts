type SeoOptions = {
  title?: string;
  description?: string;
  keywords?: string;
  path?: string;
  image?: string;
  type?: string;
  noindex?: boolean;
  structuredData?: unknown;
};

export const SITE_NAME = "Truyện Chill";
const DEFAULT_TITLE = "Truyện Chill - Đọc truyện tranh miễn phí mỗi ngày";
const DEFAULT_DESCRIPTION =
  "Đọc truyện tranh miễn phí, cập nhật nhanh chương mới mỗi ngày tại Truyện Chill.";
const DEFAULT_KEYWORDS = "truyện tranh, đọc truyện online, truyện tranh miễn phí, truyện chill";
const DEFAULT_IMAGE = "/logo-truyen-chill.png";
const STRUCTURED_DATA_SELECTOR = "script[data-seo=structured-data]";
const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

const resolveAbsoluteUrl = (value: string) => {
  if (ABSOLUTE_URL_REGEX.test(value)) {
    return value;
  }

  if (typeof window === "undefined") {
    return value;
  }

  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return new URL(normalizedPath, window.location.origin).toString();
};

const ensureMetaTag = (selector: string, key: "name" | "property", value: string) => {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(key, value);
    document.head.appendChild(tag);
  }
  return tag;
};

const setMetaByName = (name: string, content: string) => {
  const tag = ensureMetaTag(`meta[name=\"${name}\"]`, "name", name);
  tag.setAttribute("content", content);
};

const setMetaByProperty = (property: string, content: string) => {
  const tag = ensureMetaTag(`meta[property=\"${property}\"]`, "property", property);
  tag.setAttribute("content", content);
};

const setCanonical = (href: string) => {
  let canonical = document.head.querySelector<HTMLLinkElement>("link[rel=\"canonical\"]");
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", href);
};

const setStructuredData = (data: unknown) => {
  const existing = Array.from(document.head.querySelectorAll<HTMLScriptElement>(STRUCTURED_DATA_SELECTOR));
  if (!data) {
    for (const script of existing) {
      script.remove();
    }
    return;
  }

  let script = existing[0];
  if (!script) {
    script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    script.setAttribute("data-seo", "structured-data");
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(data);

  for (let index = 1; index < existing.length; index += 1) {
    existing[index].remove();
  }
};

export const updateDocumentSeo = (options: SeoOptions = {}) => {
  if (typeof document === "undefined") {
    return;
  }

  const title = options.title?.trim() || DEFAULT_TITLE;
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const description = options.description?.trim() || DEFAULT_DESCRIPTION;
  const keywords = options.keywords?.trim() || DEFAULT_KEYWORDS;
  const path = options.path || window.location.pathname + window.location.search;
  const canonicalUrl = resolveAbsoluteUrl(path);
  const imageUrl = resolveAbsoluteUrl(options.image || DEFAULT_IMAGE);
  const robotsValue = options.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large";

  document.title = fullTitle;

  setMetaByName("description", description);
  setMetaByName("keywords", keywords);
  setMetaByName("robots", robotsValue);

  setMetaByProperty("og:site_name", SITE_NAME);
  setMetaByProperty("og:locale", "vi_VN");
  setMetaByProperty("og:type", options.type || "website");
  setMetaByProperty("og:title", fullTitle);
  setMetaByProperty("og:description", description);
  setMetaByProperty("og:url", canonicalUrl);
  setMetaByProperty("og:image", imageUrl);

  setMetaByName("twitter:card", "summary_large_image");
  setMetaByName("twitter:title", fullTitle);
  setMetaByName("twitter:description", description);
  setMetaByName("twitter:image", imageUrl);

  setCanonical(canonicalUrl);
  setStructuredData(options.structuredData);
};
