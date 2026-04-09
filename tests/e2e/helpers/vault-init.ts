import { type Page, expect } from '@playwright/test';

export async function initializeVaultAndGoToDashboard(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('aegis_onboarding_done', 'true');
    try {
      const raw = localStorage.getItem('aegis_settings') || '{}';
      const settings = JSON.parse(raw);
      settings.hasSeenTour = true;
      localStorage.setItem('aegis_settings', JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  });
  await page.waitForSelector('.vault-login-root', { timeout: 15000 });

  const initTab = page
    .locator('.login-tab-btn')
    .filter({ hasText: /Initialize|Kurulum/i })
    .first();
  await expect(initTab).toBeVisible({ timeout: 5000 });
  await initTab.click();

  const pwInput = page.locator('input.vault-login-input[type="password"]').first();
  await expect(pwInput).toBeVisible({ timeout: 5000 });
  await pwInput.fill('E2eTestPassword123!');

  const submitBtn = page.locator('.vault-login-unlock-btn').first();
  await submitBtn.click();

  const secretPanel = page.locator('.vault-secret-panel, .vault-secret-box').first();
  await expect(secretPanel).toBeVisible({ timeout: 45000 });

  await page.waitForTimeout(1000);
  const finalizeBtn = page.locator('.vault-login-unlock-btn').first();
  await finalizeBtn.click();

  await expect(
    page.locator('main[role="main"], main[aria-label="Vault entries"]').first()
  ).toBeVisible({ timeout: 35000 });

  await dismissTour(page);
}

export async function dismissTour(page: Page) {
  await page.waitForTimeout(2000);

  const overlay = page.locator('.fixed.inset-0.z-\\[200\\]').first();
  if (await overlay.isVisible({ timeout: 3000 }).catch(() => false)) {
    const closeBtn = overlay.locator('button:has(svg)').first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click({ force: true });
      await page.waitForTimeout(500);
    }

    const stillVisible = await overlay.isVisible().catch(() => false);
    if (stillVisible) {
      await page.evaluate(() => {
        const els = document.querySelectorAll('.fixed.inset-0.z-\\[200\\]');
        els.forEach((el) => el.remove());
      });
      await page.waitForTimeout(300);
    }
  }

  await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('aegis_settings') || '{}';
      const settings = JSON.parse(raw);
      settings.hasSeenTour = true;
      localStorage.setItem('aegis_settings', JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  });
}

export async function createEntry(
  page: Page,
  opts: { title: string; username?: string; password?: string; category?: string }
) {
  await dismissTour(page);

  const addBtn = page
    .locator('button:has-text("New Entry"), button:has-text("Yeni Giriş")')
    .first();
  if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await addBtn.click({ force: true });
  }

  await page.waitForSelector('.entry-form-surface', { timeout: 5000 });

  const titleInput = page.locator('.entry-form-surface input[type="text"]').first();
  await titleInput.fill(opts.title);

  if (opts.category) {
    const categorySelect = page.locator('.entry-form-surface select').first();
    await categorySelect.selectOption(opts.category);
  }

  const usernameInputs = page.locator(
    '.entry-form-surface input[placeholder*="sername"], .entry-form-surface input[placeholder*="Kullanıcı"], .entry-form-surface input[placeholder*="Cardholder"]'
  );
  if ((await usernameInputs.count()) > 0 && opts.username) {
    await usernameInputs.first().fill(opts.username);
  }

  const passwordInput = page
    .locator(
      '.entry-form-surface input[type="password"], .entry-form-surface input[type="text"].pass-font'
    )
    .first();
  if ((await passwordInput.count()) > 0 && opts.password) {
    await passwordInput.fill(opts.password);
  }

  const saveBtn = page
    .locator(
      '.entry-form-surface button[type="submit"], .entry-form-surface button:has-text("Save"), .entry-form-surface button:has-text("Kaydet")'
    )
    .first();
  await saveBtn.click({ force: true });

  await page
    .waitForSelector('.entry-form-surface', { state: 'hidden', timeout: 10000 })
    .catch(() => {});
}
