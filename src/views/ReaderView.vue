<template>
  <section class="reader-wrap" v-if="readerData">
    <div class="reader-head">
      <div>
        <router-link :to="`/comic/${readerData.comic.slug}`" class="back-link">← Về chi tiết</router-link>
        <h1>{{ readerData.comic.title }}</h1>
        <p>{{ readerData.chapter.title }} · Trang {{ currentPage }}/{{ readerData.pages.length }}</p>
        <p>{{ formatPublishedAt(readerData.chapter.publishedAt) }} · {{ formatCount(readerData.chapter.viewCount) }} lượt xem</p>
        <div class="reader-jump-wrap" v-if="chapterOptions.length">
          <label for="reader-chapter-select">Nhảy chương:</label>
          <select
            id="reader-chapter-select"
            v-model="selectedChapterSlug"
            @change="jumpToSelectedChapter"
          >
            <option v-for="chapter in chapterOptions" :key="chapter.id" :value="chapter.slug">
              {{ formatChapterLabel(chapter) }}
            </option>
          </select>
        </div>

        <div class="reader-server-wrap">
          <span>Server ảnh:</span>
          <button
            type="button"
            class="reader-server-btn"
            :class="{ active: selectedImageServer === 1 }"
            @click="setImageServer(1)"
          >
            Server 1
          </button>
          <button
            type="button"
            class="reader-server-btn"
            :class="{ active: selectedImageServer === 2 }"
            :disabled="!hasServer2Images"
            @click="setImageServer(2)"
          >
            Server 2
          </button>
        </div>
      </div>
      <div class="reader-nav-btns">
        <router-link
          v-if="readerData.prevChapter"
          class="reader-arrow-btn"
          :to="`/read/${readerData.comic.slug}/${readerData.prevChapter.slug}`"
          aria-label="Chương trước"
          title="Chương trước"
        >
          <span aria-hidden="true">&larr;</span>
        </router-link>
        <router-link
          v-if="readerData.nextChapter"
          class="reader-arrow-btn"
          :to="`/read/${readerData.comic.slug}/${readerData.nextChapter.slug}`"
          aria-label="Chương sau"
          title="Chương sau"
        >
          <span aria-hidden="true">&rarr;</span>
        </router-link>
      </div>
    </div>

    <div
      class="reader-pages"
      @touchstart.passive="handleTouchStart"
      @touchend.passive="handleTouchEnd"
      @touchcancel.passive="resetSwipeTracking"
    >
      <figure
        v-for="page in readerData.pages"
        :key="page.id"
        class="reader-page"
        :data-page-index="page.pageIndex"
      >
        <img
          :data-src="resolveImageSource(page)"
          :src="PLACEHOLDER_IMAGE"
          :alt="`Page ${page.pageIndex}`"
          :style="getPageImageStyle(page)"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          @load="handlePageImageLoad(page, $event)"
          @error="markImageAsBlocked(page, $event)"
        />
      </figure>
    </div>

    <div class="reader-foot-nav">
      <router-link
        v-if="readerData.prevChapter"
        class="reader-arrow-btn"
        :to="`/read/${readerData.comic.slug}/${readerData.prevChapter.slug}`"
        aria-label="Chương trước"
        title="Chương trước"
      >
        <span aria-hidden="true">&larr;</span>
      </router-link>
      <router-link
        v-if="readerData.nextChapter"
        class="reader-arrow-btn"
        :to="`/read/${readerData.comic.slug}/${readerData.nextChapter.slug}`"
        aria-label="Chương sau"
        title="Chương sau"
      >
        <span aria-hidden="true">&rarr;</span>
      </router-link>
    </div>

    <article class="social-card" style="margin-top: 14px;">
      <div class="section-head" style="margin-bottom: 10px;">
        <h2>Bình luận chương</h2>
      </div>

      <form class="comment-composer" @submit.prevent="submitChapterComment">
        <input
          v-if="!auth.isAuthenticated"
          class="comment-guest-input"
          v-model="guestCommentName"
          maxlength="120"
          placeholder="Tên hiển thị của bạn"
        />
        <textarea
          class="comment-input"
          v-model="chapterCommentText"
          rows="2"
          maxlength="2000"
          placeholder="Viết bình luận công khai..."
        ></textarea>
        <div class="replying-banner" v-if="replyingToChapterComment">
          <span>
            Đang trả lời <strong>{{ replyingToChapterComment.userDisplayName }}</strong>
          </span>
          <button type="button" class="comment-reply-cancel" @click="cancelChapterReply">Hủy</button>
        </div>
        <div class="comment-composer-actions">
          <button class="comment-submit" type="submit">Đăng bình luận</button>
        </div>
      </form>

      <div class="comment-list" v-if="threadedChapterComments.length">
        <article
          class="comment-item"
          :class="{ 'comment-item-reply': comment.depth > 0 }"
          :style="{ marginLeft: `${Math.min(comment.depth, 4) * 16}px` }"
          v-for="comment in threadedChapterComments"
          :key="comment.id"
        >
          <div class="comment-head">
            <div class="comment-meta">
              <div class="comment-author">
                <strong>{{ comment.userDisplayName }}</strong>
                <span class="comment-role" :class="commentRoleClass(comment.userRole)">
                  {{ commentRoleLabel(comment.userRole) }}
                </span>
              </div>
              <span class="comment-reply-to" v-if="comment.replyToDisplayName">
                Trả lời {{ comment.replyToDisplayName }}
              </span>
            </div>
            <div class="comment-actions">
              <span>{{ formatCommentTime(comment.createdAt) }}</span>
              <button type="button" class="comment-reply" @click="startChapterReply(comment)">Trả lời</button>
              <button
                type="button"
                class="comment-delete"
                v-if="comment.mine"
                @click="removeChapterComment(comment.id)"
              >
                Xóa
              </button>
            </div>
          </div>
          <p>{{ comment.content }}</p>
        </article>
      </div>
      <p v-else class="empty-text">Chưa có bình luận nào cho chương này.</p>

      <div class="social-row social-row-stack" style="margin-top: 10px;">
        <h3 style="margin: 0;">Báo cáo nội dung chương</h3>
        <select v-model="chapterReportReason">
          <option value="SPAM">Spam</option>
          <option value="INAPPROPRIATE">Không phù hợp</option>
          <option value="COPYRIGHT">Bản quyền</option>
          <option value="HARASSMENT">Quấy rối</option>
          <option value="OTHER">Khác</option>
        </select>
        <textarea v-model="chapterReportDetails" rows="3" placeholder="Mô tả thêm (tuỳ chọn)"></textarea>
        <button class="secondary-btn" type="button" @click="submitChapterReport">Gửi báo cáo</button>
      </div>

      <p v-if="readerNotice" class="search-info">{{ readerNotice }}</p>
    </article>

    <div class="reader-scroll-controls">
      <!-- Desktop / non-mobile: preserve existing simple click buttons -->
      <template v-if="!isMobileDevice">
        <button
          type="button"
          class="reader-scroll-btn"
          aria-label="Lên đầu trang"
          title="Lên đầu trang"
          @click="scrollToTop"
        >
          <span aria-hidden="true">&uarr;</span>
        </button>
        <button
          type="button"
          class="reader-scroll-btn"
          aria-label="Xuống cuối trang"
          title="Xuống cuối trang"
          @click="scrollToBottom"
        >
          <span aria-hidden="true">&darr;</span>
        </button>
      </template>

      <!-- Mobile: single rectangular press-and-drag seek control.
           User presses and drags finger up/down to scroll quickly. -->
      <template v-else>
        <button
          type="button"
          class="reader-scroll-btn reader-scroll-btn-mobile-rect"
          aria-label="Giữ và kéo để cuộn nhanh"
          title="Nhấn giữ và kéo lên/xuống để cuộn nhanh"
          @touchstart.prevent="startMobileDrag($event)"
          @touchmove.prevent="mobileDragMove($event)"
          @touchend.prevent="stopHoldScroll"
          @touchcancel.prevent="stopHoldScroll"
        >
          <span class="reader-scroll-mobile-handle">
            <svg width="18" height="36" viewBox="0 0 18 36" fill="none" aria-hidden="true">
              <path d="M9 6 L5 10 M9 6 L13 10 M9 30 L5 26 M9 30 L13 26" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </button>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../lib/api";
import { trackAnalyticsEvent } from "../lib/analytics";
import { getApiBaseUrl, getMediaBaseUrl } from "../lib/runtimeConfig";
import { useAuthStore } from "../stores/auth";
import type { ChapterBrief, CommentItem, ComicDetail, ReaderData } from "../types";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const readerData = ref<ReaderData | null>(null);
const chapterOptions = ref<ChapterBrief[]>([]);
const selectedChapterSlug = ref("");
const selectedImageServer = ref<1 | 2>(1);
const currentPage = ref(1);
const imageFallbackMap = ref<Record<number, number>>({});
const pageImageDimensions = ref<Record<number, { width: number; height: number }>>({});
const blockedImageHosts = ref<Set<string>>(new Set());
const swipeStartX = ref<number | null>(null);
const swipeStartY = ref<number | null>(null);
const swipeStartAt = ref(0);
const swipeRouteLock = ref(false);
const chapterOptionsComicSlug = ref<string | null>(null);
const chapterComments = ref<CommentItem[]>([]);
const chapterCommentText = ref("");
const guestCommentName = ref(localStorage.getItem("guest_comment_name") || "");
const replyingToChapterComment = ref<CommentItem | null>(null);
const chapterReportReason = ref("SPAM");
const chapterReportDetails = ref("");
const readerNotice = ref("");
let syncTimer: number | null = null;
const API_BASE_URL = getApiBaseUrl();
const MEDIA_BASE_URL = getMediaBaseUrl();
const READER_CACHE_PREFIX = "reader_cache:v2:";
const VIEWED_CHAPTER_PREFIX = "viewed_chapter:";
const BLOCKED_IMAGE_HOSTS_KEY = "reader:blocked_image_hosts";
const READER_CACHE_TTL_MS = 30 * 60 * 1000;
const READER_PROGRESS_FRESH_MS = 6 * 60 * 60 * 1000;
const READER_ANALYTICS_ENABLED = false;
const PLACEHOLDER_IMAGE = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
let imageObserver: IntersectionObserver | null = null;
let fallbackLazyCleanup: (() => void) | null = null;
let prefetchedImageSources = new Set<string>();
const VIEWED_CHAPTER_TTL_MS = 30 * 60 * 1000;
const MAX_LOCAL_CHAPTER_ITEMS = 30;
const MAX_BLOCKED_IMAGE_HOSTS = 40;
const DEFAULT_PROXY_IMAGE_HOSTS = ["truyenvua.com", "hinhhinh.com", "hinhinh.com", "tintruyen.net"];
const MAX_IMAGE_RETRY_ATTEMPTS = 2;
const MOBILE_VIEWPORT_MAX_WIDTH = 768;
const MOBILE_LAZY_ROOT_MARGIN = "180px";
const DESKTOP_LAZY_ROOT_MARGIN = "400px";
const DESKTOP_PREFETCH_NEIGHBOR_COUNT = 1;
const BACKGROUND_IMAGE_KEEP_RADIUS = 2; // Tăng từ 1 lên 2 để giữ nhiều ảnh hơn
const MOBILE_MEMORY_TRIM_RADIUS = 5; // Tăng từ 3 lên 5 cho mobile
const MOBILE_MEMORY_TRIM_INTERVAL_MS = 1000; // Tăng từ 450ms lên 1s để giảm tần suất
const COMMENT_COOLDOWN_MS = 60 * 1000;
const REPORT_COOLDOWN_MS = 60 * 1000;
const HEADER_SCROLL_DELTA = 14;
const HEADER_TOP_VISIBLE_THRESHOLD = 24;
const HEADER_TOGGLE_SETTLE_MS = 220;
const lastScrollY = ref(0);
const isReaderHeaderVisible = ref(true);
const headerAutoPauseUntil = ref(0);
const chapterStartedAtMs = ref(0);
const chapterCompletedTracked = ref(false);
const chapterExitTracked = ref(false);
let lastMobileMemoryTrimAt = 0;
let mobileMemoryTrimDebounceTimer: number | null = null;
let offsetSaveDebounceTimer: number | null = null;

type ThreadedCommentItem = CommentItem & {
  depth: number;
};

type ReaderPageItem = ReaderData["pages"][number];

const hasServer2Images = computed(() =>
  Boolean(readerData.value?.pages.some((page) => Boolean(page.sourceImageUrl?.trim())))
);

const toTimestamp = (value: string) => {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const emitReaderHeaderVisibility = (visible: boolean) => {
  window.dispatchEvent(new CustomEvent("reader-header-visibility", { detail: { visible } }));
};

const setReaderHeaderVisibility = (visible: boolean, force = false) => {
  if (!force && isReaderHeaderVisible.value === visible) {
    return;
  }

  isReaderHeaderVisible.value = visible;
  headerAutoPauseUntil.value = performance.now() + HEADER_TOGGLE_SETTLE_MS;
  lastScrollY.value = window.scrollY;
  emitReaderHeaderVisibility(visible);
};

const currentReaderPath = () => {
  if (!readerData.value) {
    return "/read";
  }

  return `/read/${readerData.value.comic.slug}/${readerData.value.chapter.slug}`;
};

const handlePageImageLoad = (page: ReaderPageItem, event: Event) => {
  const imageElement = event.target instanceof HTMLImageElement ? event.target : null;
  if (!imageElement) {
    return;
  }

  const width = imageElement.naturalWidth;
  const height = imageElement.naturalHeight;
  if (!width || !height) {
    return;
  }

  const existing = pageImageDimensions.value[page.id];
  if (existing && existing.width === width && existing.height === height) {
    return;
  }

  const nextDimensions = {
    ...pageImageDimensions.value,
    [page.id]: { width, height },
  };
  pageImageDimensions.value = nextDimensions;
  writeStoredPageImageDimensions(nextDimensions);
};

const getPageImageStyle = (page: ReaderPageItem) => {
  const dimensions = pageImageDimensions.value[page.id];
  if (!dimensions) {
    return {};
  }

  return {
    width: "100%",
    height: "auto",
    aspectRatio: `${dimensions.width}/${dimensions.height}`,
    minHeight: "auto",
  } as const;
};

const currentReaderProgressPercent = () => {
  if (!readerData.value || !readerData.value.pages.length) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round((currentPage.value / readerData.value.pages.length) * 100))
  );
};

const currentReaderDurationSeconds = () => {
  if (!chapterStartedAtMs.value) {
    return 0;
  }

  return Math.max(0, Math.round((Date.now() - chapterStartedAtMs.value) / 1000));
};

const startChapterAnalyticsSession = () => {
  if (!readerData.value) {
    return;
  }

  chapterStartedAtMs.value = Date.now();
  chapterCompletedTracked.value = false;
  chapterExitTracked.value = false;

  if (!READER_ANALYTICS_ENABLED) {
    return;
  }

  trackAnalyticsEvent("CHAPTER_OPEN", {
    pagePath: currentReaderPath(),
    context: "reader_open",
    source: "internal",
    comicSlug: readerData.value.comic.slug,
    chapterSlug: readerData.value.chapter.slug,
  });
};

const trackChapterCompletion = () => {
  if (!readerData.value || chapterCompletedTracked.value) {
    return;
  }

  chapterCompletedTracked.value = true;
  chapterExitTracked.value = true;

  if (!READER_ANALYTICS_ENABLED) {
    return;
  }

  trackAnalyticsEvent("CHAPTER_COMPLETE", {
    pagePath: currentReaderPath(),
    context: "reader_complete",
    source: "internal",
    comicSlug: readerData.value.comic.slug,
    chapterSlug: readerData.value.chapter.slug,
    durationSeconds: currentReaderDurationSeconds(),
    progressPercent: 100,
  });
};

const trackChapterExitIfNeeded = () => {
  if (!readerData.value || chapterExitTracked.value) {
    return;
  }

  chapterExitTracked.value = true;
  if (!READER_ANALYTICS_ENABLED) {
    return;
  }

  const progress = currentReaderProgressPercent();
  if (progress >= 98) {
    return;
  }

  trackAnalyticsEvent("CHAPTER_EXIT", {
    pagePath: currentReaderPath(),
    context: "reader_exit",
    source: "internal",
    comicSlug: readerData.value.comic.slug,
    chapterSlug: readerData.value.chapter.slug,
    durationSeconds: currentReaderDurationSeconds(),
    progressPercent: progress,
  });
};

const threadedChapterComments = computed<ThreadedCommentItem[]>(() => {
  const source = chapterComments.value;
  if (!source.length) {
    return [];
  }

  const byId = new Map<number, CommentItem>();
  const childrenMap = new Map<number, CommentItem[]>();
  for (const comment of source) {
    byId.set(comment.id, comment);
    if (comment.parentId != null) {
      const children = childrenMap.get(comment.parentId) || [];
      children.push(comment);
      childrenMap.set(comment.parentId, children);
    }
  }

  const roots = source
    .filter((comment) => comment.parentId == null || !byId.has(comment.parentId))
    .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));

  for (const children of childrenMap.values()) {
    children.sort((a, b) => toTimestamp(a.createdAt) - toTimestamp(b.createdAt));
  }

  const flattened: ThreadedCommentItem[] = [];
  const visited = new Set<number>();

  const walk = (node: CommentItem, depth: number) => {
    if (visited.has(node.id)) {
      return;
    }

    visited.add(node.id);
    flattened.push({ ...node, depth });
    const children = childrenMap.get(node.id) || [];
    for (const child of children) {
      walk(child, Math.min(depth + 1, 6));
    }
  };

  for (const root of roots) {
    walk(root, 0);
  }

  if (flattened.length < source.length) {
    const leftovers = source
      .filter((comment) => !visited.has(comment.id))
      .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));
    for (const comment of leftovers) {
      flattened.push({ ...comment, depth: 0 });
    }
  }

  return flattened;
});

const formatCount = (value: number | null | undefined) => new Intl.NumberFormat("vi-VN").format(value || 0);

const formatPublishedAt = (value: string | null | undefined) => {
  if (!value) {
    return "Chưa cập nhật thời gian";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

const storageKey = computed(
  () => `reader:${String(route.params.comicSlug)}:${String(route.params.chapterSlug)}`
);

const pageImageDimensionsStorageKey = computed(
  () => `${storageKey.value}:image-dimensions`
);

const shouldForceRestoreSavedPage = computed(() => {
  const resume = route.query.resume;
  if (Array.isArray(resume)) {
    return resume.includes("1");
  }
  return resume === "1";
});

type ReaderProgressSnapshot = {
  pageIndex: number;
  savedAt: number;
  // optional offset as percentage (0..1) from top of the page element
  offsetPercent?: number;
};

const readSavedProgress = (): ReaderProgressSnapshot | null => {
  const raw = localStorage.getItem(storageKey.value);
  if (!raw) {
    return null;
  }

  const legacyPageIndex = Number(raw);
  if (Number.isFinite(legacyPageIndex) && legacyPageIndex > 0) {
    const migrated: ReaderProgressSnapshot = {
      pageIndex: Math.floor(legacyPageIndex),
      savedAt: Date.now(),
    };
    localStorage.setItem(storageKey.value, JSON.stringify(migrated));
    return migrated;
  }

  try {
    const parsed = JSON.parse(raw) as { pageIndex?: number; savedAt?: number; offsetPercent?: number };
    const pageIndex = Number(parsed.pageIndex);
    const savedAt = Number(parsed.savedAt);
    const offsetPercent = Number(parsed.offsetPercent);
    if (!Number.isFinite(pageIndex) || pageIndex < 1) {
      localStorage.removeItem(storageKey.value);
      return null;
    }

    return {
      pageIndex: Math.floor(pageIndex),
      savedAt: Number.isFinite(savedAt) && savedAt > 0 ? Math.floor(savedAt) : 0,
      offsetPercent: Number.isFinite(offsetPercent) && offsetPercent >= 0 && offsetPercent <= 1
        ? offsetPercent
        : undefined,
    };
  } catch {
    localStorage.removeItem(storageKey.value);
    return null;
  }
};

const writeSavedProgress = (pageIndex: number, offsetPercent?: number) => {
  const normalizedPage = Math.max(1, Math.floor(pageIndex));
  try {
    const payload: { pageIndex: number; savedAt: number; offsetPercent?: number } = {
      pageIndex: normalizedPage,
      savedAt: Date.now(),
    };
    if (typeof offsetPercent === "number" && Number.isFinite(offsetPercent)) {
      payload.offsetPercent = Math.max(0, Math.min(1, offsetPercent));
    }
    localStorage.setItem(storageKey.value, JSON.stringify(payload));
  } catch {
    // ignore storage failures
  }
};

const readStoredPageImageDimensions = (): Record<number, { width: number; height: number }> => {
  const raw = localStorage.getItem(pageImageDimensionsStorageKey.value);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, { width?: number; height?: number }>;
    return Object.entries(parsed).reduce<Record<number, { width: number; height: number }>>(
      (acc, [key, value]) => {
        const pageId = Number(key);
        const width = Number(value?.width);
        const height = Number(value?.height);
        if (!Number.isFinite(pageId) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
          return acc;
        }
        acc[pageId] = { width: Math.floor(width), height: Math.floor(height) };
        return acc;
      },
      {}
    );
  } catch {
    localStorage.removeItem(pageImageDimensionsStorageKey.value);
    return {};
  }
};

const writeStoredPageImageDimensions = (dimensions: Record<number, { width: number; height: number }>) => {
  try {
    localStorage.setItem(pageImageDimensionsStorageKey.value, JSON.stringify(dimensions));
  } catch {
    // Ignore storage failures
  }
};

const loadStoredPageImageDimensions = () => {
  pageImageDimensions.value = readStoredPageImageDimensions();
};

const getReaderCacheKey = (comicSlug: string, chapterSlug: string) =>
  `${READER_CACHE_PREFIX}${comicSlug}:${chapterSlug}`;

const getViewedChapterKey = (comicSlug: string, chapterSlug: string) =>
  `${VIEWED_CHAPTER_PREFIX}${comicSlug}:${chapterSlug}`;

const pruneReaderCacheStorage = () => {
  const now = Date.now();
  const keys: string[] = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && key.startsWith(READER_CACHE_PREFIX)) {
      keys.push(key);
    }
  }

  const entries: Array<{ key: string; savedAt: number }> = [];
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.removeItem(key);
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as { savedAt?: number };
      const savedAt = Number(parsed.savedAt);
      if (!savedAt || Number.isNaN(savedAt) || now - savedAt > READER_CACHE_TTL_MS) {
        localStorage.removeItem(key);
        continue;
      }
      entries.push({ key, savedAt });
    } catch {
      localStorage.removeItem(key);
    }
  }

  if (entries.length <= MAX_LOCAL_CHAPTER_ITEMS) {
    return;
  }

  entries.sort((a, b) => b.savedAt - a.savedAt);
  for (const entry of entries.slice(MAX_LOCAL_CHAPTER_ITEMS)) {
    localStorage.removeItem(entry.key);
  }
};

const pruneViewedChapterStorage = () => {
  const now = Date.now();
  const keys: string[] = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && key.startsWith(VIEWED_CHAPTER_PREFIX)) {
      keys.push(key);
    }
  }

  const entries: Array<{ key: string; viewedAt: number }> = [];
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    const viewedAt = raw ? Number(raw) : 0;
    if (!viewedAt || Number.isNaN(viewedAt) || now - viewedAt > VIEWED_CHAPTER_TTL_MS) {
      localStorage.removeItem(key);
      continue;
    }
    entries.push({ key, viewedAt });
  }

  if (entries.length <= MAX_LOCAL_CHAPTER_ITEMS) {
    return;
  }

  entries.sort((a, b) => b.viewedAt - a.viewedAt);
  for (const entry of entries.slice(MAX_LOCAL_CHAPTER_ITEMS)) {
    localStorage.removeItem(entry.key);
  }
};

const readCachedReader = (comicSlug: string, chapterSlug: string) => {
  const cacheKey = getReaderCacheKey(comicSlug, chapterSlug);
  const raw = localStorage.getItem(cacheKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { savedAt?: number; data?: ReaderData };
    if (!parsed || !parsed.savedAt || !parsed.data) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    if (Date.now() - parsed.savedAt > READER_CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return parsed.data;
  } catch {
    localStorage.removeItem(cacheKey);
    return null;
  }
};

const saveCachedReader = (comicSlug: string, chapterSlug: string, data: ReaderData) => {
  const cacheKey = getReaderCacheKey(comicSlug, chapterSlug);
  localStorage.setItem(
    cacheKey,
    JSON.stringify({
      savedAt: Date.now(),
      data,
    })
  );
  pruneReaderCacheStorage();
};

const shouldRequestReaderApi = (comicSlug: string, chapterSlug: string) => {
  pruneViewedChapterStorage();

  const viewedKey = getViewedChapterKey(comicSlug, chapterSlug);
  const lastViewRaw = localStorage.getItem(viewedKey);
  const lastView = lastViewRaw ? Number(lastViewRaw) : 0;
  const now = Date.now();

  if (!lastView || Number.isNaN(lastView) || now - lastView > VIEWED_CHAPTER_TTL_MS) {
    localStorage.setItem(viewedKey, String(now));
    pruneViewedChapterStorage();
    return true;
  }

  return false;
};

const loadChapterOptions = async (comicSlug: string) => {
  if (chapterOptionsComicSlug.value === comicSlug && chapterOptions.value.length) {
    return;
  }

  try {
    const detailResponse = await api.get<ComicDetail>(`/api/public/comics/${comicSlug}`);
    chapterOptions.value = detailResponse.data.chapters || [];
    chapterOptionsComicSlug.value = comicSlug;
  } catch {
    chapterOptions.value = [];
    chapterOptionsComicSlug.value = null;
  }
};

const saveProgress = (pageIndex: number) => {
  // Try to include an offsetPercent when saving progress so restores land
  // inside very tall images instead of at the top. Only include offset if
  // the target element has a sensible height to avoid saving 0 while images
  // are still placeholders.
  try {
    const target = document.querySelector<HTMLElement>(`.reader-page[data-page-index='${pageIndex}']`);
    if (target) {
      const pageTop = target.offsetTop;
      const pageHeight = Math.max(1, target.getBoundingClientRect().height || target.offsetHeight || 1);
      const offset = Math.max(0, window.scrollY - pageTop);
      const offsetPercent = Math.max(0, Math.min(1, offset / pageHeight));
      // Only persist offsetPercent when the page appears to have reasonable
      // height (avoid saving 0 while the real image hasn't rendered yet).
      if (pageHeight >= 120) {
        writeSavedProgress(pageIndex, offsetPercent);
      } else {
        writeSavedProgress(pageIndex);
      }
    } else {
      writeSavedProgress(pageIndex);
    }
  } catch {
    writeSavedProgress(pageIndex);
  }

  if (!auth.isAuthenticated || !readerData.value) {
    return;
  }

  if (syncTimer) {
    window.clearTimeout(syncTimer);
  }

  syncTimer = window.setTimeout(async () => {
    if (!readerData.value) {
      return;
    }
    try {
      await api.post("/api/user/history", {
        comicId: readerData.value.comic.id,
        chapterId: readerData.value.chapter.id,
        pageIndex,
      });
    } catch {
    }
  }, 700);
};

const parseExternalImageHost = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl, window.location.origin);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") {
      return null;
    }

    const host = parsed.hostname.toLowerCase();
    if (!host || isTrustedImageHost(host)) {
      return null;
    }

    return host;
  } catch {
    return null;
  }
};

const LEGACY_STORAGE_PATH_PREFIX = "/net-truyen/";
const API_STORAGE_PATH_PREFIX = "/api/public/storage";
const API_STORAGE_PATH_PREFIX_WITH_SLASH = `${API_STORAGE_PATH_PREFIX}/`;

const normalizeHost = (host: string) => host.toLowerCase().replace(/^www\./, "");

const isTrustedImageHost = (host: string) => {
  const normalizedHost = normalizeHost(host);
  const currentHost = normalizeHost(window.location.hostname);
  if (
    normalizedHost === currentHost
    || normalizedHost.endsWith(`.${currentHost}`)
    || currentHost.endsWith(`.${normalizedHost}`)
  ) {
    return true;
  }

  if (!MEDIA_BASE_URL) {
    return false;
  }

  try {
    const mediaHost = normalizeHost(new URL(MEDIA_BASE_URL).hostname);
    return (
      normalizedHost === mediaHost
      || normalizedHost.endsWith(`.${mediaHost}`)
      || mediaHost.endsWith(`.${normalizedHost}`)
    );
  } catch {
    return false;
  }
};

const mapStoragePathToMediaBase = (rawUrl: string) => {
  if (!MEDIA_BASE_URL || !rawUrl) {
    return rawUrl;
  }

  const normalizedRaw = rawUrl.trim();
  if (!normalizedRaw) {
    return normalizedRaw;
  }

  if (normalizedRaw.startsWith(API_STORAGE_PATH_PREFIX_WITH_SLASH)) {
    return `${MEDIA_BASE_URL}/${normalizedRaw.substring(API_STORAGE_PATH_PREFIX_WITH_SLASH.length)}`;
  }

  try {
    const parsed = new URL(normalizedRaw, window.location.origin);
    const currentHost = window.location.hostname.toLowerCase();
    if (parsed.hostname.toLowerCase() !== currentHost) {
      return normalizedRaw;
    }

    if (!parsed.pathname.startsWith(API_STORAGE_PATH_PREFIX_WITH_SLASH)) {
      return normalizedRaw;
    }

    const mappedPath = `${MEDIA_BASE_URL}/${parsed.pathname.substring(API_STORAGE_PATH_PREFIX_WITH_SLASH.length)}`;
    return `${mappedPath}${parsed.search}${parsed.hash}`;
  } catch {
    return normalizedRaw;
  }
};

const normalizeServerStoredImageUrl = (rawUrl: string) => {
  if (!rawUrl) {
    return rawUrl;
  }

  const normalizedRawUrl = rawUrl.trim();
  if (!normalizedRawUrl) {
    return normalizedRawUrl;
  }

  if (normalizedRawUrl.startsWith(LEGACY_STORAGE_PATH_PREFIX)) {
    return mapStoragePathToMediaBase(
      `${API_STORAGE_PATH_PREFIX}/${normalizedRawUrl.substring(LEGACY_STORAGE_PATH_PREFIX.length)}`
    );
  }

  try {
    const parsed = new URL(normalizedRawUrl, window.location.origin);
    const currentHost = window.location.hostname.toLowerCase();
    if (parsed.hostname.toLowerCase() !== currentHost) {
      return mapStoragePathToMediaBase(normalizedRawUrl);
    }

    if (!parsed.pathname.startsWith(LEGACY_STORAGE_PATH_PREFIX)) {
      return mapStoragePathToMediaBase(normalizedRawUrl);
    }

    const mappedPath = `${API_STORAGE_PATH_PREFIX}/${parsed.pathname.substring(LEGACY_STORAGE_PATH_PREFIX.length)}`;
    if (/^https?:\/\//i.test(normalizedRawUrl)) {
      return mapStoragePathToMediaBase(`${parsed.protocol}//${parsed.host}${mappedPath}${parsed.search}${parsed.hash}`);
    }

    return mapStoragePathToMediaBase(`${mappedPath}${parsed.search}${parsed.hash}`);
  } catch {
    return mapStoragePathToMediaBase(normalizedRawUrl);
  }
};

const normalizeImageServer = (value: number | null | undefined): 1 | 2 => (value === 2 ? 2 : 1);

const setImageServer = (server: 1 | 2) => {
  if (server === 2 && !hasServer2Images.value) {
    return;
  }

  if (selectedImageServer.value === server) {
    return;
  }

  selectedImageServer.value = server;
  imageFallbackMap.value = {};
};

const resolveImageCandidates = (page: ReaderPageItem) => {
  const candidates: string[] = [];

  const server1Raw = normalizeServerStoredImageUrl(page.imageUrl);
  const sourceRaw = page.sourceImageUrl?.trim() || "";
  const server2Raw = sourceRaw ? normalizeServerStoredImageUrl(sourceRaw) : "";

  const ordered = selectedImageServer.value === 2
    ? [server2Raw, server1Raw]
    : [server1Raw, server2Raw];

  for (const candidate of ordered) {
    if (candidate && !candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  }

  return candidates;
};

const resolveCurrentRawImageSource = (page: ReaderPageItem) => {
  const candidates = resolveImageCandidates(page);
  if (!candidates.length) {
    return normalizeServerStoredImageUrl(page.imageUrl);
  }

  const fallbackIndex = imageFallbackMap.value[page.id] ?? 0;
  const safeIndex = Math.max(0, Math.min(fallbackIndex, candidates.length - 1));
  return candidates[safeIndex];
};

const readBlockedImageHosts = () => {
  try {
    const raw = localStorage.getItem(BLOCKED_IMAGE_HOSTS_KEY);
    if (!raw) {
      return new Set<string>(DEFAULT_PROXY_IMAGE_HOSTS);
    }

    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) {
      return new Set<string>(DEFAULT_PROXY_IMAGE_HOSTS);
    }

    const persistedHosts =
      parsed
        .filter((item) => typeof item === "string")
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length > 0)
        .slice(-MAX_BLOCKED_IMAGE_HOSTS);

    const merged = new Set<string>(persistedHosts);
    for (const host of DEFAULT_PROXY_IMAGE_HOSTS) {
      merged.add(host);
    }
    return merged;
  } catch {
    return new Set<string>(DEFAULT_PROXY_IMAGE_HOSTS);
  }
};

const persistBlockedImageHosts = (hosts: Set<string>) => {
  try {
    localStorage.setItem(BLOCKED_IMAGE_HOSTS_KEY, JSON.stringify(Array.from(hosts).slice(-MAX_BLOCKED_IMAGE_HOSTS)));
  } catch {
  }
};

const registerBlockedImageHost = (rawUrl: string) => {
  const host = parseExternalImageHost(rawUrl);
  if (!host || blockedImageHosts.value.has(host)) {
    return;
  }

  const next = new Set(blockedImageHosts.value);
  next.add(host);
  blockedImageHosts.value = next;
  persistBlockedImageHosts(next);
};

const isBlockedImageHost = (host: string) => {
  const normalizedHost = host.trim().toLowerCase();
  if (!normalizedHost) {
    return false;
  }

  for (const blockedHost of blockedImageHosts.value) {
    if (normalizedHost === blockedHost || normalizedHost.endsWith(`.${blockedHost}`)) {
      return true;
    }
  }

  return false;
};

const resolveImageSource = (page: ReaderData["pages"][number]) => {
  const rawSource = resolveCurrentRawImageSource(page);
  if (shouldUseProxyByDefault(rawSource)) {
    return `${API_BASE_URL}/api/public/image-proxy?url=${encodeURIComponent(rawSource)}`;
  }
  return rawSource;
};

const shouldUseProxyByDefault = (rawUrl: string) => {
  const host = parseExternalImageHost(rawUrl);
  return Boolean(host);
};

const shouldUseConservativeLazyStrategy = () => {
  if (typeof window === "undefined") {
    return true;
  }

  const isMobileViewport = window.matchMedia(`(max-width: ${MOBILE_VIEWPORT_MAX_WIDTH}px)`).matches;
  const navigatorWithHints = window.navigator as Navigator & {
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
    };
    deviceMemory?: number;
  };
  const saveDataEnabled = Boolean(navigatorWithHints.connection?.saveData);
  const effectiveType = (navigatorWithHints.connection?.effectiveType || "").toLowerCase();
  const isSlowNetwork = effectiveType === "slow-2g" || effectiveType === "2g" || effectiveType === "3g";
  const hasLowMemory = typeof navigatorWithHints.deviceMemory === "number"
    && navigatorWithHints.deviceMemory > 0
    && navigatorWithHints.deviceMemory <= 4;

  return isMobileViewport || saveDataEnabled || isSlowNetwork || hasLowMemory;
};

const getLazyRootMargin = () =>
  (shouldUseConservativeLazyStrategy() ? MOBILE_LAZY_ROOT_MARGIN : DESKTOP_LAZY_ROOT_MARGIN);

const markImageAsBlocked = (page: ReaderPageItem, event?: Event) => {
  const imageElement = event?.target instanceof HTMLImageElement
    ? event.target
    : null;
  const retryAttempts = imageElement
    ? Number(imageElement.dataset.readerRetryAttempts || "0")
    : 0;

  if (imageElement && retryAttempts >= MAX_IMAGE_RETRY_ATTEMPTS) {
    return;
  }

  const currentRawSource = resolveCurrentRawImageSource(page);
  const externalHost = parseExternalImageHost(currentRawSource);
  if (externalHost && !isBlockedImageHost(externalHost)) {
    registerBlockedImageHost(currentRawSource);
  }

  const candidates = resolveImageCandidates(page);
  const currentIndex = imageFallbackMap.value[page.id] ?? 0;
  if (currentIndex < candidates.length - 1) {
    imageFallbackMap.value = {
      ...imageFallbackMap.value,
      [page.id]: currentIndex + 1,
    };
  }

  if (!imageElement) {
    return;
  }

  imageElement.dataset.readerRetryAttempts = String(retryAttempts + 1);
  const nextSource = resolveImageSource(page);
  if (nextSource) {
    imageElement.src = nextSource;
  }
};

const formatChapterLabel = (chapter: ChapterBrief) => {
  if (chapter.number !== null) {
    return `Chương ${chapter.number} · ${chapter.title}`;
  }
  return chapter.title;
};

const jumpToSelectedChapter = async () => {
  if (!readerData.value || !selectedChapterSlug.value) {
    return;
  }

  if (selectedChapterSlug.value === readerData.value.chapter.slug) {
    return;
  }

  await router.push({
    name: "reader",
    params: {
      comicSlug: readerData.value.comic.slug,
      chapterSlug: selectedChapterSlug.value,
    },
  });
};

const ensureAuth = () => {
  if (auth.isAuthenticated) {
    return true;
  }

  router.push({ name: "login", query: { redirect: route.fullPath } });
  return false;
};

const formatCommentTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

const normalizeCommentRole = (role: string | null | undefined): "ADMIN" | "USER" | "GUEST" => {
  if (role === "ADMIN" || role === "USER" || role === "GUEST") {
    return role;
  }
  return "GUEST";
};

const commentRoleLabel = (role: string | null | undefined) => {
  const normalized = normalizeCommentRole(role);
  if (normalized === "ADMIN") {
    return "admin";
  }
  if (normalized === "USER") {
    return "user";
  }
  return "guest";
};

const commentRoleClass = (role: string | null | undefined) => {
  const normalized = normalizeCommentRole(role);
  if (normalized === "ADMIN") {
    return "comment-role-admin";
  }
  if (normalized === "USER") {
    return "comment-role-user";
  }
  return "comment-role-guest";
};

const loadChapterComments = async () => {
  if (!readerData.value) {
    chapterComments.value = [];
    return;
  }

  const { data } = await api.get("/api/public/comments", {
    params: {
      comicSlug: readerData.value.comic.slug,
      chapterSlug: readerData.value.chapter.slug,
      page: 0,
      size: 40,
    },
  });

  chapterComments.value = data.content || [];
  replyingToChapterComment.value = null;
};

const submitChapterComment = async () => {
  if (!readerData.value) {
    return;
  }

  const parentId = replyingToChapterComment.value?.id ?? null;
  const isReply = parentId != null;

  const content = chapterCommentText.value.trim();
  if (!content) {
    return;
  }

  const cooldownKey = `comment_cooldown:chapter:${readerData.value.comic.id}:${readerData.value.chapter.id}`;
  const now = Date.now();
  const lastCommentAt = Number(localStorage.getItem(cooldownKey) || "0");
  if (lastCommentAt && now - lastCommentAt < COMMENT_COOLDOWN_MS) {
    readerNotice.value = "Bạn vừa gửi bình luận. Vui lòng chờ 1 phút rồi thử lại.";
    return;
  }

  try {
    let data: CommentItem;
    if (auth.isAuthenticated) {
      const response = await api.post<CommentItem>("/api/user/comments", {
        comicId: readerData.value.comic.id,
        chapterId: readerData.value.chapter.id,
        parentId,
        content,
      });
      data = response.data;
    } else {
      const guestName = guestCommentName.value.trim();
      if (!guestName) {
        readerNotice.value = "Vui lòng nhập tên trước khi bình luận.";
        return;
      }

      localStorage.setItem("guest_comment_name", guestName);
      const response = await api.post<CommentItem>("/api/public/comments", {
        comicId: readerData.value.comic.id,
        chapterId: readerData.value.chapter.id,
        parentId,
        content,
        guestName,
      });
      data = response.data;
    }

    localStorage.setItem(cooldownKey, String(now));

    chapterComments.value = [data, ...chapterComments.value];
    chapterCommentText.value = "";
    replyingToChapterComment.value = null;
    readerNotice.value = isReply ? "Đã gửi phản hồi chương." : "Đã đăng bình luận chương.";
  } catch (error: any) {
    if (error?.response?.status === 405) {
      readerNotice.value = "Backend chưa cập nhật endpoint bình luận khách. Hãy restart backend rồi thử lại.";
      return;
    }
    readerNotice.value = error?.response?.data?.message || "Không thể gửi bình luận chương lúc này.";
  }
};

const removeChapterComment = async (commentId: number) => {
  await api.delete(`/api/user/comments/${commentId}`);
  chapterComments.value = chapterComments.value.filter((comment) => comment.id !== commentId);
  if (replyingToChapterComment.value?.id === commentId) {
    replyingToChapterComment.value = null;
  }
};

const startChapterReply = (comment: CommentItem) => {
  replyingToChapterComment.value = comment;
};

const cancelChapterReply = () => {
  replyingToChapterComment.value = null;
};

const submitChapterReport = async () => {
  if (!readerData.value || !ensureAuth()) {
    return;
  }

  const cooldownKey = `report_cooldown:chapter:${readerData.value.comic.id}:${readerData.value.chapter.id}:user:${auth.user?.id ?? "me"}`;
  const now = Date.now();
  const lastReportAt = Number(localStorage.getItem(cooldownKey) || "0");
  if (lastReportAt && now - lastReportAt < REPORT_COOLDOWN_MS) {
    readerNotice.value = "Bạn vừa gửi báo cáo. Vui lòng chờ 1 phút rồi thử lại.";
    return;
  }

  try {
    await api.post("/api/user/reports", {
      comicId: readerData.value.comic.id,
      chapterId: readerData.value.chapter.id,
      reason: chapterReportReason.value,
      details: chapterReportDetails.value.trim() || undefined,
    });

    localStorage.setItem(cooldownKey, String(now));
    chapterReportDetails.value = "";
    readerNotice.value = "Đã gửi báo cáo chương.";
  } catch (error: any) {
    readerNotice.value = error?.response?.data?.message || "Không thể gửi báo cáo chương lúc này.";
  }
};

const isInteractiveTouchTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("a, button, input, textarea, select, label"));
};

const resetSwipeTracking = () => {
  swipeStartX.value = null;
  swipeStartY.value = null;
  swipeStartAt.value = 0;
};

const goToChapterBySwipe = async (chapterSlug: string) => {
  if (!readerData.value || swipeRouteLock.value) {
    return;
  }

  if (!chapterSlug || chapterSlug === readerData.value.chapter.slug) {
    return;
  }

  swipeRouteLock.value = true;
  await router.push({
    name: "reader",
    params: {
      comicSlug: readerData.value.comic.slug,
      chapterSlug,
    },
  });

  window.setTimeout(() => {
    swipeRouteLock.value = false;
  }, 180);
};

const handleTouchStart = (event: TouchEvent) => {
  if (event.touches.length !== 1 || isInteractiveTouchTarget(event.target)) {
    resetSwipeTracking();
    return;
  }

  const touch = event.touches[0];
  swipeStartX.value = touch.clientX;
  swipeStartY.value = touch.clientY;
  swipeStartAt.value = Date.now();
};

const handleTouchEnd = async (event: TouchEvent) => {
  if (!readerData.value || swipeStartX.value === null || swipeStartY.value === null || swipeRouteLock.value) {
    return;
  }

  const touch = event.changedTouches[0];
  if (!touch) {
    resetSwipeTracking();
    return;
  }

  const deltaX = touch.clientX - swipeStartX.value;
  const deltaY = touch.clientY - swipeStartY.value;
  const elapsedMs = Date.now() - swipeStartAt.value;

  resetSwipeTracking();

  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  const isHorizontalSwipe = absX >= 70 && absX > absY * 1.3 && elapsedMs <= 700;
  if (!isHorizontalSwipe) {
    return;
  }

  if (deltaX < 0 && readerData.value.nextChapter) {
    await goToChapterBySwipe(readerData.value.nextChapter.slug);
    return;
  }

  if (deltaX > 0 && readerData.value.prevChapter) {
    await goToChapterBySwipe(readerData.value.prevChapter.slug);
  }
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const scrollToBottom = () => {
  const totalHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  window.scrollTo({ top: totalHeight, behavior: "smooth" });
};

// Mobile-only: detect mobile devices (touch-capable or small viewport)
const isMobileDevice = ref(false);

const updateIsMobileDevice = () => {
  try {
    const hasTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const smallViewport = typeof window !== 'undefined' && window.matchMedia && window.matchMedia(`(max-width: ${MOBILE_VIEWPORT_MAX_WIDTH}px)`).matches;
    isMobileDevice.value = Boolean(hasTouch || smallViewport);
  } catch {
    isMobileDevice.value = false;
  }
};

// Hold-to-scroll state and handlers for mobile
const holdActive = ref(false);
const holdDirection = ref<'up' | 'down' | null>(null);
let holdStartY = 0;
let holdLastY = 0;
let holdRaf: number | null = null;
let lastHoldTime = 0;

const stopHoldScroll = () => {
  holdActive.value = false;
  holdDirection.value = null;
  holdStartY = 0;
  holdLastY = 0;
  if (holdRaf) {
    window.cancelAnimationFrame(holdRaf as number);
    holdRaf = null;
  }

  // remove any document-level handlers attached during mobile drag
  try {
    if (_documentTouchMoveHandler) {
      document.removeEventListener("touchmove", _documentTouchMoveHandler as EventListener);
      _documentTouchMoveHandler = null;
    }
    if (_documentTouchEndHandler) {
      document.removeEventListener("touchend", _documentTouchEndHandler as EventListener);
      _documentTouchEndHandler = null;
    }
  } catch {
    // ignore removal errors
  }
};

const doHoldScrollTick = (now: number) => {
  if (!holdActive.value) return;
  const elapsed = Math.max(1, now - (lastHoldTime || now));
  lastHoldTime = now;

  // base speed px per second: make it very fast for fast-scroll handle
  const baseSpeed = 1000; // px/sec - increased for extra-fast immediate scroll

  // compute drag distance to modulate speed (very small drag -> large multiplier)
  const drag = Math.max(0, Math.abs(holdLastY - holdStartY));
  const multiplier = 1 + Math.min(30, drag / 10);

  const deltaPx = (baseSpeed * multiplier) * (elapsed / 1000);
  const dir = holdDirection.value ?? 'down';
  const scrollDelta = dir === 'up' ? -deltaPx : deltaPx;
  window.scrollBy({ top: scrollDelta, left: 0, behavior: 'auto' });

  holdRaf = window.requestAnimationFrame(doHoldScrollTick);
};

// legacy startHoldScroll removed: mobile now uses startMobileDrag and desktop
// uses click handlers. Kept updateHoldScroll/doHoldScrollTick for behavior.

const updateHoldScroll = (event: TouchEvent) => {
  if (!holdActive.value || !event.touches || !event.touches.length) return;
  holdLastY = event.touches[0].clientY;
  // change direction if user drags past start
  const delta = holdLastY - holdStartY;
  if (Math.abs(delta) > 8) {
    holdDirection.value = delta < 0 ? 'up' : 'down';
  }
};

// Mobile rectangular drag control: start a drag session but don't set direction
// until user moves. This allows pressing then dragging up/down to control
// fast scroll speed and direction.
let _documentTouchMoveHandler: ((e: TouchEvent) => void) | null = null;
let _documentTouchEndHandler: ((e: TouchEvent) => void) | null = null;

const startMobileDrag = (event: TouchEvent) => {
  if (!event.touches || !event.touches.length) return;
  holdActive.value = true;
  // start immediately scrolling down by default; user can flip direction by dragging
  holdDirection.value = 'down';
  holdStartY = event.touches[0].clientY;
  holdLastY = holdStartY;
  lastHoldTime = performance.now();
  if (holdRaf) {
    window.cancelAnimationFrame(holdRaf as number);
  }

  // attach document-level handlers so dragging outside the button still works
  if (!_documentTouchMoveHandler) {
    _documentTouchMoveHandler = (e: TouchEvent) => {
      try { e.preventDefault(); } catch {}
      mobileDragMove(e);
    };
    document.addEventListener("touchmove", _documentTouchMoveHandler as EventListener, { passive: false });
  }

  if (!_documentTouchEndHandler) {
    _documentTouchEndHandler = (_e: TouchEvent) => stopHoldScroll();
    document.addEventListener("touchend", _documentTouchEndHandler as EventListener);
  }

  // Start RAF loop immediately so press-and-hold scrolls right away.
  if (!holdRaf) {
    lastHoldTime = performance.now();
    holdRaf = window.requestAnimationFrame(doHoldScrollTick);
  }
};

const mobileDragMove = (event: TouchEvent) => {
  // delegate to existing update logic which sets holdLastY and direction
  updateHoldScroll(event);
  // If we've set a direction and RAF isn't running, start the RAF loop so scrolling begins.
  if (holdDirection.value && !holdRaf) {
    lastHoldTime = performance.now();
    holdRaf = window.requestAnimationFrame(doHoldScrollTick);
  }
};

const updateCurrentPageByScroll = () => {
  const currentY = window.scrollY;
  const now = performance.now();
  const delta = currentY - lastScrollY.value;

  if (now >= headerAutoPauseUntil.value) {
    if (currentY <= HEADER_TOP_VISIBLE_THRESHOLD) {
      setReaderHeaderVisibility(true);
    } else if (Math.abs(delta) >= HEADER_SCROLL_DELTA) {
      setReaderHeaderVisibility(delta < 0);
    }
  }

  lastScrollY.value = currentY;

  const nodes = Array.from(document.querySelectorAll<HTMLElement>(".reader-page"));
  if (!nodes.length) {
    return;
  }

  const marker = window.scrollY + 220;
  let active = 1;

  for (const node of nodes) {
    if (node.offsetTop <= marker) {
      active = Number(node.dataset.pageIndex || 1);
    }
  }

  if (active !== currentPage.value) {
    currentPage.value = active;
    saveProgress(active);

    if (readerData.value && active >= readerData.value.pages.length) {
      trackChapterCompletion();
    }
  }

  trimFarImagesForMobileMemory();

  // Debounced save of offset for intra-page scroll (user scrolls within the
  // same very tall image). This ensures we persist offsetPercent even when
  // pageIndex does not change. We won't overwrite an existing offset with a
  // useless 0 if the element hasn't rendered yet.
  if (offsetSaveDebounceTimer) {
    window.clearTimeout(offsetSaveDebounceTimer);
  }
  offsetSaveDebounceTimer = window.setTimeout(() => {
    try {
      const snap = getActivePageSnapshotFromDOM();
      const target = document.querySelector<HTMLElement>(`.reader-page[data-page-index='${snap.pageIndex}']`);
      if (!target) return;
      const pageHeight = Math.max(1, target.getBoundingClientRect().height || target.offsetHeight || 1);
      // Only persist offset when element has reasonable height to avoid
      // saving 0 while image placeholders are still present.
      if (pageHeight >= 120 && typeof snap.offsetPercent === 'number' && Number.isFinite(snap.offsetPercent)) {
        writeSavedProgress(snap.pageIndex, snap.offsetPercent);
      }
    } catch {
      // ignore
    }
    offsetSaveDebounceTimer = null;
  }, 420);
};

// Compute active page index and offset percent from DOM (used when we need a
// synchronous snapshot of which page is visible and where inside that page
// the user is, e.g. during unload/visibilitychange).
const getActivePageSnapshotFromDOM = () => {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(".reader-page"));
  if (!nodes.length) return { pageIndex: 1, offsetPercent: 0 };

  const marker = window.scrollY + 220;
  let active = 1;
  let activeNode: HTMLElement | null = null;
  for (const node of nodes) {
    if (node.offsetTop <= marker) {
      active = Number(node.dataset.pageIndex || 1);
      activeNode = node;
    }
  }

  let offsetPercent = 0;
  if (activeNode) {
    const pageTop = activeNode.offsetTop;
    const pageHeight = Math.max(1, activeNode.getBoundingClientRect().height || activeNode.offsetHeight || 1);
    const offset = Math.max(0, window.scrollY - pageTop);
    offsetPercent = Math.max(0, Math.min(1, offset / pageHeight));
  }

  return { pageIndex: Math.max(1, active), offsetPercent };
};

const handleBeforeUnload = () => {
  try {
    const snap = getActivePageSnapshotFromDOM();
    writeSavedProgress(snap.pageIndex, snap.offsetPercent);
  } catch {
    // swallow
  }
};

const restoreSavedPage = async () => {
  const savedProgress = readSavedProgress();
  const normalizedSaved = savedProgress?.pageIndex && savedProgress.pageIndex > 0
    ? savedProgress.pageIndex
    : 1;
  const isFreshSavedProgress = Boolean(
    savedProgress?.savedAt && Date.now() - savedProgress.savedAt <= READER_PROGRESS_FRESH_MS
  );
  const shouldResumeByProgress = normalizedSaved > 1 && isFreshSavedProgress;
  const shouldResume = shouldForceRestoreSavedPage.value || shouldResumeByProgress;

  if (!shouldResume || normalizedSaved <= 1) {
    currentPage.value = 1;
    if (!savedProgress) {
      saveProgress(1);
    }
    return;
  }

  currentPage.value = normalizedSaved;
  await nextTick();

  const savedOffsetPercent = savedProgress?.offsetPercent;
  const target = document.querySelector<HTMLElement>(`.reader-page[data-page-index='${currentPage.value}']`);
    if (target) {
      // Try to ensure the target image is actually loading so we can compute
      // an accurate height. Prefer using the image's intrinsic dimensions
      // (naturalWidth/naturalHeight) scaled to the container width. Fallback
      // to stored pageImageDimensions, then to measured element height.
      let height = Math.max(1, target.getBoundingClientRect().height || target.offsetHeight || 1);
      const start = performance.now();

      // Find <img> inside the figure if any
      const img = target.querySelector<HTMLImageElement>("img");
      if (img) {
        // If image not yet loaded but has data-src, kickstart load so we can
        // observe natural sizes. If already loading/loaded, we'll use natural sizes.
        try {
          const ds = img.dataset.src;
          if (ds && (!img.currentSrc || img.currentSrc === PLACEHOLDER_IMAGE)) {
            img.src = ds;
            img.removeAttribute("data-src");
          }
        } catch {
          // ignore set src failures
        }

        // Wait for naturalWidth/naturalHeight to be available or timeout
        const waitForImage = () => new Promise<void>((resolve) => {
          if (img.naturalWidth && img.naturalHeight) {
            resolve();
            return;
          }
          let resolved = false;
          const onDone = () => { if (!resolved) { resolved = true; cleanup(); resolve(); } };
          const cleanup = () => { img.removeEventListener('load', onDone); img.removeEventListener('error', onDone); };
          img.addEventListener('load', onDone);
          img.addEventListener('error', onDone);
          // timeout fallback
          window.setTimeout(() => { onDone(); }, 900);
        });

        // Wait (brief) for image data to become available
        await waitForImage();

        // If we have intrinsic dimensions, compute expected rendered height
        if (img.naturalWidth && img.naturalHeight) {
          const containerWidth = Math.max(1, img.clientWidth || target.clientWidth || target.getBoundingClientRect().width || 1);
          const expected = Math.round((containerWidth * img.naturalHeight) / img.naturalWidth);
          if (height < 24) {
            height = expected;
          }
        }
      }

      // If still don't have good height, try stored pageImageDimensions
      if (height < 24) {
        try {
          const pageIndex = currentPage.value;
          const pageObj = readerData.value?.pages.find((p) => p.pageIndex === Number(pageIndex));
          if (pageObj) {
            const dims = pageImageDimensions.value[pageObj.id];
            if (dims && Number.isFinite(dims.width) && Number.isFinite(dims.height) && dims.width > 0) {
              const containerWidth = Math.max(1, target.clientWidth || target.getBoundingClientRect().width || 1);
              height = Math.round((containerWidth * dims.height) / dims.width);
            }
          }
        } catch {
          // ignore
        }
      }

      // final short poll if needed
      while (height < 24 && performance.now() - start < 800) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 50));
        height = Math.max(1, target.getBoundingClientRect().height || target.offsetHeight || 1);
      }

      if (typeof savedOffsetPercent === "number" && Number.isFinite(savedOffsetPercent)) {
        // subtract fixed header height if any (so content isn't hidden under header)
        let headerOffset = 0;
        try {
          const headerEl = document.querySelector<HTMLElement>(".reader-head");
          if (headerEl) {
            const cs = window.getComputedStyle(headerEl);
            if (cs.position === "fixed") {
              headerOffset = headerEl.offsetHeight || 0;
            }
          }
        } catch {
          headerOffset = 0;
        }

        const top = Math.max(0, target.offsetTop + Math.max(0, Math.min(1, savedOffsetPercent)) * height - headerOffset);
        window.scrollTo({ top, left: 0 });
      } else {
        target.scrollIntoView({ block: "start" });
      }
    }

  saveProgress(currentPage.value);
};

const releaseOffscreenImagesOnBackground = () => {
  const keepFrom = Math.max(1, currentPage.value - BACKGROUND_IMAGE_KEEP_RADIUS);
  const keepTo = currentPage.value + BACKGROUND_IMAGE_KEEP_RADIUS;
  const images = document.querySelectorAll<HTMLImageElement>(".reader-page img");

  images.forEach((img) => {
    const figure = img.closest<HTMLElement>(".reader-page");
    const pageIndex = Number(figure?.dataset.pageIndex || "0");

    if (!pageIndex || (pageIndex >= keepFrom && pageIndex <= keepTo)) {
      return;
    }

    const currentSrc = (img.currentSrc || img.getAttribute("src") || "").trim();
    if (!currentSrc || currentSrc === PLACEHOLDER_IMAGE) {
      return;
    }

    if (!img.dataset.src) {
      img.dataset.src = currentSrc;
    }
    img.src = PLACEHOLDER_IMAGE;
    if (imageObserver) {
      imageObserver.observe(img);
    }
  });
};

const trimFarImagesForMobileMemory = () => {
  if (!shouldUseConservativeLazyStrategy()) {
    return;
  }

  // Clear existing timer
  if (mobileMemoryTrimDebounceTimer) {
    window.clearTimeout(mobileMemoryTrimDebounceTimer);
  }

  // Debounce: chỉ trim sau khi scroll dừng 800ms
  mobileMemoryTrimDebounceTimer = window.setTimeout(() => {
    const keepFrom = Math.max(1, currentPage.value - MOBILE_MEMORY_TRIM_RADIUS);
    const keepTo = currentPage.value + MOBILE_MEMORY_TRIM_RADIUS;
    const images = document.querySelectorAll<HTMLImageElement>(".reader-page img");
    let releasedAny = false;

    images.forEach((img) => {
      const figure = img.closest<HTMLElement>(".reader-page");
      const pageIndex = Number(figure?.dataset.pageIndex || "0");
      if (!pageIndex || (pageIndex >= keepFrom && pageIndex <= keepTo)) {
        return;
      }

      const currentSrc = (img.currentSrc || img.getAttribute("src") || "").trim();
      if (!currentSrc || currentSrc === PLACEHOLDER_IMAGE) {
        return;
      }

      if (!img.dataset.src) {
        img.dataset.src = currentSrc;
      }
      img.src = PLACEHOLDER_IMAGE;
      if (imageObserver) {
        imageObserver.observe(img);
      }
      releasedAny = true;
    });

    if (releasedAny && typeof IntersectionObserver === "undefined") {
      observeLazyImages();
    }

    mobileMemoryTrimDebounceTimer = null;
  }, 800); // Debounce 800ms
};

const restoreNearCurrentImages = async () => {
  const start = Math.max(1, currentPage.value - 1);
  const end = currentPage.value + 1;

  for (let idx = start; idx <= end; idx += 1) {
    const img = document.querySelector<HTMLImageElement>(
      `.reader-page[data-page-index='${idx}'] img[data-src]`
    );
    const ds = img?.dataset.src;
    if (!img || !ds) {
      continue;
    }

    img.src = ds;
    img.removeAttribute("data-src");
  }

  // Allow DOM to settle after we swapped in nearby images so subsequent
  // scrolling (restore) can compute positions more accurately.
  await nextTick();
};

const handleReaderVisibilityChange = () => {
  if (document.visibilityState === "hidden") {
    // Use DOM-derived active page + offset to ensure we capture the latest
    // visible position even if scroll handlers haven't updated `currentPage` yet.
    const snap = getActivePageSnapshotFromDOM();
    writeSavedProgress(snap.pageIndex, snap.offsetPercent);
    releaseOffscreenImagesOnBackground();
    teardownFallbackLazyLoader();
    if (imageObserver) {
      imageObserver.disconnect();
      imageObserver = null;
    }
    return;
  }

  observeLazyImages();
  restoreNearCurrentImages();
};

const handleReaderPageHide = () => {
  // When page is being hidden, compute active page + offset from DOM to
  // avoid race where scroll event hasn't updated `currentPage` yet.
  const snap = getActivePageSnapshotFromDOM();
  writeSavedProgress(snap.pageIndex, snap.offsetPercent);
  releaseOffscreenImagesOnBackground();
};

const handleReaderPageShow = () => {
  observeLazyImages();
  restoreNearCurrentImages();
};

const loadReader = async () => {
  const comicSlug = String(route.params.comicSlug);
  const chapterSlug = String(route.params.chapterSlug);
  const shouldCallApi = shouldRequestReaderApi(comicSlug, chapterSlug);

  let data: ReaderData | null = null;
  if (!shouldCallApi) {
    data = readCachedReader(comicSlug, chapterSlug);
  }

  if (!data) {
    const response = await api.get<ReaderData>(`/api/public/read/${comicSlug}/${chapterSlug}`);
    data = response.data;
    saveCachedReader(comicSlug, chapterSlug, data);
  }

  const backendDefaultServer = normalizeImageServer(data.defaultImageServer);
  const hasSecondarySource = data.pages.some((page) => Boolean(page.sourceImageUrl?.trim()));
  selectedImageServer.value = backendDefaultServer === 2 && hasSecondarySource ? 2 : 1;

  prefetchedImageSources = new Set<string>();
  readerData.value = data;
  selectedChapterSlug.value = data.chapter.slug;
  loadStoredPageImageDimensions();
  await nextTick();
  startChapterAnalyticsSession();
  observeLazyImages();

  await loadChapterOptions(data.comic.slug);
  await loadChapterComments();

  imageFallbackMap.value = {};
  // Ensure nearby images are restored first so layout stabilizes before we
  // scroll to the saved page. This reduces cases where loading images
  // shifts content and moves the target out of view.
  await restoreNearCurrentImages();
  await restoreSavedPage();
  lastScrollY.value = window.scrollY;
  setReaderHeaderVisibility(true, true);
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
};

const handleReaderKeydown = (event: KeyboardEvent) => {
  if (!readerData.value) {
    return;
  }

  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }

  if (isEditableTarget(event.target)) {
    return;
  }

  if (event.key === "ArrowRight") {
    if (readerData.value.nextChapter) {
      event.preventDefault();
      void goToChapterBySwipe(readerData.value.nextChapter.slug);
    }
    return;
  }

  if (event.key === "ArrowLeft") {
    if (readerData.value.prevChapter) {
      event.preventDefault();
      void goToChapterBySwipe(readerData.value.prevChapter.slug);
    }
    return;
  }

  if (event.key === "ArrowDown") {
    setReaderHeaderVisibility(false);
    return;
  }

  if (event.key === "ArrowUp") {
    setReaderHeaderVisibility(true);
  }
};

const prefetchNeighbors = (pageIndex: number) => {
  if (!readerData.value || shouldUseConservativeLazyStrategy()) {
    return;
  }

  for (let offset = 1; offset <= DESKTOP_PREFETCH_NEIGHBOR_COUNT; offset += 1) {
    const idx = pageIndex + offset;
    const page = readerData.value.pages.find((p) => p.pageIndex === idx);
    if (page) {
      const src = resolveImageSource(page);
      if (src && !prefetchedImageSources.has(src)) {
        prefetchedImageSources.add(src);
        const img = new Image();
        img.decoding = "async";
        img.src = src;
      }
    }
  }
};

const teardownFallbackLazyLoader = () => {
  if (!fallbackLazyCleanup) {
    return;
  }

  fallbackLazyCleanup();
  fallbackLazyCleanup = null;
};

const observeLazyImages = () => {
  if (imageObserver) {
    imageObserver.disconnect();
    imageObserver = null;
  }

  teardownFallbackLazyLoader();

  if (typeof window === "undefined") {
    return;
  }

  if (typeof IntersectionObserver === "undefined") {
    const nodes = Array.from(document.querySelectorAll<HTMLImageElement>(".reader-pages img[data-src]"));
    if (!nodes.length) {
      return;
    }

    const fallbackMargin = Number.parseInt(getLazyRootMargin(), 10) || 180;

    const loadNearbyFallbackImages = () => {
      const viewportBottom = window.scrollY + window.innerHeight + fallbackMargin;
      nodes.forEach((img) => {
        const ds = img.dataset.src;
        if (!ds) {
          return;
        }

        const absoluteTop = img.getBoundingClientRect().top + window.scrollY;
        if (absoluteTop <= viewportBottom) {
          img.src = ds;
          img.removeAttribute("data-src");
        }
      });

      const hasPendingImage = nodes.some((img) => Boolean(img.dataset.src));
      if (!hasPendingImage) {
        teardownFallbackLazyLoader();
      }
    };

    const onFallbackUpdate = () => {
      loadNearbyFallbackImages();
    };

    window.addEventListener("scroll", onFallbackUpdate, { passive: true });
    window.addEventListener("resize", onFallbackUpdate);
    fallbackLazyCleanup = () => {
      window.removeEventListener("scroll", onFallbackUpdate);
      window.removeEventListener("resize", onFallbackUpdate);
    };

    nextTick(() => {
      loadNearbyFallbackImages();
    });
    return;
  }

  imageObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting || entry.intersectionRatio > 0) {
          const img = entry.target as HTMLImageElement;
          const ds = img.dataset.src;
          if (ds) {
            img.src = ds;
            const fig = img.closest("figure");
            const pageIndex = fig ? Number(fig.dataset.pageIndex) : NaN;
            if (!Number.isNaN(pageIndex)) {
              prefetchNeighbors(pageIndex);
            }
            img.removeAttribute("data-src");
          }
          if (imageObserver) imageObserver.unobserve(img);
        }
      });
    },
    { root: null, rootMargin: getLazyRootMargin(), threshold: 0.01 }
  );

  nextTick(() => {
    const nodes = document.querySelectorAll<HTMLImageElement>(".reader-pages img[data-src]");
    nodes.forEach((img) => {
      if (imageObserver) imageObserver.observe(img);
    });
  });
};


watch(
  () => [route.params.comicSlug, route.params.chapterSlug],
  async () => {
    trackChapterExitIfNeeded();
    setReaderHeaderVisibility(true, true);
    lastScrollY.value = 0;
    window.scrollTo({ top: 0 });
    await loadReader();
  }
);

onMounted(async () => {
  setReaderHeaderVisibility(true, true);
  blockedImageHosts.value = readBlockedImageHosts();
  await loadReader();
  lastScrollY.value = window.scrollY;
  // initialize mobile detection and listen for viewport changes
  updateIsMobileDevice();
  window.addEventListener("resize", updateIsMobileDevice);
  window.addEventListener("scroll", updateCurrentPageByScroll, { passive: true });
  window.addEventListener("keydown", handleReaderKeydown);
  document.addEventListener("visibilitychange", handleReaderVisibilityChange);
  window.addEventListener("pagehide", handleReaderPageHide);
  window.addEventListener("pageshow", handleReaderPageShow);
  // Ensure we persist the most-recent visible page if user reloads/refreshes
  // before the scroll handler has a chance to update reactive state.
  window.addEventListener("beforeunload", handleBeforeUnload);
});

onBeforeUnmount(() => {
  trackChapterExitIfNeeded();
  setReaderHeaderVisibility(true, true);
  window.removeEventListener("scroll", updateCurrentPageByScroll);
  window.removeEventListener("keydown", handleReaderKeydown);
  document.removeEventListener("visibilitychange", handleReaderVisibilityChange);
  window.removeEventListener("pagehide", handleReaderPageHide);
  window.removeEventListener("pageshow", handleReaderPageShow);
  window.removeEventListener("beforeunload", handleBeforeUnload);
  window.removeEventListener("resize", updateIsMobileDevice);
  // ensure any running hold-scroll loop is stopped
  stopHoldScroll();
  teardownFallbackLazyLoader();
  if (syncTimer) {
    window.clearTimeout(syncTimer);
  }
  if (mobileMemoryTrimDebounceTimer) {
    window.clearTimeout(mobileMemoryTrimDebounceTimer);
  }
  if (offsetSaveDebounceTimer) {
    window.clearTimeout(offsetSaveDebounceTimer);
  }
  if (imageObserver) {
    imageObserver.disconnect();
    imageObserver = null;
  }
});
</script>
