<template>
  <section class="container section-block" v-if="detail">
    <div class="detail-layout">
      <img class="detail-cover" :src="detailCoverSource" :alt="detail.title" />

      <div>
        <h1 class="detail-title">{{ detail.title }}</h1>
        <p class="detail-meta">Tác giả: {{ detail.author || "Đang cập nhật" }} · {{ detail.status }} · {{ detail.releaseYear || "N/A" }}</p>
        <p class="detail-meta">Lượt xem: {{ formatCount(detail.viewCount) }}</p>
        <p class="detail-meta">Lượt theo dõi: {{ followCount }}</p>
        <p class="detail-meta">Lượt yêu thích: {{ formatCount(favoriteCount) }}</p>
        <p class="detail-meta">Đánh giá: {{ formatRating(ratingAverage) }} ({{ formatCount(ratingCount) }} lượt)</p>

        <div class="chip-row">
          <span v-for="genre in detail.genres" :key="genre.id" class="chip static">{{ genre.name }}</span>
        </div>

        <p class="detail-description">{{ detail.description || "Chưa có mô tả" }}</p>

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

        <div class="social-card" style="margin-top: 10px;">
          <h3>Đánh giá truyện</h3>
          <p class="detail-meta">Điểm của bạn: {{ myRating ?? "Chưa đánh giá" }}</p>
          <div class="social-row">
            <select v-model="selectedRatingValue">
              <option value="">Chọn điểm</option>
              <option v-for="score in [5, 4, 3, 2, 1]" :key="`rate-${score}`" :value="String(score)">
                {{ score }} sao
              </option>
            </select>
            <button class="primary-btn" @click="submitRating">Gửi đánh giá</button>
          </div>
        </div>

        <div class="social-card" style="margin-top: 10px;">
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
            <button class="secondary-btn" @click="submitReport">Gửi báo cáo</button>
          </div>
        </div>
      </div>
    </div>

    <div class="section-head" style="margin-top: 24px;">
      <h2>Danh sách chương</h2>
      <button class="secondary-btn" @click="sortAsc = !sortAsc">
        Sắp xếp: {{ sortAsc ? "Tăng" : "Giảm" }}
      </button>
    </div>

    <div class="chapter-list">
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

      <form class="social-row social-row-stack" @submit.prevent="submitComment" v-if="auth.isAuthenticated">
        <textarea
          v-model="commentText"
          rows="3"
          maxlength="2000"
          placeholder="Viết bình luận cho truyện này..."
        ></textarea>
        <button class="primary-btn" type="submit">Đăng bình luận</button>
      </form>
      <p v-else class="detail-meta">Đăng nhập để bình luận.</p>

      <div class="comment-list" v-if="comments.length">
        <article class="comment-item" v-for="comment in comments" :key="comment.id">
          <div class="comment-head">
            <strong>{{ comment.userDisplayName }}</strong>
            <div class="comment-actions">
              <span>{{ formatCommentTime(comment.createdAt) }}</span>
              <button class="comment-delete" v-if="comment.mine" @click="removeComment(comment.id)">Xóa</button>
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
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../lib/api";
import { resolvePublicImageUrl } from "../lib/image";
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
const reportReason = ref("SPAM");
const reportDetails = ref("");
const socialNotice = ref("");

const fallbackCover =
  "https://dummyimage.com/300x420/e2e8f0/475569.png&text=No+Cover";

const detailCoverSource = computed(() => resolvePublicImageUrl(detail.value?.coverUrl) || fallbackCover);

const formatCount = (value: number) => new Intl.NumberFormat("vi-VN").format(value || 0);
const formatRating = (value: number) => (value || 0).toFixed(1);

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
};

const ensureAuth = () => {
  if (auth.isAuthenticated) {
    return true;
  }
  router.push({ name: "login", query: { redirect: route.fullPath } });
  return false;
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

  const { data } = await api.post(`/api/user/ratings/${detail.value.id}`, {
    score: selectedRating.value,
  });

  myRating.value = selectedRating.value;
  ratingAverage.value = data.averageScore || 0;
  ratingCount.value = data.ratingCount || 0;
  socialNotice.value = "Đã cập nhật đánh giá.";
};

const submitComment = async () => {
  if (!detail.value || !ensureAuth()) {
    return;
  }

  const content = commentText.value.trim();
  if (!content) {
    return;
  }

  const { data } = await api.post("/api/user/comments", {
    comicId: detail.value.id,
    content,
  });

  comments.value = [data, ...comments.value];
  commentText.value = "";
  socialNotice.value = "Đã đăng bình luận.";
};

const removeComment = async (commentId: number) => {
  await api.delete(`/api/user/comments/${commentId}`);
  comments.value = comments.value.filter((comment) => comment.id !== commentId);
};

const submitReport = async () => {
  if (!detail.value || !ensureAuth()) {
    return;
  }

  await api.post("/api/user/reports", {
    comicId: detail.value.id,
    reason: reportReason.value,
    details: reportDetails.value.trim() || undefined,
  });

  reportDetails.value = "";
  socialNotice.value = "Đã gửi báo cáo, cảm ơn bạn.";
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

onMounted(async () => {
  await loadDetail();
  await Promise.all([loadSocialState(), loadComments()]);
});
</script>
