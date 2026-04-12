<template>
  <section class="container section-block" v-if="detail">
    <div class="detail-layout">
      <img class="detail-cover" :src="detail.coverUrl || fallbackCover" :alt="detail.title" />

      <div>
        <h1 class="detail-title">{{ detail.title }}</h1>
        <p class="detail-meta">Tác giả: {{ detail.author || "Đang cập nhật" }} · {{ detail.status }}</p>
        <p class="detail-meta">Lượt theo dõi: {{ followCount }}</p>

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
          <router-link v-if="!auth.isAuthenticated" :to="{ name: 'login', query: { redirect: $route.fullPath } }" class="secondary-btn">
            Đăng nhập để theo dõi
          </router-link>
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
        <span>{{ chapter.title }}</span>
        <span>#{{ chapter.number ?? chapter.sortIndex }}</span>
      </router-link>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../lib/api";
import { useAuthStore } from "../stores/auth";
import type { ComicDetail } from "../types";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const detail = ref<ComicDetail | null>(null);
const sortAsc = ref(false);
const following = ref(false);
const followCount = ref(0);

const fallbackCover =
  "https://dummyimage.com/300x420/e2e8f0/475569.png&text=No+Cover";

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

onMounted(loadDetail);
</script>
