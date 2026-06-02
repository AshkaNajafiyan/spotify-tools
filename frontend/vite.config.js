import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'; 

console.log('importing config from vite...');


export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'manifest.webmanifest'],
      manifest: {
        name: 'Spotify Album Organizer',
        short_name: 'AlbumOrg',
        description: 'Shuffle, filter, and export your liked Spotify albums',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          { src: '/icons/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
          { src: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
          { src: '/icons/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'images', expiration: { maxEntries: 50 } }
          },
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: { cacheName: 'pages' }
          },
          {
            urlPattern: /\.js$/,
            handler: 'CacheFirst',
            options: { cacheName: 'js' }
          },
          {
            urlPattern: /\.webmanifest$/,
            handler: 'CacheFirst',
            options: { cacheName: 'manifest' }
          },
          {
            urlPattern: /\/@react-refresh/,
            handler: 'CacheFirst',
            options: { cacheName: 'vite-scripts' }
          },
          {
            urlPattern: /\/@vite-plugin-pwa\/pwa-entry-point-loaded/,
            handler: 'CacheFirst',
            options: { cacheName: 'vite-pwa-scripts' }
          }
        ],
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^(?!\/__).*/]
      }
    })
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/login': 'http://127.0.0.1:8888',
      '/albums/callback': 'http://127.0.0.1:8888',
      '/albums/genres': 'http://127.0.0.1:8888',
      '/albums/export': 'http://127.0.0.1:8888',
    }
  }
});


