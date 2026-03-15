import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['firebase', 'react', 'react-dom']
  },
  base: '/clients/',
  build: {
    outDir: '../../public/clients',
    emptyOutDir: true,
  }
});
