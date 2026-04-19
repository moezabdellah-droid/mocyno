import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

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
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', 'react-admin', 'ra-core', '@mui/material'],
    alias: {
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-router': path.resolve(__dirname, 'node_modules/react-router'),
      'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom'),
      'react-admin': path.resolve(__dirname, 'node_modules/react-admin'),
      'ra-core': path.resolve(__dirname, '../node_modules/.pnpm/ra-core@5.13.3_@tanstack+re_83e092df709851695a958cc90fefc759/node_modules/ra-core'),
      buffer: 'buffer',
    },
  },
});
