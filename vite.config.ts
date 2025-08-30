import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    commonjsOptions: { transformMixedEsModules: true },
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-CACHE-BUST-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-CACHE-BUST-${Date.now()}.js`,
        assetFileNames: `assets/[name]-CACHE-BUST-${Date.now()}.[ext]`
      }
    }
  }
});