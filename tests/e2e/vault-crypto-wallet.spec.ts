import { test, expect } from '@playwright/test';
import { dismissTour, initializeVaultAndGoToDashboard } from './helpers/vault-init';

test.describe('Crypto Vault + Watch-only', () => {
  test.beforeEach(async ({ page }) => {
    await initializeVaultAndGoToDashboard(page);
    await dismissTour(page);
  });

  test('creates a watch-only crypto wallet from the New Entry form', async ({ page }) => {
    const newEntryBtn = page
      .locator(
        'button:has-text("New Entry"), button:has-text("Yeni Kayıt"), button:has-text("Yeni Giriş")'
      )
      .first();
    await expect(newEntryBtn).toBeVisible({ timeout: 15000 });
    await newEntryBtn.click({ force: true });

    const form = page.locator('.entry-form-surface');
    await expect(form).toBeVisible({ timeout: 5000 });

    // Select CryptoWallet category from the <select>
    await form.locator('select').first().selectOption('CryptoWallet');
    await page.waitForTimeout(300);

    // Verify crypto section kicker is visible (use .first() to avoid strict-mode on option+div)
    await expect(
      form.locator('div:has-text("Crypto custody"), div:has-text("Kripto saklama")').first()
    ).toBeVisible({ timeout: 5000 });

    // Fill the wallet name (title) — first input in the form
    const titleInput = form.locator('input[type="text"]').first();
    await titleInput.fill('E2E ETH Watch');

    // Fill the public address — the input with the address placeholder
    const addressInput = form
      .locator(
        'input[placeholder*="public"], input[placeholder*="Public"], input[placeholder*="alım"], input[placeholder*="Paste"]'
      )
      .first();
    await expect(addressInput).toBeVisible({ timeout: 5000 });
    await addressInput.fill('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');

    // Fill derivation path
    const derivationInput = form.locator('input[placeholder*="m/44"]').first();
    await expect(derivationInput).toBeVisible({ timeout: 3000 });
    await derivationInput.fill("m/44'/60'/0'/0/0");

    // Fill balance
    const balanceInput = form.locator('input[placeholder="0.0000 ETH"]');
    await expect(balanceInput).toBeVisible({ timeout: 3000 });
    await balanceInput.fill('0.50 ETH');

    // Submit the form
    await form.locator('button[type="submit"]').click({ force: true });
    await expect(form).toBeHidden({ timeout: 15000 });

    await expect(
      page
        .locator('.vault-entry-card, .crypto-wallet-card')
        .filter({ hasText: 'E2E ETH Watch' })
        .first()
    ).toBeVisible({ timeout: 15000 });
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
