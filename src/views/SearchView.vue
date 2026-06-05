<template>
  <section class="container section-block">
    <div class="section-head">
      <h2>Tìm kiếm truyện</h2>
    </div>

    <form class="search-panel" @submit.prevent="submitSearch">
      <input v-model="query" placeholder="Nhập tên truyện..." />
      <input v-model="author" placeholder="Tác giả" />
      <select v-model="selectedGenreValue">
        <option value="">Tất cả thể loại</option>
        <option v-for="genre in genres" :key="genre.id" :value="String(genre.id)">
          {{ genre.name }}
        </option>
      </select>
      <select v-model="selectedStatus">
        <option value="">Mọi trạng thái</option>
        <option value="ONGOING">Đang tiến hành</option>
        <option value="COMPLETED">Hoàn thành</option>
        <option value="HIATUS">Tạm ngưng</option>
      </select>
      <input v-model="releaseYearValue" type="number" min="1900" max="2999" placeholder="Năm" />
      <button type="submit">Tìm</button>
    </form>

    <p class="search-info" v-if="query">Kết quả cho từ khóa: "{{ query }}"</p>

    <AdBanner />

    <PaginationControl :page="page" :total-pages="0" :has-next="hasNextPage" @change="changePage" />

    <div class="comic-grid">
      <ComicCardItem
        v-for="comic in comics"
        :key="comic.id"
        :comic="comic"
        analytics-context="search_results"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../lib/api";
import { trackAnalyticsEvent } from "../lib/analytics";
import { fetchPublicGenres } from "../lib/publicData";
import type { ComicCard, GenreItem } from "../types";
import ComicCardItem from "../components/ComicCard.vue";
import PaginationControl from "../components/PaginationControl.vue";
import AdBanner from "../components/AdBanner.vue";

const route = useRoute();
const router = useRouter();

const query = ref("");
const author = ref("");
const selectedGenre = ref<number | null>(null);
const selectedStatus = ref("");
const releaseYear = ref<number | null>(null);
const genres = ref<GenreItem[]>([]);
const comics = ref<ComicCard[]>([]);
const page = ref(0);
const hasNextPage = ref(false);
const isSyncingFromRoute = ref(false);
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const SEARCH_DEBOUNCE_MS = 1000;
const SEARCH_RESULT_SIZE = 20;

const buildSearchQuery = () => ({
  q: query.value || undefined,
  author: author.value || undefined,
  genre: selectedGenre.value ?? undefined,
  status: selectedStatus.value || undefined,
  year: releaseYear.value ?? undefined,
});

const isRouteQueryEqualToCurrent = () => {
  const rawGenre = route.query.genre as string | undefined;
  const rawYear = route.query.year as string | undefined;

  return (
    (route.query.q as string | undefined) === (query.value || undefined) &&
    (route.query.author as string | undefined) === (author.value || undefined) &&
    (rawGenre ? Number(rawGenre) : null) === selectedGenre.value &&
    ((route.query.status as string | undefined) || "").toUpperCase() === selectedStatus.value &&
    (rawYear ? Number(rawYear) : null) === releaseYear.value
  );
};

const scheduleRouteSync = () => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }

  searchDebounceTimer = setTimeout(() => {
    if (isRouteQueryEqualToCurrent()) {
      return;
    }

    page.value = 0;
    void router.replace({ name: "search", query: buildSearchQuery() });
  }, SEARCH_DEBOUNCE_MS);
};

const selectedGenreValue = computed({
  get: () => (selectedGenre.value == null ? "" : String(selectedGenre.value)),
  set: (value: string) => {
    selectedGenre.value = value ? Number(value) : null;
  },
});

const releaseYearValue = computed({
  get: () => (releaseYear.value == null ? "" : String(releaseYear.value)),
  set: (value: string) => {
    releaseYear.value = value ? Number(value) : null;
  },
});

const loadGenres = async () => {
  genres.value = await fetchPublicGenres();
};

const loadResult = async () => {
  const { data } = await api.get("/api/public/comics", {
    params: {
      query: query.value || undefined,
      author: author.value || undefined,
      genreId: selectedGenre.value ?? undefined,
      status: selectedStatus.value || undefined,
      year: releaseYear.value ?? undefined,
      page: page.value,
      size: SEARCH_RESULT_SIZE,
    },
  });
  comics.value = data.content || [];
  hasNextPage.value = data.hasNext === true;
};

const submitSearch = () => {
  const normalizedQuery = query.value.trim();
  trackAnalyticsEvent("SEARCH_SUBMIT", {
    pagePath: "/search",
    context: "search_form",
    source: "internal",
    searchQueryLength: normalizedQuery.length,
  });

  page.value = 0;
  router.push({ name: "search", query: buildSearchQuery() });
};

const changePage = (nextPage: number) => {
  page.value = nextPage;
  loadResult();
};

const syncFromRoute = async () => {
  isSyncingFromRoute.value = true;
  try {
    query.value = (route.query.q as string) || "";
    author.value = (route.query.author as string) || "";
    const rawGenre = route.query.genre as string | undefined;
    selectedGenre.value = rawGenre ? Number(rawGenre) : null;
    selectedStatus.value = ((route.query.status as string) || "").toUpperCase();
    const rawYear = route.query.year as string | undefined;
    const year = rawYear ? Number(rawYear) : null;
    releaseYear.value = year && !Number.isNaN(year) ? year : null;
    page.value = 0;
    await loadResult();
  } finally {
    isSyncingFromRoute.value = false;
  }
};

watch(
  [query, author, selectedGenre, selectedStatus, releaseYear],
  () => {
    if (isSyncingFromRoute.value) {
      return;
    }

    page.value = 0;
    scheduleRouteSync();
  }
);

watch(
  () => route.query,
  async () => {
    await syncFromRoute();
  }
);

onBeforeUnmount(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
});

onMounted(async () => {
  await Promise.all([loadGenres(), syncFromRoute()]);
});
</script>
