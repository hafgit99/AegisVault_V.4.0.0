import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'benchmarks/**/*.test.ts'],
    exclude: ['tests/**', 'node_modules/**', 'dist/**', 'release/**'],
    passWithNoTests: false,
    restoreMocks: true,
    clearMocks: true,
  },
});

