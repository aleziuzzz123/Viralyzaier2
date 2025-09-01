import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    rollupOptions: {
      input: {
        main: './index.tsx'
      },
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    },
    commonjsOptions: { transformMixedEsModules: true },
    sourcemap: false
  },
  optimizeDeps: {
    include: [
      '@shotstack/shotstack-studio',
      '@ffmpeg/ffmpeg',
      'pixi.js',
      'pixi-filters',
      'howler',
      'opentype.js',
      'fast-deep-equal',
      'zod'
    ],
    exclude: []
  },
  server: {
    headers: {
      // Required for FFmpeg WASM loading
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  define: {
    // Ensure global variables are available for browser environment
    global: 'globalThis'
  },
  esbuild: {
    // Ensure proper handling of ES modules
    target: 'es2020'
  }
});