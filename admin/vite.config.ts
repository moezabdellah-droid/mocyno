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
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
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
    alias: {
      buffer: 'buffer',
    },
  },
});
