import { test, expect, type Page } from '@playwright/test';

test.describe('Device Testing', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should work correctly on mobile devices', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices');
    
    const userAgent = await page.evaluate(() => navigator.userAgent);
    console.log(`Testing on mobile device: ${userAgent}`);
    
    // Test touch interactions
    const touchableElements = page.locator('button, [role="button"], a, [tabindex="0"]');
    const count = await touchableElements.count();
    
    if (count > 0) {
      const element = touchableElements.first();
      await element.tap();
      await page.waitForTimeout(100);
      
      const boundingBox = await element.boundingBox();
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
      }
    }
    
    console.log('✅ Mobile device testing completed');
  });

  test('should handle responsive design', async ({ page }) => {
    const viewports = [
      { width: 360, height: 640, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);
      
      const bodyRect = await page.locator('body').boundingBox();
      expect(bodyRect?.width).toBeGreaterThan(0);
      expect(bodyRect?.height).toBeGreaterThan(0);
      
      console.log(`✅ Responsive design check passed for ${viewport.name}`);
    }
  });
}); 