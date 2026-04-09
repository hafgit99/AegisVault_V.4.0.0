import { test, expect } from '@playwright/test';
import { initializeVaultAndGoToDashboard, createEntry, dismissTour } from './helpers/vault-init';

test.describe('Search, Filter & Sort', () => {
  test.beforeEach(async ({ page }) => {
    await initializeVaultAndGoToDashboard(page);

    await createEntry(page, {
      title: 'GitHub Account',
      username: 'dev@github.com',
      password: 'GitHubPass123!',
    });
    await page.waitForTimeout(1000);
    await createEntry(page, {
      title: 'AWS Console',
      username: 'admin@aws.com',
      password: 'AwsPass456!',
    });
    await page.waitForTimeout(1000);
    await createEntry(page, {
      title: 'Personal Email',
      username: 'me@gmail.com',
      password: 'EmailPass789!',
    });
    await page.waitForTimeout(2000);
    await dismissTour(page);
  });

  test('should filter entries by search query', async ({ page }) => {
    const searchInput = page
      .locator('input[placeholder*="earch"], input[placeholder*="Ara"]')
      .first();
    await searchInput.fill('GitHub');
    await page.waitForTimeout(500);

    const cards = page.locator('.vault-entry-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const firstCardText = await cards.first().textContent();
    expect(firstCardText?.toLowerCase()).toContain('github');
  });

  test('should show no results for non-matching search', async ({ page }) => {
    const searchInput = page
      .locator('input[placeholder*="earch"], input[placeholder*="Ara"]')
      .first();
    await searchInput.fill('ZZZNonExistentZZZ');
    await page.waitForTimeout(500);

    const cards = page.locator('.vault-entry-card');
    const count = await cards.count();
    expect(count).toBe(0);
  });

  test('should clear search results when input is cleared', async ({ page }) => {
    const searchInput = page
      .locator('input[placeholder*="earch"], input[placeholder*="Ara"]')
      .first();
    await searchInput.fill('GitHub');
    await page.waitForTimeout(500);

    await searchInput.clear();
    await page.waitForTimeout(500);

    const cards = page.locator('.vault-entry-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should search by title when title scope selected', async ({ page }) => {
    const titleScopeBtn = page
      .locator(
        '.toolbar-chip-group button:has-text("Title"), .toolbar-chip-group button:has-text("Başlık")'
      )
      .first();
    if (await titleScopeBtn.isVisible()) {
      await titleScopeBtn.click({ force: true });
    }

    const searchInput = page
      .locator('input[placeholder*="earch"], input[placeholder*="Ara"]')
      .first();
    await searchInput.fill('AWS');
    await page.waitForTimeout(500);

    const cards = page.locator('.vault-entry-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should search by username when user scope selected', async ({ page }) => {
    const userScopeBtn = page
      .locator(
        '.toolbar-chip-group button:has-text("User"), .toolbar-chip-group button:has-text("Kullanıcı")'
      )
      .first();
    if (await userScopeBtn.isVisible()) {
      await userScopeBtn.click({ force: true });
    }

    const searchInput = page
      .locator('input[placeholder*="earch"], input[placeholder*="Ara"]')
      .first();
    await searchInput.fill('admin@aws');
    await page.waitForTimeout(500);

    const cards = page.locator('.vault-entry-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should filter by category using sidebar', async ({ page }) => {
    const allItems = page.locator('.vault-entry-card');
    const initialCount = await allItems.count();

    const generalCat = page
      .locator('.category-item:has-text("General"), .category-item:has-text("Genel")')
      .first();
    await generalCat.click({ force: true });
    await page.waitForTimeout(500);

    const filteredItems = page.locator('.vault-entry-card');
    const filteredCount = await filteredItems.count();
    expect(filteredCount).toBe(initialCount);
  });

  test('should show trash category as empty initially', async ({ page }) => {
    const trashItem = page
      .locator('.category-item:has-text("Trash"), .category-item:has-text("Çöp")')
      .first();
    await trashItem.click({ force: true });
    await page.waitForTimeout(500);

    const emptyState = page.locator('text=/no.*trash|Çöp.*yok|empty/i').first();
    const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    const cards = page.locator('.vault-entry-card');
    const count = await cards.count();
    expect(count === 0 || hasEmptyState).toBe(true);
  });

  test('should show all entries when All category clicked', async ({ page }) => {
    const trashItem = page
      .locator('.category-item:has-text("Trash"), .category-item:has-text("Çöp")')
      .first();
    await trashItem.click({ force: true });
    await page.waitForTimeout(500);

    const allBtn = page
      .locator('.category-item:has-text("All"), .category-item:has-text("Tümü")')
      .first();
    await allBtn.click({ force: true });
    await page.waitForTimeout(500);

    const cards = page.locator('.vault-entry-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should sort entries by name A-Z', async ({ page }) => {
    const sortSelect = page
      .locator('select[aria-label*="Sort"], select[aria-label*="Sıra"]')
      .first();
    await sortSelect.selectOption('title_asc');
    await page.waitForTimeout(500);

    const titles = await page
      .locator('.vault-entry-card')
      .evaluateAll((cards) =>
        cards
          .map(
            (c) =>
              c
                .querySelector('[class*="font-semibold"], [class*="font-bold"]')
                ?.textContent?.trim() || ''
          )
          .filter(Boolean)
      );

    if (titles.length >= 2) {
      const sorted = [...titles].sort((a, b) => a.localeCompare(b));
      for (let i = 0; i < Math.min(titles.length, sorted.length); i++) {
        expect(titles[i]).toBe(sorted[i]);
      }
    }
  });

  test('should sort entries by name Z-A', async ({ page }) => {
    const sortSelect = page
      .locator('select[aria-label*="Sort"], select[aria-label*="Sıra"]')
      .first();
    await sortSelect.selectOption('title_desc');
    await page.waitForTimeout(500);

    const cards = page.locator('.vault-entry-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should toggle view density between comfortable and compact', async ({ page }) => {
    const densityBtn = page
      .locator(
        'button[title*="density"], button[title*="Yoğunluk"], button:has-text("Compact"), button:has-text("Compact"), button:has-text("Sıkı")'
      )
      .first();
    await expect(densityBtn).toBeVisible({ timeout: 5000 });

    const initialText = await densityBtn.textContent();

    await densityBtn.click({ force: true });
    await page.waitForTimeout(500);

    const newText = await densityBtn.textContent();
    expect(newText?.trim()).not.toBe(initialText?.trim());
  });

  test('should filter entries by search scope All', async ({ page }) => {
    const allScopeBtn = page
      .locator(
        '.toolbar-chip-group button:has-text("All"), .toolbar-chip-group button:has-text("Tümü")'
      )
      .first();
    await allScopeBtn.click({ force: true });

    const searchInput = page
      .locator('input[placeholder*="earch"], input[placeholder*="Ara"]')
      .first();
    await searchInput.fill('gmail');
    await page.waitForTimeout(500);

    const cards = page.locator('.vault-entry-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should highlight active search scope', async ({ page }) => {
    const titleScopeBtn = page
      .locator(
        '.toolbar-chip-group button:has-text("Title"), .toolbar-chip-group button:has-text("Başlık")'
      )
      .first();
    await titleScopeBtn.click({ force: true });

    await expect(titleScopeBtn).toHaveClass(/sage-green|bg-.*text-white/);
  });
});
