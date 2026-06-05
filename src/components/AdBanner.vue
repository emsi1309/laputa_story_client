<template>
  <section class="ad-banner-wrap">
    <div class="ad-banner-head">
      <span class="ad-banner-label">Quảng cáo</span>
      <span class="ad-banner-note">Nội dung tài trợ</span>
    </div>

    <div class="ad-banner-frame">
      <div v-if="!loaded" class="ad-banner-loading">Đang tải quảng cáo...</div>
      <div class="ad-banner-scroll">
        <div ref="containerRef" :id="containerId" class="ad-banner-container"></div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";

const AD_SCRIPT_SRC =
  "https://pl29649867.effectivecpmnetwork.com/602a78d9c16579f8be4628f4498cdc35/invoke.js";
const AD_CONTAINER_ID = "container-602a78d9c16579f8be4628f4498cdc35";

const containerRef = ref<HTMLDivElement | null>(null);
const loaded = ref(false);
const scriptEl = ref<HTMLScriptElement | null>(null);

const containerId = AD_CONTAINER_ID;

const mountAdScript = async () => {
  await nextTick();

  if (!containerRef.value || scriptEl.value) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.dataset.cfasync = "false";
  script.src = AD_SCRIPT_SRC;
  script.onload = () => {
    loaded.value = true;
  };
  script.onerror = () => {
    loaded.value = false;
  };

  containerRef.value.appendChild(script);
  scriptEl.value = script;
};

onMounted(() => {
  void mountAdScript();
});

onBeforeUnmount(() => {
  scriptEl.value?.remove();
  scriptEl.value = null;
});
</script>

<style scoped>
.ad-banner-wrap {
  margin: 1.25rem 0;
  padding: 0.95rem;
  border-radius: 18px;
  border: 1px solid rgba(251, 146, 60, 0.18);
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(15, 23, 42, 0.82)),
    radial-gradient(circle at top left, rgba(251, 146, 60, 0.18), transparent 42%);
  box-shadow:
    0 16px 34px rgba(15, 23, 42, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.ad-banner-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  color: #cbd5e1;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ad-banner-label {
  font-weight: 700;
  color: #fdba74;
}

.ad-banner-note {
  color: rgba(226, 232, 240, 0.72);
}

.ad-banner-frame {
  position: relative;
  min-height: 120px;
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(148, 163, 184, 0.28);
}

.ad-banner-scroll {
  min-height: 120px;
  overflow: hidden;
}

.ad-banner-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(226, 232, 240, 0.8);
  font-size: 0.92rem;
  letter-spacing: 0.02em;
  text-align: center;
  padding: 1rem;
}

.ad-banner-container {
  min-height: 120px;
}

@media (max-width: 768px) {
  .ad-banner-wrap {
    margin: 0.9rem 0;
    padding: 0.75rem;
  }

  .ad-banner-head {
    margin-bottom: 0.55rem;
    font-size: 0.75rem;
  }

  .ad-banner-scroll {
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .ad-banner-scroll::-webkit-scrollbar {
    display: none;
  }

  .ad-banner-container {
    display: flex;
    flex-wrap: nowrap;
    align-items: stretch;
    gap: 0.75rem;
    width: max-content;
    min-width: 100%;
    padding-bottom: 2px;
    scroll-snap-type: x proximity;
  }

  .ad-banner-container :deep([class$="__stand"]) {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    align-items: stretch !important;
    gap: 0.75rem !important;
    width: max-content !important;
    min-width: 100% !important;
  }

  .ad-banner-container :deep([class$="__bn-container"]) {
    flex: 0 0 min(82vw, 340px) !important;
    width: min(82vw, 340px) !important;
    max-width: min(82vw, 340px) !important;
    scroll-snap-align: start;
  }

  .ad-banner-container :deep([class$="__bn"]) {
    width: 100% !important;
    max-width: none !important;
  }

  .ad-banner-container :deep([class$="__img-container"]),
  .ad-banner-container :deep([class$="__link"]) {
    width: 100% !important;
    max-width: 100% !important;
  }

  .ad-banner-container :deep(img),
  .ad-banner-container :deep(iframe),
  .ad-banner-container :deep(video) {
    max-width: 100%;
    height: auto;
  }
}
</style>