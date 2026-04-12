<template>
  <div class="site-shell">
    <SiteHeader />
    <main class="site-main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import SiteHeader from "../components/SiteHeader.vue";
</script>
