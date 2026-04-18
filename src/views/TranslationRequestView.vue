<template>
  <section class="container section-block">
    <article class="support-form-shell">
      <header class="support-form-header">
        <h1>Yêu cầu dịch truyện</h1>
        <p>
          Bạn có thể gửi đề xuất truyện cần dịch để đội ngũ biên tập xem xét.
          Vui lòng điền đầy đủ thông tin để chúng tôi liên hệ lại nhanh hơn.
        </p>
      </header>

      <form class="support-form-grid" @submit.prevent="submitForm">
        <label class="support-field">
          <span>Họ và tên *</span>
          <input v-model="form.fullName" maxlength="120" required placeholder="Nguyễn Văn A" />
        </label>

        <label class="support-field">
          <span>Email *</span>
          <input v-model="form.email" type="email" maxlength="160" required placeholder="name@example.com" />
        </label>

        <label class="support-field">
          <span>Số điện thoại/Zalo *</span>
          <input v-model="form.phone" maxlength="40" required placeholder="09xxxxxxxx" />
        </label>

        <label class="support-field">
          <span>Tên truyện *</span>
          <input v-model="form.comicTitle" maxlength="200" required placeholder="Nhập tên truyện muốn đề xuất" />
        </label>

        <label class="support-field support-field-full">
          <span>Link truyện nguồn *</span>
          <input
            v-model="form.comicSourceUrl"
            type="url"
            maxlength="700"
            required
            placeholder="https://..."
          />
        </label>

        <label class="support-field">
          <span>Ngôn ngữ mong muốn *</span>
          <input v-model="form.targetLanguage" maxlength="80" required placeholder="Ví dụ: Hàn - Việt" />
        </label>

        <label class="support-field support-field-full">
          <span>Nội dung yêu cầu *</span>
          <textarea
            v-model="form.message"
            rows="5"
            maxlength="2000"
            required
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
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      comicTitle: form.comicTitle.trim(),
      comicSourceUrl: form.comicSourceUrl.trim(),
      targetLanguage: form.targetLanguage.trim(),
      message: form.message.trim(),
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
