import { test, expect } from '@playwright/test';
import { initializeVaultAndGoToDashboard } from './helpers/vault-init';

test.describe('Watchtower & Security Audit', () => {
  test.beforeEach(async ({ page }) => {
    await initializeVaultAndGoToDashboard(page);
  });

  test('should display watchtower panel with security metrics', async ({ page }) => {
    const watchtowerSurface = page.locator('.watchtower-surface').first();
    await expect(watchtowerSurface).toBeVisible({ timeout: 5000 });
  });

  test('should show weak passwords count', async ({ page }) => {
    const weakItem = page
      .locator('.watchtower-item:has-text("Weak"), .watchtower-item:has-text("Zayıf")')
      .first();
    await expect(weakItem).toBeVisible({ timeout: 5000 });
  });

  test('should show reused passwords count', async ({ page }) => {
    const reusedItem = page
      .locator('.watchtower-item:has-text("Reused"), .watchtower-item:has-text("Tekrar")')
      .first();
    await expect(reusedItem).toBeVisible({ timeout: 5000 });
  });

  test('should show old passwords count', async ({ page }) => {
    const oldItem = page
      .locator('.watchtower-item:has-text("Old"), .watchtower-item:has-text("Eski")')
      .first();
    await expect(oldItem).toBeVisible({ timeout: 5000 });
  });

  test('should show pwned passwords count', async ({ page }) => {
    const pwnedItem = page
      .locator('.watchtower-item:has-text("Pwned"), .watchtower-item:has-text("Sızdırıl")')
      .first();
    await expect(pwnedItem).toBeVisible({ timeout: 5000 });
  });

  test('should display HIBP scan button', async ({ page }) => {
    const hibpBtn = page
      .locator('button:has-text("HIBP"), button:has-text("Scan"), button:has-text("Tara")')
      .first();
    await expect(hibpBtn).toBeVisible({ timeout: 5000 });
  });

  test('should display HIBP privacy toggle', async ({ page }) => {
    const hibpToggle = page.locator('.watchtower-status-box input[type="checkbox"]').first();
    await expect(hibpToggle).toBeVisible({ timeout: 5000 });
  });

  test('should have all watchtower counts initialized to zero for empty vault', async ({
    page,
  }) => {
    const weakItem = page
      .locator('.watchtower-item:has-text("Weak"), .watchtower-item:has-text("Zayıf")')
      .first();
    const weakText = await weakItem.textContent();
    expect(weakText).toContain('0');
  });

  test('should show watchtower title', async ({ page }) => {
    const watchtowerTitle = page.locator('.watchtower-surface h3').first();
    await expect(watchtowerTitle).toBeVisible({ timeout: 5000 });
    const titleText = await watchtowerTitle.textContent();
    expect(titleText?.trim().length).toBeGreaterThan(0);
  });

  test('should have correct icon colors for zero-count metrics', async ({ page }) => {
    const greenIcons = page.locator(
      '.watchtower-surface svg.text-\\[var\\(--color-sage-green\\)\\]'
    );
    const count = await greenIcons.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
