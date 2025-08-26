import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Only dedupe the top-level packages to ensure a single instance.
    dedupe: ["@shotstack/shotstack-studio", "pixi.js"],
    // Add alias to force v7 paths to resolve to the v6 package, fixing the Vercel build error.
    alias: {
      'pixi.js/dist/esm/pixi.mjs': 'pixi.js',
      'pixi.js/lib/index.mjs': 'pixi.js',
    },
  },
  optimizeDeps: {
    // Pre-bundle the main dependencies for faster dev server start.
    include: ["@shotstack/shotstack-studio", "pixi.js", "@pixi/sound"]
  },
  build: {
    rollupOptions: {
      // NOTE: Input is omitted, Vite will default to index.html for a standard SPA build.
      treeshake: {
        // This is critical to prevent Vite from removing the side-effectful
        // import of @pixi/sound, which registers the audio loader globally.
        moduleSideEffects: (id) => {
          return id.includes('/node_modules/@pixi/sound');
        }
      }
    }
  }
});