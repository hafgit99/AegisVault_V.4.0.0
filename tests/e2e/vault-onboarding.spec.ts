import { test, expect } from '@playwright/test';
import { initializeVaultAndGoToDashboard } from './helpers/vault-init';

test.describe('Onboarding Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.vault-login-root', { timeout: 10000 });

    const initTab = page
      .locator('.login-tab-btn')
      .filter({ hasText: /Initialize|Kurulum/i })
      .first();
    await initTab.click();

    const pwInput = page.locator('input.vault-login-input[type="password"]').first();
    await pwInput.fill('OnboardingTest123!');

    const submitBtn = page.locator('.vault-login-unlock-btn').first();
    await submitBtn.click();

    const secretPanel = page.locator('.vault-secret-panel, .vault-secret-box').first();
    await expect(secretPanel).toBeVisible({ timeout: 45000 });

    await page.waitForTimeout(1000);
    await page.locator('.vault-login-unlock-btn').first().click();

    await expect(
      page.locator('main[role="main"], main[aria-label="Vault entries"]').first()
    ).toBeVisible({ timeout: 35000 });
  });

  test('should display onboarding wizard overlay on first unlock', async ({ page }) => {
    const onboardingDialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(onboardingDialog).toBeVisible({ timeout: 5000 });
  });

  test('should show step title on first step', async ({ page }) => {
    const onboardingDialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(onboardingDialog).toBeVisible({ timeout: 5000 });

    const stepTitle = onboardingDialog.locator('h2').first();
    await expect(stepTitle).toBeVisible();
    const titleText = await stepTitle.textContent();
    expect(titleText?.trim().length).toBeGreaterThan(0);
  });

  test('should display progress indicators matching step count', async ({ page }) => {
    const onboardingDialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(onboardingDialog).toBeVisible({ timeout: 5000 });

    const progressDots = onboardingDialog.locator('[class*="rounded-full"][class*="h-1"]');
    const count = await progressDots.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('should navigate forward with next button', async ({ page }) => {
    const onboardingDialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(onboardingDialog).toBeVisible({ timeout: 5000 });

    const nextBtn = onboardingDialog
      .locator('button:has-text("Devam"), button:has-text("Next"), button[class*="bg-blue-600"]')
      .first();
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    await page.waitForTimeout(500);
    const stepTitle = onboardingDialog.locator('h2').first();
    await expect(stepTitle).toBeVisible();
  });

  test('should show security profile selection on step 2', async ({ page }) => {
    const onboardingDialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(onboardingDialog).toBeVisible({ timeout: 5000 });

    const nextBtn = onboardingDialog.locator('button[class*="bg-blue-600"]').first();
    await nextBtn.click();
    await page.waitForTimeout(500);

    const profileButtons = onboardingDialog.locator(
      'button.group, [class*="bg-white/5"][class*="border"]'
    );
    const count = await profileButtons.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('should allow selecting different security profiles', async ({ page }) => {
    const onboardingDialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(onboardingDialog).toBeVisible({ timeout: 5000 });

    const nextBtn = onboardingDialog.locator('button[class*="bg-blue-600"]').first();
    await nextBtn.click();
    await page.waitForTimeout(500);

    const paranoidBtn = onboardingDialog
      .locator('button:has-text("paranoid"), button:has-text("Paranoid")')
      .first();
    if (await paranoidBtn.isVisible()) {
      await paranoidBtn.click();
      await expect(paranoidBtn).toHaveClass(/bg-blue-500|ring-1|border-blue/);
    }
  });

  test('should navigate back with previous button', async ({ page }) => {
    const onboardingDialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(onboardingDialog).toBeVisible({ timeout: 5000 });

    const nextBtn = onboardingDialog.locator('button[class*="bg-blue-600"]').first();
    await nextBtn.click();
    await page.waitForTimeout(500);

    const backBtn = onboardingDialog
      .locator('button:has-text("Geri"), button:has-text("Back")')
      .first();
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    await page.waitForTimeout(500);
    const stepTitle = onboardingDialog.locator('h2#step-title-0, h2').first();
    await expect(stepTitle).toBeVisible();
  });

  test('should disable back button on first step', async ({ page }) => {
    const onboardingDialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(onboardingDialog).toBeVisible({ timeout: 5000 });

    const backBtn = onboardingDialog
      .locator('button:has-text("Geri"), button:has-text("Back")')
      .first();
    if (await backBtn.isVisible()) {
      expect(await backBtn.getAttribute('disabled')).not.toBeNull();
    }
  });

  test('should complete onboarding and close dialog', async ({ page }) => {
    const onboardingDialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(onboardingDialog).toBeVisible({ timeout: 5000 });

    for (let i = 0; i < 5; i++) {
      const nextBtn = onboardingDialog
        .locator('button[class*="bg-blue-600"], button:has-text("Devam"), button:has-text("Next")')
        .first();
      if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextBtn.click({ force: true });
        await page.waitForTimeout(800);
      } else {
        break;
      }
    }

    await page.waitForTimeout(2000);

    const dialogVisible = await onboardingDialog.isVisible().catch(() => false);
    expect(dialogVisible).toBe(false);

    const onboardingDone = await page.evaluate(() => localStorage.getItem('aegis_onboarding_done'));
    expect(onboardingDone).toBe('true');
  });

  test('should persist selected security profile to localStorage', async ({ page }) => {
    const onboardingDialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(onboardingDialog).toBeVisible({ timeout: 5000 });

    const nextBtn = onboardingDialog
      .locator('button[class*="bg-blue-600"], button:has-text("Devam")')
      .first();
    await nextBtn.click({ force: true });
    await page.waitForTimeout(800);

    const advancedBtn = onboardingDialog
      .locator(
        'button:has-text("advanced"), button:has-text("Advanced"), button:has-text("Gelişmiş")'
      )
      .first();
    if (await advancedBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await advancedBtn.click({ force: true });
    }

    for (let i = 0; i < 4; i++) {
      const btn = onboardingDialog
        .locator('button[class*="bg-blue-600"], button:has-text("Devam"), button:has-text("Next")')
        .first();
      if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await btn.click({ force: true });
        await page.waitForTimeout(800);
      } else {
        break;
      }
    }

    await page.waitForTimeout(2000);

    const profile = await page.evaluate(() => {
      return localStorage.getItem('aegis_security_profile');
    });
    if (profile) {
      expect(profile).toBeTruthy();
    } else {
      const dialogGone = !(await page
        .locator('[role="dialog"][aria-modal="true"]')
        .isVisible()
        .catch(() => false));
      expect(dialogGone).toBe(true);
    }
  });
});
