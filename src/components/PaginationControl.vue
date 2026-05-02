<template>
  <div
    class="pagination-wrap"
    v-if="totalPages > 1 || (unknownTotal && (page > 0 || hasNext))"
  >
    <button :disabled="page <= 0" @click="$emit('change', page - 1)">Trước</button>
    <span v-if="!unknownTotal">Trang {{ page + 1 }} / {{ totalPages }}</span>
    <span v-else>Trang {{ page + 1 }}</span>
    <button :disabled="nextDisabled" @click="$emit('change', page + 1)">Sau</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  page: number;
  /** Đặt 0 khi API không trả tổng trang (Slice); khi đó dùng hasNext */
  totalPages: number;
  hasNext?: boolean;
}>();

defineEmits<{
  (event: "change", nextPage: number): void;
}>();

const unknownTotal = computed(() => props.totalPages <= 0);

const nextDisabled = computed(() => {
  if (!unknownTotal.value) {
    return props.page >= props.totalPages - 1;
  }
  return props.hasNext !== true;
});
</script>
