<template>
  <header class="qq-header">
    <div class="qq-top">
      <div class="container qq-top-inner">
        <router-link to="/" class="qq-brand" aria-label="Truyện Chill">
          <img class="qq-brand-logo" src="/logo-truyen-chill.png" alt="Truyện Chill" />
          <span class="qq-brand-title">Truyện Chill</span>
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
          <div class="qq-noti-wrap">
            <button class="qq-auth-btn" type="button" @click="toggleNotificationPanel">
              Thông báo
              <span class="qq-noti-badge" v-if="unreadCount > 0">{{ unreadCount }}</span>
            </button>
            <div class="qq-noti-panel" v-if="showNotificationPanel">
              <div class="qq-noti-head">
                <strong>Thông báo mới</strong>
                <button type="button" @click="markAllRead" v-if="notifications.length">Đánh dấu đã đọc</button>
              </div>
              <div class="qq-noti-list" v-if="notifications.length">
                <button
                  v-for="notification in notifications"
                  :key="notification.id"
                  type="button"
                  class="qq-noti-item"
                  :class="{ unread: !notification.read }"
                  @click="openNotification(notification)"
                >
                  <span>{{ notification.title }}</span>
                  <small>{{ notification.message }}</small>
                </button>
              </div>
              <p class="qq-noti-empty" v-else>Chưa có thông báo nào.</p>
            </div>
          </div>
          <router-link to="/profile" class="qq-auth-btn">{{ auth.user?.displayName || "Hồ sơ" }}</router-link>
          <router-link to="/library" class="qq-auth-btn">Theo dõi</router-link>
          <router-link to="/library" class="qq-auth-btn">Yêu thích</router-link>
          <button class="qq-auth-btn" @click="logout">Đăng xuất</button>
        </div>
      </div>
    </div>

    <div class="qq-nav-wrap">
      <div class="container qq-nav">
        <router-link to="/">Trang chủ</router-link>

        <div class="qq-nav-dropdown" :class="{ 'is-open': openNavMenu === 'genre' }">
          <button
            type="button"
            class="qq-nav-label qq-nav-trigger"
            :aria-expanded="openNavMenu === 'genre'"
            aria-haspopup="menu"
            @click="toggleNavMenu('genre')"
          >
            Thể loại ▾
          </button>
          <div class="qq-nav-menu">
            <router-link
              v-for="genre in genres"
              :key="`genre-menu-${genre.id}`"
              :to="{ name: 'search', query: { genre: genre.id } }"
              @click="closeNavMenu"
            >
              {{ genre.name }}
            </router-link>
          </div>
        </div>

        <div class="qq-nav-dropdown qq-nav-dropdown-right" :class="{ 'is-open': openNavMenu === 'ranking' }">
          <button
            type="button"
            class="qq-nav-label qq-nav-trigger"
            :aria-expanded="openNavMenu === 'ranking'"
            aria-haspopup="menu"
            @click="toggleNavMenu('ranking')"
          >
            Xếp hạng ▾
          </button>
          <div class="qq-nav-menu">
            <router-link
              v-for="genre in genres"
              :key="`rank-menu-${genre.id}`"
              :to="{ name: 'search', query: { genre: genre.id } }"
              @click="closeNavMenu"
            >
              Top {{ genre.name }}
            </router-link>
          </div>
        </div>

        <router-link to="/search">Tìm truyện</router-link>
        <router-link to="/about">Giới thiệu</router-link>
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
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../lib/api";
import { useAuthStore } from "../stores/auth";
import type { GenreItem, NotificationItem, NotificationPage } from "../types";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const keyword = ref("");
const genres = ref<GenreItem[]>([]);
const notifications = ref<NotificationItem[]>([]);
const unreadCount = ref(0);
const showNotificationPanel = ref(false);
const openNavMenu = ref<"genre" | "ranking" | null>(null);

const submitSearch = () => {
  router.push({ name: "search", query: { q: keyword.value || undefined } });
};

const closeNavMenu = () => {
  openNavMenu.value = null;
};

const toggleNavMenu = (menu: "genre" | "ranking") => {
  openNavMenu.value = openNavMenu.value === menu ? null : menu;
};

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null;
  if (!target) {
    return;
  }

  if (target.closest(".qq-nav-dropdown")) {
    return;
  }

  closeNavMenu();
};

const logout = () => {
  auth.logout();
  router.push({ name: "home" });
};

const toggleNotificationPanel = async () => {
  showNotificationPanel.value = !showNotificationPanel.value;
  if (showNotificationPanel.value) {
    await loadNotifications();
  }
};

const loadNotifications = async () => {
  if (!auth.isAuthenticated) {
    notifications.value = [];
    unreadCount.value = 0;
    return;
  }

  const [{ data: countData }, { data: pageData }] = await Promise.all([
    api.get<{ unreadCount: number }>("/api/user/notifications/unread-count"),
    api.get<NotificationPage>("/api/user/notifications", { params: { page: 0, size: 8 } }),
  ]);

  unreadCount.value = countData.unreadCount || 0;
  notifications.value = pageData.content || [];
};

const openNotification = async (notification: NotificationItem) => {
  await api.post(`/api/user/notifications/${notification.id}/read`);
  unreadCount.value = Math.max(0, unreadCount.value - (notification.read ? 0 : 1));
  notifications.value = notifications.value.map((item) =>
    item.id === notification.id
      ? {
          ...item,
          read: true,
        }
      : item
  );

  if (notification.link) {
    showNotificationPanel.value = false;
    router.push(notification.link);
  }
};

const markAllRead = async () => {
  await api.post("/api/user/notifications/read-all");
  unreadCount.value = 0;
  notifications.value = notifications.value.map((item) => ({
    ...item,
    read: true,
  }));
};

const loadGenres = async () => {
  const { data } = await api.get("/api/public/genres");
  genres.value = data || [];
};

onMounted(loadGenres);

onMounted(async () => {
  document.addEventListener("click", handleDocumentClick);

  if (auth.isAuthenticated) {
    await loadNotifications();
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
});

watch(
  () => route.fullPath,
  () => {
    closeNavMenu();
  }
);
</script>
