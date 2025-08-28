import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Ensure every import of Pixi resolves to the same instance/version
  resolve: {
    dedupe: ["pixi.js"],
    // If a stray deep import appears, rewrite it to the root v6 entry
    alias: {
      "pixi.js/dist/esm/pixi.mjs": "pixi.js",
      "pixi.js/lib/index.mjs": "pixi.js"
    }
  },
  optimizeDeps: {
    // Avoid Vite prebundling these; it can trigger the wrong ESM entry
    exclude: ['@shotstack/shotstack-studio', 'pixi.js']
  },
  build: {
    sourcemap: false,
    commonjsOptions: { transformMixedEsModules: true },
  }
});