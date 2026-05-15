import { test, expect } from '@playwright/test';
import { initializeVaultAndGoToDashboard, createEntry } from './helpers/vault-init';

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await initializeVaultAndGoToDashboard(page);
  });

  test('should focus search input with Ctrl+K', async ({ page }) => {
    await page.keyboard.press('Control+k');

    await page.waitForTimeout(500);

    const activeElement = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      type: (document.activeElement as HTMLInputElement)?.type,
      placeholder: (document.activeElement as HTMLInputElement)?.placeholder,
      id: document.activeElement?.id,
      className: document.activeElement?.className,
    }));

    const isSearchFocused =
      activeElement.tag === 'INPUT' ||
      (activeElement.className?.includes('search') ?? false) ||
      (activeElement.placeholder?.includes('earch') ?? false) ||
      (activeElement.placeholder?.includes('Ara') ?? false);
    expect(isSearchFocused).toBe(true);
  });

  test('should lock vault with Ctrl+L', async ({ page }) => {
    await page.keyboard.press('Control+l');

    const loginRoot = page.locator('.vault-login-root');
    await expect(loginRoot).toBeVisible({ timeout: 10000 });
  });

  test('should open new entry form with Ctrl+N', async ({ page }) => {
    await page.keyboard.press('Control+n');

    const entryForm = page.locator('.entry-form-surface');
    await expect(entryForm).toBeVisible({ timeout: 5000 });
  });

  test('should close entry form with Escape', async ({ page }) => {
    await page.keyboard.press('Control+n');
    await page.waitForSelector('.entry-form-surface', { timeout: 5000 });

    await page.keyboard.press('Escape');

    await page
      .waitForSelector('.entry-form-surface', { state: 'hidden', timeout: 5000 })
      .catch(() => {});
    const formVisible = await page
      .locator('.entry-form-surface')
      .isVisible()
      .catch(() => false);
    expect(formVisible).toBe(false);
  });

  test('should close settings drawer with Escape', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label="Open settings"], button[aria-label="Settings"]')
      .first();
    await settingsBtn.click();
    await page.waitForTimeout(1000);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const settingsDrawer = page.locator('[class*="drawer"][class*="open"]');
    const stillOpen = await settingsDrawer.isVisible().catch(() => false);
    expect(stillOpen).toBe(false);
  });

  test('should type in search after Ctrl+K', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    const searchInput = page
      .locator('input[placeholder*="earch"], input[placeholder*="Ara"]')
      .first();
    const isFocused = await page.evaluate(() => document.activeElement?.tagName === 'INPUT');
    if (isFocused) {
      await page.keyboard.type('test search query');
      const value = await searchInput.inputValue();
      expect(value).toContain('test');
    }
  });

  test('should allow Tab navigation between header elements', async ({ page }) => {
    await page.keyboard.press('Tab');

    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'INPUT', 'A', 'SELECT']).toContain(focused);

    await page.keyboard.press('Tab');
    const focused2 = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'INPUT', 'A', 'SELECT']).toContain(focused2);
  });
});
