<template>
  <footer class="site-footer">
    <div class="container site-footer-inner">
      <section class="site-footer-brand">
        <router-link to="/" class="site-footer-logo" aria-label="Truyện Chill">
          <img src="/logo-truyen-chill.png" alt="Truyện Chill" />
          <span>Truyện Chill</span>
        </router-link>
        <p class="site-footer-description">
          Nền tảng đọc truyện miễn phí, cập nhật nhanh chương mới và tối ưu trải nghiệm đọc trên cả desktop lẫn mobile.
        </p>
        <span class="site-footer-pill">Đọc truyện tranh Nhanh - Miễn Phí, completely free.</span>
      </section>

      <section class="site-footer-col">
        <h3>Khám phá</h3>
        <router-link to="/">Trang chủ</router-link>
        <router-link to="/search">Tìm truyện</router-link>
        <router-link to="/about">Giới thiệu</router-link>
      </section>

      <section class="site-footer-col">
        <h3>Hỗ trợ</h3>
        <a href="mailto:jinjnguyen147@gmail.com">jinjnguyen147@gmail.com</a>
        <a href="https://facebook.com" target="_blank" rel="noreferrer">Facebook</a>
        <a href="https://discord.gg" target="_blank" rel="noreferrer">Discord</a>
      </section>

      <section class="site-footer-col site-footer-disclaimer">
        <h3>Miễn trừ trách nhiệm</h3>
        <p>
          Trang web của chúng tôi chỉ cung cấp dịch vụ đọc truyện tranh online với mục đích giải trí và chia sẻ nội dung. Toàn bộ các truyện tranh được đăng tải trên trang web được sưu tầm từ nhiều nguồn trên internet và chúng tôi không chịu trách nhiệm về bản quyền hoặc quyền sở hữu đối với bất kỳ nội dung nào.
        </p>
        <span class="site-footer-pill">Nếu bạn là chủ sở hữu bản quyền và cho rằng nội dung trên trang vi phạm quyền của bạn, vui lòng liên hệ với chúng tôi để tiến hành gỡ bỏ nội dung vi phạm một cách kịp thời.</span>
      </section>
    </div>

    <div class="site-footer-bottom">
      <div class="container site-footer-bottom-inner">
        <p>© {{ currentYear }} Truyện Chill. All rights reserved.</p>
        <p>
          Liên hệ: <a href="mailto:jinjnguyen147@gmail.com">jinjnguyen147@gmail.com</a>
        </p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const currentYear = new Date().getFullYear();
</script>
