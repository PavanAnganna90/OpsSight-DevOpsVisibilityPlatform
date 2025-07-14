import { test, expect, type Page } from '@playwright/test';

/**
 * Cross-browser compatibility tests
 * Tests core functionality across Chrome, Firefox, Safari, and Edge
 */

test.describe('Cross-Browser Compatibility', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page before each test
    await page.goto('/');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
  });

  test('should load the homepage across all browsers', async ({ page, browserName }) => {
    console.log(`Testing on browser: ${browserName}`);
    
    // Check that the page loads successfully
    await expect(page).toHaveTitle(/OpsSight/);
    
    // Verify main navigation elements are present
    const mainContent = page.locator('main, [role="main"], #main-content').first();
    await expect(mainContent).toBeVisible();
    
    // Check for basic responsiveness
    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();
    
    console.log(`✅ Homepage loaded successfully on ${browserName} (${viewport?.width}x${viewport?.height})`);
  });

  test('should render UI components correctly', async ({ page, browserName }) => {
    console.log(`Testing UI components on browser: ${browserName}`);
    
    // Test Button components
    await testButtonComponents(page);
    
    // Test form elements
    await testFormElements(page);
    
    // Test navigation elements
    await testNavigationElements(page);
    
    console.log(`✅ UI components rendered correctly on ${browserName}`);
  });

  test('should handle CSS and styling properly', async ({ page, browserName }) => {
    console.log(`Testing CSS compatibility on browser: ${browserName}`);
    
    // Check that CSS is loaded
    const bodyStyles = await page.locator('body').evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        fontFamily: styles.fontFamily,
        margin: styles.margin,
        backgroundColor: styles.backgroundColor
      };
    });
    
    // Verify that styles are applied (not default browser styles)
    expect(bodyStyles.fontFamily).not.toBe('Times'); // Should not be default Times font
    expect(bodyStyles.margin).toBe('0px'); // Should have CSS reset
    
    // Test CSS Grid/Flexbox support
    const flexContainer = page.locator('[class*="flex"], [style*="display: flex"]').first();
    if (await flexContainer.count() > 0) {
      const flexStyles = await flexContainer.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.display;
      });
      expect(flexStyles).toBe('flex');
    }
    
    console.log(`✅ CSS styling working correctly on ${browserName}`);
  });

  test('should handle JavaScript functionality', async ({ page, browserName }) => {
    console.log(`Testing JavaScript functionality on browser: ${browserName}`);
    
    // Test basic JavaScript execution
    const jsResult = await page.evaluate(() => {
      return {
        hasReact: typeof window.React !== 'undefined' || typeof window.ReactDOM !== 'undefined',
        hasNext: typeof window.__NEXT_DATA__ !== 'undefined',
        userAgent: navigator.userAgent,
        screenSize: { width: screen.width, height: screen.height }
      };
    });
    
    console.log(`Browser info for ${browserName}:`, jsResult);
    
    // Test interactive elements
    await testInteractiveElements(page);
    
    console.log(`✅ JavaScript functionality working on ${browserName}`);
  });

  test('should handle form interactions', async ({ page, browserName }) => {
    console.log(`Testing form interactions on browser: ${browserName}`);
    
    // Look for any forms on the page
    const forms = page.locator('form, [role="form"]');
    const formCount = await forms.count();
    
    if (formCount > 0) {
      const firstForm = forms.first();
      
      // Test form input
      const inputs = firstForm.locator('input, textarea, select');
      const inputCount = await inputs.count();
      
      if (inputCount > 0) {
        const firstInput = inputs.first();
        const inputType = await firstInput.getAttribute('type') || 'text';
        
        // Test input functionality based on type
        if (inputType === 'text' || inputType === 'email' || !inputType) {
          await firstInput.fill('test@example.com');
          const value = await firstInput.inputValue();
          expect(value).toBe('test@example.com');
        }
        
        console.log(`✅ Form interaction tested on ${browserName} (${inputCount} inputs found)`);
      }
    } else {
      console.log(`ℹ️ No forms found on ${browserName} - skipping form tests`);
    }
  });

  test('should handle responsive design', async ({ page, browserName }) => {
    console.log(`Testing responsive design on browser: ${browserName}`);
    
    const viewports = [
      { width: 360, height: 640, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1024, height: 768, name: 'Tablet Landscape' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500); // Allow reflow
      
      // Check that content is still visible and accessible
      const bodyRect = await page.locator('body').boundingBox();
      expect(bodyRect?.width).toBeGreaterThan(0);
      expect(bodyRect?.height).toBeGreaterThan(0);
      
      // Check for horizontal scroll issues
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });
      
      if (hasHorizontalScroll) {
        console.log(`⚠️ Horizontal scroll detected on ${browserName} at ${viewport.name} (${viewport.width}x${viewport.height})`);
      }
      
      console.log(`✅ Responsive design check passed for ${viewport.name} on ${browserName}`);
    }
  });
});

/**
 * Test Button components across browsers
 */
async function testButtonComponents(page: Page) {
  const buttons = page.locator('button, [role="button"], input[type="button"], input[type="submit"]');
  const buttonCount = await buttons.count();
  
  if (buttonCount > 0) {
    const firstButton = buttons.first();
    
    // Test button visibility and accessibility
    await expect(firstButton).toBeVisible();
    
    // Test button interaction
    const isEnabled = await firstButton.isEnabled();
    if (isEnabled) {
      // Check if button has proper cursor
      const cursor = await firstButton.evaluate((el) => {
        return window.getComputedStyle(el).cursor;
      });
      expect(cursor).toBe('pointer');
      
      // Test hover state (if supported)
      await firstButton.hover();
      await page.waitForTimeout(100);
    }
    
    console.log(`✅ Button components tested (${buttonCount} buttons found)`);
  }
}

/**
 * Test Form elements across browsers
 */
async function testFormElements(page: Page) {
  const formElements = page.locator('input, textarea, select, [role="textbox"], [role="combobox"]');
  const elementCount = await formElements.count();
  
  if (elementCount > 0) {
    for (let i = 0; i < Math.min(elementCount, 3); i++) {
      const element = formElements.nth(i);
      await expect(element).toBeVisible();
      
      // Test focus
      await element.focus();
      
      // Check focus styles
      const focusStyles = await element.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          boxShadow: styles.boxShadow
        };
      });
      
      // Should have some form of focus indication
      const hasFocusStyle = focusStyles.outline !== 'none' || 
                           focusStyles.outlineWidth !== '0px' || 
                           focusStyles.boxShadow !== 'none';
      
      expect(hasFocusStyle).toBeTruthy();
    }
    
    console.log(`✅ Form elements tested (${elementCount} elements found)`);
  }
}

/**
 * Test Navigation elements across browsers
 */
async function testNavigationElements(page: Page) {
  const navElements = page.locator('nav, [role="navigation"], .nav, .navigation');
  const navCount = await navElements.count();
  
  if (navCount > 0) {
    const nav = navElements.first();
    await expect(nav).toBeVisible();
    
    // Test navigation links
    const links = nav.locator('a, [role="link"]');
    const linkCount = await links.count();
    
    if (linkCount > 0) {
      const firstLink = links.first();
      await expect(firstLink).toBeVisible();
      
      // Test link accessibility
      const hasHref = await firstLink.getAttribute('href');
      const hasRole = await firstLink.getAttribute('role');
      const hasAriaLabel = await firstLink.getAttribute('aria-label');
      const hasText = await firstLink.textContent();
      
      // Should have proper link attributes
      expect(hasHref || hasRole === 'link').toBeTruthy();
      expect(hasAriaLabel || hasText).toBeTruthy();
    }
    
    console.log(`✅ Navigation elements tested (${linkCount} links found)`);
  }
}

/**
 * Test Interactive elements across browsers
 */
async function testInteractiveElements(page: Page) {
  // Test click events
  const clickableElements = page.locator('button, [role="button"], a, [role="link"], [tabindex="0"]');
  const clickableCount = await clickableElements.count();
  
  if (clickableCount > 0) {
    const element = clickableElements.first();
    
    // Test keyboard navigation
    await element.focus();
    await expect(element).toBeFocused();
    
    // Test Tab navigation
    await page.keyboard.press('Tab');
    
    console.log(`✅ Interactive elements tested (${clickableCount} elements found)`);
  }
} 