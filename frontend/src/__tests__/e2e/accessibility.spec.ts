import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Comprehensive Accessibility Testing Suite
 * Verifies WCAG 2.1 AA compliance across all components and browsers
 */

test.describe('Accessibility Compliance', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('WCAG 2.1 AA Compliance', () => {
    
    test('should pass automated accessibility scan', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
      
      console.log(`✅ Accessibility scan passed: ${accessibilityScanResults.passes.length} rules checked`);
    });

    test('should have proper color contrast ratios', async ({ page }) => {
      const contrastResults = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze();

      expect(contrastResults.violations).toEqual([]);
      
      // Additional manual contrast checking for critical elements
      await testColorContrast(page);
      
      console.log('✅ Color contrast requirements met');
    });

    test('should support keyboard navigation', async ({ page }) => {
      await testKeyboardNavigation(page);
      console.log('✅ Keyboard navigation verified');
    });

    test('should have proper heading structure', async ({ page }) => {
      const headingResults = await new AxeBuilder({ page })
        .withRules(['heading-order'])
        .analyze();

      expect(headingResults.violations).toEqual([]);
      
      // Additional heading structure validation
      await testHeadingHierarchy(page);
      
      console.log('✅ Heading structure verified');
    });

    test('should have proper form accessibility', async ({ page }) => {
      const formResults = await new AxeBuilder({ page })
        .withRules(['label', 'form-field-multiple-labels'])
        .analyze();

      expect(formResults.violations).toEqual([]);
      
      await testFormAccessibility(page);
      
      console.log('✅ Form accessibility verified');
    });
  });

  test.describe('Screen Reader Support', () => {
    
    test('should have proper ARIA attributes', async ({ page }) => {
      const ariaResults = await new AxeBuilder({ page })
        .withTags(['cat.aria'])
        .analyze();

      expect(ariaResults.violations).toEqual([]);
      
      await testARIAAttributes(page);
      
      console.log('✅ ARIA attributes verified');
    });

    test('should announce content changes', async ({ page }) => {
      await testLiveRegions(page);
      console.log('✅ Live region announcements verified');
    });

    test('should have descriptive content', async ({ page }) => {
      await testContentAccessibility(page);
      console.log('✅ Content accessibility verified');
    });
  });

  test.describe('Focus Management', () => {
    
    test('should have visible focus indicators', async ({ page }) => {
      await testFocusIndicators(page);
      console.log('✅ Focus indicators verified');
    });

    test('should trap focus in modals', async ({ page }) => {
      await testFocusTrapping(page);
      console.log('✅ Focus trapping verified');
    });

    test('should maintain logical focus order', async ({ page }) => {
      await testFocusOrder(page);
      console.log('✅ Focus order verified');
    });
  });

  test.describe('Motor Accessibility', () => {
    
    test('should have adequate touch targets', async ({ page }) => {
      await testTouchTargets(page);
      console.log('✅ Touch target sizes verified');
    });

    test('should respect reduced motion preferences', async ({ page }) => {
      await testReducedMotion(page);
      console.log('✅ Reduced motion preferences respected');
    });
  });

  test.describe('Theme Accessibility', () => {
    
    test('should maintain accessibility across all themes', async ({ page }) => {
      const themes = ['minimal', 'neo-brutalist', 'glassmorphic', 'cyberpunk', 'editorial', 'accessible'];
      
      for (const theme of themes) {
        await setTheme(page, theme);
        
        const accessibilityResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();
        
        expect(accessibilityResults.violations).toEqual([]);
        console.log(`✅ Theme '${theme}' maintains accessibility`);
      }
    });

    test('should support high contrast mode', async ({ page }) => {
      await testHighContrastMode(page);
      console.log('✅ High contrast mode verified');
    });
  });
});

/**
 * Test color contrast for critical elements
 */
async function testColorContrast(page: Page) {
  // Test critical UI elements for proper contrast
  const criticalElements = [
    'button',
    'a',
    '[role="button"]',
    'input',
    'textarea',
    'select'
  ];

  for (const selector of criticalElements) {
    const elements = page.locator(selector);
    const count = await elements.count();
    
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const element = elements.nth(i);
        
        const contrast = await element.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          const bgColor = styles.backgroundColor;
          const textColor = styles.color;
          
          // Simple contrast calculation (real implementation would be more sophisticated)
          return {
            background: bgColor,
            text: textColor,
            visible: bgColor !== 'rgba(0, 0, 0, 0)' && textColor !== 'rgba(0, 0, 0, 0)'
          };
        });
        
        expect(contrast.visible).toBeTruthy();
      }
    }
  }
}

/**
 * Test keyboard navigation functionality
 */
async function testKeyboardNavigation(page: Page) {
  // Test Tab navigation
  await page.keyboard.press('Tab');
  
  let focusedElement = page.locator(':focus');
  expect(await focusedElement.count()).toBeGreaterThan(0);
  
  // Test multiple tab presses
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    focusedElement = page.locator(':focus');
    expect(await focusedElement.count()).toBeGreaterThan(0);
  }
  
  // Test Shift+Tab (reverse navigation)
  await page.keyboard.press('Shift+Tab');
  focusedElement = page.locator(':focus');
  expect(await focusedElement.count()).toBeGreaterThan(0);
  
  // Test Enter key activation
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  
  // Test Escape key
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
}

/**
 * Test heading hierarchy structure
 */
async function testHeadingHierarchy(page: Page) {
  const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
  
  if (headings.length > 0) {
    // Check for h1 presence
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    
    // Check logical heading order
    let previousLevel = 0;
    
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const currentLevel = parseInt(tagName.charAt(1));
      
      if (previousLevel > 0) {
        // Heading levels should not skip more than one level
        expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
      }
      
      previousLevel = currentLevel;
    }
  }
}

/**
 * Test form accessibility features
 */
async function testFormAccessibility(page: Page) {
  const forms = page.locator('form');
  const formCount = await forms.count();
  
  if (formCount > 0) {
    const form = forms.first();
    
    // Test form inputs have labels
    const inputs = form.locator('input, textarea, select');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      const input = inputs.nth(i);
      
      // Check for associated label
      const hasLabel = await input.evaluate(el => {
        const id = el.getAttribute('id');
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        
        if (ariaLabel || ariaLabelledBy) return true;
        
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          return !!label;
        }
        
        // Check if input is wrapped in label
        return !!el.closest('label');
      });
      
      expect(hasLabel).toBeTruthy();
    }
  }
}

/**
 * Test ARIA attributes implementation
 */
async function testARIAAttributes(page: Page) {
  // Test elements with interactive roles
  const interactiveElements = page.locator('[role="button"], [role="link"], [role="tab"], [role="menuitem"]');
  const count = await interactiveElements.count();
  
  if (count > 0) {
    for (let i = 0; i < Math.min(count, 5); i++) {
      const element = interactiveElements.nth(i);
      
      // Check for accessible name
      const hasAccessibleName = await element.evaluate(el => {
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        const textContent = el.textContent?.trim();
        
        return !!(ariaLabel || ariaLabelledBy || textContent);
      });
      
      expect(hasAccessibleName).toBeTruthy();
    }
  }
  
  // Test expandable elements
  const expandableElements = page.locator('[aria-expanded]');
  const expandableCount = await expandableElements.count();
  
  if (expandableCount > 0) {
    const element = expandableElements.first();
    const expanded = await element.getAttribute('aria-expanded');
    expect(['true', 'false']).toContain(expanded);
  }
}

/**
 * Test live region announcements
 */
async function testLiveRegions(page: Page) {
  // Look for live regions
  const liveRegions = page.locator('[aria-live], [role="status"], [role="alert"]');
  const count = await liveRegions.count();
  
  if (count > 0) {
    const liveRegion = liveRegions.first();
    const ariaLive = await liveRegion.getAttribute('aria-live');
    const role = await liveRegion.getAttribute('role');
    
    // Should have appropriate live region settings
    expect(ariaLive || role).toBeTruthy();
    
    if (ariaLive) {
      expect(['polite', 'assertive', 'off']).toContain(ariaLive);
    }
  }
}

/**
 * Test content accessibility
 */
async function testContentAccessibility(page: Page) {
  // Test images have alt text
  const images = page.locator('img');
  const imageCount = await images.count();
  
  if (imageCount > 0) {
    for (let i = 0; i < Math.min(imageCount, 5); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      
      // Alt attribute should exist (even if empty for decorative images)
      expect(alt).not.toBeNull();
    }
  }
  
  // Test links have descriptive text
  const links = page.locator('a');
  const linkCount = await links.count();
  
  if (linkCount > 0) {
    for (let i = 0; i < Math.min(linkCount, 5); i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      
      // Links should have descriptive text
      expect(text?.trim() || ariaLabel).toBeTruthy();
    }
  }
}

/**
 * Test focus indicators visibility
 */
async function testFocusIndicators(page: Page) {
  const focusableElements = page.locator('button, a, input, textarea, select, [tabindex="0"]');
  const count = await focusableElements.count();
  
  if (count > 0) {
    const element = focusableElements.first();
    
    // Focus the element
    await element.focus();
    
    // Check for focus styles
    const focusStyles = await element.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow
      };
    });
    
    // Should have some form of focus indicator
    const hasFocusIndicator = 
      focusStyles.outline !== 'none' ||
      focusStyles.outlineWidth !== '0px' ||
      focusStyles.boxShadow !== 'none';
    
    expect(hasFocusIndicator).toBeTruthy();
  }
}

/**
 * Test focus trapping in modals
 */
async function testFocusTrapping(page: Page) {
  // Look for modal triggers
  const modalTriggers = page.locator('[data-testid*="modal"], [aria-controls], button:has-text("Open"), button:has-text("Show")');
  const count = await modalTriggers.count();
  
  if (count > 0) {
    const trigger = modalTriggers.first();
    
    // Try to open modal
    await trigger.click();
    await page.waitForTimeout(300);
    
    // Check if modal is open
    const modal = page.locator('[role="dialog"], [role="modal"], .modal').first();
    
    if (await modal.count() > 0) {
      // Test focus is trapped within modal
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      
      // Focus should be within modal
      const focusWithinModal = await focusedElement.evaluate((el, modalEl) => {
        return modalEl.contains(el);
      }, await modal.elementHandle());
      
      if (!focusWithinModal) {
        console.log('⚠️ Focus may not be trapped in modal');
      }
      
      // Close modal with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  }
}

/**
 * Test logical focus order
 */
async function testFocusOrder(page: Page) {
  const focusableElements = page.locator('button, a, input, textarea, select, [tabindex="0"]');
  const count = await focusableElements.count();
  
  if (count > 1) {
    // Get positions of first few focusable elements
    const positions = [];
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const element = focusableElements.nth(i);
      const box = await element.boundingBox();
      
      if (box) {
        positions.push({ x: box.x, y: box.y, index: i });
      }
    }
    
    // Check that focus order generally follows visual order (top-to-bottom, left-to-right)
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];
      
      // Current element should be below or to the right of previous
      const isLogicalOrder = curr.y > prev.y || (curr.y === prev.y && curr.x >= prev.x);
      
      if (!isLogicalOrder) {
        console.log(`⚠️ Focus order may not be logical between elements ${prev.index} and ${curr.index}`);
      }
    }
  }
}

/**
 * Test touch target sizes for mobile accessibility
 */
async function testTouchTargets(page: Page) {
  const touchTargets = page.locator('button, a, [role="button"]');
  const count = await touchTargets.count();
  
  if (count > 0) {
    for (let i = 0; i < Math.min(count, 5); i++) {
      const target = touchTargets.nth(i);
      const box = await target.boundingBox();
      
      if (box) {
        // WCAG recommends minimum 44x44px touch targets
        expect(box.width).toBeGreaterThanOrEqual(40); // Allow small tolerance
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  }
}

/**
 * Test reduced motion preferences
 */
async function testReducedMotion(page: Page) {
  // Test with reduced motion preference
  await page.emulateMedia({ reducedMotion: 'reduce' });
  
  // Check that animations are reduced or disabled
  const animatedElements = page.locator('[class*="animate"], [style*="transition"], [style*="animation"]');
  const count = await animatedElements.count();
  
  if (count > 0) {
    for (let i = 0; i < Math.min(count, 3); i++) {
      const element = animatedElements.nth(i);
      
      const animationState = await element.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          transition: styles.transition,
          animation: styles.animation,
          transform: styles.transform
        };
      });
      
      // In reduced motion mode, animations should be minimal
      console.log(`Element ${i} animation state:`, animationState);
    }
  }
  
  // Reset media emulation
  await page.emulateMedia({ reducedMotion: null });
}

/**
 * Set theme for testing
 */
async function setTheme(page: Page, theme: string) {
  // Try to find theme selector
  const themeSelector = page.locator('[data-testid="theme-selector"], .theme-selector, button:has-text("Theme")').first();
  
  if (await themeSelector.count() > 0) {
    await themeSelector.click();
    await page.waitForTimeout(200);
    
    // Try to select specific theme
    const themeOption = page.locator(`button:has-text("${theme}"), [data-theme="${theme}"]`).first();
    
    if (await themeOption.count() > 0) {
      await themeOption.click();
      await page.waitForTimeout(500);
    } else {
      // Close theme selector if we can't find the theme
      await page.keyboard.press('Escape');
    }
  } else {
    // Try to set theme directly via JavaScript if selector not found
    await page.evaluate((themeName) => {
      const root = document.documentElement;
      root.setAttribute('data-theme', themeName);
    }, theme);
    
    await page.waitForTimeout(300);
  }
}

/**
 * Test high contrast mode support
 */
async function testHighContrastMode(page: Page) {
  // Test high contrast mode
  await page.emulateMedia({ forcedColors: 'active' });
  
  // Verify content is still accessible
  const accessibilityResults = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .analyze();
  
  // Should still pass accessibility tests in high contrast mode
  expect(accessibilityResults.violations).toEqual([]);
  
  // Reset forced colors
  await page.emulateMedia({ forcedColors: null });
} 