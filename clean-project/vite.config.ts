
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react(), runtimeErrorOverlay(), themePlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    hmr: {
      clientPort: 443,
      host: '0.0.0.0'
    },
    allowedHosts: ['all']
  },
  resolve: {
    alias: {
      '@db': path.resolve(__dirname, "db"),
      '@': path.resolve(__dirname, "client", "src"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: {
      external: ['buffer']
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
      supported: {
        bigint: true
      },
    },
  },
  define: {
    'process.env.CURRENT_TIME': JSON.stringify('2025-01-27 18:00:16'),
    'process.env.CURRENT_USER': JSON.stringify('Peblo69')
  }
});
