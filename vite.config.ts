import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.png', 'favicon.svg'],
      manifest: {
        name: 'SmartEdu',
        short_name: 'SmartEdu',
        description: 'School Management System',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
          handler: 'NetworkFirst',
          options: { cacheName: 'supabase-api', expiration: { maxEntries: 100, maxAgeSeconds: 3600 } },
        }],
      },
    })
  ],
  server: {
    host: true,   // exposes on all network interfaces (0.0.0.0)
    port: 5173,
    strictPort: false,
  },
})
