// @ts-nocheck
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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json'],
      thresholds: {
        statements: 78,
        branches: 50,
        functions: 70,
        lines: 78,
      },
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts', 'src/lib/types/**'],
    },
  },
});

