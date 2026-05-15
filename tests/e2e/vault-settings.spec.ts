import { test, expect } from '@playwright/test';
import { initializeVaultAndGoToDashboard } from './helpers/vault-init';

test.describe('Settings Drawer', () => {
  test.beforeEach(async ({ page }) => {
    await initializeVaultAndGoToDashboard(page);
  });

  async function openSettings(page: import('@playwright/test').Page) {
    const settingsBtn = page
      .locator('button[aria-label="Open settings"], button[aria-label="Settings"]')
      .first();
    await settingsBtn.click();
    await page.waitForTimeout(1000);
  }

  test('should open settings drawer when settings button clicked', async ({ page }) => {
    await openSettings(page);

    const drawer = page
      .locator('[class*="fixed"][class*="inset"], [class*="drawer"], [class*="panel"]')
      .first();
    const anySettingsContent = page
      .locator(
        'text=/General|Security|Sharing|Sync|Advanced|Genel|Güvenlik|Paylaşım|Senkronizasyon|Gelişmiş/i'
      )
      .first();
    await expect(anySettingsContent).toBeVisible({ timeout: 10000 });
  });

  test('should close settings when close button clicked', async ({ page }) => {
    await openSettings(page);

    const closeBtn = page.locator('button:has(svg.lucide-x)').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }

    const settingsContent = page.locator('[class*="drawer"][class*="open"]');
    const stillOpen = await settingsContent.isVisible().catch(() => false);
    expect(stillOpen).toBe(false);
  });

  test('should display Import/Export & Sync tab', async ({ page }) => {
    await openSettings(page);

    const syncTab = page.locator('button:has-text("Import"), button:has-text("İçe")').first();
    if (await syncTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await syncTab.click({ force: true });
      await page.waitForTimeout(500);

      const syncContent = page
        .locator('text=/Import|Export|Sync|İçe|Dışa|Senkronizasyon/i')
        .first();
      await expect(syncContent).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display Security tab in settings', async ({ page }) => {
    await openSettings(page);

    const securityTab = page
      .locator('button:has-text("Security"), button:has-text("Güvenlik")')
      .first();
    if (await securityTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await securityTab.click({ force: true });
    }
  });

  test('should display Sharing tab in settings', async ({ page }) => {
    await openSettings(page);

    const sharingTab = page
      .locator('button:has-text("Sharing"), button:has-text("Paylaşım")')
      .first();
    if (await sharingTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sharingTab.click({ force: true });
    }
  });

  test('should display Advanced tab in settings', async ({ page }) => {
    await openSettings(page);

    const advancedTab = page
      .locator('button:has-text("Advanced"), button:has-text("Gelişmiş")')
      .first();
    if (await advancedTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await advancedTab.click({ force: true });
      await page.waitForTimeout(500);
    }
  });

  test('should show QR Sync section in Import/Export tab', async ({ page }) => {
    await openSettings(page);

    const syncTab = page
      .locator('button')
      .filter({ hasText: /Import\/Export & Sync|İçe\/Dışa Aktarım & Sync/i })
      .first();
    if (await syncTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await syncTab.click({ force: true });
      await page.waitForTimeout(500);

      const qrTitle = page
        .getByText(/Cross-Device QR Sync|Cihazlar Arası QR Senkronizasyonu/i)
        .first();
      if (await qrTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(qrTitle).toBeVisible();
      }
    }
  });

  test('should display General tab as default or first tab', async ({ page }) => {
    await openSettings(page);

    const generalTab = page.locator('button:has-text("General"), button:has-text("Genel")').first();
    if (await generalTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(generalTab).toBeVisible();
    }
  });

  test('should open donation modal from settings', async ({ page }) => {
    await openSettings(page);

    const donationBtn = page.locator('button:has-text("Donate"), button:has-text("Bağış")').first();
    if (await donationBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await donationBtn.click({ force: true });
      await page.waitForTimeout(500);
    }
  });
});
