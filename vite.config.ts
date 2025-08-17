import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    dedupe: ['@shotstack/shotstack-studio'],
  },
  optimizeDeps: {
    include: [],
    exclude: []
  },
  build: {
    rollupOptions: { external: [] },
    commonjsOptions: { include: [/node_modules/] }
  }
});