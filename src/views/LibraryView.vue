<template>
  <section class="container section-block">
    <div class="section-head">
      <h2>Tủ sách cá nhân</h2>
    </div>

    <div class="library-grid">
      <article class="library-card">
        <h3>Truyện đang theo dõi</h3>
        <div v-if="follows.length" class="library-list">
          <router-link
            v-for="item in follows"
            :key="item.comicId"
            :to="`/comic/${item.slug}`"
            class="library-item"
          >
            <img :src="resolveCover(item.coverUrl)" :alt="item.title" loading="lazy" />
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.author || "Đang cập nhật" }}</p>
            </div>
          </router-link>
        </div>
        <p v-else class="empty-text">Bạn chưa theo dõi truyện nào.</p>
      </article>

      <article class="library-card">
        <h3>Danh sách yêu thích</h3>
        <div v-if="favorites.length" class="library-list">
          <router-link
            v-for="item in favorites"
            :key="`fav-${item.comicId}`"
            :to="`/comic/${item.slug}`"
            class="library-item"
          >
            <img :src="resolveCover(item.coverUrl)" :alt="item.title" loading="lazy" />
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.author || "Đang cập nhật" }}</p>
            </div>
          </router-link>
        </div>
        <p v-else class="empty-text">Bạn chưa thêm truyện yêu thích.</p>
      </article>

      <article class="library-card">
        <h3>Lịch sử đọc</h3>
        <div v-if="history.length" class="history-list">
          <router-link
            v-for="item in history"
            :key="item.comicId"
            :to="historyLink(item)"
            class="history-item"
          >
            <div>
              <strong>{{ item.comicTitle }}</strong>
              <p>
                {{ item.chapterTitle ? `Đang đọc: ${item.chapterTitle}` : "Chưa có chương đã đọc" }}
              </p>
            </div>
            <span>Trang {{ item.pageIndex }}</span>
          </router-link>
        </div>
        <p v-else class="empty-text">Chưa có lịch sử đọc.</p>
      </article>

      <article class="library-card">
        <h3>Đề xuất theo hành vi đọc</h3>
        <div v-if="recommendations.length" class="library-list">
          <router-link
            v-for="item in recommendations"
            :key="`rec-${item.comicId}`"
            :to="`/comic/${item.slug}`"
            class="library-item"
          >
            <img :src="resolveCover(item.coverUrl)" :alt="item.title" loading="lazy" />
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.reason }}</p>
            </div>
          </router-link>
        </div>
        <p v-else class="empty-text">Chưa có gợi ý phù hợp.</p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import api from "../lib/api";
import { resolvePublicImageUrl } from "../lib/image";
import type { FavoriteComic, RecommendationItem } from "../types";

type FollowItem = {
  comicId: number;
  title: string;
  slug: string;
  coverUrl: string | null;
  author: string | null;
};

type HistoryItem = {
  comicId: number;
  comicTitle: string;
  comicSlug: string;
  chapterId: number | null;
  chapterTitle: string | null;
  chapterSlug: string | null;
  pageIndex: number;
};

const follows = ref<FollowItem[]>([]);
const favorites = ref<FavoriteComic[]>([]);
const history = ref<HistoryItem[]>([]);
const recommendations = ref<RecommendationItem[]>([]);

const fallbackCover = "https://dummyimage.com/300x420/e2e8f0/475569.png&text=No+Cover";

const resolveCover = (coverUrl: string | null) => resolvePublicImageUrl(coverUrl) || fallbackCover;

const loadRecommendations = async () => {
  const hasBehaviorData =
    follows.value.length > 0 || favorites.value.length > 0 || history.value.length > 0;

  if (!hasBehaviorData) {
    recommendations.value = [];
    return;
  }

  const recommendationRes = await api.get("/api/user/recommendations", { params: { limit: 16 } });
  recommendations.value = recommendationRes.data || [];
};

const load = async () => {
  const [followRes, favoriteRes, historyRes] = await Promise.all([
    api.get("/api/user/follows"),
    api.get("/api/user/favorites"),
    api.get("/api/user/history", { params: { limit: 40 } }),
  ]);

  follows.value = followRes.data || [];
  favorites.value = favoriteRes.data || [];
  history.value = historyRes.data || [];

  // Load recommendation after core sections so the page becomes usable faster.
  await loadRecommendations();
};

const historyLink = (item: HistoryItem) => {
  if (item.chapterSlug) {
    return `/read/${item.comicSlug}/${item.chapterSlug}`;
  }
  return `/comic/${item.comicSlug}`;
};

onMounted(load);
</script>
