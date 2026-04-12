<template>
  <section class="auth-screen">
    <div class="auth-card">
      <h1>Đăng nhập</h1>
      <p>Đăng nhập để theo dõi truyện và đồng bộ lịch sử đọc</p>

      <form @submit.prevent="submit">
        <label>Email</label>
        <input v-model="email" type="email" placeholder="ban@example.com" required />

        <label>Mật khẩu</label>
        <input v-model="password" type="password" placeholder="Nhập mật khẩu" required />

        <p class="error" v-if="error">{{ error }}</p>

        <button class="primary-btn" type="submit" :disabled="loading">
          {{ loading ? "Đang xử lý..." : "Đăng nhập" }}
        </button>
      </form>

      <p class="auth-foot">
        Chưa có tài khoản?
        <router-link to="/register">Đăng ký ngay</router-link>
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

const submit = async () => {
  loading.value = true;
  error.value = "";

  try {
    await auth.login(email.value, password.value);
    router.push((route.query.redirect as string) || "/");
  } catch {
    error.value = "Đăng nhập thất bại, vui lòng kiểm tra lại thông tin";
  } finally {
    loading.value = false;
  }
};
</script>
