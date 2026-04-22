import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const reactAdminPath = require.resolve('react-admin');
const raCoreEntry = require.resolve('ra-core', { paths: [reactAdminPath] });
const raCorePath = raCoreEntry.match(new RegExp('.*[\\\\/]node_modules[\\\\/]ra-core'))?.[0] || 'ra-core';

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
      'ra-core': raCorePath,
      buffer: 'buffer',
    },
  },
});
