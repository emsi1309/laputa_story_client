<template>
  <section class="reader-wrap" v-if="readerData">
    <div class="reader-head">
      <div>
        <router-link :to="`/comic/${readerData.comic.slug}`" class="back-link">← Về chi tiết</router-link>
        <h1>{{ readerData.comic.title }}</h1>
        <p>{{ readerData.chapter.title }} · Trang {{ currentPage }}/{{ readerData.pages.length }}</p>
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

    <div class="reader-pages">
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
let syncTimer: number | null = null;
const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");

const storageKey = computed(
  () => `reader:${String(route.params.comicSlug)}:${String(route.params.chapterSlug)}`
);

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
  const { data } = await api.get<ReaderData>(
    `/api/public/read/${route.params.comicSlug}/${route.params.chapterSlug}`
  );
  readerData.value = data;
  selectedChapterSlug.value = data.chapter.slug;

  try {
    const detailResponse = await api.get<ComicDetail>(`/api/public/comics/${route.params.comicSlug}`);
    chapterOptions.value = detailResponse.data.chapters || [];
  } catch {
    chapterOptions.value = [];
  }

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
