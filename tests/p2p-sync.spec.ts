import { test, expect } from '@playwright/test';

test.describe('P2P QR Sync Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the local dev server
    await page.goto('http://localhost:5173');
    // Login
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("Enter Vault")');
    // Ensure dashboard loads
    await expect(page.locator('text=Aegis Premium Vault')).toBeVisible();
  });

  test('Should open QRExporter from Data Management settings', async ({ page }) => {
    // Open Settings Modal
    await page.click('button[title="Ayarlar"]'); // The settings gear icon
    
    // Check if Data Management section is visible
    await expect(page.locator('text=Veri Taşınabilirliği (Data Management)')).toBeVisible();
    
    // Click on QR Export button
    await page.click('button:has-text("QR Oluştur (Export)")');
    
    // Verify QRExporter renders
    await expect(page.locator('text=P2P Sync Export')).toBeVisible();
    await expect(page.locator('text=Cancel Export').or(page.locator('text=Devam Et İptal'))).toBeVisible();
    
    // Check for animated frames text
    await expect(page.locator('text=/\\d+\\/\\d+/')).toBeVisible(); 
  });

  test('Should open QRScanner from Data Management settings and handle missing camera gracefully', async ({ page }) => {
    // Note: Playwright does not have a real camera attached by default, so it may show the error state or hang on permission.
    // We will grant fake device permissions to ensure it tries.
    
    // Open Settings Modal
    await page.click('button[title="Ayarlar"]'); 
    
    // Click on QR Import button
    await page.click('button:has-text("Kamerayla Tara (Import)")');
    
    // Verify QRScanner renders
    await expect(page.locator('text=P2P Sync Receiver')).toBeVisible();
    
    // Verify cancel button exists
    const cancelBtn = page.locator('button', { hasText: 'İptal Et' });
    await expect(cancelBtn).toBeVisible();
    
    // Click cancel to return to settings
    await cancelBtn.click();
    await expect(page.locator('text=Cihazlar Arası QR Senkronizasyon')).toBeVisible();
  });
});
