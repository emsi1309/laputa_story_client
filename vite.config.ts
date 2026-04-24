import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  // Production build hardening: disable source maps, force minification
  // and use hashed output names so bundles are harder to read in DevTools.
  build: {
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      format: { comments: false },
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      mangle: true,
    },
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/chunk.[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]'
      }
    }
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
