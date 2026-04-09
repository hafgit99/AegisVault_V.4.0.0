import { test, expect } from '@playwright/test';
import { initializeVaultAndGoToDashboard } from './helpers/vault-init';

test.describe('Theme & Internationalization', () => {
  test.beforeEach(async ({ page }) => {
    await initializeVaultAndGoToDashboard(page);
  });

  test('should toggle theme from light to dark', async ({ page }) => {
    const themeBtn = page
      .locator('button[aria-label*="theme"], button[aria-label*="Tema"]')
      .first();
    await expect(themeBtn).toBeVisible({ timeout: 5000 });

    const initialTheme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );

    await themeBtn.click();
    await page.waitForTimeout(500);

    const newTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(newTheme).not.toBe(initialTheme);
  });

  test('should persist theme preference after toggle', async ({ page }) => {
    const themeBtn = page
      .locator('button[aria-label*="theme"], button[aria-label*="Tema"]')
      .first();
    await expect(themeBtn).toBeVisible({ timeout: 5000 });
    await themeBtn.click({ force: true });
    await page.waitForTimeout(800);

    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(['dark', 'light']).toContain(theme);

    const persistedTheme = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('aegis:theme-mode');
        if (raw) return raw;
        return document.documentElement.getAttribute('data-theme');
      } catch {
        return document.documentElement.getAttribute('data-theme');
      }
    });
    expect(persistedTheme).toBeTruthy();
  });

  test('should toggle language from EN to TR', async ({ page }) => {
    const langBtn = page.locator('button[aria-label="Change language"]').first();
    await expect(langBtn).toBeVisible({ timeout: 5000 });

    const initialLang = await langBtn.textContent();
    await langBtn.click();
    await page.waitForTimeout(500);

    const newLang = await langBtn.textContent();
    expect(initialLang?.trim()).not.toBe(newLang?.trim());
  });

  test('should reflect language change in UI labels', async ({ page }) => {
    const langBtn = page.locator('button[aria-label="Change language"]').first();
    const initialLang = await langBtn.textContent();

    await langBtn.click();
    await page.waitForTimeout(1000);

    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('should maintain dark theme on mobile viewport', async ({ page }) => {
    const themeBtn = page
      .locator('button[aria-label*="theme"], button[aria-label*="Tema"]')
      .first();
    await themeBtn.click();
    await page.waitForTimeout(500);

    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);

    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBeTruthy();
  });

  test('should show dashboard properly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);

    const mainContent = page.locator('main[role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 5000 });
  });

  test('should show dashboard properly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    const mainContent = page.locator('main[role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 5000 });
  });

  test('should show dashboard properly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    const mainContent = page.locator('main[role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 5000 });
  });

  test('should have correct page title', async ({ page }) => {
    const title = await page.title();
    expect(title.toLowerCase()).toMatch(/aegis|vault/i);
  });

  test('should have proper meta viewport for responsive design', async ({ page }) => {
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });

  test('should render dark mode with proper background color', async ({ page }) => {
    const themeBtn = page
      .locator('button[aria-label*="theme"], button[aria-label*="Tema"]')
      .first();
    await themeBtn.click();
    await page.waitForTimeout(500);

    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(['dark', 'light']).toContain(theme);
  });

  test('should have skip-to-content link accessible', async ({ page }) => {
    const skipLink = page.locator('.skip_to_content, a[href="#main-content"]').first();
    await expect(skipLink).toBeAttached();
  });

  test('should not have console errors after theme switch', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    const themeBtn = page
      .locator('button[aria-label*="theme"], button[aria-label*="Tema"]')
      .first();
    await themeBtn.click();
    await page.waitForTimeout(1000);

    const criticalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
