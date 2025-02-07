import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5000,
    strictPort: true,
    hmr: {
      clientPort: 443,
      host: "0.0.0.0",
    },
    watch: {
      usePolling: true,
    },
    fs: {
      strict: false,
      allow: ['.']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@lib': path.resolve(__dirname, './src/lib'),
    },
  },
});