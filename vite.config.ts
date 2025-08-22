import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname is not available in ES modules, so we define it manually.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: [
      '@shotstack/shotstack-studio',
      'pixi.js',
      '@pixi/core', '@pixi/utils', '@pixi/constants',
      '@pixi/extensions', '@pixi/math', '@pixi/runner',
      '@pixi/compressed-textures', '@pixi/text', '@pixi/spritesheet'
    ],
    preserveSymlinks: false,
    alias: {
      'pixi.js': path.resolve(__dirname, 'node_modules/pixi.js'),
      '@shotstack/shotstack-studio': path.resolve(__dirname, 'node_modules/@shotstack/shotstack-studio')
    }
  },
  optimizeDeps: {
    include: ['@shotstack/shotstack-studio']
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        studio: path.resolve(__dirname, 'studio.html')
      }
    }
  }
});
