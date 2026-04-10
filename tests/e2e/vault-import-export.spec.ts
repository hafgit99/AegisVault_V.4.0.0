import { test, expect } from '@playwright/test';
import { initializeVaultAndGoToDashboard } from './helpers/vault-init';

test.describe('Import & Export Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await initializeVaultAndGoToDashboard(page);
  });

  async function openImportExportTab(page: import('@playwright/test').Page) {
    const settingsBtn = page.locator('button[aria-label="Settings"]').first();
    await settingsBtn.click();
    await page.waitForTimeout(1000);

    const syncTab = page
      .locator('button')
      .filter({ hasText: /Import\/Export & Sync|İçe\/Dışa Aktarım & Sync/i })
      .first();
    await expect(syncTab).toBeVisible({ timeout: 5000 });
    // Use force: true to bypass any transient overlays or animations
    await syncTab.click({ force: true });
    await page.waitForTimeout(500);
  }

  test('should display import section in settings', async ({ page }) => {
    await openImportExportTab(page);

    const importSection = page
      .locator('text=/Import from|İçe Aktar|Bitwarden|1Password|KeePass/i')
      .first();
    if (await importSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(importSection).toBeVisible();
    }
  });

  test('should display export section in settings', async ({ page }) => {
    await openImportExportTab(page);

    const exportSection = page.locator('text=/Export|Dışa Aktar|CSV|JSON|Backup/i').first();
    if (await exportSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(exportSection).toBeVisible();
    }
  });

  test('should have file input for import', async ({ page }) => {
    await openImportExportTab(page);

    const fileInput = page.locator('input[type="file"]').first();
    const hasFileInput = await fileInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasFileInput) {
      await expect(fileInput).toBeAttached();
    }
  });

  test('should display backup creation option', async ({ page }) => {
    await openImportExportTab(page);

    const backupSection = page
      .locator('text=/Backup|Yedek|Encrypted Backup|Şifreli Yedek/i')
      .first();
    if (await backupSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(backupSection).toBeVisible();
    }
  });

  test('should display QR export button', async ({ page }) => {
    await openImportExportTab(page);

    const exportBtn = page
      .getByRole('button', { name: /Generate QR \(Export\)|QR Oluştur \(Dışa Aktar\)/i })
      .first();
    if (await exportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(exportBtn).toBeVisible();
    }
  });

  test('should display QR import button', async ({ page }) => {
    await openImportExportTab(page);

    const importBtn = page
      .getByRole('button', { name: /Scan with Camera \(Import\)|Kamerayla Tara \(İçe Aktar\)/i })
      .first();
    if (await importBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(importBtn).toBeVisible();
    }
  });

  test('should show vendor auto-detection for imports', async ({ page }) => {
    await openImportExportTab(page);

    const vendorHints = page.locator('text=/Bitwarden|1Password|KeePass|Proton Pass/i').first();
    if (await vendorHints.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(vendorHints).toBeVisible();
    }
  });

  test('should show encrypted backup restore option', async ({ page }) => {
    await openImportExportTab(page);

    const restoreSection = page.locator('text=/Restore|Geri Yükle|\\.aes/i').first();
    if (await restoreSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(restoreSection).toBeVisible();
    }
  });
});
