<template>
  <SiteAnnouncementBar />
  <div class="app-below-announcement">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import SiteAnnouncementBar from "./components/SiteAnnouncementBar.vue";
</script>
