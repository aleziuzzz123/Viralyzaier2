import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["@shotstack/shotstack-studio", "pixi.js", "@pixi/sound"]
  },
  build: {
    commonjsOptions: { transformMixedEsModules: true },
    sourcemap: false
  }
});