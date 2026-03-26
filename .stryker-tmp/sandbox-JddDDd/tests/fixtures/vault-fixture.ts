// @ts-nocheck
import { test as base, expect, type Page } from '@playwright/test';

/**
 * Vault Test Fixture
 * Aegis Vault UI ile uyumlu reusable setup/teardown
 * 
 * NOT: Aegis Vault URL-based routing yerine React state-based navigation kullanır.
 * Tüm helper fonksiyonlar buna göre hazırlanmıştır.
 */
export type VaultTestContext = {
  masterPassword: string;
  deviceSecret: string;
  testVaultName: string;
};

export const test = base.extend<VaultTestContext>({
  masterPassword: 'TestMasterPassword123!@#',
  deviceSecret: 'abcd1234ef567890abcd1234ef567890', // 32-char hex string (simulated)
  testVaultName: 'e2e-test-vault',
});

export { expect };

// ─── Helper: Initialize sekmesine geç ────────────────────────────────────────
export async function switchToInitializeTab(page: Page) {
  // "Initialize" tabını bul — i18n key: 'initialize', görünen metin değişebilir
  const initTab = page.locator(
    'button.login-tab-btn:has-text("Initialize"), button.login-tab-btn:has-text("Oluştur"), button.login-tab-btn:has-text("Yeni")'
  ).first();
  if (await initTab.isVisible()) {
    await initTab.click();
  }
}

// ─── Helper: Unlock sekmesine geç ────────────────────────────────────────────
export async function switchToUnlockTab(page: Page) {
  const unlockTab = page.locator(
    'button.login-tab-btn:has-text("Unlock"), button.login-tab-btn:has-text("Aç"), button.login-tab-btn:has-text("Kilidi")'
  ).first();
  if (await unlockTab.isVisible()) {
    await unlockTab.click();
  }
}

// ─── Helper: Yeni vault kurulumu ──────────────────────────────────────────────
/**
 * Aegis Vault'ta yeni vault oluşturma akışı:
 * 1. Initialize tabına geç
 * 2. Master Password gir
 * 3. "Generate Secret" butonuna tıkla
 * 4. "Finalize Vault" butonuna tıkla (secret otomatik oluşturulur)
 * 
 * deviceSecret parametresi bu implementasyonda kullanılmaz çünkü
 * Aegis kendi secret key'ini otomatik üretip gösterir.
 */
export async function setupNewVault(
  page: Page,
  masterPassword: string,
  _deviceSecret?: string
) {
  // Initialize sekmesine geç
  await switchToInitializeTab(page);

  // Master Password alanı
  await page.waitForSelector('input.vault-login-input', { timeout: 8000 });
  await page.fill('input.vault-login-input', masterPassword);

  // "Generate Secret" veya "Gizli Anahtar Oluştur" butonuna tıkla
  await page.click('button.vault-login-unlock-btn, button[type="submit"]');

  // Secret Key göründükten sonra "Finalize Vault" tıkla
  // Vault paneli görünmeli
  const secretPanel = page.locator('.vault-secret-panel');
  await secretPanel.waitFor({ timeout: 10000 });

  // "Finalize Vault" butonuna tıkla
  await page.click('button.vault-login-unlock-btn, button[type="submit"]');

  // Dashboard yüklenene kadar bekle
  await page.waitForSelector(
    '[data-testid="dashboard"], .dashboard-main, [data-testid="vault-entries"], text=Dashboard',
    { timeout: 20000 }
  );

  return page;
}

// ─── Helper: Login ────────────────────────────────────────────────────────────
export async function loginVault(
  page: Page,
  masterPassword: string,
  deviceSecret: string
) {
  // Unlock tabına geç (varsayılan)
  await switchToUnlockTab(page);

  // Login formu yüklenene kadar bekle
  await page.waitForSelector('input.vault-login-input', { timeout: 8000 });

  // Master Password gir
  await page.fill('input.vault-login-input[type="password"], input.vault-login-input:not([type="text"])', masterPassword);

  // Device Secret Key gir
  const secretInput = page.locator('input.vault-login-input[type="text"]');
  if (await secretInput.isVisible()) {
    await secretInput.fill(deviceSecret);
  }

  // Unlock tıkla
  await page.click('button.vault-login-unlock-btn, button[type="submit"]:has-text("Unlock"), button[type="submit"]:has-text("Kilidi Aç")');

  // Dashboard göründükten sonra devam et
  await page.waitForSelector(
    '[data-testid="dashboard"], .dashboard-main, [data-testid="vault-entries"]',
    { timeout: 20000 }
  );

  return page;
}

// ─── Helper: Vault kilitlendi mi? ─────────────────────────────────────────────
export async function checkVaultLocked(page: Page): Promise<boolean> {
  const loginInput = page.locator('input.vault-login-input');
  return await loginInput.isVisible({ timeout: 5000 }).catch(() => false);
}

// ─── Helper: Logout ────────────────────────────────────────────────────────────
export async function logoutVault(page: Page) {
  // Dashboard'daki logout / lock butonunu bul
  // İlk olarak Settings/User Menu dene
  const lockButtons = [
    '[aria-label*="Logout"]',
    '[aria-label*="Lock"]',
    '[aria-label*="Kilitle"]',
    'button[data-testid="logout-btn"]',
    'button[data-testid="lock-btn"]',
  ];

  for (const selector of lockButtons) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await btn.click();
      break;
    }
  }

  // Login ekranı yüklenene kadar bekle
  await page.waitForSelector('input.vault-login-input', { timeout: 8000 });
}

// ─── Helper: Dashboard'da entry ekle ──────────────────────────────────────────
export async function addVaultEntry(
  page: Page,
  options: {
    title: string;
    username?: string;
    password?: string;
    website?: string;
    notes?: string;
    tags?: string;
  }
) {
  // Add butonu
  await page.click(
    'button[data-testid="add-entry-btn"], button[aria-label*="Add"], button:has-text("Add Entry"), button:has-text("+ Add"), button:has-text("Ekle")'
  );

  // Form yüklen
  await page.waitForSelector(
    'input[placeholder*="Title"], input[placeholder*="Başlık"]',
    { timeout: 5000 }
  );

  await page.fill('input[placeholder*="Title"], input[placeholder*="Başlık"]', options.title);

  if (options.username) {
    await page.fill('input[placeholder*="Username"], input[placeholder*="Kullanıcı"]', options.username);
  }
  if (options.password) {
    await page.fill('input[placeholder*="Password"], input[placeholder*="Şifre"]', options.password);
  }
  if (options.website) {
    await page.fill('input[placeholder*="Website"], input[placeholder*="URL"]', options.website);
  }
  if (options.notes) {
    const notesField = page.locator('textarea[placeholder*="Notes"], textarea[placeholder*="Not"]');
    if (await notesField.isVisible()) {
      await notesField.fill(options.notes);
    }
  }
  if (options.tags) {
    const tagsField = page.locator('input[placeholder*="Tags"], input[placeholder*="Etiket"]');
    if (await tagsField.isVisible()) {
      await tagsField.fill(options.tags);
    }
  }

  // Kaydet
  await page.click(
    'button[type="submit"]:has-text("Save"), button:has-text("Kaydet"), button[data-testid="save-entry-btn"]'
  );

  // Entry listesinde görünene kadar bekle
  await page.waitForSelector(`text=${options.title}`, { timeout: 8000 });
}
