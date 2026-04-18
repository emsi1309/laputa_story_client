<template>
  <article class="comic-card qq-card">
    <router-link :to="`/comic/${comic.slug}`" class="cover-wrap qq-cover-wrap">
      <img :src="coverSource" :alt="comic.title" loading="lazy" />
      <div class="qq-card-badges">
        <span class="qq-badge qq-badge-time">{{ timeAgo }}</span>
        <span class="qq-badge qq-badge-hot" v-if="comic.followCount > 0">Hot</span>
      </div>
    </router-link>
    <div class="comic-body qq-card-body">
      <router-link
        :to="`/comic/${comic.slug}`"
        class="comic-title qq-card-title"
        :data-full-title="comic.title"
        :title="comic.title"
        :aria-label="comic.title"
      >
        {{ comic.title }}
      </router-link>
      <p class="comic-meta qq-card-meta">{{ comic.releaseYear || "N/A" }} · {{ comic.status }}</p>
      <router-link
        v-if="comic.latestChapter"
        :to="`/read/${comic.slug}/${comic.latestChapter.slug}`"
        class="chapter-link qq-card-chapter"
      >
        Chương {{ comic.latestChapter.number ?? comic.latestChapter.sortIndex }}
      </router-link>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { resolvePublicImageUrl } from "../lib/image";
import type { ComicCard } from "../types";

const props = defineProps<{
  comic: ComicCard;
}>();

const coverSource = computed(() => resolvePublicImageUrl(props.comic.coverUrl) || fallbackCover);

const timeAgo = computed(() => {
  const timestamp = props.comic.updatedAt;
  if (!timestamp) {
    return "Mới";
  }

  const diffMs = Date.now() - new Date(timestamp).getTime();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (diffMs < hour) {
    const mins = Math.max(1, Math.floor(diffMs / (60 * 1000)));
    return `${mins} phút trước`;
  }

  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours} giờ trước`;
  }

  const days = Math.floor(diffMs / day);
  return `${days} ngày trước`;
});

const fallbackCover =
  "https://dummyimage.com/300x420/e2e8f0/475569.png&text=No+Cover";
</script>
