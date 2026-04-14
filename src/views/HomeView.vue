<template>
  <section class="container home-community">
    <div class="home-community-left">
      <div class="community-item">
        <span class="community-dot"></span>
        <div>
          <p class="community-title">CỘNG ĐỒNG</p>
          <p class="community-desc">Tham gia để cập nhật và ủng hộ Truyện Chill.</p>
        </div>
      </div>
      <div class="community-item">
        <span class="community-dot"></span>
        <div>
          <p class="community-title">LIÊN HỆ QUẢNG CÁO</p>
          <p class="community-desc">Hợp tác quảng cáo và tài trợ tại đây.</p>
        </div>
      </div>
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
    <HorizontalComicRow :comics="featuredComics" />
  </section>

  <section class="container section-block">
    <div class="section-head">
      <h2 class="section-title">Độc Quyền Truyện Chill</h2>
    </div>
    <HorizontalComicRow :comics="exclusiveComics" />
  </section>

  <section class="container section-block">
    <div class="section-head home-filter-head">
      <h2 class="section-title">Danh Sách Truyện Tranh Mới</h2>
      <form class="mini-search" @submit.prevent="goSearch">
        <input v-model="keyword" placeholder="Tìm tên truyện" />
        <button type="submit">Tìm</button>
      </form>
      <div class="chip-row">
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
      <ComicCardItem v-for="comic in comics" :key="comic.id" :comic="comic" />
    </div>

    <PaginationControl :page="page" :total-pages="totalPages" @change="changePage" />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../lib/api";
import type { ComicCard, GenreItem } from "../types";
import ComicCardItem from "../components/ComicCard.vue";
import HorizontalComicRow from "../components/HorizontalComicRow.vue";
import PaginationControl from "../components/PaginationControl.vue";

const router = useRouter();

const latest = ref<ComicCard[]>([]);
const hot = ref<ComicCard[]>([]);
const comics = ref<ComicCard[]>([]);
const genres = ref<GenreItem[]>([]);
const genreId = ref<number | null>(null);
const page = ref(0);
const totalPages = ref(1);
const keyword = ref("");

const featuredComics = computed(() => hot.value.slice(0, 20));
const exclusiveComics = computed(() => latest.value.slice(0, 20));

const loadHome = async () => {
  const { data } = await api.get("/api/public/home");
  latest.value = data.latestUpdated || [];
  hot.value = data.hot || [];
};

const loadGenres = async () => {
  const { data } = await api.get("/api/public/genres");
  genres.value = data || [];
};

const loadBrowse = async () => {
  const { data } = await api.get("/api/public/comics", {
    params: {
      page: page.value,
      size: 18,
      genreId: genreId.value ?? undefined,
    },
  });
  comics.value = data.content || [];
  totalPages.value = data.totalPages || 1;
};

const setGenre = (nextGenreId: number | null) => {
  genreId.value = nextGenreId;
  page.value = 0;
  loadBrowse();
};

const changePage = (nextPage: number) => {
  page.value = nextPage;
  loadBrowse();
};

const goSearch = () => {
  router.push({ name: "search", query: { q: keyword.value || undefined } });
};

onMounted(async () => {
  await Promise.all([loadHome(), loadGenres(), loadBrowse()]);
});
</script>
