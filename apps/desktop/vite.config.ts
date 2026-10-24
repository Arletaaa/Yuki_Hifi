import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    // Electron 33 ships Chromium 130; modern output keeps top-level await usable.
    target: "es2022"
  },
  server: {
    port: 5173,
    strictPort: false
  }
});
