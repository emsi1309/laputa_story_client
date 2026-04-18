<template>
  <div class="qq-row-shell">
    <button class="qq-row-nav" :disabled="!canScrollLeft" @click="scrollByCard(-1)">◀</button>

    <div
      ref="trackRef"
      class="qq-row-track"
      @scroll="updateButtons"
      @pointerenter="pauseAutoScroll"
      @pointerleave="resumeAutoScrollSoon"
      @focusin="pauseAutoScroll"
      @focusout="resumeAutoScrollSoon"
      @touchstart.passive="pauseAutoScroll"
      @touchend.passive="resumeAutoScrollSoon"
    >
      <div class="qq-row-item" v-for="comic in comics" :key="comic.id">
        <ComicCard :comic="comic" />
      </div>
    </div>

    <button class="qq-row-nav" :disabled="!canScrollRight" @click="scrollByCard(1)">▶</button>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import ComicCard from "./ComicCard.vue";
import type { ComicCard as ComicCardType } from "../types";

const props = defineProps<{
  comics: ComicCardType[];
}>();

const trackRef = ref<HTMLDivElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);
let autoScrollTimer: number | null = null;
let autoScrollResumeTimer: number | null = null;
let reduceMotionPreference: MediaQueryList | null = null;

const AUTO_SCROLL_INTERVAL_MS = 5000;
const AUTO_SCROLL_RESUME_DELAY_MS = 5000;

const updateButtons = () => {
  const el = trackRef.value;
  if (!el) {
    return;
  }
  canScrollLeft.value = el.scrollLeft > 8;
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 8;
};

const clearAutoScrollTimer = () => {
  if (autoScrollTimer === null) {
    return;
  }
  window.clearInterval(autoScrollTimer);
  autoScrollTimer = null;
};

const clearAutoScrollResumeTimer = () => {
  if (autoScrollResumeTimer === null) {
    return;
  }
  window.clearTimeout(autoScrollResumeTimer);
  autoScrollResumeTimer = null;
};

const getTrackGapPx = (el: HTMLDivElement) => {
  const styles = window.getComputedStyle(el);
  const gapRaw = styles.columnGap && styles.columnGap !== "normal" ? styles.columnGap : styles.gap;
  const gap = Number.parseFloat(gapRaw || "0");
  return Number.isFinite(gap) ? gap : 0;
};

const getCardStepPx = (el: HTMLDivElement) => {
  const item = el.querySelector<HTMLElement>(".qq-row-item");
  if (!item) {
    return 0;
  }
  return Math.round(item.getBoundingClientRect().width + getTrackGapPx(el));
};

const canAutoScroll = () => {
  const el = trackRef.value;
  if (!el || props.comics.length < 2) {
    return false;
  }
  if (reduceMotionPreference?.matches) {
    return false;
  }
  return el.scrollWidth > el.clientWidth + 8;
};

const autoScrollTick = () => {
  const el = trackRef.value;
  if (!el) {
    return;
  }

  updateButtons();
  if (!canAutoScroll()) {
    return;
  }

  const step = getCardStepPx(el) || Math.max(120, Math.floor(el.clientWidth * 0.3));
  const remaining = el.scrollWidth - (el.scrollLeft + el.clientWidth);

  if (remaining <= step * 0.85) {
    el.scrollTo({ left: 0, behavior: "smooth" });
    return;
  }

  el.scrollBy({ left: step, behavior: "smooth" });
};

const startAutoScroll = () => {
  if (typeof window === "undefined") {
    return;
  }

  clearAutoScrollResumeTimer();
  clearAutoScrollTimer();

  if (!canAutoScroll()) {
    return;
  }

  autoScrollTimer = window.setInterval(autoScrollTick, AUTO_SCROLL_INTERVAL_MS);
};

const pauseAutoScroll = () => {
  clearAutoScrollResumeTimer();
  clearAutoScrollTimer();
};

const resumeAutoScrollSoon = () => {
  if (typeof window === "undefined") {
    return;
  }

  clearAutoScrollResumeTimer();
  if (!canAutoScroll()) {
    return;
  }

  autoScrollResumeTimer = window.setTimeout(() => {
    startAutoScroll();
  }, AUTO_SCROLL_RESUME_DELAY_MS);
};

const scrollByCard = (direction: 1 | -1) => {
  const el = trackRef.value;
  if (!el) {
    return;
  }

  pauseAutoScroll();
  const step = getCardStepPx(el);
  const amount = step > 0 ? step * 3 : Math.max(240, Math.floor(el.clientWidth * 0.55));
  el.scrollBy({ left: amount * direction, behavior: "smooth" });
  resumeAutoScrollSoon();
};

const onResize = () => {
  updateButtons();
  startAutoScroll();
};

watch(
  () => props.comics.length,
  async () => {
    await nextTick();
    updateButtons();
    startAutoScroll();
  }
);

onMounted(async () => {
  await nextTick();
  if (typeof window !== "undefined") {
    reduceMotionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  }
  updateButtons();
  window.addEventListener("resize", onResize);
  startAutoScroll();
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
  pauseAutoScroll();
});
</script>
