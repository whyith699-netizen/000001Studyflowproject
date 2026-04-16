/* eslint-env node */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const normalizeBasePath = (value) => {
  const trimmed = (value || '').trim()
  if (!trimmed || trimmed === '/') return '/'
  if (trimmed === './') return './'

  let normalized = trimmed
  if (!normalized.startsWith('/')) normalized = `/${normalized}`
  if (!normalized.endsWith('/')) normalized = `${normalized}/`
  return normalized
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isCapacitor = (env.CAPACITOR_BUILD || process.env.CAPACITOR_BUILD || '').trim() === 'true'
  const isGhPages = mode === 'ghpages'
  const configuredBase = env.VITE_BASE_PATH || process.env.VITE_BASE_PATH || '/'
  const base = isCapacitor ? './' : normalizeBasePath(configuredBase)

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        disable: isCapacitor || isGhPages,
        registerType: 'autoUpdate',
        includeAssets: ['pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          name: 'StudyFlow - Smart Study Dashboard',
          short_name: 'StudyFlow',
          description: 'Your all-in-one study dashboard. Track courses, manage tasks, focus with Pomodoro, and boost your productivity.',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          orientation: 'any',
          scope: base,
          start_url: base,
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
          categories: ['education', 'productivity'],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'cdn-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'firebase-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24, // 1 day
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
    base,
  }
})
