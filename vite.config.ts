import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname is not available in ES modules, so we define it manually.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["@shotstack/shotstack-studio", "pixi.js", "@pixi/core", "@pixi/graphics", "@pixi/color", "@pixi/utils"],
    alias: {
      // point all pixi imports to our compat shim
      "pixi.js": path.resolve(__dirname, "src/shims/pixi7-compat.ts"),
    }
  },
  optimizeDeps: {
    // don’t prebundle pixi itself; let Rollup use our alias
    exclude: ["pixi.js"],
    include: ["@shotstack/shotstack-studio"]
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