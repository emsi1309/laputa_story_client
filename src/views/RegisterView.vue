<template>
  <section class="auth-screen">
    <div class="auth-card">
      <h1>Tạo tài khoản</h1>
      <p>Tham gia để lưu truyện yêu thích và lịch sử đọc</p>

      <form @submit.prevent="submit">
        <label>Tên hiển thị</label>
        <input v-model="displayName" type="text" placeholder="Tên của bạn" required />

        <label>Email</label>
        <input v-model="email" type="email" placeholder="ban@example.com" required />

        <label>Mật khẩu</label>
        <input v-model="password" type="password" placeholder="Tối thiểu 6 ký tự" required />

        <p class="error" v-if="error">{{ error }}</p>

        <button class="primary-btn" type="submit" :disabled="loading">
          {{ loading ? "Đang xử lý..." : "Đăng ký" }}
        </button>
      </form>

      <p class="auth-foot">
        Đã có tài khoản?
        <router-link to="/login">Đăng nhập</router-link>
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();

const displayName = ref("");
const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

const submit = async () => {
  loading.value = true;
  error.value = "";

  try {
    await auth.register(email.value, password.value, displayName.value);
    router.push("/");
  } catch {
    error.value = "Đăng ký thất bại, email có thể đã tồn tại";
  } finally {
    loading.value = false;
  }
};
</script>
