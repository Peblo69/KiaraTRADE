import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import runtimeErrorModalPlugin from '@replit/vite-plugin-runtime-error-modal';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), runtimeErrorModalPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    hmr: {
      clientPort: 443,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@db': path.resolve(__dirname, './db'),
    },
  },
});