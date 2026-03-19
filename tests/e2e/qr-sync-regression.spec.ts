import { test, expect } from '@playwright/test';

test.describe('QR Sync Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate using the baseURL defined in the config
    await page.goto('/');
    
    // Fill password - use admin123 as used in original tests
    const pwInput = page.locator('input[type="password"]').first();
    await expect(pwInput).toBeVisible({ timeout: 15000 });
    await pwInput.fill('admin123');

    // Click Unlock or Generate
    const submitBtn = page.locator('.vault-login-unlock-btn').first();
    await submitBtn.click();

    // The app might be in Setup mode (fresh env) or Unlock mode (reusing env/IDB)
    // We check which state we are in after the first click
    try {
      // Wait for either the Dashboard OR the Secret Box to appear
      await Promise.any([
        page.waitForSelector('main[role="main"], button[aria-label="Settings"]', { timeout: 10000 }),
        page.waitForSelector('.vault-secret-panel, .vault-secret-box', { timeout: 10000 })
      ]);

      // If we see the secret box, it means we were in Setup mode, so we need one more click (Finalize)
      if (await page.locator('.vault-secret-panel, .vault-secret-box').isVisible()) {
        await page.waitForTimeout(1000); // Wait for transition/animation
        await submitBtn.click();
      }
    } catch {
      console.log('Transition state detection timed out, waiting for final appearance...');
    }

    // Wait for the Dashboard to appear. 
    await expect(page.locator('main[role="main"], button[aria-label="Settings"]').first()).toBeVisible({ timeout: 20000 });
  });

  test('renders encrypted QR export flow with transfer code controls', async ({ page }) => {
    // Click Settings
    await page.locator('button[aria-label="Settings"]').first().click();
    
    // Click QR Export (Wait for it to be visible in the drawer)
    await page.locator('text=QR, button:has-text("Export"), button:has-text("Aktar")').last().click();

    // Check for Transfer Code label/input
    await expect(page.locator('text=Transfer code, text=Transfer Code, text=Transfer Kodu').first()).toBeVisible({ timeout: 10000 });
    // Check for any button that looks like Prepare QR or QR Hazirla
    await expect(page.locator('button:has-text("QR"), button:has-text("Hazırla"), button:has-text("Prepare")').last()).toBeVisible();
  });

  test('renders receiver pairing controls for QR import flow', async ({ page }) => {
    await page.locator('button[aria-label="Settings"]').first().click();
    
    // Click QR Import
    await page.locator('text=Camera, text=Kamera, text=Tara').last().click();

    // Check for Receiver pairing code text
    await expect(page.locator('text=Receiver pairing code, text=Alici eslestirme kodu, text=Alıcı eşleştirme').first()).toBeVisible({ timeout: 10000 });
    // Check for Copy Code button
    await expect(page.locator('button:has-text("Copy"), button:has-text("Kopyala")').first()).toBeVisible();
  });
});
