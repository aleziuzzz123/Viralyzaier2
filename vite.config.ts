import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',                           // ensure absolute URLs resolve from root
  server: { port: 5173 },
  // Ensure Vite doesn't try to prebundle our local SDK file
  optimizeDeps: { exclude: ['shotstack-studio'] },
});
