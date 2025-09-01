import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: '.',
            build: {
            rollupOptions: {
              input: {
                main: './index.html'
              },
              output: {
                entryFileNames: `assets/[name].[hash].js`,
                chunkFileNames: `assets/[name].[hash].js`,
                assetFileNames: `assets/[name].[hash].[ext]`
              }
            },
            commonjsOptions: { transformMixedEsModules: true },
            sourcemap: false
          },
            optimizeDeps: {
            include: [
              // '@shotstack/shotstack-studio', // Temporarily disabled
              // '@ffmpeg/ffmpeg', // Temporarily disabled
              // 'pixi.js', // Temporarily disabled
              // 'pixi-filters', // Temporarily disabled
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