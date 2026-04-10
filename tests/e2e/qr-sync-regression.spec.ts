import { test, expect } from '@playwright/test';

test.describe('QR Sync Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Use addInitScript to ensure these flags are set BEFORE the app initializes
    await page.addInitScript(() => {
      localStorage.setItem('aegis_onboarding_done', 'true');
      localStorage.setItem('aegis_seen_tour', 'true');
      localStorage.setItem('aegis_bypass_tour', 'true');
      try {
        const raw = localStorage.getItem('aegis_settings') || '{}';
        const settings = JSON.parse(raw);
        settings.hasSeenTour = true;
        localStorage.setItem('aegis_settings', JSON.stringify(settings));
      } catch {
        /* ignore */
      }
    });

    await page.goto('/');

    // Wait for the login page to load
    await page.waitForSelector('.vault-login-root', { timeout: 15000 });

    // CI always starts fresh — go through Initialize flow
    const initTab = page
      .locator('.login-tab-btn')
      .filter({ hasText: /Initialize|Kurulum/i })
      .first();
    await expect(initTab).toBeVisible({ timeout: 5000 });
    await initTab.click();

    // Fill password
    const pwInput = page.locator('input.vault-login-input[type="password"]').first();
    await expect(pwInput).toBeVisible({ timeout: 5000 });
    await pwInput.fill('admin123');

    // Click "Generate Secret"
    const submitBtn = page.locator('.vault-login-unlock-btn').first();
    await submitBtn.click();

    // Wait for secret panel
    const secretPanel = page.locator('.vault-secret-panel, .vault-secret-box').first();
    await expect(secretPanel).toBeVisible({ timeout: 45000 });

    // Click "Finalize Vault"
    await page.waitForTimeout(1000);
    const finalizeBtn = page.locator('.vault-login-unlock-btn').first();
    await finalizeBtn.click();

    // Wait for Dashboard to appear
    await expect(
      page.locator('main[role="main"], main[aria-label="Vault entries"]').first()
    ).toBeVisible({ timeout: 35000 });
  });

  test('renders encrypted QR export flow with transfer code controls', async ({ page }) => {
    // Open Settings drawer
    const settingsBtn = page.locator('button[aria-label="Settings"]').first();
    await expect(settingsBtn).toBeVisible({ timeout: 10000 });
    await settingsBtn.click();

    // After modularization, we MUST click the Sync tab to see QR controls
    const syncTab = page
      .locator('button')
      .filter({ hasText: /Import\/Export & Sync|İçe\/Dışa Aktarım & Sync/i })
      .first();
    await expect(syncTab).toBeVisible({ timeout: 5000 });
    await syncTab.click({ force: true });

    // Verify the QR Sync section title is visible (EN or TR) using regex
    const qrTitle = page
      .getByText(/Cross-Device QR Sync|Cihazlar Arası QR Senkronizasyonu/i)
      .first();
    await expect(qrTitle).toBeVisible({ timeout: 15000 });

    // Verify the QR Export button exists (EN or TR)
    const exportBtn = page
      .getByRole('button', { name: /Generate QR \(Export\)|QR Oluştur \(Dışa Aktar\)/i })
      .first();
    await expect(exportBtn).toBeVisible({ timeout: 5000 });
  });

  test('renders receiver pairing controls for QR import flow', async ({ page }) => {
    // Open Settings drawer
    const settingsBtn = page.locator('button[aria-label="Settings"]').first();
    await expect(settingsBtn).toBeVisible({ timeout: 10000 });
    await settingsBtn.click();

    // After modularization, we MUST click the Sync tab to see QR controls
    const syncTab = page
      .locator('button')
      .filter({ hasText: /Import\/Export & Sync|İçe\/Dışa Aktarım & Sync/i })
      .first();
    await expect(syncTab).toBeVisible({ timeout: 5000 });
    await syncTab.click({ force: true });

    // Verify the QR Sync section title using regex
    const qrTitle = page
      .getByText(/Cross-Device QR Sync|Cihazlar Arası QR Senkronizasyonu/i)
      .first();
    await expect(qrTitle).toBeVisible({ timeout: 15000 });

    // Verify the QR Import button exists (EN or TR)
    const importBtn = page
      .getByRole('button', { name: /Scan with Camera \(Import\)|Kamerayla Tara \(İçe Aktar\)/i })
      .first();
    await expect(importBtn).toBeVisible({ timeout: 5000 });
  });
});
