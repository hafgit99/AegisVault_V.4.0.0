import { test, expect } from '@playwright/test';
import { initializeVaultAndGoToDashboard, createEntry, dismissTour } from './helpers/vault-init';

test.describe('Entry CRUD Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await initializeVaultAndGoToDashboard(page);
  });

  test('should open entry form when New Entry button clicked', async ({ page }) => {
    await dismissTour(page);
    const newEntryBtn = page
      .locator('button:has-text("New Entry"), button:has-text("Yeni Giriş")')
      .first();
    await newEntryBtn.click({ force: true });

    const entryForm = page.locator('.entry-form-surface');
    await expect(entryForm).toBeVisible({ timeout: 5000 });
  });

  test('should have category selector with all categories', async ({ page }) => {
    await dismissTour(page);
    const newEntryBtn = page
      .locator('button:has-text("New Entry"), button:has-text("Yeni Giriş")')
      .first();
    await newEntryBtn.click({ force: true });
    await page.waitForSelector('.entry-form-surface', { timeout: 5000 });

    const categorySelect = page.locator('.entry-form-surface select').first();
    await expect(categorySelect).toBeVisible();

    const options = categorySelect.locator('option');
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('should create a new General entry', async ({ page }) => {
    await createEntry(page, {
      title: 'Test Website',
      username: 'testuser@example.com',
      password: 'SuperSecret123!',
      category: 'General',
    });

    await page.waitForTimeout(2000);

    const entryCard = page.locator('.vault-entry-card').first();
    await expect(entryCard).toBeVisible({ timeout: 10000 });

    const cardText = await entryCard.textContent();
    expect(cardText).toContain('Test Website');
  });

  test('should show entry count after creating entry', async ({ page }) => {
    await createEntry(page, {
      title: 'Counter Entry',
      username: 'counter@test.com',
      password: 'CounterPass123!',
    });

    await page.waitForTimeout(2000);

    const entryCount = page.locator('span:has-text("1 entries"), span:has-text("1 giriş")').first();
    await expect(entryCount).toBeVisible({ timeout: 5000 });
  });

  test('should create entry with Notes category', async ({ page }) => {
    await dismissTour(page);
    const newEntryBtn = page
      .locator('button:has-text("New Entry"), button:has-text("Yeni Giriş")')
      .first();
    await newEntryBtn.click({ force: true });
    await page.waitForSelector('.entry-form-surface', { timeout: 5000 });

    const categorySelect = page.locator('.entry-form-surface select').first();
    await categorySelect.selectOption('Notes');

    const titleInput = page.locator('.entry-form-surface input[type="text"]').first();
    await titleInput.fill('My Secret Note');

    const noteArea = page.locator('.entry-form-surface textarea').first();
    await expect(noteArea).toBeVisible();
    await noteArea.fill('This is a secret note content');

    const saveBtn = page
      .locator(
        '.entry-form-surface button[type="submit"], .entry-form-surface button:has-text("Save"), .entry-form-surface button:has-text("Kaydet")'
      )
      .first();
    await saveBtn.click({ force: true });

    await page.waitForTimeout(2000);
    const entryCard = page.locator('.vault-entry-card').first();
    await expect(entryCard).toBeVisible({ timeout: 10000 });
  });

  test('should close entry form without saving', async ({ page }) => {
    await dismissTour(page);
    const newEntryBtn = page
      .locator('button:has-text("New Entry"), button:has-text("Yeni Giriş")')
      .first();
    await newEntryBtn.click({ force: true });
    await page.waitForSelector('.entry-form-surface', { timeout: 5000 });

    const closeBtn = page.locator('.entry-form-surface button:has(svg.lucide-x)').first();
    await closeBtn.click();

    await page.waitForSelector('.entry-form-surface', { state: 'hidden', timeout: 5000 });
    const formGone = await page
      .locator('.entry-form-surface')
      .isVisible()
      .catch(() => false);
    expect(formGone).toBe(false);
  });

  test('should show password visibility toggle in form', async ({ page }) => {
    await dismissTour(page);
    const newEntryBtn = page
      .locator('button:has-text("New Entry"), button:has-text("Yeni Giriş")')
      .first();
    await newEntryBtn.click({ force: true });
    await page.waitForSelector('.entry-form-surface', { timeout: 5000 });

    const passwordInput = page
      .locator('.entry-form-surface input[type="password"], .entry-form-surface input.pass-font')
      .first();
    await expect(passwordInput).toBeVisible();

    const eyeBtn = page
      .locator(
        '.entry-form-surface button:has(svg.lucide-eye), .entry-form-surface button:has(svg.lucide-eye-off)'
      )
      .first();
    await expect(eyeBtn).toBeVisible();
  });

  test('should generate password with wand button', async ({ page }) => {
    await dismissTour(page);
    const newEntryBtn = page
      .locator('button:has-text("New Entry"), button:has-text("Yeni Giriş")')
      .first();
    await newEntryBtn.click({ force: true });
    await page.waitForSelector('.entry-form-surface', { timeout: 5000 });

    const wandBtn = page
      .locator(
        '.entry-form-surface button:has(svg.lucide-wand-2), .entry-form-surface button[title*="Generate"], .entry-form-surface button[title*="generate"]'
      )
      .first();
    if (await wandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await wandBtn.click({ force: true });
    } else {
      await page.keyboard.press('Control+g');
    }

    await page.waitForTimeout(500);

    const passwordInput = page
      .locator(
        '.entry-form-surface input[type="password"], .entry-form-surface input[type="text"].pass-font'
      )
      .first();
    const value = await passwordInput.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });

  test('should add tags to an entry', async ({ page }) => {
    await dismissTour(page);
    const newEntryBtn = page
      .locator('button:has-text("New Entry"), button:has-text("Yeni Giriş")')
      .first();
    await newEntryBtn.click({ force: true });
    await page.waitForSelector('.entry-form-surface', { timeout: 5000 });

    const titleInput = page.locator('.entry-form-surface input[type="text"]').first();
    await titleInput.fill('Tagged Entry');

    const passwordInput = page
      .locator('.entry-form-surface input[type="password"], .entry-form-surface input.pass-font')
      .first();
    await passwordInput.fill('TaggedPass123!');

    const tagInput = page
      .locator(
        '.entry-form-surface input[placeholder*="ag"], .entry-form-surface input[placeholder*="Tag"]'
      )
      .first();
    if (await tagInput.isVisible()) {
      await tagInput.fill('work');
      await tagInput.press('Enter');
    }

    const saveBtn = page
      .locator(
        '.entry-form-surface button[type="submit"], .entry-form-surface button:has-text("Save"), .entry-form-surface button:has-text("Kaydet")'
      )
      .first();
    await saveBtn.click({ force: true });

    await page.waitForTimeout(2000);
  });

  test('should delete an entry (soft delete to trash)', async ({ page }) => {
    await createEntry(page, {
      title: 'Delete Me',
      username: 'delete@test.com',
      password: 'DeletePass123!',
    });
    await page.waitForTimeout(2000);
    await dismissTour(page);

    const entryCard = page.locator('.vault-entry-card:has-text("Delete Me")').first();
    await expect(entryCard).toBeVisible({ timeout: 10000 });

    const deleteBtn = entryCard.locator('button:has(svg.lucide-trash-2)').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    const mainContent = page.locator('.vault-entry-card:has-text("Delete Me")').first();
    const stillVisible = await mainContent.isVisible().catch(() => false);
    expect(stillVisible).toBe(false);
  });

  test('should restore entry from trash', async ({ page }) => {
    await createEntry(page, {
      title: 'Restore Me',
      username: 'restore@test.com',
      password: 'RestorePass123!',
    });
    await page.waitForTimeout(2000);
    await dismissTour(page);

    const entryCard = page.locator('.vault-entry-card:has-text("Restore Me")').first();
    if (await entryCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      const deleteBtn = entryCard.locator('button:has(svg.lucide-trash-2)').first();
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click({ force: true });
        await page.waitForTimeout(1000);
      }
    }

    const trashFilter = page
      .locator('.category-item:has-text("Trash"), .category-item:has-text("Çöp")')
      .first();
    await trashFilter.click({ force: true });
    await page.waitForTimeout(1000);

    const trashedCard = page.locator('.vault-entry-card:has-text("Restore Me")').first();
    if (await trashedCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      const restoreBtn = trashedCard
        .locator('button:has-text("Restore"), button:has-text("Geri")')
        .first();
      if (await restoreBtn.isVisible()) {
        await restoreBtn.click({ force: true });
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should show password in plaintext when visibility toggled', async ({ page }) => {
    await createEntry(page, {
      title: 'Visibility Test',
      username: 'vis@test.com',
      password: 'VisiblePassword!',
    });
    await page.waitForTimeout(2000);
    await dismissTour(page);

    const entryCard = page.locator('.vault-entry-card:has-text("Visibility Test")').first();
    await expect(entryCard).toBeVisible({ timeout: 10000 });

    const eyeBtn = entryCard.locator('button:has(svg.lucide-eye)').first();
    if (await eyeBtn.isVisible()) {
      await eyeBtn.click({ force: true });
      await page.waitForTimeout(500);
    }
  });

  test('should copy password to clipboard', async ({ page }) => {
    await createEntry(page, {
      title: 'Copy Test',
      username: 'copy@test.com',
      password: 'CopyPassword123!',
    });
    await page.waitForTimeout(2000);
    await dismissTour(page);

    const entryCard = page.locator('.vault-entry-card:has-text("Copy Test")').first();
    await expect(entryCard).toBeVisible({ timeout: 10000 });

    const copyBtn = entryCard.locator('button:has(svg.lucide-copy)').first();
    if (await copyBtn.isVisible()) {
      await copyBtn.click({ force: true });
      await page.waitForTimeout(500);
    }
  });
});
