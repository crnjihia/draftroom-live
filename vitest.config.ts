import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@draftroom/shared': path.resolve(__dirname, './apps/shared/src/index.ts'),
      '@': path.resolve(__dirname, './apps/web/src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['apps/**/src/**/*.test.{ts,tsx}'],
  },
});
