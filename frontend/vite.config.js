import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  server: {
    port: 5176,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://crumble.fmr.local',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://crumble.fmr.local',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
  }
})
