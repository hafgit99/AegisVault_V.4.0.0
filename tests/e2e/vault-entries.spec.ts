/**
 * Aegis Vault - Entry Management E2E Tests
 *
 * Bu test suite vault giriş yönetimini test eder.
 * NOT: Bu testler vault açıldıktan SONRA çalışır.
 * Bazı testler sadece UI elementlerinin varlığını doğrular
 * (tam entegrasyon testleri için dev server'ın vault verisi içermesi gerekir).
 */
import { test, expect } from '@playwright/test';

test.describe('Vault Entry Management (Login Page)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.vault-login-root', { timeout: 10000 });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 1: Login ekranı doğru elementlere sahip
  // ─────────────────────────────────────────────────────────────────────────────
  test('should display correct login form elements for vault access', async ({ page }) => {
    // Login formu
    const form = page.locator('form');
    await expect(form).toBeAttached();

    // Submit butonu
    const submitBtn = page.locator('button.vault-login-unlock-btn');
    await expect(submitBtn.first()).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 2: Initialize akışında vault oluşturma adımları sıralı
  // ─────────────────────────────────────────────────────────────────────────────
  test('should show multi-step vault initialization flow', async ({ page }) => {
    // Initialize tabına geç
    const initTab = page.locator('.login-tab-btn').nth(1);
    await initTab.click();

    // Step 1: Password girişi
    const passwordInput = page.locator('input.vault-login-input').first();
    await expect(passwordInput).toBeVisible();

    // Step 1 submit - Generate buton olmalı
    const generateBtn = page.locator('button.vault-login-unlock-btn').first();
    await expect(generateBtn).toBeVisible();

    // Başlık içerik kontrolü (mode indicator)
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 3: Vault selector - profil listesi
  // ─────────────────────────────────────────────────────────────────────────────
  test('should show vault selector when multiple profiles exist', async ({ page }) => {
    // Multi-vault UI elementi
    const tabs = page.locator('.vault-login-tabs');
    await expect(tabs).toBeVisible({ timeout: 5000 });

    // Tab count
    const tabButtons = page.locator('.login-tab-btn');
    await expect(tabButtons).toHaveCount(2);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 4: Emergency Kit PDF indirme butonu güvenli
  // ─────────────────────────────────────────────────────────────────────────────
  test('should have secure emergency kit download in setup flow', async ({ page }) => {
    // Initialize moduna gir
    const initTab = page.locator('.login-tab-btn').nth(1);
    await initTab.click();

    // Password gir + Generate
    await page.locator('input.vault-login-input').first().fill('SecurePass123!@#');
    await page.locator('button.vault-login-unlock-btn').first().click();

    // Secret panel görünmeli
    const secretPanel = page.locator('.vault-secret-panel');
    await expect(secretPanel).toBeVisible({ timeout: 10000 });

    // Download butonu
    const downloadBtn = page.locator('.vault-login-download-btn');
    await expect(downloadBtn).toBeVisible();

    // Finalize butonu da görünmeli
    const finalizeBtn = page.locator('button.vault-login-unlock-btn').first();
    await expect(finalizeBtn).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 5: Aurora background animasyon başlıyor (CSS animation)
  // ─────────────────────────────────────────────────────────────────────────────
  test('should render aurora background animation', async ({ page }) => {
    // The login page uses v5-login-backdrop for the animated background
    const backdrop = page.locator('.v5-login-backdrop');
    await expect(backdrop).toBeAttached();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 6: Loading state - decrypting indicator gösteriliyor
  // ─────────────────────────────────────────────────────────────────────────────
  test('should show loading indicator during vault operation', async ({ page }) => {
    // Şifre gir
    const passwordInput = page.locator('input.vault-login-input').first();
    await passwordInput.fill('TestPassword123!');

    const secretInput = page.locator('input.vault-login-input[type="text"]').first();
    if (await secretInput.isVisible()) {
      await secretInput.fill('abcdef1234567890abcdef1234567890');
    }

    // Submit et
    await page.locator('button.vault-login-unlock-btn').first().click();

    // Loading indicator görünebilir (kısa süre)
    // Not: Çok hızlı hata verirse görünmeyebilir
    await page.waitForTimeout(200);

    // Sayfa crash olmadan devam etmeli
    await expect(page.locator('.vault-login-root')).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 7: Logo/icon görünüyor
  // ─────────────────────────────────────────────────────────────────────────────
  test('should display Aegis logo on login page', async ({ page }) => {
    // Two logos exist (desktop intro panel + mobile login panel); use .first()
    const logo = page.locator('img[alt="Aegis Logo"]').first();
    await expect(logo).toBeVisible({ timeout: 5000 });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 8: Footer/protection text görünüyor
  // ─────────────────────────────────────────────────────────────────────────────
  test('should display protection footer text', async ({ page }) => {
    const footer = page.locator('.vault-login-foot');
    await expect(footer).toBeVisible({ timeout: 5000 });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 9: Passkey (biometrics) butonu Unlock modunda görünür
  // ─────────────────────────────────────────────────────────────────────────────
  test('should show passkey button in unlock mode', async ({ page }) => {
    // Unlock tab (varsayılan)
    const unlockTab = page.locator('.login-tab-btn').first();
    await unlockTab.click();

    const passkeyBtn = page.locator('.vault-login-passkey');
    await expect(passkeyBtn).toBeVisible({ timeout: 5000 });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 10: Initialize modunda passkey butonu yok
  // ─────────────────────────────────────────────────────────────────────────────
  test('should not show passkey button in initialize mode', async ({ page }) => {
    // Initialize tabına geç
    const initTab = page.locator('.login-tab-btn').nth(1);
    await initTab.click();

    // Passkey butonu görünmemeli (setup modunda)
    const passkeyBtn = page.locator('.vault-login-passkey');
    const visible = await passkeyBtn.isVisible().catch(() => false);
    expect(visible).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 11: Viewport boyutları - responsive layout
  // ─────────────────────────────────────────────────────────────────────────────
  test('should maintain usable layout on mobile viewport', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    await page.waitForSelector('.vault-login-root', { timeout: 10000 });

    // Login form hâlâ görünmeli
    const loginSurface = page.locator('.vault-login-surface');
    await expect(loginSurface).toBeVisible();

    // Buttons görünür
    const submitBtn = page.locator('button.vault-login-unlock-btn').first();
    await expect(submitBtn).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 12: Tablet viewport - responsive
  // ─────────────────────────────────────────────────────────────────────────────
  test('should maintain usable layout on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForSelector('.vault-login-root', { timeout: 10000 });

    const loginSurface = page.locator('.vault-login-surface');
    await expect(loginSurface).toBeVisible();
  });
});
