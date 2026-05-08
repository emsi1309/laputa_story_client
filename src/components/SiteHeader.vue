<template>
  <header class="qq-header">
    <div class="qq-top">
      <div class="container qq-top-inner">
        <div class="qq-top-brand-row">
          <router-link to="/" class="qq-brand" aria-label="Truyện Chill">
            <img class="qq-brand-logo" src="/logo-truyen-chill-header.png" alt="Truyện Chill" />
          </router-link>
          <button
            v-if="isMobileViewport"
            type="button"
            class="qq-mobile-header-toggle"
            :aria-expanded="showHeaderControls"
            :aria-label="showHeaderControls ? 'Thu gọn thanh điều hướng' : 'Mở thanh điều hướng'"
            :title="showHeaderControls ? 'Thu gọn' : 'Mở rộng'"
            @click="toggleMobileHeaderControls"
          >
            <span class="qq-mobile-toggle-icon" :class="{ 'is-open': showHeaderControls }" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
        </div>

        <div ref="searchBoxEl" v-show="showHeaderControls" class="qq-search-box">
          <form class="qq-search" @submit.prevent="submitSearch">
            <input
              v-model="keyword"
              placeholder="Bạn muốn tìm truyện gì"
              autocomplete="off"
              spellcheck="false"
              @focus="handleSearchFocus"
              @keydown.escape.prevent="closeSearchSuggestions"
            />
            <button type="submit">Tìm</button>
          </form>

          <div v-if="showSearchSuggestions" class="qq-search-dropdown">
            <p v-if="searchNotice" class="qq-search-empty">{{ searchNotice }}</p>

            <div v-else class="qq-search-results">
              <router-link
                v-for="comic in searchSuggestions"
                :key="comic.id"
                :to="`/comic/${comic.slug}`"
                class="qq-search-result"
                @click="closeSearchSuggestions"
              >
                <img :src="comicCoverSource(comic)" :alt="comic.title" />
                <div class="qq-search-result-body">
                  <strong>{{ comic.title }}</strong>
                  <span>{{ comic.author || "Đang cập nhật" }}</span>
                  <small v-if="comic.latestChapter">
                    Chương {{ comic.latestChapter.number ?? comic.latestChapter.sortIndex }}
                  </small>
                </div>
              </router-link>
            </div>

            <router-link
              class="qq-search-see-all"
              :to="{ name: 'search', query: { q: keyword || undefined } }"
              @click="closeSearchSuggestions"
            >
              Xem toàn bộ kết quả
            </router-link>
          </div>
        </div>

        <div v-show="showHeaderControls" class="qq-top-actions">
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
    </div>

    <div class="qq-nav-wrap" v-show="showHeaderControls">
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
        <router-link to="/request-translation">Yêu cầu dịch truyện</router-link>
        <router-link to="/advertising-contact">Liên hệ quảng cáo</router-link>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../lib/api";
import { resolvePublicImageUrl } from "../lib/image";
import { fetchPublicGenres } from "../lib/publicData";
import { useAuthStore } from "../stores/auth";
import type { ComicCard, GenreItem, NotificationItem, NotificationPage } from "../types";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const keyword = ref("");
const searchBoxEl = ref<HTMLElement | null>(null);
const searchSuggestions = ref<ComicCard[]>([]);
const searchLoading = ref(false);
const searchOpen = ref(false);
const searchNotice = ref("");
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let searchRequestId = 0;
const genres = ref<GenreItem[]>([]);
const notifications = ref<NotificationItem[]>([]);
const unreadCount = ref(0);
const showNotificationPanel = ref(false);
const hasLoadedNotificationList = ref(false);
const lastNotificationListLoadedAt = ref(0);
const openNavMenu = ref<"genre" | "ranking" | null>(null);
const isMobileViewport = ref(false);
const isMobileHeaderOpen = ref(true);

const MOBILE_BREAKPOINT = 980;
const NOTIFICATION_LIST_CACHE_MS = 60_000;
const SEARCH_RESULT_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 1000;
const FALLBACK_COVER = "https://dummyimage.com/300x420/e2e8f0/475569.png&text=No+Cover";

const showHeaderControls = computed(() => !isMobileViewport.value || isMobileHeaderOpen.value);
const showSearchSuggestions = computed(() => searchOpen.value && keyword.value.trim().length > 0);

const submitSearch = () => {
  router.push({ name: "search", query: { q: keyword.value || undefined } });
};

const closeSearchSuggestions = () => {
  searchOpen.value = false;
};

const handleSearchFocus = () => {
  if (keyword.value.trim()) {
    searchOpen.value = true;
  }
};

const clearSearchSuggestions = () => {
  searchSuggestions.value = [];
  searchNotice.value = "";
  searchLoading.value = false;
};

const comicCoverSource = (comic: ComicCard) => resolvePublicImageUrl(comic.coverUrl) || FALLBACK_COVER;

const loadSearchSuggestions = async () => {
  const term = keyword.value.trim();
  if (!term) {
    clearSearchSuggestions();
    closeSearchSuggestions();
    return;
  }

  const requestId = ++searchRequestId;
  searchLoading.value = true;
  searchNotice.value = "";

  try {
    const { data } = await api.get("/api/public/comics", {
      params: {
        query: term,
        page: 0,
        size: SEARCH_RESULT_LIMIT,
      },
    });

    if (requestId !== searchRequestId) {
      return;
    }

    searchSuggestions.value = data.content || [];
    searchNotice.value = searchSuggestions.value.length ? "" : "Không tìm thấy kết quả phù hợp.";
    searchOpen.value = true;
  } catch {
    if (requestId === searchRequestId) {
      searchSuggestions.value = [];
      searchNotice.value = "Không tải được kết quả tìm kiếm.";
      searchOpen.value = true;
    }
  } finally {
    if (requestId === searchRequestId) {
      searchLoading.value = false;
    }
  }
};

const scheduleSearchSuggestions = () => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }

  const term = keyword.value.trim();
  if (!term) {
    clearSearchSuggestions();
    closeSearchSuggestions();
    return;
  }

  searchOpen.value = true;
  searchDebounceTimer = setTimeout(() => {
    void loadSearchSuggestions();
  }, SEARCH_DEBOUNCE_MS);
};

const closeNavMenu = () => {
  openNavMenu.value = null;
};

const toggleNavMenu = (menu: "genre" | "ranking") => {
  openNavMenu.value = openNavMenu.value === menu ? null : menu;
};

const detectMobileViewport = () => {
  if (typeof window === "undefined") {
    return;
  }

  const nextIsMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  if (nextIsMobile === isMobileViewport.value) {
    return;
  }

  isMobileViewport.value = nextIsMobile;
  if (nextIsMobile) {
    isMobileHeaderOpen.value = false;
    closeNavMenu();
    showNotificationPanel.value = false;
    return;
  }

  isMobileHeaderOpen.value = true;
};

const toggleMobileHeaderControls = () => {
  if (!isMobileViewport.value) {
    return;
  }

  isMobileHeaderOpen.value = !isMobileHeaderOpen.value;
  if (!isMobileHeaderOpen.value) {
    closeNavMenu();
    showNotificationPanel.value = false;
  }
};

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null;
  if (!target) {
    return;
  }

  if (searchBoxEl.value?.contains(target)) {
    return;
  }

  closeSearchSuggestions();

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
    await loadNotificationCount();
    const shouldRefreshList =
      !hasLoadedNotificationList.value ||
      Date.now() - lastNotificationListLoadedAt.value > NOTIFICATION_LIST_CACHE_MS;
    if (shouldRefreshList) {
      await loadNotificationList();
    }
  }
};

const loadNotificationCount = async () => {
  if (!auth.isAuthenticated) {
    notifications.value = [];
    unreadCount.value = 0;
    hasLoadedNotificationList.value = false;
    lastNotificationListLoadedAt.value = 0;
    return;
  }

  const { data: countData } = await api.get<{ unreadCount: number }>("/api/user/notifications/unread-count");
  unreadCount.value = countData.unreadCount || 0;
};

const loadNotificationList = async () => {
  if (!auth.isAuthenticated) {
    notifications.value = [];
    hasLoadedNotificationList.value = false;
    lastNotificationListLoadedAt.value = 0;
    return;
  }

  const { data: pageData } = await api.get<NotificationPage>("/api/user/notifications", {
    params: { page: 0, size: 8 },
  });
  notifications.value = pageData.content || [];
  hasLoadedNotificationList.value = true;
  lastNotificationListLoadedAt.value = Date.now();
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
  genres.value = await fetchPublicGenres();
};

onMounted(loadGenres);

watch(keyword, () => {
  scheduleSearchSuggestions();
});

onMounted(async () => {
  detectMobileViewport();
  document.addEventListener("click", handleDocumentClick);
  window.addEventListener("resize", detectMobileViewport);

  if (auth.isAuthenticated) {
    await loadNotificationCount();
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
  window.removeEventListener("resize", detectMobileViewport);
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
});

watch(
  () => route.fullPath,
  () => {
    closeNavMenu();
    closeSearchSuggestions();
    if (isMobileViewport.value) {
      isMobileHeaderOpen.value = false;
      showNotificationPanel.value = false;
    }
  }
);
</script>
