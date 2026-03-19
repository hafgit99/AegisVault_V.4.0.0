import { test, expect } from '@playwright/test';

test.describe('QR Sync Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Wait for the login page to load
    await page.waitForSelector('.vault-login-root', { timeout: 15000 });

    // CI always starts fresh — go through Initialize flow
    const initTab = page.locator('.login-tab-btn').nth(1);
    await initTab.click();

    // Fill password
    const pwInput = page.locator('input.vault-login-input[type="password"]').first();
    await expect(pwInput).toBeVisible({ timeout: 5000 });
    await pwInput.fill('admin123');

    // Click "Generate Secret"
    const submitBtn = page.locator('.vault-login-unlock-btn').first();
    await submitBtn.click();

    // Wait for secret panel (Argon2id may be slow on CI)
    const secretPanel = page.locator('.vault-secret-panel, .vault-secret-box').first();
    await expect(secretPanel).toBeVisible({ timeout: 25000 });

    // Click "Finalize Vault"
    await page.waitForTimeout(500);
    const finalizeBtn = page.locator('.vault-login-unlock-btn').first();
    await finalizeBtn.click();

    // Wait for Dashboard
    await expect(
      page.locator('main[role="main"], main[aria-label="Vault entries"]').first()
    ).toBeVisible({ timeout: 25000 });
  });

  test('renders encrypted QR export flow with transfer code controls', async ({ page }) => {
    // Open Settings drawer
    const settingsBtn = page.locator('button[aria-label="Settings"]').first();
    await expect(settingsBtn).toBeVisible({ timeout: 5000 });
    await settingsBtn.click();

    // Verify the QR Sync section title is visible (EN or TR)
    await expect(
      page.locator('text=Cross-Device QR Sync, text=Cihazlar Arası QR Senkronizasyonu, text=QR Sync').first()
    ).toBeVisible({ timeout: 10000 });

    // Verify the QR Export button exists (EN or TR)
    await expect(
      page.locator('button:has-text("Generate QR"), button:has-text("QR Oluştur")').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('renders receiver pairing controls for QR import flow', async ({ page }) => {
    // Open Settings drawer
    const settingsBtn = page.locator('button[aria-label="Settings"]').first();
    await expect(settingsBtn).toBeVisible({ timeout: 5000 });
    await settingsBtn.click();

    // Verify the QR Sync section is visible
    await expect(
      page.locator('text=Cross-Device QR Sync, text=Cihazlar Arası QR Senkronizasyonu, text=QR Sync').first()
    ).toBeVisible({ timeout: 10000 });

    // Verify the QR Import button exists (EN or TR)
    await expect(
      page.locator('button:has-text("Scan with Camera"), button:has-text("Kamerayla Tara")').first()
    ).toBeVisible({ timeout: 5000 });
  });
});
