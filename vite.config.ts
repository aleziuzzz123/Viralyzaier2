import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // The 'resolve.alias' section has been removed as it was causing a build error.
  // Vite will now correctly use the 'module' field from pixi.js's package.json,
  // and the 'overrides' in package.json ensures it's the correct v6.5.10.
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
