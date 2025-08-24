import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname is not available in ES modules, so we define it manually.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Only dedupe the top-level packages to ensure a single instance.
    dedupe: ["@shotstack/shotstack-studio", "pixi.js"],
  },
  optimizeDeps: {
    // Pre-bundle the main dependencies for faster dev server start.
    include: ["@shotstack/shotstack-studio", "pixi.js", "@pixi/sound"]
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        studio: path.resolve(__dirname, 'studio.html'),
      },
      // CRITICAL: tell Rollup not to tree-shake the module's side-effects
      treeshake: {
        moduleSideEffects: (id) => id.includes('/node_modules/@pixi/sound'),
      },
      output: {
        // Optional: put pixi-sound in its own chunk (easier to see it load)
        manualChunks(id) {
          if (id.includes('/node_modules/@pixi/sound')) {
            return 'pixi-sound';
          }
        },
      },
    }
  }
});
