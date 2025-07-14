/**
 * Accessibility Enhancements for Theme Transitions
 * 
 * Comprehensive accessibility utilities for theme transitions including:
 * - Reduced motion support and detection
 * - Screen reader announcements and live regions
 * - Focus management during transitions
 * - WCAG 2.1 AA compliance features
 * - High contrast mode support
 * - Keyboard navigation enhancements
 * - Color contrast validation
 * - Motion sensitivity controls
 */

// Accessibility configuration interface
export interface AccessibilityConfig {
  respectReducedMotion: boolean;
  announceThemeChanges: boolean;
  manageFocusDuringTransitions: boolean;
  enableHighContrastMode: boolean;
  validateColorContrast: boolean;
  enableKeyboardShortcuts: boolean;
  motionSensitivityLevel: 'none' | 'reduced' | 'minimal';
  screenReaderVerbosity: 'minimal' | 'standard' | 'verbose';
}

// Default accessibility configuration
const DEFAULT_ACCESSIBILITY_CONFIG: AccessibilityConfig = {
  respectReducedMotion: true,
  announceThemeChanges: true,
  manageFocusDuringTransitions: true,
  enableHighContrastMode: true,
  validateColorContrast: true,
  enableKeyboardShortcuts: true,
  motionSensitivityLevel: 'reduced',
  screenReaderVerbosity: 'standard',
};

// Screen reader announcement types
export type AnnouncementType = 'polite' | 'assertive' | 'off';

// Focus management state
interface FocusState {
  activeElement: Element | null;
  focusableElements: Element[];
  focusIndex: number;
}

// Color contrast result
interface ContrastResult {
  ratio: number;
  level: 'AAA' | 'AA' | 'A' | 'fail';
  isValid: boolean;
}

// Accessibility enhancement manager
class AccessibilityManager {
  private config: AccessibilityConfig = DEFAULT_ACCESSIBILITY_CONFIG;
  private liveRegion: HTMLElement | null = null;
  private focusState: FocusState | null = null;
  private keyboardShortcuts = new Map<string, () => void>();
  private motionMediaQuery: MediaQueryList | null = null;
  private contrastMediaQuery: MediaQueryList | null = null;

  constructor() {
    this.initializeLiveRegion();
    this.initializeMediaQueries();
    this.initializeKeyboardShortcuts();
  }

  /**
   * Update accessibility configuration
   */
  public updateConfig(newConfig: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.enableKeyboardShortcuts !== undefined) {
      if (newConfig.enableKeyboardShortcuts) {
        this.enableKeyboardShortcuts();
      } else {
        this.disableKeyboardShortcuts();
      }
    }
  }

  /**
   * Initialize live region for screen reader announcements
   */
  private initializeLiveRegion(): void {
    if (typeof document === 'undefined') return;

    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.setAttribute('aria-relevant', 'text');
    this.liveRegion.className = 'sr-only';
    this.liveRegion.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    
    document.body.appendChild(this.liveRegion);
  }

  /**
   * Initialize media queries for accessibility preferences
   */
  private initializeMediaQueries(): void {
    if (typeof window === 'undefined') return;

    // Reduced motion media query
    this.motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.motionMediaQuery.addEventListener('change', this.handleMotionPreferenceChange.bind(this));

    // High contrast media query
    this.contrastMediaQuery = window.matchMedia('(prefers-contrast: high)');
    this.contrastMediaQuery.addEventListener('change', this.handleContrastPreferenceChange.bind(this));
  }

  /**
   * Handle motion preference changes
   */
  private handleMotionPreferenceChange(event: MediaQueryListEvent): void {
    if (event.matches) {
      this.announceToScreenReader('Motion reduced for accessibility', 'polite');
      this.updateConfig({ motionSensitivityLevel: 'none' });
    } else {
      this.updateConfig({ motionSensitivityLevel: 'reduced' });
    }
  }

  /**
   * Handle contrast preference changes
   */
  private handleContrastPreferenceChange(event: MediaQueryListEvent): void {
    if (event.matches) {
      this.announceToScreenReader('High contrast mode enabled', 'polite');
      this.updateConfig({ enableHighContrastMode: true });
    } else {
      this.updateConfig({ enableHighContrastMode: false });
    }
  }

  /**
   * Initialize keyboard shortcuts for theme switching
   */
  private initializeKeyboardShortcuts(): void {
    // Alt + T: Toggle theme
    this.keyboardShortcuts.set('Alt+KeyT', () => {
      this.announceToScreenReader('Theme toggle shortcut activated', 'assertive');
      // This would be connected to the theme context
      document.dispatchEvent(new CustomEvent('theme:toggle'));
    });

    // Alt + D: Toggle dark mode
    this.keyboardShortcuts.set('Alt+KeyD', () => {
      this.announceToScreenReader('Dark mode toggle shortcut activated', 'assertive');
      document.dispatchEvent(new CustomEvent('theme:toggleDarkMode'));
    });

    // Alt + H: Toggle high contrast
    this.keyboardShortcuts.set('Alt+KeyH', () => {
      this.announceToScreenReader('High contrast toggle shortcut activated', 'assertive');
      document.dispatchEvent(new CustomEvent('theme:toggleHighContrast'));
    });

    // Alt + M: Toggle reduced motion
    this.keyboardShortcuts.set('Alt+KeyM', () => {
      this.announceToScreenReader('Motion preference toggle shortcut activated', 'assertive');
      document.dispatchEvent(new CustomEvent('accessibility:toggleMotion'));
    });

    this.enableKeyboardShortcuts();
  }

  /**
   * Enable keyboard shortcuts
   */
  private enableKeyboardShortcuts(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('keydown', this.handleKeyboardShortcut.bind(this));
  }

  /**
   * Disable keyboard shortcuts
   */
  private disableKeyboardShortcuts(): void {
    if (typeof document === 'undefined') return;

    document.removeEventListener('keydown', this.handleKeyboardShortcut.bind(this));
  }

  /**
   * Handle keyboard shortcut events
   */
  private handleKeyboardShortcut(event: KeyboardEvent): void {
    if (!this.config.enableKeyboardShortcuts) return;

    const key = `${event.altKey ? 'Alt+' : ''}${event.ctrlKey ? 'Ctrl+' : ''}${event.shiftKey ? 'Shift+' : ''}${event.code}`;
    const handler = this.keyboardShortcuts.get(key);

    if (handler) {
      event.preventDefault();
      handler();
    }
  }

  /**
   * Announce message to screen readers
   */
  public announceToScreenReader(
    message: string, 
    priority: AnnouncementType = 'polite',
    delay: number = 100
  ): void {
    if (!this.config.announceThemeChanges || !this.liveRegion) return;

    // Clear previous announcement
    this.liveRegion.textContent = '';
    this.liveRegion.setAttribute('aria-live', priority);

    // Add announcement with slight delay to ensure it's picked up
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = this.formatAnnouncementMessage(message);
      }
    }, delay);
  }

  /**
   * Format announcement message based on verbosity level
   */
  private formatAnnouncementMessage(message: string): string {
    const { screenReaderVerbosity } = this.config;

    switch (screenReaderVerbosity) {
      case 'minimal':
        return message.split('.')[0]; // First sentence only
      case 'verbose':
        return `Theme system: ${message}. Use Alt+T to toggle themes, Alt+D for dark mode, Alt+H for high contrast.`;
      default:
        return message;
    }
  }

  /**
   * Capture focus state before transition
   */
  public captureFocusState(): void {
    if (!this.config.manageFocusDuringTransitions) return;

    const activeElement = document.activeElement;
    const focusableElements = this.getFocusableElements();
    const focusIndex = Array.from(focusableElements).indexOf(activeElement as Element);

    this.focusState = {
      activeElement,
      focusableElements: Array.from(focusableElements),
      focusIndex: Math.max(0, focusIndex),
    };
  }

  /**
   * Restore focus state after transition
   */
  public restoreFocusState(): void {
    if (!this.config.manageFocusDuringTransitions || !this.focusState) return;

    const { activeElement, focusableElements, focusIndex } = this.focusState;

    // Try to restore focus to the same element
    if (activeElement && document.contains(activeElement)) {
      (activeElement as HTMLElement).focus();
      return;
    }

    // If original element is not available, focus the element at the same index
    const currentFocusableElements = this.getFocusableElements();
    const targetElement = currentFocusableElements[Math.min(focusIndex, currentFocusableElements.length - 1)];

    if (targetElement) {
      (targetElement as HTMLElement).focus();
    }

    this.focusState = null;
  }

  /**
   * Get all focusable elements in the document
   */
  private getFocusableElements(): NodeListOf<Element> {
    return document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
    );
  }

  /**
   * Check if reduced motion is preferred
   */
  public prefersReducedMotion(): boolean {
    if (!this.config.respectReducedMotion) return false;
    
    if (this.motionMediaQuery) {
      return this.motionMediaQuery.matches;
    }

    // Fallback check
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    return false;
  }

  /**
   * Check if high contrast is preferred
   */
  public prefersHighContrast(): boolean {
    if (!this.config.enableHighContrastMode) return false;
    
    if (this.contrastMediaQuery) {
      return this.contrastMediaQuery.matches;
    }

    // Fallback check
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-contrast: high)').matches;
    }

    return false;
  }

  /**
   * Calculate color contrast ratio
   */
  public calculateContrastRatio(color1: string, color2: string): ContrastResult {
    const luminance1 = this.getLuminance(color1);
    const luminance2 = this.getLuminance(color2);
    
    const lighter = Math.max(luminance1, luminance2);
    const darker = Math.min(luminance1, luminance2);
    
    const ratio = (lighter + 0.05) / (darker + 0.05);
    
    let level: ContrastResult['level'];
    let isValid: boolean;

    if (ratio >= 7) {
      level = 'AAA';
      isValid = true;
    } else if (ratio >= 4.5) {
      level = 'AA';
      isValid = true;
    } else if (ratio >= 3) {
      level = 'A';
      isValid = false;
    } else {
      level = 'fail';
      isValid = false;
    }

    return { ratio, level, isValid };
  }

  /**
   * Get relative luminance of a color
   */
  private getLuminance(color: string): number {
    // Convert color to RGB values
    const rgb = this.parseColor(color);
    if (!rgb) return 0;

    // Convert to relative luminance
    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Parse color string to RGB values
   */
  private parseColor(color: string): [number, number, number] | null {
    // Create a temporary element to parse the color
    const div = document.createElement('div');
    div.style.color = color;
    document.body.appendChild(div);
    
    const computedColor = window.getComputedStyle(div).color;
    document.body.removeChild(div);

    // Parse RGB values from computed style
    const match = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }

    return null;
  }

  /**
   * Validate theme colors for accessibility
   */
  public validateThemeAccessibility(theme: Record<string, string>): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check background/text contrast
    const background = theme['--theme-background-primary'] || theme['background'];
    const text = theme['--theme-text-primary'] || theme['color'];

    if (background && text) {
      const contrast = this.calculateContrastRatio(background, text);
      if (!contrast.isValid) {
        issues.push(`Text contrast ratio ${contrast.ratio.toFixed(2)} does not meet WCAG AA standards (4.5:1 required)`);
        suggestions.push('Increase contrast between background and text colors');
      }
    }

    // Check focus indicator contrast
    const focusColor = theme['--theme-border-focus'] || theme['--focus-color'];
    if (background && focusColor) {
      const focusContrast = this.calculateContrastRatio(background, focusColor);
      if (focusContrast.ratio < 3) {
        issues.push(`Focus indicator contrast ratio ${focusContrast.ratio.toFixed(2)} is too low (3:1 minimum required)`);
        suggestions.push('Use a more contrasting color for focus indicators');
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions,
    };
  }

  /**
   * Apply accessibility enhancements to theme transition
   * Including real-time color contrast monitoring during transitions
   */
  public enhanceThemeTransition(
    themeName: string,
    colorMode: string,
    onTransitionStart?: () => void,
    onTransitionComplete?: () => void
  ): {
    shouldReduceMotion: boolean;
    announcement: string;
    focusManagement: {
      capture: () => void;
      restore: () => void;
    };
    contrastMonitoring: {
      startMonitoring: () => void;
      stopMonitoring: () => void;
      getViolations: () => string[];
    };
  } {
    const shouldReduceMotion = this.prefersReducedMotion() || this.config.motionSensitivityLevel === 'none';
    let contrastViolations: string[] = [];
    let monitoringInterval: NodeJS.Timeout | null = null;
    
    // Generate appropriate announcement
    let announcement = '';
    switch (this.config.screenReaderVerbosity) {
      case 'minimal':
        announcement = `${themeName} theme`;
        break;
      case 'verbose':
        announcement = `Theme changed to ${themeName} in ${colorMode} mode. The page appearance has been updated. Use Alt+T to toggle themes or Alt+D for dark mode.`;
        break;
      default:
        announcement = `Theme changed to ${themeName} in ${colorMode} mode`;
    }

    // Enhanced contrast monitoring for transitions
    const startContrastMonitoring = () => {
      if (!this.config.validateColorContrast) return;

      contrastViolations = [];
      
      const monitorContrast = () => {
        // Monitor key UI elements for contrast violations during transition
        const elementsToCheck = [
          { selector: 'button', description: 'buttons' },
          { selector: 'a', description: 'links' },
          { selector: 'input', description: 'form inputs' },
          { selector: '[role="tab"]', description: 'tabs' },
          { selector: '.text-primary', description: 'primary text' },
          { selector: '.bg-primary', description: 'primary backgrounds' },
        ];

        elementsToCheck.forEach(({ selector, description }) => {
          const elements = document.querySelectorAll(selector);
          elements.forEach((element, index) => {
            if (element instanceof HTMLElement) {
              const computedStyle = window.getComputedStyle(element);
              const textColor = computedStyle.color;
              const backgroundColor = computedStyle.backgroundColor;
              
              if (textColor && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
                const contrastResult = this.calculateContrastRatio(textColor, backgroundColor);
                
                if (!contrastResult.isValid) {
                  const violation = `${description} element ${index + 1}: contrast ratio ${contrastResult.ratio.toFixed(2)} (${contrastResult.level})`;
                  
                  if (!contrastViolations.includes(violation)) {
                    contrastViolations.push(violation);
                    
                    // Announce serious violations immediately
                    if (contrastResult.level === 'fail') {
                      this.announceToScreenReader(
                        `Accessibility warning: Low contrast detected in ${description}`, 
                        'assertive'
                      );
                    }
                  }
                }
              }
            }
          });
        });
      };

      // Start monitoring at intervals during transition
      monitoringInterval = setInterval(monitorContrast, 50); // Check every 50ms during transition
      monitorContrast(); // Initial check
    };

    const stopContrastMonitoring = () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
      }

      // Final contrast validation
      if (contrastViolations.length > 0 && this.config.announceThemeChanges) {
        const violationCount = contrastViolations.length;
        this.announceToScreenReader(
          `Theme transition completed. ${violationCount} contrast ${violationCount === 1 ? 'issue' : 'issues'} detected. Check accessibility settings for details.`,
          'polite'
        );
      }
    };

    const getViolations = () => [...contrastViolations];

    return {
      shouldReduceMotion,
      announcement,
      focusManagement: {
        capture: () => this.captureFocusState(),
        restore: () => this.restoreFocusState(),
      },
      contrastMonitoring: {
        startMonitoring: startContrastMonitoring,
        stopMonitoring: stopContrastMonitoring,
        getViolations,
      },
    };
  }

  /**
   * Add accessibility attributes to theme-related elements
   */
  public enhanceThemeElements(): void {
    // Enhance theme toggle buttons
    const themeButtons = document.querySelectorAll('[data-theme-toggle]');
    themeButtons.forEach(button => {
      if (!button.getAttribute('aria-label')) {
        button.setAttribute('aria-label', 'Toggle theme');
      }
      if (!button.getAttribute('role')) {
        button.setAttribute('role', 'button');
      }
      button.setAttribute('aria-describedby', 'theme-toggle-description');
    });

    // Add description for theme toggles
    if (!document.getElementById('theme-toggle-description')) {
      const description = document.createElement('div');
      description.id = 'theme-toggle-description';
      description.className = 'sr-only';
      description.textContent = 'Changes the visual theme of the application. Use Alt+T for keyboard shortcut.';
      document.body.appendChild(description);
    }

    // Enhance color mode selectors
    const colorModeSelectors = document.querySelectorAll('[data-color-mode]');
    colorModeSelectors.forEach(selector => {
      selector.setAttribute('role', 'radiogroup');
      selector.setAttribute('aria-label', 'Color mode selection');
    });
  }

  /**
   * Get accessibility status report
   */
  public getAccessibilityReport(): {
    reducedMotionEnabled: boolean;
    highContrastEnabled: boolean;
    keyboardShortcutsEnabled: boolean;
    screenReaderSupport: boolean;
    focusManagementEnabled: boolean;
    colorContrastValidation: boolean;
  } {
    return {
      reducedMotionEnabled: this.prefersReducedMotion(),
      highContrastEnabled: this.prefersHighContrast(),
      keyboardShortcutsEnabled: this.config.enableKeyboardShortcuts,
      screenReaderSupport: this.config.announceThemeChanges && !!this.liveRegion,
      focusManagementEnabled: this.config.manageFocusDuringTransitions,
      colorContrastValidation: this.config.validateColorContrast,
    };
  }

  /**
   * Cleanup and destroy
   */
  public destroy(): void {
    if (this.liveRegion) {
      document.body.removeChild(this.liveRegion);
      this.liveRegion = null;
    }

    this.disableKeyboardShortcuts();

    if (this.motionMediaQuery) {
      this.motionMediaQuery.removeEventListener('change', this.handleMotionPreferenceChange.bind(this));
    }

    if (this.contrastMediaQuery) {
      this.contrastMediaQuery.removeEventListener('change', this.handleContrastPreferenceChange.bind(this));
    }

    this.keyboardShortcuts.clear();
    this.focusState = null;
  }
}

// Global accessibility manager instance
export const accessibilityManager = new AccessibilityManager();

/**
 * React hook for accessibility management
 */
export function useAccessibility() {
  const updateConfig = (config: Partial<AccessibilityConfig>) => {
    accessibilityManager.updateConfig(config);
  };

  const announceToScreenReader = (message: string, priority?: AnnouncementType) => {
    accessibilityManager.announceToScreenReader(message, priority);
  };

  const enhanceThemeTransition = (themeName: string, colorMode: string) => {
    return accessibilityManager.enhanceThemeTransition(themeName, colorMode);
  };

  const validateThemeAccessibility = (theme: Record<string, string>) => {
    return accessibilityManager.validateThemeAccessibility(theme);
  };

  const getReport = () => accessibilityManager.getAccessibilityReport();

  const prefersReducedMotion = () => accessibilityManager.prefersReducedMotion();

  const prefersHighContrast = () => accessibilityManager.prefersHighContrast();

  return {
    updateConfig,
    announceToScreenReader,
    enhanceThemeTransition,
    validateThemeAccessibility,
    getReport,
    prefersReducedMotion,
    prefersHighContrast,
  };
}

/**
 * Accessibility decorator for theme transition functions
 */
export function withAccessibilityEnhancements<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  themeName: string,
  colorMode: string
): T {
  return (async (...args: any[]) => {
    const enhancements = accessibilityManager.enhanceThemeTransition(themeName, colorMode);
    
    // Capture focus state
    enhancements.focusManagement.capture();
    
    // Announce transition start
    accessibilityManager.announceToScreenReader(`Starting theme transition to ${themeName}`, 'polite');
    
    try {
      const result = await fn(...args);
      
      // Announce completion
      accessibilityManager.announceToScreenReader(enhancements.announcement, 'polite');
      
      // Restore focus
      setTimeout(() => {
        enhancements.focusManagement.restore();
      }, 100);
      
      return result;
    } catch (error) {
      accessibilityManager.announceToScreenReader('Theme transition failed', 'assertive');
      enhancements.focusManagement.restore();
      throw error;
    }
  }) as T;
}

export default accessibilityManager; 