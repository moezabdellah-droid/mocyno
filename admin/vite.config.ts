import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
    }),
  ],
  base: '/admin/',
  build: {
    outDir: '../public/admin',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/storage', 'firebase/functions'],
          pdf: ['@react-pdf/renderer'],
        },
      },
    },
  },
  define: {
    // Make Buffer available globally
    global: 'globalThis',
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', 'react-admin', '@mui/material'],
    alias: {
      buffer: 'buffer',
    },
  },
});
