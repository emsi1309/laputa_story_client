<template>
  <section class="container section-block" v-if="detail">
    <div class="detail-layout">
      <img class="detail-cover" :src="detailCoverSource" :alt="detail.title" />

      <div>
        <h1 class="detail-title">{{ detail.title }}</h1>
        <p class="detail-meta">Tác giả: {{ detail.author || "Đang cập nhật" }} · {{ detail.status }}</p>
        <p class="detail-meta">Lượt xem: {{ formatCount(detail.viewCount) }}</p>
        <p class="detail-meta">Lượt theo dõi: {{ followCount }}</p>
        <p class="detail-meta">Lượt yêu thích: {{ formatCount(favoriteCount) }}</p>
        <p class="detail-meta">Đánh giá: {{ formatRating(ratingAverage) }} ({{ formatCount(ratingCount) }} lượt)</p>

        <div class="chip-row genre-row">
          <span v-for="genre in detail.genres" :key="genre.id" class="chip static genre-tag">{{ genre.name }}</span>
        </div>

        <div class="detail-actions">
          <router-link
            v-if="latestChapter"
            :to="`/read/${detail.slug}/${latestChapter.slug}`"
            class="primary-btn"
          >
            Đọc chương mới nhất
          </router-link>
          <button class="secondary-btn" @click="toggleFollow" v-if="auth.isAuthenticated">
            {{ following ? "Bỏ theo dõi" : "Theo dõi" }}
          </button>
          <button class="secondary-btn" @click="toggleFavorite" v-if="auth.isAuthenticated">
            {{ favorite ? "Bỏ yêu thích" : "Yêu thích" }}
          </button>
          <router-link v-if="!auth.isAuthenticated" :to="{ name: 'login', query: { redirect: $route.fullPath } }" class="secondary-btn">
            Đăng nhập để theo dõi
          </router-link>
        </div>

        <div class="detail-tool-toggle">
          <button type="button" class="secondary-btn" @click="toggleToolPanel('rating')">
            {{ activeToolPanel === 'rating' ? 'Ẩn đánh giá' : 'Đánh giá truyện' }}
          </button>
          <button type="button" class="secondary-btn" @click="toggleToolPanel('report')">
            {{ activeToolPanel === 'report' ? 'Ẩn báo cáo' : 'Báo cáo nội dung' }}
          </button>
        </div>

        <div class="social-card tool-panel" v-if="activeToolPanel === 'rating'">
          <h3>Đánh giá truyện</h3>
          <p class="detail-meta">Điểm của bạn: {{ myRating ?? "Chưa đánh giá" }}</p>
          <div class="social-row">
            <select v-model="selectedRatingValue">
              <option value="">Chọn điểm</option>
              <option v-for="score in [5, 4, 3, 2, 1]" :key="`rate-${score}`" :value="String(score)">
                {{ score }} sao
              </option>
            </select>
            <button class="primary-btn" type="button" @click="submitRating">Gửi</button>
          </div>
        </div>

        <div class="social-card tool-panel" v-if="activeToolPanel === 'report'">
          <h3>Báo cáo nội dung</h3>
          <div class="social-row social-row-stack">
            <select v-model="reportReason">
              <option value="SPAM">Spam</option>
              <option value="INAPPROPRIATE">Không phù hợp</option>
              <option value="COPYRIGHT">Bản quyền</option>
              <option value="HARASSMENT">Quấy rối</option>
              <option value="OTHER">Khác</option>
            </select>
            <textarea v-model="reportDetails" rows="3" placeholder="Mô tả thêm (tuỳ chọn)"></textarea>
            <button class="secondary-btn" type="button" @click="submitReport">Gửi báo cáo</button>
          </div>
        </div>
      </div>
    </div>

    <article class="detail-description-block">
      <div class="section-head" style="margin-bottom: 10px;">
        <h2>Mô tả truyện</h2>
      </div>
      <p class="detail-description" :class="{ collapsed: shouldCollapseDescription && !descriptionExpanded }">
        {{ descriptionText }}
      </p>
      <button
        v-if="shouldCollapseDescription"
        type="button"
        class="secondary-btn"
        @click="descriptionExpanded = !descriptionExpanded"
      >
        {{ descriptionExpanded ? "Thu gọn" : "Xem thêm" }}
      </button>
    </article>

    <div class="section-head" style="margin-top: 24px;">
      <h2>Danh sách chương</h2>
      <button class="secondary-btn" @click="sortAsc = !sortAsc">
        Sắp xếp: {{ sortAsc ? "Tăng" : "Giảm" }}
      </button>
    </div>

    <div class="chapter-list" :class="{ 'chapter-list-scroll': displayedChapters.length > 10 }">
      <router-link
        v-for="chapter in displayedChapters"
        :key="chapter.id"
        :to="`/read/${detail.slug}/${chapter.slug}`"
        class="chapter-item"
      >
        <div class="chapter-item-main">
          <span>{{ chapter.title }}</span>
          <span class="chapter-item-meta">
            {{ formatPublishedAt(chapter.publishedAt) }} · {{ formatCount(chapter.viewCount) }} lượt xem
          </span>
        </div>
        <span>#{{ chapter.number ?? chapter.sortIndex }}</span>
      </router-link>
    </div>

    <article class="social-card" style="margin-top: 16px;">
      <div class="section-head" style="margin-bottom: 10px;">
        <h2>Bình luận truyện</h2>
      </div>

      <form class="comment-composer" @submit.prevent="submitComment">
        <input
          v-if="!auth.isAuthenticated"
          class="comment-guest-input"
          v-model="guestCommentName"
          maxlength="120"
          placeholder="Tên hiển thị của bạn"
        />
        <textarea
          class="comment-input"
          v-model="commentText"
          rows="2"
          maxlength="2000"
          placeholder="Viết bình luận công khai..."
        ></textarea>
        <div class="replying-banner" v-if="replyingTo">
          <span>
            Đang trả lời <strong>{{ replyingTo.userDisplayName }}</strong>
          </span>
          <button type="button" class="comment-reply-cancel" @click="cancelReply">Hủy</button>
        </div>
        <div class="comment-composer-actions">
          <button class="comment-submit" type="submit">Đăng bình luận</button>
        </div>
      </form>

      <div class="comment-list" v-if="threadedComments.length">
        <article
          class="comment-item"
          :class="{ 'comment-item-reply': comment.depth > 0 }"
          :style="{ marginLeft: `${Math.min(comment.depth, 4) * 16}px` }"
          v-for="comment in threadedComments"
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
              <button type="button" class="comment-reply" @click="startReply(comment)">Trả lời</button>
              <button type="button" class="comment-delete" v-if="comment.mine" @click="removeComment(comment.id)">Xóa</button>
            </div>
          </div>
          <p>{{ comment.content }}</p>
        </article>
      </div>
      <p v-else class="empty-text">Chưa có bình luận nào.</p>

      <p v-if="socialNotice" class="search-info">{{ socialNotice }}</p>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../lib/api";
import { resolvePublicImageUrl } from "../lib/image";
import { updateDocumentSeo } from "../lib/seo";
import { useAuthStore } from "../stores/auth";
import type { CommentItem, ComicDetail, FavoriteState, UserRating } from "../types";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const detail = ref<ComicDetail | null>(null);
const sortAsc = ref(false);
const following = ref(false);
const followCount = ref(0);
const favorite = ref(false);
const favoriteCount = ref(0);
const ratingAverage = ref(0);
const ratingCount = ref(0);
const myRating = ref<number | null>(null);
const selectedRating = ref<number | null>(null);
const comments = ref<CommentItem[]>([]);
const commentText = ref("");
const guestCommentName = ref(localStorage.getItem("guest_comment_name") || "");
const replyingTo = ref<CommentItem | null>(null);
const reportReason = ref("SPAM");
const reportDetails = ref("");
const socialNotice = ref("");
const descriptionExpanded = ref(false);
const activeToolPanel = ref<"rating" | "report" | null>(null);

const COMMENT_COOLDOWN_MS = 60 * 1000;
const RATING_COOLDOWN_MS = 60 * 1000;
const REPORT_COOLDOWN_MS = 60 * 1000;

type ThreadedCommentItem = CommentItem & {
  depth: number;
};

const fallbackCover =
  "https://dummyimage.com/300x420/e2e8f0/475569.png&text=No+Cover";

const detailCoverSource = computed(() => resolvePublicImageUrl(detail.value?.coverUrl) || fallbackCover);
const descriptionText = computed(() => detail.value?.description || "Chưa có mô tả");
const shouldCollapseDescription = computed(() => descriptionText.value.length > 700);

const toTimestamp = (value: string) => {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const threadedComments = computed<ThreadedCommentItem[]>(() => {
  const source = comments.value;
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

const formatCount = (value: number) => new Intl.NumberFormat("vi-VN").format(value || 0);
const formatRating = (value: number) => (value || 0).toFixed(1);

const statusLabelMap: Record<string, string> = {
  ONGOING: "Đang tiến hành",
  COMPLETED: "Hoàn thành",
  HIATUS: "Tạm ngưng",
};

const toPlainText = (value: string | null | undefined, maxLength: number) => {
  const normalized = (value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "Đọc truyện tranh miễn phí, cập nhật chương mới liên tục tại Truyện Chill.";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
};

const buildComicStructuredData = (comic: ComicDetail) => {
  const baseUrl = window.location.origin;
  const chapterCount = comic.chapters.length;
  const latest = latestChapter.value;

  return {
    "@context": "https://schema.org",
    "@type": "ComicSeries",
    name: comic.title,
    url: `${baseUrl}/comic/${comic.slug}`,
    description: toPlainText(comic.description, 240),
    image: detailCoverSource.value,
    inLanguage: "vi",
    author: comic.author ? { "@type": "Person", name: comic.author } : undefined,
    genre: comic.genres.map((genre) => genre.name),
    numberOfItems: chapterCount,
    dateModified: comic.updatedAt,
    potentialAction: latest
      ? {
          "@type": "ReadAction",
          target: `${baseUrl}/read/${comic.slug}/${latest.slug}`,
        }
      : undefined,
  };
};

const applyComicSeo = () => {
  if (!detail.value) {
    return;
  }

  const comic = detail.value;
  const normalizedStatus = statusLabelMap[comic.status] || comic.status;
  const genres = comic.genres.map((genre) => genre.name).filter(Boolean);
  const description = toPlainText(comic.description, 170);
  const keywordParts = [
    comic.title,
    comic.author || "",
    ...genres,
    "đọc truyện tranh",
    "truyện tranh miễn phí",
    "truyện chill",
  ].filter((item) => item && item.trim().length > 0);

  updateDocumentSeo({
    title: `${comic.title} - ${normalizedStatus}`,
    description,
    keywords: keywordParts.join(", "),
    path: `/comic/${comic.slug}`,
    image: detailCoverSource.value,
    type: "book",
    structuredData: buildComicStructuredData(comic),
  });
};

const selectedRatingValue = computed({
  get: () => (selectedRating.value == null ? "" : String(selectedRating.value)),
  set: (value: string) => {
    selectedRating.value = value ? Number(value) : null;
  },
});

const formatPublishedAt = (value: string | null) => {
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

const displayedChapters = computed(() => {
  if (!detail.value) {
    return [];
  }
  const list = [...detail.value.chapters];
  return sortAsc.value ? list : list.reverse();
});

const latestChapter = computed(() => {
  if (!detail.value || !detail.value.chapters.length) {
    return null;
  }
  const sorted = [...detail.value.chapters].sort((a, b) => b.sortIndex - a.sortIndex);
  return sorted[0];
});

const loadDetail = async () => {
  const { data } = await api.get(`/api/public/comics/${route.params.slug}`);
  detail.value = data;
  descriptionExpanded.value = false;
  followCount.value = data.followCount || 0;
  favoriteCount.value = data.favoriteCount || 0;
  ratingAverage.value = data.ratingAverage || 0;
  ratingCount.value = data.ratingCount || 0;

  if (auth.isAuthenticated && detail.value) {
    try {
      const { data: followData } = await api.get("/api/user/follows/check", {
        params: { comicId: detail.value.id },
      });
      following.value = followData.following;
      followCount.value = followData.followCount;
    } catch {
      following.value = false;
    }
  }

  applyComicSeo();
};

const loadSocialState = async () => {
  if (!detail.value) {
    return;
  }

  if (auth.isAuthenticated) {
    try {
      const [{ data: favoriteData }, { data: myRatingData }] = await Promise.all([
        api.get<FavoriteState>("/api/user/favorites/check", { params: { comicId: detail.value.id } }),
        api.get<UserRating>(`/api/user/ratings/${detail.value.id}`),
      ]);

      favorite.value = favoriteData.favorite;
      favoriteCount.value = favoriteData.favoriteCount;
      myRating.value = myRatingData.score;
      selectedRating.value = myRatingData.score;
    } catch {
      favorite.value = false;
      myRating.value = null;
    }
  }
};

const loadComments = async () => {
  if (!detail.value) {
    return;
  }

  const { data } = await api.get("/api/public/comments", {
    params: {
      comicSlug: detail.value.slug,
      page: 0,
      size: 40,
    },
  });
  comments.value = data.content || [];
  replyingTo.value = null;
};

const ensureAuth = () => {
  if (auth.isAuthenticated) {
    return true;
  }
  router.push({ name: "login", query: { redirect: route.fullPath } });
  return false;
};

const toggleToolPanel = (panel: "rating" | "report") => {
  activeToolPanel.value = activeToolPanel.value === panel ? null : panel;
};

const toggleFollow = async () => {
  if (!detail.value) {
    return;
  }

  if (!auth.isAuthenticated) {
    router.push({ name: "login", query: { redirect: route.fullPath } });
    return;
  }

  const comicId = detail.value.id;
  const { data } = following.value
    ? await api.delete(`/api/user/follows/${comicId}`)
    : await api.post(`/api/user/follows/${comicId}`);

  following.value = data.following;
  followCount.value = data.followCount;
};

const toggleFavorite = async () => {
  if (!detail.value || !ensureAuth()) {
    return;
  }

  const comicId = detail.value.id;
  const { data } = favorite.value
    ? await api.delete(`/api/user/favorites/${comicId}`)
    : await api.post(`/api/user/favorites/${comicId}`);

  favorite.value = data.favorite;
  favoriteCount.value = data.favoriteCount;
};

const submitRating = async () => {
  if (!detail.value || !ensureAuth()) {
    return;
  }

  if (!selectedRating.value || selectedRating.value < 1 || selectedRating.value > 5) {
    socialNotice.value = "Vui lòng chọn điểm từ 1 đến 5.";
    return;
  }

  const cooldownKey = `rating_cooldown:comic:${detail.value.id}:user:${auth.user?.id ?? "me"}`;
  const now = Date.now();
  const lastRatingAt = Number(localStorage.getItem(cooldownKey) || "0");
  if (lastRatingAt && now - lastRatingAt < RATING_COOLDOWN_MS) {
    socialNotice.value = "Bạn vừa đánh giá truyện này. Vui lòng chờ 1 phút rồi thử lại.";
    return;
  }

  try {
    const { data } = await api.post(`/api/user/ratings/${detail.value.id}`, {
      score: selectedRating.value,
    });

    localStorage.setItem(cooldownKey, String(now));
    myRating.value = selectedRating.value;
    ratingAverage.value = data.averageScore || 0;
    ratingCount.value = data.ratingCount || 0;
    socialNotice.value = "Đã cập nhật đánh giá.";
  } catch (error: any) {
    socialNotice.value = error?.response?.data?.message || "Không thể gửi đánh giá lúc này.";
  }
};

const submitComment = async () => {
  if (!detail.value) {
    return;
  }

  const parentId = replyingTo.value?.id ?? null;
  const isReply = parentId != null;

  const content = commentText.value.trim();
  if (!content) {
    return;
  }

  const cooldownKey = `comment_cooldown:comic:${detail.value.id}`;
  const now = Date.now();
  const lastCommentAt = Number(localStorage.getItem(cooldownKey) || "0");
  if (lastCommentAt && now - lastCommentAt < COMMENT_COOLDOWN_MS) {
    socialNotice.value = "Bạn vừa gửi bình luận. Vui lòng chờ 1 phút rồi thử lại.";
    return;
  }

  try {
    let data: CommentItem;
    if (auth.isAuthenticated) {
      const response = await api.post<CommentItem>("/api/user/comments", {
        comicId: detail.value.id,
        parentId,
        content,
      });
      data = response.data;
    } else {
      const guestName = guestCommentName.value.trim();
      if (!guestName) {
        socialNotice.value = "Vui lòng nhập tên trước khi bình luận.";
        return;
      }

      localStorage.setItem("guest_comment_name", guestName);
      const response = await api.post<CommentItem>("/api/public/comments", {
        comicId: detail.value.id,
        parentId,
        content,
        guestName,
      });
      data = response.data;
    }

    localStorage.setItem(cooldownKey, String(now));

    comments.value = [data, ...comments.value];
    commentText.value = "";
    replyingTo.value = null;
    socialNotice.value = isReply ? "Đã gửi phản hồi." : "Đã đăng bình luận.";
  } catch (error: any) {
    if (error?.response?.status === 405) {
      socialNotice.value = "Backend chưa cập nhật endpoint bình luận khách. Hãy restart backend rồi thử lại.";
      return;
    }
    socialNotice.value = error?.response?.data?.message || "Không thể gửi bình luận lúc này.";
  }
};

const removeComment = async (commentId: number) => {
  await api.delete(`/api/user/comments/${commentId}`);
  comments.value = comments.value.filter((comment) => comment.id !== commentId);
  if (replyingTo.value?.id === commentId) {
    replyingTo.value = null;
  }
};

const startReply = (comment: CommentItem) => {
  replyingTo.value = comment;
};

const cancelReply = () => {
  replyingTo.value = null;
};

const submitReport = async () => {
  if (!detail.value || !ensureAuth()) {
    return;
  }

  const cooldownKey = `report_cooldown:comic:${detail.value.id}:user:${auth.user?.id ?? "me"}`;
  const now = Date.now();
  const lastReportAt = Number(localStorage.getItem(cooldownKey) || "0");
  if (lastReportAt && now - lastReportAt < REPORT_COOLDOWN_MS) {
    socialNotice.value = "Bạn vừa gửi báo cáo. Vui lòng chờ 1 phút rồi thử lại.";
    return;
  }

  try {
    await api.post("/api/user/reports", {
      comicId: detail.value.id,
      reason: reportReason.value,
      details: reportDetails.value.trim() || undefined,
    });

    localStorage.setItem(cooldownKey, String(now));
    reportDetails.value = "";
    socialNotice.value = "Đã gửi báo cáo, cảm ơn bạn.";
  } catch (error: any) {
    socialNotice.value = error?.response?.data?.message || "Không thể gửi báo cáo lúc này.";
  }
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

const loadPage = async () => {
  await loadDetail();
  await Promise.all([loadSocialState(), loadComments()]);
};

onMounted(async () => {
  await loadPage();
});

watch(
  () => route.params.slug,
  async (nextSlug, previousSlug) => {
    if (!nextSlug || nextSlug === previousSlug) {
      return;
    }
    await loadPage();
  }
);
</script>
