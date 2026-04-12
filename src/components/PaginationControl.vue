<template>
  <div class="pagination-wrap" v-if="totalPages > 1">
    <button :disabled="page <= 0" @click="$emit('change', page - 1)">Trước</button>
    <span>Trang {{ page + 1 }} / {{ totalPages }}</span>
    <button :disabled="page >= totalPages - 1" @click="$emit('change', page + 1)">Sau</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  page: number;
  totalPages: number;
}>();

defineEmits<{
  (event: "change", nextPage: number): void;
}>();
</script>
