import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@andika/shared': path.resolve(__dirname, './apps/shared/dist/index.js'),
      '@': path.resolve(__dirname, './apps/web/src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['apps/**/src/**/*.test.{ts,tsx}'],
  },
});
