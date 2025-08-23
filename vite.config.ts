import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["@shotstack/shotstack-studio", "pixi.js", "@pixi/core", "@pixi/*"],
    alias: {
      "pixi.js": resolve(__dirname, "node_modules/pixi.js"),
      "@pixi/core": resolve(__dirname, "node_modules/@pixi/core")
    }
  },
  optimizeDeps: {
    include: ["@shotstack/shotstack-studio", "pixi.js"]
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        studio: resolve(__dirname, "studio.html")
      }
    }
  }
});

