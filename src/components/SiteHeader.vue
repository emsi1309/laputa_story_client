<template>
  <header class="qq-header">
    <div class="qq-top">
      <div class="container qq-top-inner">
        <router-link to="/" class="qq-brand">
          <span class="qq-brand-main">NET</span>
          <span class="qq-brand-accent">TRUYỆN</span>
        </router-link>

        <form class="qq-search" @submit.prevent="submitSearch">
          <input v-model="keyword" placeholder="Bạn muốn tìm truyện gì" />
          <button type="submit">Tìm</button>
        </form>

        <div class="qq-auth" v-if="!auth.isAuthenticated">
          <router-link to="/register" class="qq-auth-btn">Đăng ký</router-link>
          <router-link to="/login" class="qq-auth-btn">Đăng nhập</router-link>
        </div>

        <div class="qq-auth" v-else>
          <router-link to="/library" class="qq-auth-btn">Theo dõi</router-link>
          <button class="qq-auth-btn" @click="logout">Đăng xuất</button>
        </div>
      </div>
    </div>

    <div class="qq-nav-wrap">
      <div class="container qq-nav">
        <router-link to="/">Trang chủ</router-link>

        <div class="qq-nav-dropdown">
          <span class="qq-nav-label">Thể loại ▾</span>
          <div class="qq-nav-menu">
            <router-link
              v-for="genre in genres"
              :key="`genre-menu-${genre.id}`"
              :to="{ name: 'search', query: { genre: genre.id } }"
            >
              {{ genre.name }}
            </router-link>
          </div>
        </div>

        <div class="qq-nav-dropdown">
          <span class="qq-nav-label">Xếp hạng ▾</span>
          <div class="qq-nav-menu">
            <router-link
              v-for="genre in genres"
              :key="`rank-menu-${genre.id}`"
              :to="{ name: 'search', query: { genre: genre.id } }"
            >
              Top {{ genre.name }}
            </router-link>
          </div>
        </div>

        <router-link to="/search">Tìm truyện</router-link>
        <router-link to="/library">Lịch sử</router-link>
        <router-link to="/library">Theo dõi</router-link>
        <a href="https://discord.gg" target="_blank" rel="noreferrer">Discord</a>
        <a href="https://facebook.com" target="_blank" rel="noreferrer">Fanpage</a>
        <a href="/search">Yêu cầu dịch truyện</a>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../lib/api";
import { useAuthStore } from "../stores/auth";
import type { GenreItem } from "../types";

const router = useRouter();
const auth = useAuthStore();
const keyword = ref("");
const genres = ref<GenreItem[]>([]);

const submitSearch = () => {
  router.push({ name: "search", query: { q: keyword.value || undefined } });
};

const logout = () => {
  auth.logout();
  router.push({ name: "home" });
};

const loadGenres = async () => {
  const { data } = await api.get("/api/public/genres");
  genres.value = data || [];
};

onMounted(loadGenres);
</script>
