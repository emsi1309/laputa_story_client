<template>
  <div class="site-shell" :class="{ 'reader-mode': isReaderRoute }">
    <SiteHeader v-show="isHeaderVisible" />
    <main class="site-main">
      <router-view />
    </main>
    <SiteFooter v-if="!isReaderRoute" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import SiteHeader from "../components/SiteHeader.vue";
import SiteFooter from "../components/SiteFooter.vue";

const route = useRoute();
const isHeaderVisible = ref(true);
const isMobileViewport = ref(false);
const lastScrollY = ref(0);

const MOBILE_BREAKPOINT = 980;
const AUTO_HIDE_START_Y = 88;
const HIDE_DELTA = 8;
const SHOW_DELTA = -6;

const isReaderRoute = computed(() => route.name === "reader");
const isHomeRoute = computed(() => route.name === "home");
const shouldAutoHideHomeHeader = computed(
  () => isHomeRoute.value && isMobileViewport.value && !isReaderRoute.value
);

const getScrollY = () => {
  if (typeof window === "undefined") {
    return 0;
  }

  return window.scrollY || 0;
};

const detectMobileViewport = () => {
  if (typeof window === "undefined") {
    return;
  }

  isMobileViewport.value = window.innerWidth <= MOBILE_BREAKPOINT;
};

const handleWindowScroll = () => {
  const currentY = getScrollY();

  if (!shouldAutoHideHomeHeader.value) {
    lastScrollY.value = currentY;
    return;
  }

  const delta = currentY - lastScrollY.value;

  if (currentY <= 36) {
    isHeaderVisible.value = true;
    lastScrollY.value = currentY;
    return;
  }

  if (delta > HIDE_DELTA && currentY > AUTO_HIDE_START_Y) {
    isHeaderVisible.value = false;
  } else if (delta < SHOW_DELTA) {
    isHeaderVisible.value = true;
  }

  lastScrollY.value = currentY;
};

const handleReaderHeaderVisibility = (event: Event) => {
  if (!isReaderRoute.value) {
    return;
  }

  const customEvent = event as CustomEvent<{ visible?: boolean }>;
  const nextVisible = customEvent.detail?.visible;
  if (typeof nextVisible === "boolean") {
    isHeaderVisible.value = nextVisible;
  }
};

onMounted(() => {
  detectMobileViewport();
  lastScrollY.value = getScrollY();

  window.addEventListener("reader-header-visibility", handleReaderHeaderVisibility as EventListener);
  window.addEventListener("resize", detectMobileViewport);
  window.addEventListener("scroll", handleWindowScroll, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener("reader-header-visibility", handleReaderHeaderVisibility as EventListener);
  window.removeEventListener("resize", detectMobileViewport);
  window.removeEventListener("scroll", handleWindowScroll);
});

watch(shouldAutoHideHomeHeader, (enabled) => {
  isHeaderVisible.value = true;
  if (!enabled) {
    return;
  }

  lastScrollY.value = getScrollY();
});

watch(
  () => route.fullPath,
  () => {
    isHeaderVisible.value = true;
    lastScrollY.value = getScrollY();
  }
);
</script>
