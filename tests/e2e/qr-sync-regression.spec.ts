import { test, expect } from '@playwright/test';

test.describe('QR Sync Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("Enter Vault")');
  });

  test('renders encrypted QR export flow with transfer code controls', async ({ page }) => {
    await page.click('button[title="Ayarlar"]');
    await page.click('button:has-text("QR Olustur"), button:has-text("Create QR")');

    await expect(page.locator('text=Transfer code, text=Transfer Code')).toBeVisible();
    await expect(page.locator('button:has-text("QR Hazirla"), button:has-text("Prepare QR")')).toBeVisible();
  });

  test('renders receiver pairing controls for QR import flow', async ({ page }) => {
    await page.click('button[title="Ayarlar"]');
    await page.click('button:has-text("Kamerayla Tara"), button:has-text("Scan with Camera")');

    await expect(page.locator('text=Receiver pairing code, text=Alici eslestirme kodu')).toBeVisible();
    await expect(page.locator('button:has-text("Kodu Kopyala"), button:has-text("Copy Code")')).toBeVisible();
  });
});
