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
        how: resolve(__dirname, 'how-it-works.html'),
        faq: resolve(__dirname, 'faq.html'),
        join: resolve(__dirname, 'join.html'),
        login: resolve(__dirname, 'login.html'),
        'sso-callback': resolve(__dirname, 'sso-callback.html'),
        profile: resolve(__dirname, 'profile.html'),
        pricing: resolve(__dirname, 'pricing/index.html'),
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
