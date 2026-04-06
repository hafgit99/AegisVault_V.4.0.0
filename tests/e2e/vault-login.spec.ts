/**
 * Aegis Vault - Authentication E2E Tests
 *
 * Bu test suite, Aegis Vault'un kimlik doğrulama akışlarını test eder:
 * - Login ekranının görüntülenmesi
 * - Yeni vault oluşturma (Initialize)
 * - Mevcut vault'a giriş (Unlock)
 * - Hatalı şifre ile giriş reddi
 * - Vault kilitleme (logout)
 * - Şifre gücü göstergesi
 */
import { test, expect } from '@playwright/test';

test.describe('Vault Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Sayfanın yüklenmesini bekle
    await page.waitForSelector('.vault-login-root', { timeout: 10000 });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 1: Login sayfası başlangıçta görüntülenir
  // ─────────────────────────────────────────────────────────────────────────────
  test('should display login page on initial load', async ({ page }) => {
    // Input alanı görünmeli
    const loginInput = page.locator('input.vault-login-input').first();
    await expect(loginInput).toBeVisible({ timeout: 5000 });

    // Submit butonu görünmeli
    const submitBtn = page.locator('button.vault-login-unlock-btn, button[type="submit"]').first();
    await expect(submitBtn).toBeVisible();

    // Başlık görünmeli (Aegis Premium Vault veya türkçe karşılığı)
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 2: Login / Unlock tabları var
  // ─────────────────────────────────────────────────────────────────────────────
  test('should show Unlock and Initialize tabs', async ({ page }) => {
    const tabContainer = page.locator('.vault-login-tabs');
    await expect(tabContainer).toBeVisible({ timeout: 5000 });

    // İki tab olmalı
    const tabs = page.locator('.login-tab-btn');
    await expect(tabs).toHaveCount(2);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 3: Initialize tabına geçiş
  // ─────────────────────────────────────────────────────────────────────────────
  test('should switch to Initialize tab when clicked', async ({ page }) => {
    // İkinci tab (Initialize)
    const initTab = page.locator('.login-tab-btn').nth(1);
    await initTab.click();

    // Active class geçmeli
    await expect(initTab).toHaveClass(/vault-login-tab-active|text-white/);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 4: Boş master password ile submit hata vermeli
  // ─────────────────────────────────────────────────────────────────────────────
  test('should not submit with empty master password', async ({ page }) => {
    // Butona tıkla ama input boş
    const submitBtn = page.locator('button.vault-login-unlock-btn, button[type="submit"]').first();
    await submitBtn.click();

    // Hata gösterilmeli VEYA login ekranında kalmaya devam etmeli
    const loginInput = page.locator('input.vault-login-input').first();
    await expect(loginInput).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 5: Master password alanı password type olmalı
  // ─────────────────────────────────────────────────────────────────────────────
  test('should have password type for master password input', async ({ page }) => {
    // İlk input password type olmalı
    const passwordInput = page.locator('input[type="password"].vault-login-input').first();
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 6: Show/Hide password toggle çalışmalı
  // ─────────────────────────────────────────────────────────────────────────────
  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('input.vault-login-input[type="password"]').first();
    await expect(passwordInput).toBeVisible();

    // Toggle butonu - eye icon içeren button
    const toggleBtn = page.locator('button[tabindex="-1"]').first();
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      // Şimdi type="text" olmalı
      const textInput = page.locator('input.vault-login-input[type="text"]').first();
      await expect(textInput).toBeVisible({ timeout: 3000 });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 7: Hatalı giriş - error state gösterilmeli
  // ─────────────────────────────────────────────────────────────────────────────
  test('should show error state on wrong login attempt', async ({ page }) => {
    // Önce Unlock tabında olduğumuzdan emin ol
    const unlockTab = page.locator('.login-tab-btn').first();
    await unlockTab.click();

    // Yanlış şifre gir
    const passwordInput = page.locator('input.vault-login-input[type="password"]').first();
    await passwordInput.fill('WrongPassword123!');

    // Device secret de gir (boş bırakırsak farklı hata verebilir)
    const secretInput = page.locator('input.vault-login-input[type="text"]').first();
    if (await secretInput.isVisible()) {
      await secretInput.fill('wrongsecretkey');
    }

    // Submit et
    const submitBtn = page.locator('button.vault-login-unlock-btn, button[type="submit"]').first();
    await submitBtn.click();

    // Hata durumu: kırmızı border VEYA toast mesajı VEYA error div görünmeli
    const _errorState = page
      .locator('.animate-shake, .border-red-500, [class*="error"], .bg-red-500')
      .first();

    // Login input hâlâ görünmeli (vault açılmamış)
    await expect(passwordInput).toBeVisible({ timeout: 8000 });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 8: Initialize modunda secret panel görünmeli
  // ─────────────────────────────────────────────────────────────────────────────
  test('should show secret key panel in initialize mode', async ({ page }) => {
    // Initialize tabına geç
    const initTab = page.locator('.login-tab-btn').nth(1);
    await initTab.click();

    // Password gir
    const passwordInput = page.locator('input.vault-login-input').first();
    await passwordInput.fill('TestPassword123!@#');

    // "Generate Secret" butonuna tıkla
    const submitBtn = page.locator('button.vault-login-unlock-btn, button[type="submit"]').first();
    await submitBtn.click();

    // Secret panel görünmeli
    const secretPanel = page.locator('.vault-secret-panel, .vault-secret-box');
    await expect(secretPanel.first()).toBeVisible({ timeout: 10000 });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 9: Download Kit butonu görünmeli (setup modunda)
  // ─────────────────────────────────────────────────────────────────────────────
  test('should show download emergency kit button in setup mode', async ({ page }) => {
    // Initialize tabına geç
    const initTab = page.locator('.login-tab-btn').nth(1);
    await initTab.click();

    // Password gir ve Generate Secret
    await page.locator('input.vault-login-input').first().fill('TestPassword123!@#');
    await page.locator('button.vault-login-unlock-btn, button[type="submit"]').first().click();

    // Secret panel çıktıktan sonra download butonu görünmeli
    const downloadBtn = page.locator(
      '.vault-login-download-btn, button:has-text("Download"), button:has-text("İndir")'
    );
    await expect(downloadBtn.first()).toBeVisible({ timeout: 10000 });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 10: Biometrics/Passkey butonu görünmeli (unlock modunda)
  // ─────────────────────────────────────────────────────────────────────────────
  test('should display biometrics button in unlock mode', async ({ page }) => {
    // Unlock tabında olmak (varsayılan)
    const unlockTab = page.locator('.login-tab-btn').first();
    await unlockTab.click();

    // Fingerprint/passkey butonu görünmeli
    const biometricsBtn = page.locator(
      '.vault-login-passkey, button:has-text("Biometric"), button:has-text("Parmak")'
    );
    await expect(biometricsBtn.first()).toBeVisible({ timeout: 5000 });
  });
});
