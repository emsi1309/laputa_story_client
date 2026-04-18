import api from "./api";
import { getApiBaseUrl } from "./runtimeConfig";

export type AnalyticsEventType =
  | "PAGE_VIEW"
  | "COMIC_CLICK"
  | "CHAPTER_OPEN"
  | "CHAPTER_COMPLETE"
  | "CHAPTER_EXIT"
  | "SEARCH_SUBMIT";

type AnalyticsEventPayload = {
  eventType: AnalyticsEventType;
  pagePath?: string;
  referrer?: string;
  source?: string;
  context?: string;
  comicSlug?: string;
  chapterSlug?: string;
  durationSeconds?: number;
  progressPercent?: number;
  searchQueryLength?: number;
  occurredAtMs: number;
};

type TrackEventInput = {
  pagePath?: string;
  referrer?: string;
  source?: string;
  context?: string;
  comicSlug?: string;
  chapterSlug?: string;
  durationSeconds?: number;
  progressPercent?: number;
  searchQueryLength?: number;
};

const VISITOR_ID_KEY = "tc_analytics_visitor_id";
const SESSION_ID_KEY = "tc_analytics_session_id";
const SESSION_LAST_SEEN_KEY = "tc_analytics_session_last_seen";
const SESSION_TTL_MS = 30 * 60 * 1000;
const FLUSH_INTERVAL_MS = 4000;
const MAX_BATCH_SIZE = 30;
const MAX_QUEUE_SIZE = 200;

const queue: AnalyticsEventPayload[] = [];
let flushTimer: number | null = null;
let flushInProgress = false;
let lifecycleHooksBound = false;

let memoryVisitorId = "";
let memorySessionId = "";
let memorySessionLastSeen = 0;

const hasBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";

const readLocalStorage = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeLocalStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
  }
};

const readSessionStorage = (key: string) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeSessionStorage = (key: string, value: string) => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
  }
};

const createRandomId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
};

const sanitizeToken = (rawValue: string | null | undefined, maxLength: number) => {
  const normalized = (rawValue || "")
    .trim()
    .replace(/[^a-zA-Z0-9:_-]/g, "");

  if (!normalized) {
    return "";
  }

  return normalized.length <= maxLength ? normalized : normalized.slice(0, maxLength);
};

const ensureVisitorId = () => {
  const existing = sanitizeToken(readLocalStorage(VISITOR_ID_KEY), 128);
  if (existing) {
    memoryVisitorId = existing;
    return existing;
  }

  if (memoryVisitorId) {
    return memoryVisitorId;
  }

  const nextVisitorId = createRandomId();
  memoryVisitorId = nextVisitorId;
  writeLocalStorage(VISITOR_ID_KEY, nextVisitorId);
  return nextVisitorId;
};

const ensureSessionId = () => {
  const now = Date.now();
  const existing = sanitizeToken(readSessionStorage(SESSION_ID_KEY), 64);
  const lastSeen = Number(readSessionStorage(SESSION_LAST_SEEN_KEY) || "0");

  if (existing && Number.isFinite(lastSeen) && now - lastSeen <= SESSION_TTL_MS) {
    writeSessionStorage(SESSION_LAST_SEEN_KEY, String(now));
    memorySessionId = existing;
    memorySessionLastSeen = now;
    return existing;
  }

  if (memorySessionId && now - memorySessionLastSeen <= SESSION_TTL_MS) {
    memorySessionLastSeen = now;
    return memorySessionId;
  }

  const nextSessionId = createRandomId();
  writeSessionStorage(SESSION_ID_KEY, nextSessionId);
  writeSessionStorage(SESSION_LAST_SEEN_KEY, String(now));
  memorySessionId = nextSessionId;
  memorySessionLastSeen = now;
  return nextSessionId;
};

const normalizePath = (rawPath?: string) => {
  const fallback = hasBrowser() ? window.location.pathname || "/" : "/";
  if (!rawPath) {
    return fallback;
  }

  let normalized = rawPath.trim();
  if (!normalized) {
    return fallback;
  }

  if (/^https?:\/\//i.test(normalized)) {
    try {
      normalized = new URL(normalized).pathname;
    } catch {
      return fallback;
    }
  }

  const queryIndex = normalized.indexOf("?");
  if (queryIndex >= 0) {
    normalized = normalized.slice(0, queryIndex);
  }

  const hashIndex = normalized.indexOf("#");
  if (hashIndex >= 0) {
    normalized = normalized.slice(0, hashIndex);
  }

  if (!normalized) {
    return "/";
  }

  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  normalized = normalized.replace(/\/{2,}/g, "/");
  return normalized.slice(0, 400);
};

const normalizeReferrer = (rawReferrer?: string) => {
  const fallback = hasBrowser() ? document.referrer || "" : "";
  const source = (rawReferrer || fallback).trim();
  if (!source) {
    return undefined;
  }

  if (source.startsWith("/")) {
    return source.slice(0, 800);
  }

  if (/^https?:\/\//i.test(source)) {
    try {
      const refUrl = new URL(source);
      return `${refUrl.origin}${refUrl.pathname}`.slice(0, 800);
    } catch {
      return undefined;
    }
  }

  return source.slice(0, 800);
};

const normalizeText = (value: string | undefined, maxLength: number) => {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return undefined;
  }

  return normalized.length <= maxLength ? normalized : normalized.slice(0, maxLength);
};

const normalizeSlug = (value: string | undefined) => {
  const normalized = normalizeText(value, 220);
  if (!normalized) {
    return undefined;
  }
  return normalized.toLowerCase();
};

const clampNumber = (value: number | undefined, min: number, max: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  return Math.max(min, Math.min(max, Math.round(value)));
};

const scheduleFlush = () => {
  if (!hasBrowser() || flushTimer !== null) {
    return;
  }

  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushAnalytics();
  }, FLUSH_INTERVAL_MS);
};

const buildRequestPayload = (events: AnalyticsEventPayload[]) => ({
  sessionId: ensureSessionId(),
  visitorId: ensureVisitorId(),
  events,
});

const trimQueueOverflow = () => {
  if (queue.length > MAX_QUEUE_SIZE) {
    queue.splice(0, queue.length - MAX_QUEUE_SIZE);
  }
};

const flushWithBeacon = () => {
  if (!hasBrowser() || queue.length === 0) {
    return;
  }

  const batch = queue.splice(0, Math.min(queue.length, MAX_BATCH_SIZE));
  const payload = JSON.stringify(buildRequestPayload(batch));
  const endpoint = `${getApiBaseUrl()}/api/public/analytics/events`;

  try {
    if (navigator.sendBeacon(endpoint, new Blob([payload], { type: "application/json" }))) {
      return;
    }
  } catch {
  }

  queue.unshift(...batch);
  trimQueueOverflow();
  void flushAnalytics();
};

const ensureLifecycleHooks = () => {
  if (!hasBrowser() || lifecycleHooksBound) {
    return;
  }

  lifecycleHooksBound = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushWithBeacon();
    }
  });

  window.addEventListener("pagehide", () => {
    flushWithBeacon();
  });

  window.addEventListener("beforeunload", () => {
    flushWithBeacon();
  });
};

export const flushAnalytics = async () => {
  if (!hasBrowser() || flushInProgress || queue.length === 0) {
    return;
  }

  if (flushTimer !== null) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }

  flushInProgress = true;
  const batch = queue.splice(0, Math.min(queue.length, MAX_BATCH_SIZE));

  try {
    await api.post("/api/public/analytics/events", buildRequestPayload(batch));
  } catch {
    queue.unshift(...batch);
    trimQueueOverflow();
  } finally {
    flushInProgress = false;
    if (queue.length > 0) {
      scheduleFlush();
    }
  }
};

export const trackAnalyticsEvent = (eventType: AnalyticsEventType, payload: TrackEventInput = {}) => {
  if (!hasBrowser()) {
    return;
  }

  ensureLifecycleHooks();

  const event: AnalyticsEventPayload = {
    eventType,
    pagePath: normalizePath(payload.pagePath),
    referrer: normalizeReferrer(payload.referrer),
    source: normalizeText(payload.source, 120),
    context: normalizeText(payload.context, 120),
    comicSlug: normalizeSlug(payload.comicSlug),
    chapterSlug: normalizeSlug(payload.chapterSlug),
    durationSeconds: clampNumber(payload.durationSeconds, 0, 86400),
    progressPercent: clampNumber(payload.progressPercent, 0, 100),
    searchQueryLength: clampNumber(payload.searchQueryLength, 0, 500),
    occurredAtMs: Date.now(),
  };

  queue.push(event);
  trimQueueOverflow();

  if (queue.length >= MAX_BATCH_SIZE) {
    void flushAnalytics();
    return;
  }

  scheduleFlush();
};

export const trackPageView = (payload: Omit<TrackEventInput, "durationSeconds" | "progressPercent" | "comicSlug" | "chapterSlug" | "searchQueryLength"> = {}) => {
  trackAnalyticsEvent("PAGE_VIEW", {
    ...payload,
    pagePath: payload.pagePath || (hasBrowser() ? window.location.pathname : "/"),
  });
};
