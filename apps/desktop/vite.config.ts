import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // 生产构建由 Electron 以 file:// 加载，必须用相对路径，否则资源 404 白屏。
  base: "./",
  build: {
    // Electron 33 ships Chromium 130; modern output keeps top-level await usable.
    target: "es2022"
  },
  server: {
    port: 5173,
    strictPort: false
  }
});
