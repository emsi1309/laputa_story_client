<template>
  <div class="site-shell" :class="{ 'reader-mode': isReaderRoute }">
    <button
      v-if="isReaderRoute"
      type="button"
      class="reader-header-toggle"
      :aria-label="isHeaderVisible ? 'An header' : 'Hien header'"
      :title="isHeaderVisible ? 'An header' : 'Hien header'"
      @click="toggleHeader"
    >
      {{ isHeaderVisible ? "Ẩn header" : "Hiện header" }}
    </button>

    <SiteHeader v-show="isHeaderVisible" />
    <main class="site-main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import SiteHeader from "../components/SiteHeader.vue";

const route = useRoute();
const isHeaderVisible = ref(true);

const isReaderRoute = computed(() => route.name === "reader");

const toggleHeader = () => {
  isHeaderVisible.value = !isHeaderVisible.value;
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
  window.addEventListener("reader-header-visibility", handleReaderHeaderVisibility as EventListener);
});

onBeforeUnmount(() => {
  window.removeEventListener("reader-header-visibility", handleReaderHeaderVisibility as EventListener);
});

watch(isReaderRoute, (isReader) => {
  isHeaderVisible.value = true;
});
</script>
