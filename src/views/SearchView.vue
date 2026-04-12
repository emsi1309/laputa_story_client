<template>
  <section class="container section-block">
    <div class="section-head">
      <h2>Tìm kiếm truyện</h2>
    </div>

    <form class="search-panel" @submit.prevent="submitSearch">
      <input v-model="query" placeholder="Nhập tên truyện..." />
      <select v-model="selectedGenreValue">
        <option value="">Tất cả thể loại</option>
        <option v-for="genre in genres" :key="genre.id" :value="String(genre.id)">
          {{ genre.name }}
        </option>
      </select>
      <button type="submit">Tìm</button>
    </form>

    <p class="search-info" v-if="query">Kết quả cho từ khóa: "{{ query }}"</p>

    <div class="comic-grid">
      <ComicCardItem v-for="comic in comics" :key="comic.id" :comic="comic" />
    </div>

    <PaginationControl :page="page" :total-pages="totalPages" @change="changePage" />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../lib/api";
import type { ComicCard, GenreItem } from "../types";
import ComicCardItem from "../components/ComicCard.vue";
import PaginationControl from "../components/PaginationControl.vue";

const route = useRoute();
const router = useRouter();

const query = ref("");
const selectedGenre = ref<number | null>(null);
const genres = ref<GenreItem[]>([]);
const comics = ref<ComicCard[]>([]);
const page = ref(0);
const totalPages = ref(1);

const selectedGenreValue = computed({
  get: () => (selectedGenre.value == null ? "" : String(selectedGenre.value)),
  set: (value: string) => {
    selectedGenre.value = value ? Number(value) : null;
  },
});

const loadGenres = async () => {
  const { data } = await api.get("/api/public/genres");
  genres.value = data || [];
};

const loadResult = async () => {
  const { data } = await api.get("/api/public/comics", {
    params: {
      query: query.value || undefined,
      genreId: selectedGenre.value ?? undefined,
      page: page.value,
      size: 18,
    },
  });
  comics.value = data.content || [];
  totalPages.value = data.totalPages || 1;
};

const submitSearch = () => {
  page.value = 0;
  router.push({
    name: "search",
    query: {
      q: query.value || undefined,
      genre: selectedGenre.value ?? undefined,
    },
  });
};

const changePage = (nextPage: number) => {
  page.value = nextPage;
  loadResult();
};

const syncFromRoute = async () => {
  query.value = (route.query.q as string) || "";
  const rawGenre = route.query.genre as string | undefined;
  selectedGenre.value = rawGenre ? Number(rawGenre) : null;
  page.value = 0;
  await loadResult();
};

watch(
  () => route.query,
  async () => {
    await syncFromRoute();
  }
);

onMounted(async () => {
  await loadGenres();
  await syncFromRoute();
});
</script>
