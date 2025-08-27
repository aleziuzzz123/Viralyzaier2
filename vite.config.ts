import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Let Rollup handle these exactly as published; don't prebundle
  optimizeDeps: {
    exclude: ['@shotstack/shotstack-studio', 'pixi.js']
  },
  build: {
    sourcemap: false,
    commonjsOptions: { transformMixedEsModules: true },
  },
  resolve: {
    // IMPORTANT: no alias that points 'pixi.js' to dist/esm/...
    dedupe: ['pixi.js'] // ensures only one copy is bundled
  }
});