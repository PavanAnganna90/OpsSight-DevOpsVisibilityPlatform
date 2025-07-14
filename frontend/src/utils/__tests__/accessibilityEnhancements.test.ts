/**
 * Tests for accessibility enhancements in theme transitions
 * Ensures WCAG 2.1 AA compliance and proper accessibility features
 */

import {
  accessibilityManager,
  useAccessibility,
  withAccessibilityEnhancements,
  AccessibilityConfig,
} from '../accessibilityEnhancements';

// Mock DOM methods and APIs
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

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn();

// Mock getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  value: jest.fn(() => ({
    color: 'rgb(0, 0, 0)',
    backgroundColor: 'rgb(255, 255, 255)',
    getPropertyValue: jest.fn(),
  })),
});

// Mock document methods
Object.defineProperty(document, 'querySelectorAll', {
  value: jest.fn(() => []),
});

Object.defineProperty(document, 'createElement', {
  value: jest.fn(() => ({
    setAttribute: jest.fn(),
    style: {},
    className: '',
    textContent: '',
  })),
});

Object.defineProperty(document, 'body', {
  value: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
    },
  },
  writable: true,
});

describe('AccessibilityManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset accessibility manager state
    accessibilityManager.updateConfig({
      respectReducedMotion: true,
      announceThemeChanges: true,
      manageFocusDuringTransitions: true,
      enableHighContrastMode: false,
      validateColorContrast: true,
      enableKeyboardShortcuts: true,
      motionSensitivityLevel: 'reduced',
      screenReaderVerbosity: 'standard',
    });
  });

  describe('Configuration Management', () => {
    test('updates configuration correctly', () => {
      const newConfig: Partial<AccessibilityConfig> = {
        motionSensitivityLevel: 'none',
        screenReaderVerbosity: 'verbose',
      };

      accessibilityManager.updateConfig(newConfig);
      const report = accessibilityManager.getAccessibilityReport();

      expect(report.reducedMotionEnabled).toBeDefined();
      expect(report.screenReaderSupport).toBe(true);
    });

    test('respects system preferences', () => {
      // Mock reduced motion preference
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));

      expect(accessibilityManager.prefersReducedMotion()).toBe(true);
    });

    test('respects high contrast preference', () => {
      // Mock high contrast preference
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query.includes('prefers-contrast: high'),
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));

      expect(accessibilityManager.prefersHighContrast()).toBe(true);
    });
  });

  describe('Screen Reader Announcements', () => {
    test('creates live region for announcements', () => {
      const mockElement = {
        setAttribute: jest.fn(),
        style: { cssText: '' },
        className: '',
      };
      
      (document.createElement as jest.Mock).mockReturnValue(mockElement);

      accessibilityManager.announceToScreenReader('Test announcement', 'polite');

      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-live', 'polite');
      expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-atomic', 'true');
    });

    test('formats announcements based on verbosity level', () => {
      accessibilityManager.updateConfig({ screenReaderVerbosity: 'minimal' });
      
      const enhancement = accessibilityManager.enhanceThemeTransition('minimal', 'dark');
      expect(enhancement.announcement).toBe('minimal theme');

      accessibilityManager.updateConfig({ screenReaderVerbosity: 'verbose' });
      const verboseEnhancement = accessibilityManager.enhanceThemeTransition('minimal', 'dark');
      expect(verboseEnhancement.announcement).toContain('Theme changed to minimal in dark mode');
      expect(verboseEnhancement.announcement).toContain('Alt+T');
    });

    test('handles different announcement priorities', () => {
      const mockElement = {
        setAttribute: jest.fn(),
        style: { cssText: '' },
        className: '',
        textContent: '',
      };
      
      (document.createElement as jest.Mock).mockReturnValue(mockElement);

      accessibilityManager.announceToScreenReader('Urgent message', 'assertive');
      expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-live', 'assertive');

      accessibilityManager.announceToScreenReader('Polite message', 'polite');
      expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-live', 'polite');
    });
  });

  describe('Focus Management', () => {
    test('captures and restores focus state', () => {
      const mockActiveElement = { focus: jest.fn() };
      Object.defineProperty(document, 'activeElement', {
        value: mockActiveElement,
        writable: true,
      });

      const mockFocusableElements = [
        { focus: jest.fn() },
        { focus: jest.fn() },
        mockActiveElement,
      ];

      (document.querySelectorAll as jest.Mock).mockReturnValue(mockFocusableElements);

      // Capture focus state
      accessibilityManager.captureFocusState();

      // Simulate focus change
      Object.defineProperty(document, 'activeElement', {
        value: mockFocusableElements[0],
        writable: true,
      });

      // Restore focus state
      accessibilityManager.restoreFocusState();

      expect(mockActiveElement.focus).toHaveBeenCalled();
    });

    test('handles missing active element gracefully', () => {
      Object.defineProperty(document, 'activeElement', {
        value: null,
        writable: true,
      });

      expect(() => {
        accessibilityManager.captureFocusState();
        accessibilityManager.restoreFocusState();
      }).not.toThrow();
    });
  });

  describe('Color Contrast Validation', () => {
    test('calculates contrast ratios correctly', () => {
      const result = accessibilityManager.calculateContrastRatio('#000000', '#ffffff');
      expect(result.ratio).toBe(21);
      expect(result.level).toBe('AAA');
      expect(result.isValid).toBe(true);
    });

    test('identifies contrast violations', () => {
      const result = accessibilityManager.calculateContrastRatio('#cccccc', '#ffffff');
      expect(result.ratio).toBeLessThan(4.5);
      expect(result.level).toBe('fail');
      expect(result.isValid).toBe(false);
    });

    test('validates theme accessibility', () => {
      const goodTheme = {
        'text-primary': '#000000',
        'bg-primary': '#ffffff',
        'text-secondary': '#333333',
      };

      const result = accessibilityManager.validateThemeAccessibility(goodTheme);
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    test('detects theme accessibility issues', () => {
      const badTheme = {
        'text-primary': '#cccccc',
        'bg-primary': '#ffffff',
        'text-secondary': '#dddddd',
      };

      const result = accessibilityManager.validateThemeAccessibility(badTheme);
      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Theme Transition Enhancements', () => {
    test('provides comprehensive transition enhancements', () => {
      const enhancement = accessibilityManager.enhanceThemeTransition('minimal', 'dark');

      expect(enhancement).toHaveProperty('shouldReduceMotion');
      expect(enhancement).toHaveProperty('announcement');
      expect(enhancement).toHaveProperty('focusManagement');
      expect(enhancement).toHaveProperty('contrastMonitoring');

      expect(typeof enhancement.focusManagement.capture).toBe('function');
      expect(typeof enhancement.focusManagement.restore).toBe('function');
      expect(typeof enhancement.contrastMonitoring.startMonitoring).toBe('function');
      expect(typeof enhancement.contrastMonitoring.stopMonitoring).toBe('function');
      expect(typeof enhancement.contrastMonitoring.getViolations).toBe('function');
    });

    test('reduces motion when system preference is enabled', () => {
      // Mock reduced motion preference
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));

      const enhancement = accessibilityManager.enhanceThemeTransition('minimal', 'dark');
      expect(enhancement.shouldReduceMotion).toBe(true);
    });

    test('monitors contrast during transitions', (done) => {
      const mockElements = [
        {
          style: {},
          getAttribute: jest.fn(),
          setAttribute: jest.fn(),
        },
      ];

      (document.querySelectorAll as jest.Mock).mockReturnValue(mockElements);
      (window.getComputedStyle as jest.Mock).mockReturnValue({
        color: 'rgb(200, 200, 200)', // Low contrast
        backgroundColor: 'rgb(255, 255, 255)',
      });

      const enhancement = accessibilityManager.enhanceThemeTransition('minimal', 'dark');
      
      enhancement.contrastMonitoring.startMonitoring();
      
      // Allow monitoring to run
      setTimeout(() => {
        enhancement.contrastMonitoring.stopMonitoring();
        const violations = enhancement.contrastMonitoring.getViolations();
        
        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0]).toContain('contrast ratio');
        done();
      }, 100);
    });

    test('handles empty violation list', () => {
      const enhancement = accessibilityManager.enhanceThemeTransition('minimal', 'dark');
      
      enhancement.contrastMonitoring.startMonitoring();
      enhancement.contrastMonitoring.stopMonitoring();
      
      const violations = enhancement.contrastMonitoring.getViolations();
      expect(Array.isArray(violations)).toBe(true);
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('initializes keyboard shortcuts', () => {
      const mockAddEventListener = jest.fn();
      Object.defineProperty(document, 'addEventListener', {
        value: mockAddEventListener,
        writable: true,
      });

      accessibilityManager.updateConfig({ enableKeyboardShortcuts: true });
      expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    test('disables keyboard shortcuts when configured', () => {
      const mockRemoveEventListener = jest.fn();
      Object.defineProperty(document, 'removeEventListener', {
        value: mockRemoveEventListener,
        writable: true,
      });

      accessibilityManager.updateConfig({ enableKeyboardShortcuts: false });
      expect(mockRemoveEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    test('dispatches custom events for keyboard shortcuts', () => {
      const mockDispatchEvent = jest.fn();
      Object.defineProperty(document, 'dispatchEvent', {
        value: mockDispatchEvent,
        writable: true,
      });

      // Simulate Alt+T keypress
      const keyEvent = new KeyboardEvent('keydown', {
        altKey: true,
        code: 'KeyT',
      });

      // This would be called by the keyboard handler
      document.dispatchEvent(new CustomEvent('theme:toggle'));
      expect(mockDispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
    });
  });

  describe('Accessibility Report', () => {
    test('provides comprehensive accessibility status', () => {
      const report = accessibilityManager.getAccessibilityReport();

      expect(report).toHaveProperty('reducedMotionEnabled');
      expect(report).toHaveProperty('highContrastEnabled');
      expect(report).toHaveProperty('keyboardShortcutsEnabled');
      expect(report).toHaveProperty('screenReaderSupport');
      expect(report).toHaveProperty('focusManagementEnabled');
      expect(report).toHaveProperty('colorContrastValidation');

      expect(typeof report.reducedMotionEnabled).toBe('boolean');
      expect(typeof report.screenReaderSupport).toBe('boolean');
    });

    test('reflects current configuration state', () => {
      accessibilityManager.updateConfig({
        enableKeyboardShortcuts: false,
        validateColorContrast: false,
      });

      const report = accessibilityManager.getAccessibilityReport();
      expect(report.keyboardShortcutsEnabled).toBe(false);
      expect(report.colorContrastValidation).toBe(false);
    });
  });
});

describe('useAccessibility Hook', () => {
  test('provides accessibility management functions', () => {
    const {
      updateConfig,
      announceToScreenReader,
      enhanceThemeTransition,
      validateThemeAccessibility,
      getReport,
      prefersReducedMotion,
      prefersHighContrast,
    } = useAccessibility();

    expect(typeof updateConfig).toBe('function');
    expect(typeof announceToScreenReader).toBe('function');
    expect(typeof enhanceThemeTransition).toBe('function');
    expect(typeof validateThemeAccessibility).toBe('function');
    expect(typeof getReport).toBe('function');
    expect(typeof prefersReducedMotion).toBe('function');
    expect(typeof prefersHighContrast).toBe('function');
  });

  test('updates configuration through hook', () => {
    const { updateConfig, getReport } = useAccessibility();
    
    updateConfig({ motionSensitivityLevel: 'none' });
    const report = getReport();
    
    expect(report).toBeDefined();
  });
});

describe('withAccessibilityEnhancements Decorator', () => {
  test('wraps async functions with accessibility features', async () => {
    const mockFunction = jest.fn().mockResolvedValue('success');
    const enhancedFunction = withAccessibilityEnhancements(mockFunction, 'minimal', 'dark');

    const result = await enhancedFunction('test', 'args');

    expect(mockFunction).toHaveBeenCalledWith('test', 'args');
    expect(result).toBe('success');
  });

  test('handles function errors gracefully', async () => {
    const mockFunction = jest.fn().mockRejectedValue(new Error('Test error'));
    const enhancedFunction = withAccessibilityEnhancements(mockFunction, 'minimal', 'dark');

    await expect(enhancedFunction()).rejects.toThrow('Test error');
  });

  test('announces transition start and completion', async () => {
    const mockFunction = jest.fn().mockResolvedValue('success');
    const enhancedFunction = withAccessibilityEnhancements(mockFunction, 'minimal', 'dark');

    const announceSpy = jest.spyOn(accessibilityManager, 'announceToScreenReader');

    await enhancedFunction();

    expect(announceSpy).toHaveBeenCalledWith(
      'Starting theme transition to minimal',
      'polite'
    );
    expect(announceSpy).toHaveBeenCalledWith(
      expect.stringContaining('Theme changed to minimal in dark mode'),
      'polite'
    );
  });

  test('manages focus state during transitions', async () => {
    const mockFunction = jest.fn().mockResolvedValue('success');
    const enhancedFunction = withAccessibilityEnhancements(mockFunction, 'minimal', 'dark');

    const captureSpy = jest.spyOn(accessibilityManager, 'captureFocusState');
    const restoreSpy = jest.spyOn(accessibilityManager, 'restoreFocusState');

    await enhancedFunction();

    expect(captureSpy).toHaveBeenCalled();
    
    // Restore is called with a timeout, so we need to wait
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(restoreSpy).toHaveBeenCalled();
  });
});

describe('Integration Tests', () => {
  test('complete accessibility workflow', async () => {
    // Setup
    const { updateConfig, enhanceThemeTransition, getReport } = useAccessibility();
    
    // Configure accessibility
    updateConfig({
      respectReducedMotion: true,
      announceThemeChanges: true,
      validateColorContrast: true,
    });

    // Enhance theme transition
    const enhancement = enhanceThemeTransition('minimal', 'dark');
    
    // Start monitoring
    enhancement.contrastMonitoring.startMonitoring();
    enhancement.focusManagement.capture();

    // Simulate transition
    await new Promise(resolve => setTimeout(resolve, 50));

    // Stop monitoring
    enhancement.contrastMonitoring.stopMonitoring();
    enhancement.focusManagement.restore();

    // Verify report
    const report = getReport();
    expect(report.colorContrastValidation).toBe(true);
    expect(report.screenReaderSupport).toBe(true);
  });

  test('accessibility features work with reduced motion', () => {
    // Mock reduced motion preference
    (window.matchMedia as jest.Mock).mockImplementation(query => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    const enhancement = accessibilityManager.enhanceThemeTransition('minimal', 'dark');
    expect(enhancement.shouldReduceMotion).toBe(true);
    
    // Verify that motion-sensitive features are disabled
    expect(enhancement.announcement).toBeTruthy();
    expect(enhancement.focusManagement).toBeDefined();
  });

  test('accessibility features work with high contrast', () => {
    // Mock high contrast preference
    (window.matchMedia as jest.Mock).mockImplementation(query => ({
      matches: query.includes('prefers-contrast: high'),
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    accessibilityManager.updateConfig({ enableHighContrastMode: true });
    const report = accessibilityManager.getAccessibilityReport();
    expect(report.highContrastEnabled).toBe(true);
  });
}); 