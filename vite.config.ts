import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // The 'resolve.alias' was removed as it was causing a build error.
  optimizeDeps: {
    // Don’t prebundle Studio/Pixi – avoids Rollup/ESM export mismatches
    exclude: ['@shotstack/shotstack-studio', 'pixi.js'],
  },
  build: {
    sourcemap: false,
    commonjsOptions: { transformMixedEsModules: true },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  }
});