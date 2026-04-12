<template>
  <div class="qq-row-shell">
    <button class="qq-row-nav" :disabled="!canScrollLeft" @click="scrollByCard(-1)">◀</button>

    <div ref="trackRef" class="qq-row-track" @scroll="updateButtons">
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

const updateButtons = () => {
  const el = trackRef.value;
  if (!el) {
    return;
  }
  canScrollLeft.value = el.scrollLeft > 8;
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 8;
};

const scrollByCard = (direction: 1 | -1) => {
  const el = trackRef.value;
  if (!el) {
    return;
  }
  const amount = Math.max(280, Math.floor(el.clientWidth * 0.72));
  el.scrollBy({ left: amount * direction, behavior: "smooth" });
};

const onResize = () => updateButtons();

watch(
  () => props.comics.length,
  async () => {
    await nextTick();
    updateButtons();
  }
);

onMounted(async () => {
  await nextTick();
  updateButtons();
  window.addEventListener("resize", onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
});
</script>
