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
    await createEntry(page, {
      title: 'AWS Console',
      username: 'admin@aws.com',
      password: 'AwsPass456!',
    });
    await createEntry(page, {
      title: 'Personal Email',
      username: 'me@gmail.com',
      password: 'EmailPass789!',
    });
    // High-resilience wait for all entries to be processed and rendered
    await expect(async () => {
      const cardCount = await page.locator('.vault-entry-card').count();
      expect(cardCount).toBe(3);
    }).toPass({
      timeout: 30000,
      intervals: [1000, 2000, 5000],
    });

    await dismissTour(page);
  });

  test('should filter entries by search query', async ({ page }) => {
    const searchInput = page
      .locator('input[placeholder*="earch"], input[placeholder*="Ara"]')
      .first();
    await searchInput.fill('GitHub');

    const cards = page.locator('.vault-entry-card');
    await expect(cards).toHaveCount(1, { timeout: 5000 });

    const firstCardText = await cards.first().textContent();
    expect(firstCardText?.toLowerCase()).toContain('github');
  });

  test('should find entries using special characters like @', async ({ page }) => {
    const searchInput = page
      .locator('input[placeholder*="earch"], input[placeholder*="Ara"]')
      .first();
    await searchInput.fill('admin@aws');

    // Wait for the filtered results with retries to handle debounce timing
    await expect(async () => {
      const cards = page.locator('.vault-entry-card');
      await expect(cards).toHaveCount(1);
      await expect(cards.first()).toContainText('AWS Console');
    }).toPass({ timeout: 10000 });
  });

  test('should show no results for non-matching search', async ({ page }) => {
    const searchInput = page
      .locator('input[placeholder*="earch"], input[placeholder*="Ara"]')
      .first();
    await searchInput.fill('nonexistent_entry_xyz');

    await expect(page.locator('.vault-entry-card')).toHaveCount(0, { timeout: 5000 });
  });

  test('should show all entries when search is cleared', async ({ page }) => {
    const searchInput = page
      .locator('input[placeholder*="earch"], input[placeholder*="Ara"]')
      .first();
    await searchInput.fill('aws');
    await expect(page.locator('.vault-entry-card')).toHaveCount(1, { timeout: 5000 });

    await searchInput.fill('');
    await expect(page.locator('.vault-entry-card')).toHaveCount(3, { timeout: 7000 });
  });

  test('should search by title when title scope selected', async ({ page }) => {
    const titleScopeBtn = page
      .locator(
        '.toolbar-chip-group button:has-text("Title"), .toolbar-chip-group button:has-text("Başlık"), .toolbar-chip-group button:has-text("Baslik")'
      )
      .first();
    await expect(titleScopeBtn).toBeVisible();
    await titleScopeBtn.click({ force: true });

    const searchInput = page
      .locator('input[placeholder*="earch"], input[placeholder*="Ara"]')
      .first();
    await searchInput.fill('github');

    const cards = page.locator('.vault-entry-card');
    await expect(cards).toHaveCount(1, { timeout: 5000 });
    await expect(cards.first()).toContainText('GitHub');
  });

  test('should search by username when user scope selected', async ({ page }) => {
    const userScopeBtn = page
      .locator(
        '.toolbar-chip-group button:has-text("User"), .toolbar-chip-group button:has-text("Kullanıcı"), .toolbar-chip-group button:has-text("Kullanici")'
      )
      .first();
    await expect(userScopeBtn).toBeVisible({ timeout: 5000 });
    await userScopeBtn.click({ force: true });

    const searchInput = page
      .locator('input[placeholder*="earch"], input[placeholder*="Ara"]')
      .first();
    await searchInput.fill('admin@aws');

    const cards = page.locator('.vault-entry-card');
    await expect(cards).toHaveCount(1, { timeout: 10000 });
    await expect(cards.first()).toContainText('AWS Console');
  });

  test('should filter by category using sidebar', async ({ page }) => {
    const allItems = page.locator('.vault-entry-card');
    const initialCount = await allItems.count();

    const generalCat = page
      .locator('.category-item:has-text("General"), .category-item:has-text("Genel")')
      .first();
    await generalCat.click({ force: true });

    const filteredItems = page.locator('.vault-entry-card');
    await expect(filteredItems).toHaveCount(initialCount, { timeout: 5000 });
  });

  test('should show trash category as empty initially', async ({ page }) => {
    const trashItem = page
      .locator('.category-item:has-text("Trash"), .category-item:has-text("Çöp")')
      .first();
    await trashItem.click({ force: true });

    const emptyState = page.locator('text=/no.*trash|Çöp.*yok|empty/i').first();
    await expect(emptyState).toBeVisible({ timeout: 5000 });

    const cards = page.locator('.vault-entry-card');
    await expect(cards).toHaveCount(0, { timeout: 5000 });
  });

  test('should show all entries when All category clicked', async ({ page }) => {
    const trashItem = page
      .locator('.category-item:has-text("Trash"), .category-item:has-text("Çöp")')
      .first();
    await trashItem.click({ force: true });
    await expect(page.locator('.vault-entry-card')).toHaveCount(0, { timeout: 5000 });

    const allBtn = page
      .locator('.category-item:has-text("All"), .category-item:has-text("Tümü")')
      .first();
    await allBtn.click({ force: true });

    const cards = page.locator('.vault-entry-card');
    await expect(cards).not.toHaveCount(0, { timeout: 5000 });
  });

  test('should sort entries by name A-Z', async ({ page }) => {
    const sortSelect = page
      .locator('select[aria-label*="Sort"], select[aria-label*="Sıra"]')
      .first();
    await sortSelect.selectOption('title_asc');

    await expect(async () => {
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

      expect(titles.length).toBeGreaterThanOrEqual(2);
      const sorted = [...titles].sort((a, b) => a.localeCompare(b));
      expect(titles).toEqual(sorted);
    }).toPass({ timeout: 5000 });
  });

  test('should sort entries by name Z-A', async ({ page }) => {
    const sortSelect = page
      .locator('select[aria-label*="Sort"], select[aria-label*="Sıra"]')
      .first();
    await sortSelect.selectOption('title_desc');

    await expect(async () => {
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

      expect(titles.length).toBeGreaterThanOrEqual(2);
      const sorted = [...titles].sort((a, b) => b.localeCompare(a));
      expect(titles).toEqual(sorted);
    }).toPass({ timeout: 5000 });
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

    await expect(async () => {
      const newText = await densityBtn.textContent();
      expect(newText?.trim()).not.toBe(initialText?.trim());
    }).toPass({ timeout: 5000 });
  });

  test('should filter entries by search scope All', async ({ page }) => {
    const allScopeBtn = page
      .locator(
        '.toolbar-chip-group button:has-text("All"), .toolbar-chip-group button:has-text("Tümü")'
      )
      .first();
    await expect(allScopeBtn).toBeVisible({ timeout: 5000 });
    await allScopeBtn.click({ force: true });
    await expect(allScopeBtn).toHaveAttribute('aria-pressed', 'true', { timeout: 5000 });

    const searchInput = page
      .locator('input[placeholder*="earch"], input[placeholder*="Ara"]')
      .first();
    await searchInput.fill('me@gmail.com');

    await expect(async () => {
      const cards = page.locator('.vault-entry-card');
      await expect(cards).toHaveCount(1);
      await expect(cards.first()).toContainText('Personal Email');
    }).toPass({ timeout: 15000, intervals: [500, 1000, 2000] });
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
