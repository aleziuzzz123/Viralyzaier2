import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname is not available in ES modules, so we define it manually.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["@shotstack/shotstack-studio", "pixi.js", "@pixi/core", "@pixi/graphics", "@pixi/color"],
  },
  optimizeDeps: {
    include: ["@shotstack/shotstack-studio", "pixi.js", "@pixi/core", "@pixi/graphics", "@pixi/color"]
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
