import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        appPreview: resolve(__dirname, 'app-preview.html'),
        how: resolve(__dirname, 'how-it-works.html'),
        faq: resolve(__dirname, 'faq.html'),
        join: resolve(__dirname, 'join.html'),
        ambassadors: resolve(__dirname, 'ambassadors.html'),
        login: resolve(__dirname, 'login.html'),
        'sso-callback': resolve(__dirname, 'sso-callback.html'),
        pricing: resolve(__dirname, 'pricing/index.html'),
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    watch: {
      // The app has its own dev server; build outputs shouldn't trigger reloads here.
      ignored: ['**/app/**', '**/dist/**'],
    },
    proxy: {
      // Mirrors the /blog -> /app/index.html rewrite in vercel.json for local dev.
      // Requires the app's dev server running on port 5174 (cd app && npm run dev).
      '/blog': 'http://localhost:5174',
    },
  },
});
