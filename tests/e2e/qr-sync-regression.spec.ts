import { test, expect } from '@playwright/test';

test.describe('QR Sync Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Wait for the login page to load
    await page.waitForSelector('.vault-login-root', { timeout: 15000 });

    // ── CI always starts with a fresh environment (no vault exists) ──
    // We need to go through the Initialize flow to create a vault first.
    // Step 1: Switch to the Initialize tab (2nd tab)
    const initTab = page.locator('.login-tab-btn').nth(1);
    await initTab.click();

    // Step 2: Fill password
    const pwInput = page.locator('input.vault-login-input[type="password"]').first();
    await expect(pwInput).toBeVisible({ timeout: 5000 });
    await pwInput.fill('admin123');

    // Step 3: Click "Generate Secret" button
    const submitBtn = page.locator('.vault-login-unlock-btn').first();
    await submitBtn.click();

    // Step 4: Wait for the secret panel to appear (Argon2id derivation may take a while on CI)
    const secretPanel = page.locator('.vault-secret-panel, .vault-secret-box').first();
    await expect(secretPanel).toBeVisible({ timeout: 25000 });

    // Step 5: Click "Finalize Vault" button to complete setup
    await page.waitForTimeout(500); // Brief pause for UI state update
    const finalizeBtn = page.locator('.vault-login-unlock-btn').first();
    await finalizeBtn.click();

    // Step 6: Wait for the Dashboard to appear
    await expect(
      page.locator('main[role="main"], main[aria-label="Vault entries"]').first()
    ).toBeVisible({ timeout: 25000 });
  });

  test('renders encrypted QR export flow with transfer code controls', async ({ page }) => {
    // Click Settings
    const settingsBtn = page.locator('button[aria-label="Settings"]').first();
    await expect(settingsBtn).toBeVisible({ timeout: 5000 });
    await settingsBtn.click();

    // Click QR Export button
    const exportBtn = page.locator('button:has-text("QR"), button:has-text("Export"), button:has-text("Aktar")').first();
    await expect(exportBtn).toBeVisible({ timeout: 5000 });
    await exportBtn.click();

    // Check for Transfer Code label/input
    await expect(
      page.locator('text=Transfer Code, text=Transfer code, text=Transfer Kodu').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('renders receiver pairing controls for QR import flow', async ({ page }) => {
    // Click Settings
    const settingsBtn = page.locator('button[aria-label="Settings"]').first();
    await expect(settingsBtn).toBeVisible({ timeout: 5000 });
    await settingsBtn.click();

    // Click QR Import / Scan button
    const importBtn = page.locator('button:has-text("Camera"), button:has-text("Kamera"), button:has-text("Tara"), button:has-text("Import"), button:has-text("Aktar")').last();
    await expect(importBtn).toBeVisible({ timeout: 5000 });
    await importBtn.click();

    // Check for Receiver pairing section
    await expect(
      page.locator('text=Receiver, text=Alıcı, text=pairing').first()
    ).toBeVisible({ timeout: 10000 });
  });
});
