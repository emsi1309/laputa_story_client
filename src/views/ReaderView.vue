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
          @error="markImageAsBlocked(page.id, page.imageUrl)"
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
import type { ChapterBrief, CommentItem, ComicDetail, ReaderData } from "../types";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const readerData = ref<ReaderData | null>(null);
const chapterOptions = ref<ChapterBrief[]>([]);
const selectedChapterSlug = ref("");
const currentPage = ref(1);
const imageFallbackMap = ref<Record<number, boolean>>({});
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
const READER_CACHE_PREFIX = "reader_cache:";
const VIEWED_CHAPTER_PREFIX = "viewed_chapter:";
const BLOCKED_IMAGE_HOSTS_KEY = "reader:blocked_image_hosts";
const READER_CACHE_TTL_MS = 30 * 60 * 1000;
const VIEWED_CHAPTER_TTL_MS = 30 * 60 * 1000;
const MAX_LOCAL_CHAPTER_ITEMS = 30;
const MAX_BLOCKED_IMAGE_HOSTS = 40;
const COMMENT_COOLDOWN_MS = 60 * 1000;
const REPORT_COOLDOWN_MS = 60 * 1000;
const HEADER_SCROLL_DELTA = 14;
const HEADER_TOP_VISIBLE_THRESHOLD = 24;
const HEADER_TOGGLE_SETTLE_MS = 220;
const lastScrollY = ref(0);
const isReaderHeaderVisible = ref(true);
const headerAutoPauseUntil = ref(0);

type ThreadedCommentItem = CommentItem & {
  depth: number;
};

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

const shouldRestoreSavedPage = computed(() => route.query.resume === "1");

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

const parseExternalImageHost = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl, window.location.origin);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") {
      return null;
    }

    const host = parsed.hostname.toLowerCase();
    const currentHost = window.location.hostname.toLowerCase();
    if (!host || host === currentHost) {
      return null;
    }

    return host;
  } catch {
    return null;
  }
};

const readBlockedImageHosts = () => {
  try {
    const raw = localStorage.getItem(BLOCKED_IMAGE_HOSTS_KEY);
    if (!raw) {
      return new Set<string>();
    }

    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }

    return new Set(
      parsed
        .filter((item) => typeof item === "string")
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length > 0)
        .slice(-MAX_BLOCKED_IMAGE_HOSTS)
    );
  } catch {
    return new Set<string>();
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

const resolveImageSource = (page: ReaderData["pages"][number]) => {
  if (shouldUseProxyByDefault(page.imageUrl) || imageFallbackMap.value[page.id]) {
    return `${API_BASE_URL}/api/public/image-proxy?url=${encodeURIComponent(page.imageUrl)}`;
  }
  return page.imageUrl;
};

const shouldUseProxyByDefault = (rawUrl: string) => {
  const host = parseExternalImageHost(rawUrl);
  if (!host) {
    return false;
  }

  return blockedImageHosts.value.has(host);
};

const markImageAsBlocked = (pageId: number, rawUrl: string) => {
  if (imageFallbackMap.value[pageId]) {
    return;
  }

  registerBlockedImageHost(rawUrl);

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
  }
};

const restoreSavedPage = async () => {
  const saved = Number(localStorage.getItem(storageKey.value) || "1");
  const normalizedSaved = saved > 0 ? saved : 1;

  if (!shouldRestoreSavedPage.value || normalizedSaved <= 1) {
    currentPage.value = 1;
    saveProgress(1);
    return;
  }

  currentPage.value = normalizedSaved;
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
  await loadChapterComments();

  imageFallbackMap.value = {};
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

watch(
  () => [route.params.comicSlug, route.params.chapterSlug],
  async () => {
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
  window.addEventListener("scroll", updateCurrentPageByScroll, { passive: true });
  window.addEventListener("keydown", handleReaderKeydown);
});

onBeforeUnmount(() => {
  setReaderHeaderVisibility(true, true);
  window.removeEventListener("scroll", updateCurrentPageByScroll);
  window.removeEventListener("keydown", handleReaderKeydown);
  if (syncTimer) {
    window.clearTimeout(syncTimer);
  }
});
</script>
