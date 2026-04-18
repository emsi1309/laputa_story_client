<template>
  <section class="container section-block">
    <article class="support-form-shell">
      <header class="support-form-header">
        <h1>Liên hệ quảng cáo</h1>
        <p>
          Vui lòng để lại thông tin hợp tác quảng cáo/tài trợ. Đội ngũ Truyện Chill
          sẽ liên hệ lại để tư vấn gói phù hợp với ngân sách của bạn.
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
          <span>Tên công ty/đơn vị *</span>
          <input v-model="form.companyName" maxlength="160" required placeholder="Tên thương hiệu hoặc agency" />
        </label>

        <label class="support-field support-field-full">
          <span>Website/Fanpage</span>
          <input v-model="form.websiteUrl" type="url" maxlength="700" placeholder="https://..." />
        </label>

        <label class="support-field">
          <span>Vị trí quảng cáo mong muốn *</span>
          <input
            v-model="form.adPosition"
            maxlength="200"
            required
            placeholder="Trang chủ, banner đầu trang, bài viết tài trợ..."
          />
        </label>

        <label class="support-field">
          <span>Ngân sách dự kiến *</span>
          <input v-model="form.budgetRange" maxlength="120" required placeholder="Ví dụ: 5-10 triệu/tháng" />
        </label>

        <label class="support-field support-field-full">
          <span>Nội dung liên hệ *</span>
          <textarea
            v-model="form.message"
            rows="5"
            maxlength="2000"
            required
            placeholder="Mô tả mục tiêu chiến dịch, thời gian chạy, đối tượng muốn tiếp cận..."
          ></textarea>
        </label>

        <div class="support-actions">
          <button class="support-submit-btn" type="submit" :disabled="submitting">
            {{ submitting ? "Đang gửi..." : "Gửi liên hệ" }}
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
  companyName: "",
  websiteUrl: "",
  adPosition: "",
  budgetRange: "",
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
    await api.post("/api/public/support-requests/advertising", {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      companyName: form.companyName.trim(),
      websiteUrl: form.websiteUrl.trim() || null,
      adPosition: form.adPosition.trim(),
      budgetRange: form.budgetRange.trim(),
      message: form.message.trim(),
    });

    form.companyName = "";
    form.websiteUrl = "";
    form.adPosition = "";
    form.budgetRange = "";
    form.message = "";
    successMessage.value = "Đã gửi liên hệ quảng cáo thành công. Chúng tôi sẽ phản hồi sớm.";
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message ||
      "Không thể gửi liên hệ lúc này. Vui lòng thử lại sau.";
  } finally {
    submitting.value = false;
  }
};
</script>
