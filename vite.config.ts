// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  base: '/', // serve from site root
  plugins: [react()],
  resolve: {
    // so you can import like: import x from '@/lib/uuid'
    alias: { '@': path.resolve(__dirname, '.') },
    // avoid multiple Pixi instances (Shotstack bundles Pixi)
    dedupe: ['pixi.js', '@pixi/*'],
  },
  optimizeDeps: {
    // IMPORTANT: we're loading Shotstack from /public/vendor, not from node_modules
    // so tell Vite NOT to prebundle it or Pixi.
    exclude: ['@shotstack/shotstack-studio', 'pixi.js', '@pixi/utils', '@pixi/assets'],
  },
});
