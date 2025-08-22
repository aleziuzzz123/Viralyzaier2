import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['@shotstack/shotstack-studio', 'pixi.js', '@pixi/*'],
    alias: [
      // Force every @pixi/* to resolve to THIS node_modules
      { find: /^@pixi\/(.+)$/, replacement: path.resolve(__dirname, 'node_modules/@pixi/$1') },
      // Force pixi.js root to THIS node_modules
      { find: /^pixi\.js$/, replacement: path.resolve(__dirname, 'node_modules/pixi.js') },
      // Force studio to single path
      { find: '@shotstack/shotstack-studio', replacement: path.resolve(__dirname, 'node_modules/@shotstack/shotstack-studio') },
    ],
    // Important in monorepos/symlinked setups: resolve to the physical path so Vite doesn’t treat a symlink as a second copy
    preserveSymlinks: false,
  },
  optimizeDeps: {
    include: ['@shotstack/shotstack-studio'], 
    // keep empty unless you added pixi explicitly
    exclude: [],
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        studio: path.resolve(__dirname, 'studio.html'),
      },
    },
  },
});