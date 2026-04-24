import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  // Disable generation of source maps in production builds to avoid
  // exposing original source files to clients via DevTools.
  build: {
    sourcemap: false,
  },
  server: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
