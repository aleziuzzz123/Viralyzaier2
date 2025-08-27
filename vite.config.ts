import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Force the ESM build of Pixi v6 that contains the expected named exports
      'pixi.js': 'pixi.js/dist/esm/pixi.mjs'
    }
  },
  optimizeDeps: {
    // This avoids Vite trying to massage Pixi/Studio in ways that break the build.
    exclude: ['@shotstack/shotstack-studio', 'pixi.js', '@pixi/sound'],
  },
  build: {
    sourcemap: false,
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
