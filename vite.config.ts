import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    strictPort: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    entries: ['index.html'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // AÄŸÄ±r kÃ¼tÃ¼phaneleri ayrÄ± chunk'lara bÃ¶l
          'vendor-sql': ['sql.js'],
          'vendor-pdf-core': ['jspdf'],
          'vendor-pdf-table': ['jspdf-autotable'],
          'vendor-canvas': ['html2canvas'],
          'vendor-ui': ['react-toastify', 'lucide-react'],
          'vendor-crypto': ['hash-wasm'],
          'vendor-i18n': ['i18next', 'react-i18next'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
