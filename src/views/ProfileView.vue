<template>
  <section class="container section-block">
    <article class="social-card profile-card">
      <div class="section-head" style="margin-bottom: 8px;">
        <h2>Hồ sơ cá nhân</h2>
      </div>
      <p class="detail-meta">Cập nhật thông tin hiển thị và đổi mật khẩu tài khoản.</p>

      <div class="profile-grid">
        <div class="profile-meta">
          <h3>Thông tin tài khoản</h3>
          <p><strong>Email:</strong> {{ profile.email || "-" }}</p>
          <p><strong>Vai trò:</strong> {{ roleText }}</p>
        </div>

        <form class="profile-form" @submit.prevent="saveProfile">
          <label for="profile-display-name">Tên hiển thị</label>
          <input id="profile-display-name" v-model="form.displayName" maxlength="120" autocomplete="name" />

          <label for="profile-current-password">Mật khẩu hiện tại</label>
          <input
            id="profile-current-password"
            v-model="form.currentPassword"
            type="password"
            autocomplete="current-password"
            placeholder="Nhập khi muốn đổi mật khẩu"
          />

          <label for="profile-new-password">Mật khẩu mới</label>
          <input
            id="profile-new-password"
            v-model="form.newPassword"
            type="password"
            autocomplete="new-password"
            placeholder="Tối thiểu 6 ký tự"
          />

          <label for="profile-confirm-password">Nhập lại mật khẩu mới</label>
          <input
            id="profile-confirm-password"
            v-model="form.confirmNewPassword"
            type="password"
            autocomplete="new-password"
          />

          <div class="detail-actions" style="margin-top: 8px;">
            <button class="primary-btn" type="submit">Lưu thay đổi</button>
            <button class="secondary-btn" type="button" @click="resetPasswordFields">Xóa mật khẩu đã nhập</button>
          </div>
        </form>
      </div>

      <p v-if="notice" class="search-info" style="margin-top: 10px;">{{ notice }}</p>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import api from "../lib/api";
import { useAuthStore } from "../stores/auth";

type ProfileData = {
  id: number;
  email: string;
  displayName: string;
  roles: string[];
};

const auth = useAuthStore();

const profile = reactive<ProfileData>({
  id: 0,
  email: "",
  displayName: "",
  roles: [],
});

const form = reactive({
  displayName: "",
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
});

const notice = ref("");

const roleText = computed(() => (profile.roles.length ? profile.roles.join(", ") : "-"));

const resetPasswordFields = () => {
  form.currentPassword = "";
  form.newPassword = "";
  form.confirmNewPassword = "";
};

const loadProfile = async () => {
  const { data } = await api.get<ProfileData>("/api/user/me");
  profile.id = data.id;
  profile.email = data.email;
  profile.displayName = data.displayName;
  profile.roles = data.roles || [];
  form.displayName = data.displayName || "";
};

const saveProfile = async () => {
  const displayName = form.displayName.trim();
  if (!displayName) {
    notice.value = "Tên hiển thị không được để trống.";
    return;
  }

  if (form.newPassword && form.newPassword !== form.confirmNewPassword) {
    notice.value = "Mật khẩu xác nhận không khớp.";
    return;
  }

  try {
    const payload: Record<string, string> = {
      displayName,
    };

    if (form.newPassword) {
      payload.currentPassword = form.currentPassword;
      payload.newPassword = form.newPassword;
    }

    const { data } = await api.patch<ProfileData>("/api/user/me", payload);

    profile.displayName = data.displayName;
    profile.roles = data.roles || [];
    form.displayName = data.displayName || "";
    notice.value = "Đã cập nhật hồ sơ.";

    resetPasswordFields();
    await auth.fetchMe();
  } catch (error: any) {
    notice.value = error?.response?.data?.message || "Không thể cập nhật hồ sơ lúc này.";
  }
};

onMounted(async () => {
  await loadProfile();
});
</script>
