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
          :src="resolveImageSource(page)"
          :alt="`Page ${page.pageIndex}`"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          @error="markImageAsBlocked(page.id)"
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

    <div class="reader-scroll-controls">
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
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../lib/api";
import { getApiBaseUrl } from "../lib/runtimeConfig";
import { useAuthStore } from "../stores/auth";
import type { ChapterBrief, ComicDetail, ReaderData } from "../types";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const readerData = ref<ReaderData | null>(null);
const chapterOptions = ref<ChapterBrief[]>([]);
const selectedChapterSlug = ref("");
const currentPage = ref(1);
const imageFallbackMap = ref<Record<number, boolean>>({});
const swipeStartX = ref<number | null>(null);
const swipeStartY = ref<number | null>(null);
const swipeStartAt = ref(0);
const swipeRouteLock = ref(false);
const chapterOptionsComicSlug = ref<string | null>(null);
let syncTimer: number | null = null;
const API_BASE_URL = getApiBaseUrl();
const READER_CACHE_PREFIX = "reader_cache:";
const VIEWED_CHAPTER_PREFIX = "viewed_chapter:";
const READER_CACHE_TTL_MS = 30 * 60 * 1000;
const VIEWED_CHAPTER_TTL_MS = 30 * 60 * 1000;
const MAX_LOCAL_CHAPTER_ITEMS = 30;

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
  localStorage.setItem(storageKey.value, String(pageIndex));

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

const resolveImageSource = (page: ReaderData["pages"][number]) => {
  if (shouldUseProxyByDefault(page.imageUrl) || imageFallbackMap.value[page.id]) {
    return `${API_BASE_URL}/api/public/image-proxy?url=${encodeURIComponent(page.imageUrl)}`;
  }
  return page.imageUrl;
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

const markImageAsBlocked = (pageId: number) => {
  if (imageFallbackMap.value[pageId]) {
    return;
  }
  imageFallbackMap.value = {
    ...imageFallbackMap.value,
    [pageId]: true,
  };
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

const updateCurrentPageByScroll = () => {
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
  }
};

const restoreSavedPage = async () => {
  const saved = Number(localStorage.getItem(storageKey.value) || "1");
  currentPage.value = saved > 0 ? saved : 1;
  await nextTick();

  const target = document.querySelector<HTMLElement>(`.reader-page[data-page-index='${currentPage.value}']`);
  if (target) {
    target.scrollIntoView({ block: "start" });
  }

  saveProgress(currentPage.value);
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

  readerData.value = data;
  selectedChapterSlug.value = data.chapter.slug;

  await loadChapterOptions(data.comic.slug);

  imageFallbackMap.value = {};
  await restoreSavedPage();
};

watch(
  () => [route.params.comicSlug, route.params.chapterSlug],
  async () => {
    window.scrollTo({ top: 0 });
    await loadReader();
  }
);

onMounted(async () => {
  await loadReader();
  window.addEventListener("scroll", updateCurrentPageByScroll, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", updateCurrentPageByScroll);
  if (syncTimer) {
    window.clearTimeout(syncTimer);
  }
});
</script>
