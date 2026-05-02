<template>
  <section class="container home-community">
    <div class="home-community-left">
      <router-link
        class="community-item community-item-link"
        v-for="item in communityItems"
        :key="item.title"
        :to="item.to"
      >
        <span class="community-icon-wrap" :class="item.iconClass" aria-hidden="true">
          <svg class="community-icon" viewBox="0 0 24 24">
            <path :d="item.iconPath" />
          </svg>
        </span>
        <div>
          <p class="community-title">{{ item.title }}</p>
          <p class="community-desc">{{ item.desc }}</p>
        </div>
      </router-link>
    </div>

    <div class="home-community-right">
      <a href="https://facebook.com" target="_blank" rel="noreferrer" class="social-pill">Facebook</a>
      <a href="https://discord.gg" target="_blank" rel="noreferrer" class="social-pill">Discord</a>
      <a href="https://t.me" target="_blank" rel="noreferrer" class="social-pill">Telegram</a>
    </div>
  </section>

  <section class="container section-block">
    <div class="section-head">
      <h2 class="section-title">Truyện Hay</h2>
    </div>
    <HorizontalComicRow :comics="featuredComics" analytics-context="home_hot" />
  </section>

  <section class="container section-block">
    <div class="section-head">
      <h2 class="section-title">Truyện Xuyên Không</h2>
    </div>
    <HorizontalComicRow :comics="exclusiveComics" analytics-context="home_exclusive" />
  </section>

  <section class="container section-block">
    <div class="section-head home-filter-head">
      <h2 class="section-title">Danh Sách Truyện Tranh Mới</h2>
      <form class="mini-search" @submit.prevent="goSearch">
        <input v-model="keyword" placeholder="Tìm tên truyện" />
        <button type="submit">Tìm</button>
      </form>
      <div class="chip-row chip-row-scroll">
        <button :class="{ active: genreId === null }" @click="setGenre(null)">Tất cả</button>
        <button
          v-for="genre in genres"
          :key="genre.id"
          :class="{ active: genreId === genre.id }"
          @click="setGenre(genre.id)"
        >
          {{ genre.name }}
        </button>
      </div>
    </div>

    <div class="comic-grid">
      <ComicCardItem
        v-for="comic in comics"
        :key="comic.id"
        :comic="comic"
        analytics-context="home_latest"
      />
    </div>

    <div class="home-load-more-wrap" v-if="browseHasMore">
      <button type="button" class="home-load-more-btn" :disabled="browseLoading" @click="loadMoreComics">
        {{ browseLoading ? "Đang tải…" : "Tải thêm truyện" }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../lib/api";
import { trackAnalyticsEvent } from "../lib/analytics";
import { fetchPublicGenres } from "../lib/publicData";
import type { ComicCard, GenreItem } from "../types";
import ComicCardItem from "../components/ComicCard.vue";
import HorizontalComicRow from "../components/HorizontalComicRow.vue";
type HomePayload = {
  latestUpdated?: ComicCard[];
  hot?: ComicCard[];
  exclusive?: ComicCard[];
  latestHasMore?: boolean;
  latestPageSize?: number;
};

const router = useRouter();

const hot = ref<ComicCard[]>([]);
const exclusive = ref<ComicCard[]>([]);
const comics = ref<ComicCard[]>([]);
const genres = ref<GenreItem[]>([]);
const genreId = ref<number | null>(null);
const browseNextPage = ref(1);
const browseHasMore = ref(false);
const browseLoading = ref(false);
const keyword = ref("");
const communityItems = [
  {
    title: "YÊU CẦU DỊCH TRUYỆN",
    desc: "Đề xuất bộ truyện bạn muốn được dịch và cập nhật.",
    to: "/request-translation",
    iconClass: "community-icon-community",
    iconPath:
      "M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5s1.34 3.5 3 3.5z M8 11c1.66 0 3-1.57 3-3.5S9.66 4 8 4S5 5.57 5 7.5S6.34 11 8 11z M8 13c-2.67 0-8 1.34-8 4v2h10v-2c0-1.2.47-2.23 1.24-3.06C10.29 13.57 9.08 13 8 13z M16 13c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  },
  {
    title: "LIÊN HỆ QUẢNG CÁO",
    desc: "Hợp tác quảng cáo và tài trợ tại đây.",
    to: "/advertising-contact",
    iconClass: "community-icon-ads",
    iconPath:
      "M3 10.5V14c0 .55.45 1 1 1h2l5 4V5L6 9H4c-.55 0-1 .45-1 1.5z M15 10.5c0 1.38-.56 2.63-1.46 3.54l1.41 1.41A6.97 6.97 0 0 0 17 10.5a6.97 6.97 0 0 0-2.05-4.95l-1.41 1.41c.9.91 1.46 2.16 1.46 3.54z M18.5 10.5c0 2.35-.95 4.48-2.5 6.01l1.41 1.41A10.43 10.43 0 0 0 21 10.5c0-2.88-1.17-5.48-3.05-7.42l-1.41 1.41c1.24 1.27 1.96 3.01 1.96 4.01z",
  },
];

const featuredComics = computed(() => hot.value.slice(0, 21));
const exclusiveComics = computed(() => exclusive.value.slice(0, 21));

const loadHome = async () => {
  const { data } = await api.get<HomePayload>("/api/public/home");
  comics.value = data.latestUpdated || [];
  hot.value = data.hot || [];
  exclusive.value = data.exclusive || data.latestUpdated || [];
  browseNextPage.value = 1;
  browseHasMore.value = data.latestHasMore === true;
};

const loadGenres = async () => {
  genres.value = await fetchPublicGenres();
};

const loadBrowse = async () => {
  const { data } = await api.get("/api/public/comics", {
    params: {
      page: 0,
      size: 21,
      genreId: genreId.value ?? undefined,
    },
  });
  comics.value = data.content || [];
  browseNextPage.value = 1;
  browseHasMore.value = data.hasNext === true;
};

const loadMoreComics = async () => {
  if (browseLoading.value || !browseHasMore.value) {
    return;
  }
  browseLoading.value = true;
  try {
    const { data } = await api.get("/api/public/comics", {
      params: {
        page: browseNextPage.value,
        size: 21,
        genreId: genreId.value ?? undefined,
      },
    });
    const chunk = data.content || [];
    comics.value = [...comics.value, ...chunk];
    browseNextPage.value += 1;
    browseHasMore.value = data.hasNext === true;
  } finally {
    browseLoading.value = false;
  }
};

const setGenre = (nextGenreId: number | null) => {
  genreId.value = nextGenreId;
  void loadBrowse();
};

const goSearch = () => {
  const normalizedKeyword = keyword.value.trim();
  trackAnalyticsEvent("SEARCH_SUBMIT", {
    pagePath: "/",
    context: "home_search",
    source: "internal",
    searchQueryLength: normalizedKeyword.length,
  });

  router.push({ name: "search", query: { q: keyword.value || undefined } });
};

onMounted(async () => {
  await Promise.all([loadHome(), loadGenres()]);
});
</script>

<style scoped>
.home-load-more-wrap {
  display: flex;
  justify-content: center;
  margin-top: 1.25rem;
}

.home-load-more-btn {
  padding: 0.55rem 1.35rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  font-weight: 600;
  cursor: pointer;
}

.home-load-more-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
}

.home-load-more-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
