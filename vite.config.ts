import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname is not available in ES modules, so we define it manually.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Add an alias to point 'pixi.js' imports to our compatibility shim.
    // This resolves the missing 'deprecation' export required by @shotstack/shotstack-studio.
    alias: {
      'pixi.js': path.resolve(__dirname, 'src/shims/pixi7-compat.ts'),
    },
    // Only dedupe the top-level packages to ensure a single instance.
    // 'pixi.js' is removed from dedupe as the alias now handles its resolution.
    dedupe: ["@shotstack/shotstack-studio"],
  },
  optimizeDeps: {
    // Pre-bundle the main dependencies for faster dev server start.
    // 'pixi.js' is removed to prevent conflicts with the alias above.
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