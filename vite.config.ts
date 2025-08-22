// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  base: '/',                 // So /vendor/... resolves correctly
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
    dedupe: ['pixi.js', '@pixi/*'], // avoid multiple Pixi builds
  },
  optimizeDeps: {
    // We are loading Shotstack from /public/vendor, not node_modules.
    // Tell Vite NOT to prebundle these (prevents double Pixi/FFmpeg).
    exclude: ['@shotstack/shotstack-studio', 'pixi.js', '@pixi/utils', '@pixi/assets'],
  },
});
