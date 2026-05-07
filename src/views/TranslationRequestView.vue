<template>
  <section class="container section-block">
    <article class="support-form-shell">
      <header class="support-form-header">
        <h1>Yêu cầu dịch truyện</h1>
        <p>
          Bạn có thể gửi đề xuất truyện cần dịch để đội ngũ biên tập xem xét.
          Chỉ cần nhập tên truyện, các thông tin còn lại là tuỳ chọn.
        </p>
      </header>

      <form class="support-form-grid" @submit.prevent="submitForm">
        <label class="support-field">
          <span>Họ và tên (tuỳ chọn)</span>
          <input v-model="form.fullName" maxlength="120" placeholder="Nguyễn Văn A" />
        </label>

        <label class="support-field">
          <span>Email (tuỳ chọn)</span>
          <input v-model="form.email" type="email" maxlength="160" placeholder="name@example.com" />
        </label>

        <label class="support-field">
          <span>Số điện thoại/Zalo (tuỳ chọn)</span>
          <input v-model="form.phone" maxlength="40" placeholder="09xxxxxxxx" />
        </label>

        <label class="support-field">
          <span>Tên truyện *</span>
          <input v-model="form.comicTitle" maxlength="200" required placeholder="Nhập tên truyện muốn đề xuất" />
        </label>

        <label class="support-field support-field-full">
          <span>Link truyện nguồn (tuỳ chọn)</span>
          <input
            v-model="form.comicSourceUrl"
            type="url"
            maxlength="700"
            placeholder="https://..."
          />
        </label>

        <label class="support-field">
          <span>Ngôn ngữ mong muốn (tuỳ chọn)</span>
          <input v-model="form.targetLanguage" maxlength="80" placeholder="Ví dụ: Hàn - Việt" />
        </label>

        <label class="support-field support-field-full">
          <span>Nội dung yêu cầu (tuỳ chọn)</span>
          <textarea
            v-model="form.message"
            rows="5"
            maxlength="2000"
            placeholder="Bạn có thể bổ sung lý do đề xuất, độ hot, cộng đồng quan tâm..."
          ></textarea>
        </label>

        <div class="support-actions">
          <button class="support-submit-btn" type="submit" :disabled="submitting">
            {{ submitting ? "Đang gửi..." : "Gửi yêu cầu" }}
          </button>
        </div>
      </form>

      <p v-if="errorMessage" class="support-feedback support-feedback-error">{{ errorMessage }}</p>
      <p v-if="successMessage" class="support-feedback support-feedback-success">{{ successMessage }}</p>
    </article>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import api from "../lib/api";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();

const form = reactive({
  fullName: "",
  email: "",
  phone: "",
  comicTitle: "",
  comicSourceUrl: "",
  targetLanguage: "",
  message: "",
});

const submitting = ref(false);
const successMessage = ref("");
const errorMessage = ref("");

watch(
  () => auth.user,
  (user) => {
    if (!user) {
      return;
    }

    if (!form.fullName.trim()) {
      form.fullName = user.displayName || "";
    }
    if (!form.email.trim()) {
      form.email = user.email || "";
    }
  },
  { immediate: true }
);

const submitForm = async () => {
  if (submitting.value) {
    return;
  }

  submitting.value = true;
  successMessage.value = "";
  errorMessage.value = "";

  try {
    await api.post("/api/public/support-requests/translation", {
      fullName: form.fullName.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      comicTitle: form.comicTitle.trim(),
      comicSourceUrl: form.comicSourceUrl.trim() || null,
      targetLanguage: form.targetLanguage.trim() || null,
      message: form.message.trim() || null,
    });

    form.comicTitle = "";
    form.comicSourceUrl = "";
    form.targetLanguage = "";
    form.message = "";
    successMessage.value = "Đã gửi yêu cầu dịch truyện thành công. Chúng tôi sẽ phản hồi sớm.";
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message ||
      "Không thể gửi yêu cầu lúc này. Vui lòng thử lại sau.";
  } finally {
    submitting.value = false;
  }
};
</script>
