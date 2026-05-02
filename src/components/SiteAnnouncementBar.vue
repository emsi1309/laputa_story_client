<template>
  <div
    v-if="banner?.message"
    ref="rootEl"
    class="site-announcement-fixed"
    role="region"
    aria-live="polite"
    aria-label="Thông báo từ quản trị"
  >
    <div class="site-announcement-inner">
      <span class="site-announcement-badge" aria-hidden="true">TB</span>
      <div class="site-announcement-marquee">
        <span
          class="site-announcement-track"
          :style="{ animationDuration: `${banner.scrollDurationSeconds}s` }"
          >{{ banner.message }}</span
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import api from "../lib/api";

const route = useRoute();
const banner = ref<{ message: string; scrollDurationSeconds: number } | null>(null);
const rootEl = ref<HTMLElement | null>(null);

const setAnnouncementCssHeight = () => {
  if (!banner.value?.message) {
    document.documentElement.style.setProperty("--site-announcement-h", "0px");
    return;
  }
  const h = rootEl.value?.offsetHeight ?? 0;
  document.documentElement.style.setProperty("--site-announcement-h", h ? `${h}px` : "0px");
};

const fetchBanner = async () => {
  try {
    const { data } = await api.get<{ message: string | null; scrollDurationSeconds: number }>(
      "/api/public/reader-announcements/active"
    );
    const text = data?.message?.trim();
    if (text) {
      const sec = data.scrollDurationSeconds ?? 30;
      banner.value = {
        message: text,
        scrollDurationSeconds: Math.min(600, Math.max(5, sec)),
      };
    } else {
      banner.value = null;
    }
  } catch {
    banner.value = null;
  }
  await nextTick();
  setAnnouncementCssHeight();
};

watch(banner, async () => {
  await nextTick();
  setAnnouncementCssHeight();
});

let pollTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  void fetchBanner();
  pollTimer = setInterval(() => void fetchBanner(), 90_000);
  window.addEventListener("resize", setAnnouncementCssHeight);
});

watch(
  () => route.fullPath,
  () => {
    void fetchBanner();
  }
);

onBeforeUnmount(() => {
  if (pollTimer) {
    clearInterval(pollTimer);
  }
  window.removeEventListener("resize", setAnnouncementCssHeight);
  document.documentElement.style.setProperty("--site-announcement-h", "0px");
});
</script>
