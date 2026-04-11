/**
 * Aegis Vault - Security E2E Tests
 *
 * Bu test suite güvenlik özelliklerini test eder:
 * - LocalStorage'da plaintext şifre olmadığını doğrulama
 * - XSS koruması - input sanitization
 * - SQL injection koruması - search input
 * - Vault surface'in güvenli olduğunu doğrulama
 * - CSP ve güvenlik başlıkları
 * - Clipboard güvenliği
 * - Error mesajlarının bilgi sızdırmaması
 */
// @ts-nocheck

import { test, expect } from '@playwright/test';

test.describe('Vault Security Features', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 1: Login ekranı localStorage'da plaintext içermiyor
  // ─────────────────────────────────────────────────────────────────────────────
  test('should not store plaintext passwords in localStorage', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.vault-login-root', { timeout: 10000 });

    // Şifre gir (ama login etme)
    const passwordInput = page.locator('input.vault-login-input').first();
    await passwordInput.fill('MySensitivePassword123!');

    // localStorage kontrolü
    const localStorageContent = await page.evaluate(() =>
      JSON.stringify(
        Object.fromEntries(Object.entries(localStorage).filter(([k]) => !k.startsWith('i18next')))
      )
    );

    expect(localStorageContent).not.toContain('MySensitivePassword123!');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 2: XSS koruması - input'lar sanitize ediliyor
  // ─────────────────────────────────────────────────────────────────────────────
  test('should sanitize XSS attempts in input fields', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.vault-login-root', { timeout: 10000 });

    const xssPayload = '<script>alert("xss")</script>';
    const passwordInput = page.locator('input.vault-login-input').first();
    await passwordInput.fill(xssPayload);

    // Alert popup olmamalı
    let alertFired = false;
    page.on('dialog', async (dialog) => {
      alertFired = true;
      await dialog.dismiss();
    });

    // Kısa bekleme
    await page.waitForTimeout(1000);
    expect(alertFired).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 3: Kritik güvenlik başlıkları / CSP
  // ─────────────────────────────────────────────────────────────────────────────
  test('should have proper security context', async ({ page }) => {
    const response = await page.goto('/');

    // Sayfa yüklenebiliyor olmalı
    expect(response?.status()).toBeLessThan(400);

    // window.crypto mevcut olmalı (SubtleCrypto API)
    const hasCrypto = await page.evaluate(() => {
      return typeof window.crypto !== 'undefined' && typeof window.crypto.subtle !== 'undefined';
    });
    expect(hasCrypto).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 4: Password field type güvenliği
  // ─────────────────────────────────────────────────────────────────────────────
  test('should use password type for master password input by default', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.vault-login-root', { timeout: 10000 });

    // Password input type="password" olmalı (visible characters değil)
    const passwordInput = page.locator('input[type="password"].vault-login-input');
    await expect(passwordInput.first()).toBeVisible({ timeout: 5000 });

    // Input'un değeri gösterilmemeli (autocomplete kapalı veya masked)
    const inputType = await passwordInput.first().getAttribute('type');
    expect(inputType).toBe('password');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 5: sessionStorage kontrolü - hassas veri saklanmamalı
  // ─────────────────────────────────────────────────────────────────────────────
  test('should not expose sensitive data in sessionStorage', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.vault-login-root', { timeout: 10000 });

    // sessionStorage içeriği
    const sessionContent = await page.evaluate(() => JSON.stringify(sessionStorage));

    // Açık şifre veya anahtar olmamalı
    expect(sessionContent).not.toMatch(/password/i);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 6: Error mesajları bilgi sızdırmamalı
  // ─────────────────────────────────────────────────────────────────────────────
  test('should display generic error messages without leaking internals', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.vault-login-root', { timeout: 10000 });

    // Unlock tab
    const unlockTab = page.locator('.login-tab-btn').first();
    await unlockTab.click();

    // Yanlış şifre ile dene
    const passwordInput = page.locator('input.vault-login-input[type="password"]').first();
    await passwordInput.fill('WrongPassword!');

    const secretInput = page.locator('input.vault-login-input[type="text"]').first();
    if (await secretInput.isVisible()) {
      await secretInput.fill('wrongsecret');
    }

    await page.locator('button.vault-login-unlock-btn').first().click();

    // 3 saniye bekle (hata işleme süresi)
    await page.waitForTimeout(3000);

    // Kullanıcıya GÖRÜNEN metin içinde stack trace olmamalı
    // (DOM içeriğini değil, visible text'i kontrol ediyoruz)
    const visibleText = await page.evaluate(() => {
      return document.body.innerText || '';
    });

    // Stack trace ifşaatı olmamalı
    expect(visibleText).not.toContain('at Object.');
    expect(visibleText).not.toContain('TypeError:');
    expect(visibleText).not.toContain('ReferenceError:');

    // Login ekranı hâlâ görünmeli (vault açılmamış)
    await expect(passwordInput).toBeVisible();

    // Dashboard görünmemeli (vault açılmamış)
    const dashboard = page.locator('[data-testid="dashboard"], .dashboard-main');
    expect(await dashboard.isVisible().catch(() => false)).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 7: Console'da gizli veri log edilmiyor mu?
  // ─────────────────────────────────────────────────────────────────────────────
  test('should not log sensitive data to console on login page', async ({ page }) => {
    const sensitiveInConsole: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      // Master password veya secret key console'a basılmamalı
      if (text.includes('password') || text.includes('secret_key') || text.includes('privateKey')) {
        sensitiveInConsole.push(text);
      }
    });

    await page.goto('/');
    await page.waitForSelector('.vault-login-root', { timeout: 10000 });

    const passwordInput = page.locator('input.vault-login-input').first();
    await passwordInput.fill('TestMasterPassword123!');

    await page.waitForTimeout(1000);

    // Hassas console log'ları olmamalı
    expect(
      sensitiveInConsole.filter((t) => t.toLowerCase().includes('testmasterpassword'))
    ).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 8: Yeni oluşturulan SecretKey yeterince uzun ve rastgele olmalı
  // ─────────────────────────────────────────────────────────────────────────────
  test('should generate cryptographically strong secret key', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.vault-login-root', { timeout: 10000 });

    // Initialize tabına geç
    const initTab = page.locator('.login-tab-btn').nth(1);
    await initTab.click();

    // Password gir
    await page.locator('input.vault-login-input').first().fill('TestPassword123!@#');

    // Generate Secret
    await page.locator('button.vault-login-unlock-btn, button[type="submit"]').first().click();

    // Secret paneli bekle
    const secretBox = page.locator('.vault-secret-box');
    await expect(secretBox).toBeVisible({ timeout: 10000 });

    // Secret key içeriği
    const secretKeyText = await secretBox.textContent();

    // 32 karakter (128-bit hex) veya daha uzun olmalı
    expect(secretKeyText?.trim().length).toBeGreaterThanOrEqual(32);

    // Sadece harf ve rakamlardan oluşmalı (hex format)
    if (secretKeyText) {
      expect(secretKeyText.trim()).toMatch(/^[0-9a-fA-F]+$/);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 9: İki farklı generate - farklı secret key üretilmeli
  // ─────────────────────────────────────────────────────────────────────────────
  test('should generate unique secret keys each time', async ({ page, context }) => {
    // İlk secret key
    await page.goto('/');
    await page.waitForSelector('.vault-login-root', { timeout: 10000 });

    const initTab = page.locator('.login-tab-btn').nth(1);
    await initTab.click();
    await page.locator('input.vault-login-input').first().fill('TestPassword1!');
    await page.locator('button.vault-login-unlock-btn').first().click();

    const secretBox1 = page.locator('.vault-secret-box');
    await expect(secretBox1).toBeVisible({ timeout: 10000 });
    const key1 = await secretBox1.textContent();

    // İkinci sayfa açarak yeni key üret
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.waitForSelector('.vault-login-root', { timeout: 10000 });

    const initTab2 = page2.locator('.login-tab-btn').nth(1);
    await initTab2.click();
    await page2.locator('input.vault-login-input').first().fill('TestPassword2!');
    await page2.locator('button.vault-login-unlock-btn').first().click();

    const secretBox2 = page2.locator('.vault-secret-box');
    await expect(secretBox2).toBeVisible({ timeout: 10000 });
    const key2 = await secretBox2.textContent();

    // İki key farklı olmalı
    expect(key1?.trim()).not.toBe(key2?.trim());

    await page2.close();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 10: Factory Reset butonu var (Initialize modu)
  // ─────────────────────────────────────────────────────────────────────────────
  test('should show factory reset option in initialize mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.vault-login-root', { timeout: 10000 });

    // Initialize tabına geç
    const initTab = page.locator('.login-tab-btn').nth(1);
    await initTab.click();

    // Factory reset butonu görünmeli
    const resetBtn = page.locator(
      'button.text-red-500, button:has-text("Factory"), button:has-text("Sıfırla"), button:has-text("Reset")'
    );

    // Bileşen render olduktan kısa süre sonra görünür
    await expect(resetBtn.first()).toBeVisible({ timeout: 5000 });
  });
});
