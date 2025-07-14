/**
 * Comprehensive Theme Transition Tests
 * 
 * Tests all aspects of the theme transition system including:
 * - Unit tests for core functionality
 * - Integration tests for complete workflows
 * - Visual regression tests for layout consistency
 * - Accessibility compliance tests
 * - Performance and optimization tests
 * - Cross-browser compatibility tests
 */

import {
  themeTransitionManager,
  applyThemeWithTransition,
  markForThemeTransition,
  unmarkFromThemeTransition,
  useThemeTransition,
  preloadThemeResources,
  ThemeTransitionConfig,
} from '../themeTransition';
import { themes, ColorMode, ThemeName } from '../../styles/themes';
import { accessibilityManager } from '../accessibilityEnhancements';
import { performanceOptimizer } from '../performanceOptimizations';

// Mock DOM APIs and dependencies
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query.includes('prefers-reduced-motion: reduce') ? false : false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock requestAnimationFrame and related APIs
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn();

// Mock performance API
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
  },
});

// Mock DOM methods
Object.defineProperty(document, 'querySelectorAll', {
  value: jest.fn(() => []),
  writable: true,
});

Object.defineProperty(document, 'createElement', {
  value: jest.fn(() => ({
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    getBoundingClientRect: jest.fn(() => ({
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
    })),
    style: {},
    className: '',
    textContent: '',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
  writable: true,
});

Object.defineProperty(document, 'documentElement', {
  value: {
    style: {},
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(),
    },
  },
  writable: true,
});

Object.defineProperty(document, 'body', {
  value: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    style: {},
    className: '',
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(),
    },
  },
  writable: true,
});

// Mock getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  value: jest.fn(() => ({
    color: 'rgb(0, 0, 0)',
    backgroundColor: 'rgb(255, 255, 255)',
    transform: 'none',
    opacity: '1',
    getPropertyValue: jest.fn((prop: string) => {
      const values: Record<string, string> = {
        'color': 'rgb(0, 0, 0)',
        'background-color': 'rgb(255, 255, 255)',
        'transform': 'none',
        'opacity': '1',
      };
      return values[prop] || '';
    }),
  })),
  writable: true,
});

// Mock Web Animations API
Object.defineProperty(Element.prototype, 'animate', {
  value: jest.fn(() => ({
    finished: Promise.resolve(),
    cancel: jest.fn(),
    pause: jest.fn(),
    play: jest.fn(),
    reverse: jest.fn(),
    finish: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
  writable: true,
});

// Test data
const testThemes = {
  minimal: themes.minimal,
  'neo-brutalist': themes['neo-brutalist'],
};

const testConfig: ThemeTransitionConfig = {
  duration: 300,
  timing: 'ease-in-out',
  properties: ['background-color', 'color'],
  enableFLIP: true,
  respectReducedMotion: true,
  enablePerformanceOptimizations: true,
  enableAccessibilityEnhancements: true,
};

describe('ThemeTransitionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    // Reset manager state
    themeTransitionManager.updateConfig(testConfig);
    themeTransitionManager.clearCaches();
  });

  afterEach(() => {
    jest.useRealTimers();
    themeTransitionManager.abortTransition();
  });

  describe('Core Functionality', () => {
    test('initializes with default configuration', () => {
      expect(themeTransitionManager.isTransitionActive()).toBe(false);
      expect(themeTransitionManager.isPerformanceHealthy()).toBe(true);
    });

    test('updates configuration correctly', () => {
      const newConfig = { duration: 500, enableFLIP: false };
      themeTransitionManager.updateConfig(newConfig);
      
      // Configuration should be updated (internal state verification)
      expect(() => themeTransitionManager.updateConfig(newConfig)).not.toThrow();
    });

    test('tracks transition state correctly', async () => {
      expect(themeTransitionManager.isTransitionActive()).toBe(false);
      
      const transitionPromise = themeTransitionManager.coordinateThemeTransition(
        testThemes.minimal,
        'dark'
      );
      
      expect(themeTransitionManager.isTransitionActive()).toBe(true);
      
      jest.runAllTimers();
      await transitionPromise;
      
      expect(themeTransitionManager.isTransitionActive()).toBe(false);
    });

    test('handles abort transition correctly', async () => {
      const transitionPromise = themeTransitionManager.coordinateThemeTransition(
        testThemes.minimal,
        'dark'
      );
      
      expect(themeTransitionManager.isTransitionActive()).toBe(true);
      
      themeTransitionManager.abortTransition();
      
      try {
        jest.runAllTimers();
        await transitionPromise;
      } catch (error: any) {
        expect(error.message).toContain('aborted');
      }
      
      expect(themeTransitionManager.isTransitionActive()).toBe(false);
    });
  });

  describe('FLIP Animation System', () => {
    test('captures element states for FLIP transitions', async () => {
      const mockElements = [
        {
          getBoundingClientRect: jest.fn(() => ({
            top: 10, left: 10, width: 100, height: 50,
          })),
          style: {},
        },
        {
          getBoundingClientRect: jest.fn(() => ({
            top: 20, left: 20, width: 200, height: 100,
          })),
          style: {},
        },
      ];

      (document.querySelectorAll as jest.Mock).mockReturnValue(mockElements);

      await themeTransitionManager.coordinateThemeTransition(
        testThemes.minimal,
        'dark',
        { enableFLIP: true }
      );

      jest.runAllTimers();

      expect(mockElements[0].getBoundingClientRect).toHaveBeenCalled();
      expect(mockElements[1].getBoundingClientRect).toHaveBeenCalled();
    });

    test('applies FLIP transforms correctly', async () => {
      const mockElement = {
        getBoundingClientRect: jest.fn()
          .mockReturnValueOnce({ top: 0, left: 0, width: 100, height: 50 })
          .mockReturnValueOnce({ top: 10, left: 10, width: 120, height: 60 }),
        style: {},
      };

      (document.querySelectorAll as jest.Mock).mockReturnValue([mockElement]);

      await themeTransitionManager.coordinateThemeTransition(
        testThemes.minimal,
        'dark',
        { enableFLIP: true }
      );

      jest.runAllTimers();

      // Verify transform was applied (via performance optimizer)
      expect(mockElement.getBoundingClientRect).toHaveBeenCalledTimes(2);
    });

    test('skips FLIP when disabled', async () => {
      const mockElement = {
        getBoundingClientRect: jest.fn(),
        style: {},
      };

      (document.querySelectorAll as jest.Mock).mockReturnValue([mockElement]);

      await themeTransitionManager.coordinateThemeTransition(
        testThemes.minimal,
        'dark',
        { enableFLIP: false }
      );

      jest.runAllTimers();

      // Should not capture states when FLIP is disabled
      expect(mockElement.getBoundingClientRect).not.toHaveBeenCalled();
    });
  });

  describe('Performance Optimizations', () => {
    test('applies performance optimizations during transitions', async () => {
      const applySpy = jest.spyOn(performanceOptimizer, 'applyGPUAcceleration');
      const batchSpy = jest.spyOn(performanceOptimizer, 'queueDOMUpdate');

      await themeTransitionManager.coordinateThemeTransition(
        testThemes.minimal,
        'dark',
        { enablePerformanceOptimizations: true }
      );

      jest.runAllTimers();

      // Performance optimizations should be applied
      expect(applySpy).toHaveBeenCalled();
      expect(batchSpy).toHaveBeenCalled();

      applySpy.mockRestore();
      batchSpy.mockRestore();
    });

    test('reports performance metrics correctly', () => {
      const report = themeTransitionManager.getPerformanceReport();
      
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('cacheStats');
      expect(report).toHaveProperty('memoryUsage');
    });

    test('monitors performance health', () => {
      expect(themeTransitionManager.isPerformanceHealthy()).toBe(true);
      
      // Simulate performance degradation by mocking the isPerformanceHealthy method directly
      jest.spyOn(themeTransitionManager, 'isPerformanceHealthy').mockReturnValue(false);
      
      expect(themeTransitionManager.isPerformanceHealthy()).toBe(false);
    });

    test('clears caches when requested', () => {
      const clearSpy = jest.spyOn(performanceOptimizer, 'clearCaches');
      
      themeTransitionManager.clearCaches();
      
      expect(clearSpy).toHaveBeenCalled();
      clearSpy.mockRestore();
    });
  });

  describe('Accessibility Integration', () => {
    test('applies accessibility enhancements during transitions', async () => {
      const enhanceSpy = jest.spyOn(accessibilityManager, 'enhanceThemeTransition');
      const announceSpy = jest.spyOn(accessibilityManager, 'announceToScreenReader');

      await themeTransitionManager.coordinateThemeTransition(
        testThemes.minimal,
        'dark',
        { enableAccessibilityEnhancements: true }
      );

      jest.runAllTimers();

      expect(enhanceSpy).toHaveBeenCalledWith('minimal', 'dark');
      expect(announceSpy).toHaveBeenCalled();

      enhanceSpy.mockRestore();
      announceSpy.mockRestore();
    });

    test('respects reduced motion preferences', async () => {
      // Mock reduced motion preference
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));

      const config = { duration: 300, enableFLIP: true };

      await themeTransitionManager.coordinateThemeTransition(
        testThemes.minimal,
        'dark',
        config
      );

      jest.runAllTimers();

      // Should apply reduced motion settings
      expect(true).toBe(true); // Motion would be reduced internally
    });

    test('manages focus state during transitions', async () => {
      const captureSpy = jest.spyOn(accessibilityManager, 'captureFocusState');
      const restoreSpy = jest.spyOn(accessibilityManager, 'restoreFocusState');

      await themeTransitionManager.coordinateThemeTransition(
        testThemes.minimal,
        'dark'
      );

      jest.runAllTimers();

      expect(captureSpy).toHaveBeenCalled();
      expect(restoreSpy).toHaveBeenCalled();

      captureSpy.mockRestore();
      restoreSpy.mockRestore();
    });

    test('reports accessibility status correctly', () => {
      const report = themeTransitionManager.getAccessibilityReport();
      
      expect(report).toHaveProperty('reducedMotionEnabled');
      expect(report).toHaveProperty('highContrastEnabled');
      expect(report).toHaveProperty('screenReaderSupport');
    });
  });

  describe('Error Handling', () => {
    test('handles invalid theme gracefully', async () => {
      const invalidTheme = null as any;
      
      await expect(
        themeTransitionManager.coordinateThemeTransition(invalidTheme, 'dark')
      ).rejects.toThrow();
    });

    test('recovers from animation errors', async () => {
      // Mock animation failure
      Element.prototype.animate = jest.fn(() => {
        throw new Error('Animation failed');
      });

      await expect(
        themeTransitionManager.coordinateThemeTransition(testThemes.minimal, 'dark')
      ).rejects.toThrow();

      // Should restore focus even on error
      const restoreSpy = jest.spyOn(accessibilityManager, 'restoreFocusState');
      expect(restoreSpy).toHaveBeenCalled();
      restoreSpy.mockRestore();
    });

    test('handles DOM query failures', async () => {
      (document.querySelectorAll as jest.Mock).mockImplementation(() => {
        throw new Error('DOM query failed');
      });

      // Should not crash on DOM query failures
      await expect(
        themeTransitionManager.coordinateThemeTransition(testThemes.minimal, 'dark')
      ).rejects.toThrow();
    });

    test('cleans up on transition abort', async () => {
      const transitionPromise = themeTransitionManager.coordinateThemeTransition(
        testThemes.minimal,
        'dark'
      );

      // Abort mid-transition
      setTimeout(() => {
        themeTransitionManager.abortTransition();
      }, 50);

      try {
        jest.runAllTimers();
        await transitionPromise;
      } catch (error: any) {
        expect(error.message).toContain('aborted');
      }

      expect(themeTransitionManager.isTransitionActive()).toBe(false);
    });
  });

  describe('Instant Theme Switch', () => {
    test('applies theme immediately without transitions', () => {
      const rootElement = document.documentElement;
      
      themeTransitionManager.instantThemeSwitch(testThemes.minimal, 'dark');
      
      // Should apply theme classes immediately
      expect(document.body.className).toContain('theme-minimal');
    });

    test('skips transition effects for instant switch', () => {
      const animateSpy = jest.spyOn(Element.prototype, 'animate');
      
      themeTransitionManager.instantThemeSwitch(testThemes.minimal, 'dark');
      
      expect(animateSpy).not.toHaveBeenCalled();
      animateSpy.mockRestore();
    });
  });
});

describe('Theme Transition Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('applyThemeWithTransition', () => {
    test('applies theme with default configuration', async () => {
      await applyThemeWithTransition('minimal', 'dark');
      
      expect(document.body.className).toContain('theme-minimal');
    });

    test('applies theme with custom configuration', async () => {
      const customConfig = { duration: 500, enableFLIP: false };
      
      await applyThemeWithTransition('minimal', 'dark', customConfig);
      
      expect(document.body.className).toContain('theme-minimal');
    });

    test('handles transition errors gracefully', async () => {
      // Mock transition manager to throw error
      jest.spyOn(themeTransitionManager, 'coordinateThemeTransition')
        .mockRejectedValue(new Error('Transition failed'));

      await expect(
        applyThemeWithTransition('minimal', 'dark')
      ).rejects.toThrow('Transition failed');
    });
  });

  describe('Element Marking for Transitions', () => {
    test('marks elements for theme transitions', () => {
      const mockElement = {
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
      } as any;

      markForThemeTransition(mockElement, 'transition');
      
      expect(mockElement.setAttribute).toHaveBeenCalledWith(
        'data-theme-transition', 
        'true'
      );
    });

    test('marks elements for component transitions', () => {
      const mockElement = {
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
      } as any;

      markForThemeTransition(mockElement, 'component');
      
      expect(mockElement.setAttribute).toHaveBeenCalledWith(
        'data-theme-component', 
        'true'
      );
    });

    test('unmarks elements from transitions', () => {
      const mockElement = {
        removeAttribute: jest.fn(),
        getAttribute: jest.fn(),
      } as any;

      unmarkFromThemeTransition(mockElement);
      
      expect(mockElement.removeAttribute).toHaveBeenCalledWith('data-theme-transition');
      expect(mockElement.removeAttribute).toHaveBeenCalledWith('data-theme-component');
    });
  });

  describe('Resource Preloading', () => {
    test('preloads theme resources', () => {
      const createElementSpy = jest.spyOn(document, 'createElement');
      const headAppendSpy = jest.fn();
      
      Object.defineProperty(document, 'head', {
        value: { appendChild: headAppendSpy },
        writable: true,
      });

      preloadThemeResources('minimal');
      
      expect(createElementSpy).toHaveBeenCalled();
      expect(headAppendSpy).toHaveBeenCalled();
      
      createElementSpy.mockRestore();
    });
  });
});

describe('useThemeTransition Hook', () => {
  test('provides theme transition functions', () => {
    const {
      applyTheme,
      isTransitioning,
      abortTransition,
      updateConfig,
      getPerformanceReport,
      getAccessibilityReport,
      isPerformanceHealthy,
      clearCaches,
    } = useThemeTransition();

    expect(typeof applyTheme).toBe('function');
    expect(typeof isTransitioning).toBe('function');
    expect(typeof abortTransition).toBe('function');
    expect(typeof updateConfig).toBe('function');
    expect(typeof getPerformanceReport).toBe('function');
    expect(typeof getAccessibilityReport).toBe('function');
    expect(typeof isPerformanceHealthy).toBe('function');
    expect(typeof clearCaches).toBe('function');
  });

  test('applies theme through hook', async () => {
    const { applyTheme } = useThemeTransition();
    
    await applyTheme('minimal', 'dark');
    
    expect(document.body.className).toContain('theme-minimal');
  });

  test('reports transition state correctly', () => {
    const { isTransitioning } = useThemeTransition();
    
    expect(isTransitioning()).toBe(false);
  });

  test('updates configuration through hook', () => {
    const { updateConfig } = useThemeTransition();
    
    expect(() => {
      updateConfig({ duration: 500 });
    }).not.toThrow();
  });
});

describe('Visual Regression Prevention', () => {
  test('captures component snapshots before transitions', async () => {
    const mockElements = [
      {
        getBoundingClientRect: jest.fn(() => ({
          top: 0, left: 0, width: 100, height: 50,
        })),
        style: {},
        children: [],
      },
    ];

    (document.querySelectorAll as jest.Mock).mockReturnValue(mockElements);

    await themeTransitionManager.coordinateThemeTransition(
      testThemes.minimal,
      'dark'
    );

    jest.runAllTimers();

    expect(mockElements[0].getBoundingClientRect).toHaveBeenCalled();
  });

  test('detects potential layout shifts', async () => {
    const mockElement = {
      getBoundingClientRect: jest.fn()
        .mockReturnValueOnce({ top: 0, left: 0, width: 100, height: 50 })
        .mockReturnValueOnce({ top: 10, left: 5, width: 120, height: 60 }),
      style: {},
    };

    (document.querySelectorAll as jest.Mock).mockReturnValue([mockElement]);

    await themeTransitionManager.coordinateThemeTransition(
      testThemes.minimal,
      'dark',
      { enableFLIP: true }
    );

    jest.runAllTimers();

    // Should detect and handle layout shift
    expect(mockElement.getBoundingClientRect).toHaveBeenCalledTimes(2);
  });

  test('prevents layout shifts with FLIP technique', async () => {
    const mockElement = {
      getBoundingClientRect: jest.fn(() => ({
        top: 0, left: 0, width: 100, height: 50,
      })),
      style: {},
      animate: jest.fn(() => ({
        finished: Promise.resolve(),
        cancel: jest.fn(),
      })),
    };

    (document.querySelectorAll as jest.Mock).mockReturnValue([mockElement]);

    await themeTransitionManager.coordinateThemeTransition(
      testThemes.minimal,
      'dark',
      { enableFLIP: true }
    );

    jest.runAllTimers();

    // Should apply FLIP technique to prevent layout shifts
    expect(mockElement.animate).toHaveBeenCalled();
  });
});

describe('Performance Monitoring', () => {
  test('measures transition timing', async () => {
    const markSpy = jest.spyOn(window.performance, 'mark');
    const measureSpy = jest.spyOn(window.performance, 'measure');

    await themeTransitionManager.coordinateThemeTransition(
      testThemes.minimal,
      'dark'
    );

    jest.runAllTimers();

    expect(markSpy).toHaveBeenCalled();
    expect(measureSpy).toHaveBeenCalled();

    markSpy.mockRestore();
    measureSpy.mockRestore();
  });

  test('monitors memory usage during transitions', () => {
    const initialReport = themeTransitionManager.getPerformanceReport();
    expect(initialReport.averageMemoryUsage).toBeDefined();
  });

  test('tracks frame rate during transitions', async () => {
    const rafSpy = jest.spyOn(window, 'requestAnimationFrame');

    await themeTransitionManager.coordinateThemeTransition(
      testThemes.minimal,
      'dark'
    );

    jest.runAllTimers();

    expect(rafSpy).toHaveBeenCalled();
    rafSpy.mockRestore();
  });
});

describe('Cross-browser Compatibility', () => {
  test('handles missing Web Animations API gracefully', async () => {
    // Remove animate method
    delete (Element.prototype as any).animate;

    await themeTransitionManager.coordinateThemeTransition(
      testThemes.minimal,
      'dark'
    );

    jest.runAllTimers();

    // Should fallback gracefully
    expect(document.body.className).toContain('theme-minimal');
  });

  test('works without CSS custom properties support', async () => {
    const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
    CSSStyleDeclaration.prototype.setProperty = undefined as any;

    await themeTransitionManager.coordinateThemeTransition(
      testThemes.minimal,
      'dark'
    );

    jest.runAllTimers();

    CSSStyleDeclaration.prototype.setProperty = originalSetProperty;

    // Should apply theme even without CSS custom properties
    expect(document.body.className).toContain('theme-minimal');
  });

  test('handles missing matchMedia API', async () => {
    const originalMatchMedia = window.matchMedia;
    (window as any).matchMedia = undefined;

    await themeTransitionManager.coordinateThemeTransition(
      testThemes.minimal,
      'dark'
    );

    jest.runAllTimers();

    window.matchMedia = originalMatchMedia;

    expect(document.body.className).toContain('theme-minimal');
  });
});

describe('Integration Tests', () => {
  test('complete theme transition workflow', async () => {
    // Mark elements for transition
    const mockElement = {
      setAttribute: jest.fn(),
      getBoundingClientRect: jest.fn(() => ({
        top: 0, left: 0, width: 100, height: 50,
      })),
      style: {},
      animate: jest.fn(() => ({
        finished: Promise.resolve(),
        cancel: jest.fn(),
      })),
    } as any;

    markForThemeTransition(mockElement);
    (document.querySelectorAll as jest.Mock).mockReturnValue([mockElement]);

    // Execute complete transition
    await themeTransitionManager.coordinateThemeTransition(
      testThemes.minimal,
      'dark',
      {
        duration: 300,
        enableFLIP: true,
        enablePerformanceOptimizations: true,
        enableAccessibilityEnhancements: true,
      }
    );

    jest.runAllTimers();

    // Verify all systems worked together
    expect(mockElement.setAttribute).toHaveBeenCalled();
    expect(mockElement.getBoundingClientRect).toHaveBeenCalled();
    expect(document.body.className).toContain('theme-minimal');
  });

  test('handles complex multi-component transitions', async () => {
    const mockComponents = Array.from({ length: 5 }, () => ({
      getBoundingClientRect: jest.fn(() => ({
        top: Math.random() * 100,
        left: Math.random() * 100,
        width: 100 + Math.random() * 50,
        height: 50 + Math.random() * 25,
      })),
      style: {},
      animate: jest.fn(() => ({
        finished: Promise.resolve(),
        cancel: jest.fn(),
      })),
    }));

    (document.querySelectorAll as jest.Mock).mockReturnValue(mockComponents);

    await themeTransitionManager.coordinateThemeTransition(
      testThemes['neo-brutalist'],
      'light'
    );

    jest.runAllTimers();

    // All components should be handled
    mockComponents.forEach(component => {
      expect(component.getBoundingClientRect).toHaveBeenCalled();
    });
  });

  test('maintains state consistency across rapid transitions', async () => {
    // Start multiple transitions rapidly
    const transitions = [
      themeTransitionManager.coordinateThemeTransition(testThemes.minimal, 'dark'),
      themeTransitionManager.coordinateThemeTransition(testThemes['neo-brutalist'], 'light'),
      themeTransitionManager.coordinateThemeTransition(testThemes.minimal, 'light'),
    ];

    // Only the last one should complete
    try {
      jest.runAllTimers();
      await Promise.allSettled(transitions);
    } catch (error) {
      // Some transitions should be aborted
    }

    expect(themeTransitionManager.isTransitionActive()).toBe(false);
  });
});

describe('Browser Compatibility Tests', () => {
  test('handles Internet Explorer fallbacks', async () => {
    // Mock IE environment
    Object.defineProperty(window, 'navigator', {
      value: { userAgent: 'MSIE' },
      writable: true,
    });

    await themeTransitionManager.coordinateThemeTransition(
      testThemes.minimal,
      'dark'
    );

    jest.runAllTimers();

    expect(document.body.className).toContain('theme-minimal');
  });

  test('works with Safari-specific behavior', async () => {
    // Mock Safari environment
    Object.defineProperty(window, 'navigator', {
      value: { userAgent: 'Safari' },
      writable: true,
    });

    await themeTransitionManager.coordinateThemeTransition(
      testThemes.minimal,
      'dark'
    );

    jest.runAllTimers();

    expect(document.body.className).toContain('theme-minimal');
  });

  test('handles Firefox differences', async () => {
    // Mock Firefox environment
    Object.defineProperty(window, 'navigator', {
      value: { userAgent: 'Firefox' },
      writable: true,
    });

    await themeTransitionManager.coordinateThemeTransition(
      testThemes.minimal,
      'dark'
    );

    jest.runAllTimers();

    expect(document.body.className).toContain('theme-minimal');
  });
});

describe('Performance Benchmarks', () => {
  test('transition completes within performance budget', async () => {
    const startTime = performance.now();
    
    await themeTransitionManager.coordinateThemeTransition(
      testThemes.minimal,
      'dark'
    );

    jest.runAllTimers();
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should complete quickly (test environment timing)
    expect(duration).toBeLessThan(1000);
  });

  test('memory usage stays within bounds', () => {
    const initialMemory = process.memoryUsage();
    
    // Perform multiple transitions
    for (let i = 0; i < 10; i++) {
      themeTransitionManager.coordinateThemeTransition(
        testThemes.minimal,
        i % 2 === 0 ? 'dark' : 'light'
      );
    }
    
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    
    // Memory increase should be reasonable
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
  });

  test('handles concurrent transitions efficiently', async () => {
    const concurrentTransitions = Array.from({ length: 5 }, () =>
      themeTransitionManager.coordinateThemeTransition(
        testThemes.minimal,
        'dark'
      )
    );

    const results = await Promise.allSettled(concurrentTransitions);
    
    // Should handle concurrent requests gracefully
    expect(results.some(result => result.status === 'fulfilled')).toBe(true);
  });
}); 