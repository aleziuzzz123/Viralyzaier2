import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["pixi.js"] // ensure a single Pixi instance is used everywhere
  },
  optimizeDeps: {
    exclude: ["@shotstack/shotstack-studio", "pixi.js"] // don't prebundle, prevents Rollup mismatch
  },
  build: {
    commonjsOptions: { transformMixedEsModules: true },
    sourcemap: false
  }
});
