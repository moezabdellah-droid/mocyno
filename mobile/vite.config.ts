import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/mobile/',
  build: {
    outDir: '../public/mobile',
    emptyOutDir: true
  }
})
