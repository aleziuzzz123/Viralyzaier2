import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    commonjsOptions: { transformMixedEsModules: true },
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-NUCLEAR-FIX-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-NUCLEAR-FIX-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-NUCLEAR-FIX-${Date.now()}.[ext]`
      }
    },
    external: ['@shotstack/shotstack-studio'],
  }
});