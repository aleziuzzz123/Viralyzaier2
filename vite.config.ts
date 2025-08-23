import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["@shotstack/shotstack-studio", "pixi.js", "@pixi/core", "@pixi/*"],
    alias: {
      "pixi.js": path.resolve(__dirname, "node_modules/pixi.js"),
      "@pixi/core": path.resolve(__dirname, "node_modules/@pixi/core")
    },
    preserveSymlinks: false
  },
  optimizeDeps: {
    include: ["@shotstack/shotstack-studio", "pixi.js"]
  }
});
