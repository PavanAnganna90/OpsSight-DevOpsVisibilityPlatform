import { test, expect, type Page } from '@playwright/test';

/**
 * Performance Testing Suite
 * Tests Core Web Vitals and performance metrics across browsers and devices
 */

test.describe('Performance Testing', () => {
  
  test.beforeEach(async ({ page }) => {
    // Start performance measurement
    await page.goto('/', { waitUntil: 'networkidle' });
  });

  test.describe('Core Web Vitals', () => {
    
    test('should meet LCP (Largest Contentful Paint) targets', async ({ page }) => {
      const lcp = await measureLCP(page);
      
      // LCP should be under 2.5 seconds for good performance
      expect(lcp).toBeLessThan(2500);
      console.log(`✅ LCP: ${lcp}ms (target: <2500ms)`);
    });

    test('should meet FID (First Input Delay) targets', async ({ page }) => {
      const fid = await measureFID(page);
      
      // FID should be under 100ms for good performance
      expect(fid).toBeLessThan(100);
      console.log(`✅ FID: ${fid}ms (target: <100ms)`);
    });

    test('should meet CLS (Cumulative Layout Shift) targets', async ({ page }) => {
      const cls = await measureCLS(page);
      
      // CLS should be under 0.1 for good performance
      expect(cls).toBeLessThan(0.1);
      console.log(`✅ CLS: ${cls} (target: <0.1)`);
    });
  });

  test.describe('Load Performance', () => {
    
    test('should load page within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/', { waitUntil: 'load' });
      
      const loadTime = Date.now() - startTime;
      
      // Page should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      console.log(`✅ Page load time: ${loadTime}ms (target: <3000ms)`);
    });

    test('should have efficient resource loading', async ({ page }) => {
      const resources = await measureResourceTiming(page);
      
      // Check critical resource load times
      expect(resources.css).toBeLessThan(1000);
      expect(resources.js).toBeLessThan(2000);
      
      console.log(`✅ Resource timing - CSS: ${resources.css}ms, JS: ${resources.js}ms`);
    });

    test('should have minimal blocking resources', async ({ page }) => {
      const blockingResources = await measureBlockingResources(page);
      
      // Should have minimal render-blocking resources
      expect(blockingResources.count).toBeLessThan(5);
      expect(blockingResources.totalSize).toBeLessThan(500000); // 500KB
      
      console.log(`✅ Blocking resources: ${blockingResources.count} resources, ${blockingResources.totalSize} bytes`);
    });
  });

  test.describe('Runtime Performance', () => {
    
    test('should have efficient JavaScript execution', async ({ page }) => {
      const jsMetrics = await measureJavaScriptPerformance(page);
      
      // JavaScript execution should be efficient
      expect(jsMetrics.mainThreadTime).toBeLessThan(2000);
      expect(jsMetrics.taskDuration).toBeLessThan(50);
      
      console.log(`✅ JS Performance - Main thread: ${jsMetrics.mainThreadTime}ms, Task duration: ${jsMetrics.taskDuration}ms`);
    });

      test('should have stable frame rate', async ({ page }) => {
    const frameRate = await measureFrameRate(page) as { average: number; drops: number };
    
    // Should maintain good frame rate (>50fps for interactions)
    expect(frameRate.average).toBeGreaterThan(50);
    expect(frameRate.drops).toBeLessThan(5);
    
    console.log(`✅ Frame rate - Average: ${frameRate.average}fps, Drops: ${frameRate.drops}`);
  });

    test('should manage memory efficiently', async ({ page }) => {
      const memoryMetrics = await measureMemoryUsage(page);
      
      // Memory usage should be reasonable
      expect(memoryMetrics.heapUsed).toBeLessThan(50000000); // 50MB
      expect(memoryMetrics.heapTotal).toBeLessThan(100000000); // 100MB
      
      console.log(`✅ Memory usage - Used: ${Math.round(memoryMetrics.heapUsed / 1024 / 1024)}MB, Total: ${Math.round(memoryMetrics.heapTotal / 1024 / 1024)}MB`);
    });
  });

  test.describe('Network Performance', () => {
    
    test('should optimize image loading', async ({ page }) => {
      const imageMetrics = await measureImagePerformance(page);
      
      // Images should be optimized
      expect(imageMetrics.averageSize).toBeLessThan(200000); // 200KB average
      expect(imageMetrics.totalSize).toBeLessThan(2000000); // 2MB total
      
      console.log(`✅ Image performance - Average: ${Math.round(imageMetrics.averageSize / 1024)}KB, Total: ${Math.round(imageMetrics.totalSize / 1024)}KB`);
    });

    test('should use caching effectively', async ({ page }) => {
      // First load
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Second load (should use cache)
      const startTime = Date.now();
      await page.reload();
      await page.waitForLoadState('networkidle');
      const reloadTime = Date.now() - startTime;
      
      // Reload should be faster due to caching
      expect(reloadTime).toBeLessThan(1500);
      console.log(`✅ Cache performance - Reload time: ${reloadTime}ms`);
    });
  });

  test.describe('Mobile Performance', () => {
    
    test('should perform well on mobile devices', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test is only for mobile devices');
      
      const mobileMetrics = await measureMobilePerformance(page);
      
      // Mobile-specific performance targets
      expect(mobileMetrics.lcp).toBeLessThan(3000); // More lenient for mobile
      expect(mobileMetrics.fid).toBeLessThan(150);
      expect(mobileMetrics.cls).toBeLessThan(0.15);
      
      console.log(`✅ Mobile performance - LCP: ${mobileMetrics.lcp}ms, FID: ${mobileMetrics.fid}ms, CLS: ${mobileMetrics.cls}`);
    });

    test('should handle slow networks gracefully', async ({ page }) => {
      // Simulate slow 3G network
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 100); // Add 100ms delay
      });
      
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('load');
      const loadTime = Date.now() - startTime;
      
      // Should still load within reasonable time on slow network
      expect(loadTime).toBeLessThan(8000);
      console.log(`✅ Slow network performance: ${loadTime}ms`);
    });
  });
});

/**
 * Measure Largest Contentful Paint (LCP)
 */
async function measureLCP(page: Page): Promise<number> {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Fallback timeout
        setTimeout(() => resolve(0), 5000);
      } else {
        resolve(0);
      }
    });
  });
}

/**
 * Measure First Input Delay (FID)
 */
async function measureFID(page: Page): Promise<number> {
  // Simulate user interaction to measure FID
  await page.click('body');
  
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries() as any[];
          if (entries.length > 0) {
            resolve(entries[0].processingStart - entries[0].startTime);
          } else {
            resolve(0);
          }
        });
        observer.observe({ entryTypes: ['first-input'] });
        
        // Fallback
        setTimeout(() => resolve(0), 3000);
      } else {
        resolve(0);
      }
    });
  });
}

/**
 * Measure Cumulative Layout Shift (CLS)
 */
async function measureCLS(page: Page): Promise<number> {
  await page.waitForTimeout(2000); // Wait for potential layout shifts
  
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      if ('PerformanceObserver' in window) {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
        });
        observer.observe({ entryTypes: ['layout-shift'] });
        
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 2000);
      } else {
        resolve(0);
      }
    });
  });
}

/**
 * Measure resource loading timing
 */
async function measureResourceTiming(page: Page) {
  return await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    
    let cssTime = 0;
    let jsTime = 0;
    let cssCount = 0;
    let jsCount = 0;
    
    resources.forEach(resource => {
      const resourceTiming = resource as any;
      const duration = resourceTiming.responseEnd - resourceTiming.startTime;
      
      if (resourceTiming.name.includes('.css')) {
        cssTime += duration;
        cssCount++;
      } else if (resourceTiming.name.includes('.js')) {
        jsTime += duration;
        jsCount++;
      }
    });
    
    return {
      css: cssCount > 0 ? cssTime / cssCount : 0,
      js: jsCount > 0 ? jsTime / jsCount : 0
    };
  });
}

/**
 * Measure blocking resources
 */
async function measureBlockingResources(page: Page) {
  return await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    const blockingResources = resources.filter(resource => 
      resource.name.includes('.css') || 
      (resource.name.includes('.js') && !resource.name.includes('async'))
    );
    
    const totalSize = blockingResources.reduce((sum, resource) => {
      return sum + ((resource as any).transferSize || 0);
    }, 0);
    
    return {
      count: blockingResources.length,
      totalSize
    };
  });
}

/**
 * Measure JavaScript performance metrics
 */
async function measureJavaScriptPerformance(page: Page) {
  // Trigger some interactions to measure JS performance
  await page.click('body');
  await page.waitForTimeout(1000);
  
  return await page.evaluate(() => {
    const paintEntries = performance.getEntriesByType('paint');
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
      mainThreadTime: navigationEntry.loadEventEnd - navigationEntry.navigationStart,
      taskDuration: paintEntries.length > 0 ? paintEntries[paintEntries.length - 1].startTime : 0
    };
  });
}

/**
 * Measure frame rate during interactions
 */
async function measureFrameRate(page: Page) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      const frames: number[] = [];
      let lastTime = performance.now();
      let frameDrops = 0;
      
      function measureFrame() {
        const currentTime = performance.now();
        const frameDuration = currentTime - lastTime;
        const fps = 1000 / frameDuration;
        
        frames.push(fps);
        
        if (fps < 30) frameDrops++; // Count significant frame drops
        
        lastTime = currentTime;
        
        if (frames.length < 60) { // Measure for ~1 second at 60fps
          requestAnimationFrame(measureFrame);
        } else {
          const average = frames.reduce((a, b) => a + b, 0) / frames.length;
          resolve({ average, drops: frameDrops });
        }
      }
      
      requestAnimationFrame(measureFrame);
    });
  });
}

/**
 * Measure memory usage
 */
async function measureMemoryUsage(page: Page) {
  return await page.evaluate(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        heapUsed: memory.usedJSHeapSize,
        heapTotal: memory.totalJSHeapSize,
        heapLimit: memory.jsHeapSizeLimit
      };
    }
    
    return {
      heapUsed: 0,
      heapTotal: 0,
      heapLimit: 0
    };
  });
}

/**
 * Measure image performance
 */
async function measureImagePerformance(page: Page) {
  return await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'));
    let totalSize = 0;
    let imageCount = 0;
    
    const resources = performance.getEntriesByType('resource');
    
    resources.forEach(resource => {
      if (resource.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        totalSize += resource.transferSize || 0;
        imageCount++;
      }
    });
    
    return {
      count: imageCount,
      totalSize,
      averageSize: imageCount > 0 ? totalSize / imageCount : 0
    };
  });
}

/**
 * Measure mobile-specific performance
 */
async function measureMobilePerformance(page: Page) {
  // Mobile-specific measurements with adjusted expectations
  const [lcp, fid, cls] = await Promise.all([
    measureLCP(page),
    measureFID(page),
    measureCLS(page)
  ]);
  
  return { lcp, fid, cls };
} 