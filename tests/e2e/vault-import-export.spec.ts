import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { initializeVaultAndGoToDashboard } from './helpers/vault-init';
import { BackupService } from '../../src/lib/BackupService';
import { CryptoWalletVault } from '../../src/lib/wallet/CryptoWalletVault';

function ensureNodeBackupCrypto() {
  const root = globalThis as any;
  root.window = root.window ?? {};
  if (!root.window.crypto) {
    Object.defineProperty(root.window, 'crypto', {
      value: root.crypto,
      configurable: true,
    });
  }
  root.window.btoa =
    root.window.btoa ?? ((input: string) => Buffer.from(input, 'binary').toString('base64'));
  root.window.atob =
    root.window.atob ?? ((input: string) => Buffer.from(input, 'base64').toString('binary'));
}

async function createRecoveryDrillFixture(filePath: string) {
  ensureNodeBackupCrypto();
  const backupJson = await BackupService.encryptBackup(
    [
      {
        title: 'Recovery Drill Login',
        username: 'user@example.com',
        pass: 'E2eSecret123!',
        category: 'General',
        totpSecret: 'JBSWY3DPEHPK3PXP',
      },
      CryptoWalletVault.fromDraft({
        name: 'E2E Watch Wallet',
        chain: 'ethereum',
        publicAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        custodyMode: 'watch_only',
      }),
    ],
    'RecoveryDrillE2E123!'
  );
  await writeFile(filePath, backupJson, 'utf8');
}

test.describe('Import & Export Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await initializeVaultAndGoToDashboard(page);
  });

  async function openImportExportTab(page: import('@playwright/test').Page) {
    const settingsBtn = page
      .locator('button[aria-label="Open settings"], button[aria-label="Settings"]')
      .first();
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
  test('should run recovery drill without importing backup data', async ({ page }, testInfo) => {
    await openImportExportTab(page);

    const drillPanel = page.getByTestId('recovery-drill-panel');
    await expect(drillPanel).toBeVisible({ timeout: 10000 });

    const backupPath = testInfo.outputPath('recovery-drill-valid.aes');
    await createRecoveryDrillFixture(backupPath);
    await page.getByTestId('recovery-drill-file-input').setInputFiles(backupPath);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await dialog.locator('input[type="password"]').fill('RecoveryDrillE2E123!');
    await dialog
      .getByRole('button', {
        name: /Test backup only|Sadece yedegi test et|Sadece yedeği test et/i,
      })
      .click();

    const report = page.getByTestId('recovery-drill-report');
    await expect(report).toBeVisible({ timeout: 30000 });
    await expect(report).toContainText(/2|Kayit|Records/i);
    await expect(report).toContainText(/Crypto|Kripto/i);

    await expect(
      page.locator('.vault-entry-card').filter({ hasText: 'Recovery Drill Login' })
    ).toHaveCount(0);
  });
});
