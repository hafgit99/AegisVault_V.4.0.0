import { test, expect } from '@playwright/test';

test.describe('QR Sync Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Fill password
    const pwInput = page.locator('input[type="password"]').first();
    await expect(pwInput).toBeVisible({ timeout: 10000 });
    await pwInput.fill('admin123!');

    const submitBtn = page.locator('.vault-login-unlock-btn').first();
    const btnText = await submitBtn.textContent() || '';
    await submitBtn.click();

    // If it was in setup mode (Generate Secret), we need to click again to Finalize
    if (btnText.toLowerCase().includes('generate') || btnText.toLowerCase().includes('oluştur') || btnText.toLowerCase().includes('yarat')) {
      const secretPanel = page.locator('.vault-secret-panel, .vault-secret-box').first();
      await expect(secretPanel).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500); // Give it a moment to animate
      await submitBtn.click();
    }

    // Wait for the Dashboard to appear. 
    await expect(page.locator('main[aria-label="Vault entries"], button[aria-label="Settings"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('renders encrypted QR export flow with transfer code controls', async ({ page }) => {
    // Click Settings
    await page.locator('button[aria-label="Settings"]').first().click();
    
    // Click Create QR
    await page.locator('text=QR Olustur, text=Create QR, text=QR').last().click();

    // Wait for text Transfer Code
    await expect(page.locator('text=Transfer code, text=Transfer Code, text=Transfer Kodu')).first().toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("QR Hazirla"), button:has-text("Prepare QR"), button:has-text("Hazırla")')).first().toBeVisible();
  });

  test('renders receiver pairing controls for QR import flow', async ({ page }) => {
    await page.locator('button[aria-label="Settings"]').first().click();
    await page.locator('text=Kamerayla Tara, text=Scan with Camera, text=Tara').last().click();

    await expect(page.locator('text=Receiver pairing code, text=Alici eslestirme kodu, text=Alıcı eşleştirme')).first().toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Kodu Kopyala"), button:has-text("Copy Code"), button:has-text("Kopyala")')).first().toBeVisible();
  });
});
