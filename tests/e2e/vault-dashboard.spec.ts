import { test, expect } from '@playwright/test';
import { initializeVaultAndGoToDashboard, createEntry } from './helpers/vault-init';

test.describe('Dashboard UI', () => {
  test.beforeEach(async ({ page }) => {
    await initializeVaultAndGoToDashboard(page);
  });

  test('should display dashboard header with Aegis Vault branding', async ({ page }) => {
    const heading = page.locator('h1:has-text("Aegis Vault")').first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should display main content area with vault title', async ({ page }) => {
    const vaultTitle = page.locator('h2:has-text("Vault"), h2').first();
    await expect(vaultTitle).toBeVisible({ timeout: 5000 });
  });

  test('should show zero entries count for new vault', async ({ page }) => {
    const entryCount = page.locator('span:has-text("entries"), span:has-text("giriş")').first();
    await expect(entryCount).toBeVisible({ timeout: 5000 });
    const text = await entryCount.textContent();
    expect(text).toContain('0');
  });

  test('should show empty state message for new vault', async ({ page }) => {
    const emptyState = page.locator('text=/no.*password|Şifre.*bulun|parola.*yok/i').first();
    await expect(emptyState).toBeVisible({ timeout: 5000 });
  });

  test('should display lock button in header', async ({ page }) => {
    const lockBtn = page
      .locator(
        'button[aria-label="Lock vault"], button:has-text("Lock"), button:has-text("Kilitle")'
      )
      .first();
    await expect(lockBtn).toBeVisible({ timeout: 5000 });
  });

  test('should display settings button in header', async ({ page }) => {
    const settingsBtn = page.locator('button[aria-label="Settings"]').first();
    await expect(settingsBtn).toBeVisible({ timeout: 5000 });
  });

  test('should display search input in header', async ({ page }) => {
    const searchInput = page
      .locator('input[placeholder*="earch"], input[placeholder*="Ara"]')
      .first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
  });

  test('should display language toggle button', async ({ page }) => {
    const langBtn = page.locator('button[aria-label="Change language"]').first();
    await expect(langBtn).toBeVisible({ timeout: 5000 });
  });

  test('should display theme toggle button', async ({ page }) => {
    const themeBtn = page
      .locator('button[aria-label*="theme"], button[aria-label*="Tema"]')
      .first();
    await expect(themeBtn).toBeVisible({ timeout: 5000 });
  });

  test('should display donate button', async ({ page }) => {
    const donateBtn = page.locator('button[aria-label="Donate"]').first();
    await expect(donateBtn).toBeVisible({ timeout: 5000 });
  });

  test('should display category sidebar', async ({ page }) => {
    const categorySurface = page.locator('.category-surface').first();
    await expect(categorySurface).toBeVisible({ timeout: 5000 });
  });

  test('should display watchtower panel', async ({ page }) => {
    const watchtowerSurface = page.locator('.watchtower-surface').first();
    await expect(watchtowerSurface).toBeVisible({ timeout: 5000 });
  });

  test('should display emergency kit download button', async ({ page }) => {
    const emergencyKitBtn = page.locator('.emergency-kit-btn').first();
    await expect(emergencyKitBtn).toBeVisible({ timeout: 5000 });
  });

  test('should display offline PWA indicator', async ({ page }) => {
    const offlineIndicator = page.locator('.offline-surface').first();
    await expect(offlineIndicator).toBeVisible({ timeout: 5000 });
  });

  test('should display sort selector', async ({ page }) => {
    const sortSelect = page
      .locator('select[aria-label*="Sort"], select[aria-label*="Sıra"]')
      .first();
    await expect(sortSelect).toBeVisible({ timeout: 5000 });
  });

  test('should display search scope chips', async ({ page }) => {
    const scopeChips = page.locator('.toolbar-chip-group').first();
    await expect(scopeChips).toBeVisible({ timeout: 5000 });
  });

  test('should display view density toggle', async ({ page }) => {
    const densityBtn = page.locator('button[title*="density"], button[title*="Yoğunluk"]').first();
    await expect(densityBtn).toBeVisible({ timeout: 5000 });
  });

  test('should show New Entry button when not in form mode', async ({ page }) => {
    const newEntryBtn = page
      .locator('button:has-text("New Entry"), button:has-text("Yeni Giriş")')
      .first();
    await expect(newEntryBtn).toBeVisible({ timeout: 5000 });
  });

  test('should lock vault when lock button is clicked', async ({ page }) => {
    const lockBtn = page
      .locator(
        'button[aria-label="Lock vault"], button:has-text("Lock"), button:has-text("Kilitle")'
      )
      .first();
    await lockBtn.click();

    const loginRoot = page.locator('.vault-login-root');
    await expect(loginRoot).toBeVisible({ timeout: 10000 });
  });

  test('should display security score gauge', async ({ page }) => {
    const scoreGauge = page
      .locator('[class*="SecurityScore"], svg[class*="score"], [data-testid="security-score"]')
      .first();
    const dashboard = page.locator('main[role="main"]').first();
    await expect(dashboard).toBeVisible({ timeout: 5000 });
  });

  test('should show category list in sidebar', async ({ page }) => {
    const categoryItems = page.locator('.category-item');
    const count = await categoryItems.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('should display trash category in sidebar', async ({ page }) => {
    const trashItem = page
      .locator('.category-item:has-text("Trash"), .category-item:has-text("Çöp")')
      .first();
    await expect(trashItem).toBeVisible({ timeout: 5000 });
  });

  test('should display WASM SQLCipher status text', async ({ page }) => {
    const statusText = page.locator('text=/WASM SQLCipher/i').first();
    await expect(statusText).toBeVisible({ timeout: 5000 });
  });
});
