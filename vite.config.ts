import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname is not available in ES modules, so we define it manually.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["@shotstack/shotstack-studio", "pixi.js", "@pixi/core", "@pixi/*"],
    preserveSymlinks: false
  },
  optimizeDeps: {
    include: ["@shotstack/shotstack-studio", "pixi.js"]
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        studio: path.resolve(__dirname, 'studio.html')
      },
      external: [
        '@pixi/core',
        '@pixi/display',
        '@pixi/graphics',
        '@pixi/sprite',
        '@pixi/text',
        '@pixi/utils',
        '@pixi/constants',
        '@pixi/math',
        '@pixi/events',
        '@pixi/ticker',
        '@pixi/app',
        '@pixi/loaders',
        '@pixi/filter',
        '@pixi/particle',
        '@pixi/sound',
        '@pixi/interaction',
        '@pixi/mesh',
        '@pixi/mesh-extras',
        '@pixi/prepare',
        '@pixi/batch',
        '@pixi/compressed-textures',
        '@pixi/extract',
        '@pixi/runner',
        '@pixi/settings',
        '@pixi/spritesheet',
        '@pixi/text-bitmap',
        '@pixi/text-html',
        '@pixi/ticker',
        '@pixi/utils'
      ]
    }
  }
});