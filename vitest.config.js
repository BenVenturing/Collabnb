import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom', 'use-sync-external-store'] },
  test: {
    // Inline the shared app's translation hooks so React deduplication also
    // applies in tests (native Node imports otherwise resolve app/node_modules).
    server: { deps: { inline: [/react-i18next/] } },
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    restoreMocks: true,
    environmentOptions: { jsdom: { url: 'https://www.collabnb.com/', pretendToBeVisual: true } },
  },
});
