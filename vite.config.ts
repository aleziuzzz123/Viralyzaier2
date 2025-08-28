import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Only dedupe the top-level packages to ensure a single instance.
    dedupe: ["@shotstack/shotstack-studio", "pixi.js"],
    // Add alias to force v7 paths to resolve to the v6 package, fixing the Vercel build error.
    alias: {
      'pixi.js/dist/esm/pixi.mjs': 'pixi.js',
      'pixi.js/lib/index.mjs': 'pixi.js',
    },
  },
  optimizeDeps: {
    // This avoids Vite trying to massage Pixi/Studio in ways that break the build.
    exclude: ['@shotstack/shotstack-studio', 'pixi.js'],
  },
  build: {
    commonjsOptions: { transformMixedEsModules: true },
    rollupOptions: {
      // NOTE: Input is omitted, Vite will default to index.html for a standard SPA build.
      treeshake: {
        // This is critical to prevent Vite from removing the side-effectful
        // import of @pixi/sound, which registers the audio loader globally.
        moduleSideEffects: (id) => {
          return id.includes('/node_modules/@pixi/sound');
        }
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  }
});