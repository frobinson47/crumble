import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Cache API responses (recipes, lists, etc.)
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
              networkTimeoutSeconds: 3,
            },
          },
          {
            // Cache recipe images
            urlPattern: /\/uploads\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Cookslate',
        short_name: 'Cookslate',
        description: 'Your recipes. Your way.',
        start_url: '/',
        display: 'standalone',
        background_color: '#F5EDE3',
        theme_color: '#C75B39',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  base: '/',
  server: {
    port: 5176,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://cookslate.fmr.local',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://cookslate.fmr.local',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
  }
})
