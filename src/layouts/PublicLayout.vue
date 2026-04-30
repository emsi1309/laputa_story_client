<template>
  <div class="site-shell" :class="{ 'reader-mode': isReaderRoute }">
    <SiteHeader
      class="site-header-shell"
      :class="{ 'is-reader-hidden': isReaderRoute && !isHeaderVisible }"
    />
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

const isReaderRoute = computed(() => route.name === "reader");

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

watch(
  () => route.fullPath,
  () => {
    isHeaderVisible.value = true;
  }
);
</script>
