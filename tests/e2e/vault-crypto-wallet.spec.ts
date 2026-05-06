import { test, expect } from '@playwright/test';
import { dismissTour, initializeVaultAndGoToDashboard } from './helpers/vault-init';

test.describe('Crypto Vault + Watch-only', () => {
  test.beforeEach(async ({ page }) => {
    await initializeVaultAndGoToDashboard(page);
    await dismissTour(page);
  });

  test('creates a watch-only crypto wallet from the New Entry form', async ({ page }) => {
    const newEntryBtn = page
      .locator('button:has-text("New Entry"), button:has-text("Yeni Kayıt"), button:has-text("Yeni Giriş")')
      .first();
    await expect(newEntryBtn).toBeVisible({ timeout: 15000 });
    await newEntryBtn.click({ force: true });

    const form = page.locator('.entry-form-surface');
    await expect(form).toBeVisible({ timeout: 5000 });

    await form.locator('select').first().selectOption('CryptoWallet');
    await expect(form.locator('text=/Crypto custody|Kripto saklama/i')).toBeVisible();

    await form.locator('input').first().fill('E2E ETH Watch');
    await form.locator('input[placeholder*="public"], input[placeholder*="Public"], input[placeholder*="alım"]').first()
      .fill('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
    await form.locator('input[placeholder*="m/44"]').first().fill("m/44'/60'/0'/0/0");
    await form.locator('input[placeholder="0.0000 ETH"]').fill('0.50 ETH');

    await form.locator('button[type="submit"]').click({ force: true });
    await expect(form).toBeHidden({ timeout: 15000 });

    await expect(page.locator('.vault-entry-card, .crypto-wallet-card').filter({ hasText: 'E2E ETH Watch' }).first())
      .toBeVisible({ timeout: 15000 });
  });

  test('opens the dedicated Crypto Vault panel from the category rail', async ({ page }) => {
    const cryptoCategory = page
      .locator('.category-item')
      .filter({ hasText: /Crypto Vault|Kripto Kasa/i })
      .first();

    await expect(cryptoCategory).toBeVisible({ timeout: 15000 });
    await cryptoCategory.click({ force: true });

    await expect(page.locator('.crypto-vault-panel')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/No live signing|Canlı imzalama yok/i')).toBeVisible();
  });
});
