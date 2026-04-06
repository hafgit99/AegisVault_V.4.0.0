import { defineConfig, devices } from '@playwright/test';

/**
 * Aegis Vault - Playwright E2E Test Configuration
 *
 * Test suiteleri:
 * - vault-login.spec.ts      → Authentication akışı (10 test)
 * - vault-security.spec.ts   → Güvenlik kontrolleri (10 test)
 * - vault-entries.spec.ts    → Entry yönetimi & UI (12 test)
 * - vault-crypto.spec.ts     → Crypto altyapı testleri (10 test)
 * - vault-accessibility.spec.ts → A11y & UI testleri (12 test)
 *
 * Toplam hedef: ~54 test, >80% feature coverage
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Test execution
  fullyParallel: false, // IndexedDB state çakışmalarını önle
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Flaky testler için 1 retry
  workers: process.env.CI ? 1 : 2, // Paralel browser sayısı

  // Reporting
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'], // stdout'a özet
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  // Global test options
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Viewport default
    viewport: { width: 1280, height: 720 },

    // Navigation timeout
    navigationTimeout: 15000,
    actionTimeout: 10000,
  },

  // Web Server - Vite dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stderr: 'pipe',
  },

  // Timeout per test
  timeout: 30000, // 30 saniye per test
  expect: {
    timeout: 8000, // expect assertion timeout
  },

  // Output directory
  outputDir: 'test-results',

  // Projects (Browsers)
  // Primary: Chromium (hızlı, stabil)
  // CI'da tümü, lokalde sadece Chrome
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Clipboard permission (copy-to-clipboard testleri için)
        permissions: ['clipboard-read', 'clipboard-write'],
        // Dev tools access
        launchOptions: {
          args: [
            '--allow-file-access-from-files',
            '--disable-web-security', // OPFS testleri için
            '--use-fake-ui-for-media-stream', // Camera mocking
          ],
        },
      },
    },

    // Firefox (CI modunda ekstra browser)
    ...(process.env.CI
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
          },
        ]
      : []),

    // Mobile Chrome (CI veya isteğe bağlı)
    ...(process.env.E2E_MOBILE
      ? [
          {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 5'] },
          },
          {
            name: 'mobile-safari',
            use: { ...devices['iPhone 12'] },
          },
        ]
      : []),
  ],
});
