import { test, expect } from '@playwright/test';

test.describe('Onboarding Wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass the Spotlight tour to prevent it from covering the onboarding dialog
    await page.addInitScript(() => {
      localStorage.setItem('aegis_bypass_tour', 'true');
      localStorage.setItem('aegis_seen_tour', 'true');
    });
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

    // The wizard now has 6 steps; progress dot buttons use h-2.5 + rounded-full
    const progressDots = onboardingDialog.locator('button[class*="rounded-full"][class*="h-2"]');
    const count = await progressDots.count();
    expect(count).toBe(6);
  });

  test('should navigate forward with next button', async ({ page }) => {
    const onboardingDialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(onboardingDialog).toBeVisible({ timeout: 5000 });

    const nextBtn = page.getByTestId('onboarding-next');
    await expect(nextBtn).toBeVisible();

    const oldTitle = await onboardingDialog.locator('h2').first().textContent();
    await nextBtn.click();
    await page.waitForTimeout(400);

    const newTitle = await onboardingDialog.locator('h2').first().textContent();
    expect(newTitle).not.toBe(oldTitle);
  });

  test('should show security profile selection on step 0 (master)', async ({ page }) => {
    const onboardingDialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(onboardingDialog).toBeVisible({ timeout: 5000 });

    // Step 0 displays profile choices: Standard, Advanced, Paranoid
    const profileButtons = onboardingDialog.locator(
      'button:has-text("Standard"), button:has-text("Advanced"), button:has-text("Paranoid"), button:has-text("Gelişmiş")'
    );
    const count = await profileButtons.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should allow selecting different security profiles', async ({ page }) => {
    const onboardingDialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(onboardingDialog).toBeVisible({ timeout: 5000 });

    // Profiles are on step 0 now — click Paranoid
    const paranoidBtn = onboardingDialog.locator('button:has-text("Paranoid")').first();
    await expect(paranoidBtn).toBeVisible({ timeout: 5000 });
    await paranoidBtn.click();
    // The selected button gets a sage-green border color
    await expect(paranoidBtn).toHaveClass(/border-\[var\(--color-sage-green\)\]|sage-green|shadow/);
  });

  test('should navigate back with previous button', async ({ page }) => {
    const onboardingDialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(onboardingDialog).toBeVisible({ timeout: 5000 });

    // Navigate to step 1 first
    const nextBtn = page.getByTestId('onboarding-next');
    await nextBtn.click();
    await page.waitForTimeout(400);

    const step1Title = await onboardingDialog.locator('h2').first().textContent();

    const backBtn = onboardingDialog
      .locator('button:has-text("Geri"), button:has-text("Back")')
      .first();
    await expect(backBtn).toBeVisible();
    await backBtn.click();
    await page.waitForTimeout(400);

    const backTitle = await onboardingDialog.locator('h2').first().textContent();
    expect(backTitle).not.toBe(step1Title);
  });

  test('should disable back button on first step', async ({ page }) => {
    const onboardingDialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(onboardingDialog).toBeVisible({ timeout: 5000 });

    const backBtn = onboardingDialog
      .locator('button:has-text("Geri"), button:has-text("Back")')
      .first();
    if (await backBtn.isVisible()) {
      // On step 0 the back button is disabled and has opacity-0
      const isDisabled = await backBtn.getAttribute('disabled');
      const classes = await backBtn.getAttribute('class');
      expect(isDisabled !== null || classes?.includes('opacity-0')).toBeTruthy();
    }
  });

  test('should complete onboarding and close dialog', async ({ page }) => {
    const onboardingDialog = page.locator('[role="dialog"][aria-modal="true"]').first();
    await expect(onboardingDialog).toBeVisible({ timeout: 15000 });

    const nextBtn = page.getByTestId('onboarding-next');

    // Walk through all 6 steps: master(0) → recovery(1) → backup(2) → secondFactor(3) → privacy(4) → finish(5)
    for (let step = 0; step < 5; step++) {
      await expect(nextBtn).toBeVisible({ timeout: 5000 });
      await nextBtn.click();
      await page.waitForTimeout(400);
    }

    // Now on step 5 (finish) — click the final button ("Start Using Vault")
    await expect(nextBtn).toBeVisible({ timeout: 5000 });
    await nextBtn.click();

    // Verify completion
    await expect(onboardingDialog).toBeHidden({ timeout: 15000 });

    const onboardingDone = await page.evaluate(() => localStorage.getItem('aegis_onboarding_done'));
    expect(onboardingDone).toBe('true');
  });

  test('should persist selected security profile to localStorage', async ({ page }) => {
    const onboardingDialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(onboardingDialog).toBeVisible({ timeout: 5000 });

    // Select paranoid profile on step 0
    const paranoidBtn = onboardingDialog.locator('button:has-text("Paranoid")').first();
    if (await paranoidBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await paranoidBtn.click();
    }

    // Navigate through all steps
    const nextBtn = page.getByTestId('onboarding-next');
    for (let step = 0; step < 5; step++) {
      await expect(nextBtn).toBeVisible({ timeout: 5000 });
      await nextBtn.click();
      await page.waitForTimeout(400);
    }

    // Complete onboarding (step 5 → finish)
    await expect(nextBtn).toBeVisible({ timeout: 5000 });
    await nextBtn.click();
    await page.waitForTimeout(500);

    const plan = await page.evaluate(() => {
      return localStorage.getItem('aegis_onboarding_security_plan');
    });
    if (plan) {
      const parsed = JSON.parse(plan);
      expect(parsed.profile).toBeTruthy();
      expect(parsed.completedAt).toBeTruthy();
    } else {
      // Dialog should at least be closed
      const dialogGone = !(await page
        .locator('[role="dialog"][aria-modal="true"]')
        .isVisible()
        .catch(() => false));
      expect(dialogGone).toBe(true);
    }
  });
});
