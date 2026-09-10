import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const APP_BASE = process.env.NODE_ENV === 'production' ? '/app/' : '/';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: { enabled: true, type: 'module' },
      workbox: {
        // main bundle is ~5.5MB; raise the default 2MB precache cap to cover it
        maximumFileSizeToCacheInBytes: 7 * 1024 * 1024,
      },
      manifest: {
        name: 'Collabnb',
        short_name: 'Collabnb',
        description: 'Discover stays, manage collabs, and grow your portfolio.',
        // scope is the site root (not /app/) because the app immediately routes to
        // root-level paths like /explore, /profile, /host — scoping to /app/ alone
        // made Chrome treat those as "outside the app" and show its URL trust bar
        start_url: '/explore',
        scope: '/',
        display: 'standalone',
        background_color: '#EFECE9',
        theme_color: '#192524',
        icons: [
          { src: `${APP_BASE}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${APP_BASE}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
          { src: `${APP_BASE}icons/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  base: APP_BASE,
  envDir: '.',
  publicDir: 'public-pwa',
  build: { outDir: 'dist' },
  server: { port: 5174 },
});
