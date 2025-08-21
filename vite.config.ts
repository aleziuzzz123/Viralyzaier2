import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
  ],
  base: '/', // absolute root, so /vendor/... works everywhere
  // This resolve block prevents Vite from bundling multiple versions of PixiJS,
  // which can cause issues with Shotstack Studio's plugin system (e.g., "AudioLoadParser not found").
  resolve: {
    dedupe: ['pixi.js', '@pixi/*'],
  },
  optimizeDeps: {
    include: ['@shotstack/shotstack-studio'],
  },
});