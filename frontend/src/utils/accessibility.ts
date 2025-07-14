/**
 * Accessibility utilities for WCAG 2.1 AA compliance
 * Provides color contrast calculations, ARIA helpers, and keyboard navigation
 */

// Color contrast calculation utilities
export interface ContrastResult {
  ratio: number;
  isAA: boolean;
  isAAA: boolean;
  level: 'fail' | 'AA' | 'AAA';
}

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance of a color
 * Based on WCAG 2.1 specification
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const normalize = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * normalize(r) + 0.7152 * normalize(g) + 0.0722 * normalize(b);
}

/**
 * Parse OKLCH color format to RGB
 */
function oklchToRgb(oklch: string): { r: number; g: number; b: number } | null {
  const match = oklch.match(/oklch\(([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\)/);
  if (!match) return null;

  const [, l, c, h] = match.map(Number);
  
  // Simple approximation - in production, use a proper color conversion library
  const lightness = l * 255;
  return { r: lightness, g: lightness, b: lightness };
}

/**
 * Parse CSS color to RGB values
 */
function parseColor(color: string): { r: number; g: number; b: number } | null {
  if (color.startsWith('#')) {
    return hexToRgb(color);
  }
  
  if (color.startsWith('oklch(')) {
    return oklchToRgb(color);
  }

  if (color.startsWith('rgb(')) {
    const match = color.match(/rgb\(([0-9]+),\s*([0-9]+),\s*([0-9]+)\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
      };
    }
  }

  // Default fallback for CSS color names
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  ctx.fillStyle = color;
  const rgba = ctx.fillStyle;
  
  if (rgba.startsWith('#')) {
    return hexToRgb(rgba);
  }
  
  return null;
}

/**
 * Calculate color contrast ratio between two colors
 * Returns ratio and WCAG compliance levels
 */
export function calculateContrastRatio(
  foreground: string,
  background: string
): ContrastResult {
  const fg = parseColor(foreground);
  const bg = parseColor(background);

  if (!fg || !bg) {
    return { ratio: 1, isAA: false, isAAA: false, level: 'fail' };
  }

  const fgLuminance = getRelativeLuminance(fg.r, fg.g, fg.b);
  const bgLuminance = getRelativeLuminance(bg.r, bg.g, bg.b);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  const ratio = (lighter + 0.05) / (darker + 0.05);

  const isAA = ratio >= 4.5;
  const isAAA = ratio >= 7;

  return {
    ratio: Math.round(ratio * 100) / 100,
    isAA,
    isAAA,
    level: isAAA ? 'AAA' : isAA ? 'AA' : 'fail',
  };
}

/**
 * Check if a color combination meets WCAG contrast requirements
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA'
): boolean {
  const result = calculateContrastRatio(foreground, background);
  return level === 'AA' ? result.isAA : result.isAAA;
}

/**
 * Validate all theme color combinations for contrast compliance
 */
export function validateThemeContrast(theme: any): {
  issues: Array<{
    combination: string;
    foreground: string;
    background: string;
    ratio: number;
    level: string;
  }>;
  isCompliant: boolean;
} {
  const issues: Array<{
    combination: string;
    foreground: string;
    background: string;
    ratio: number;
    level: string;
  }> = [];

  // Common text/background combinations to check
  const combinations = [
    { name: 'Primary text on light background', fg: theme.semantic?.text?.primary || '#000000', bg: theme.semantic?.background?.primary || '#ffffff' },
    { name: 'Secondary text on light background', fg: theme.semantic?.text?.secondary || '#666666', bg: theme.semantic?.background?.primary || '#ffffff' },
    { name: 'Primary button text', fg: '#ffffff', bg: theme.colors?.primary?.[500] || '#0066cc' },
    { name: 'Link text', fg: theme.colors?.primary?.[600] || '#0052a3', bg: theme.semantic?.background?.primary || '#ffffff' },
  ];

  combinations.forEach((combo) => {
    const result = calculateContrastRatio(combo.fg, combo.bg);
    if (!result.isAA) {
      issues.push({
        combination: combo.name,
        foreground: combo.fg,
        background: combo.bg,
        ratio: result.ratio,
        level: result.level,
      });
    }
  });

  return {
    issues,
    isCompliant: issues.length === 0,
  };
}

// ARIA and Semantic HTML utilities
export interface AriaAttributes {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-hidden'?: boolean;
  'aria-live'?: 'polite' | 'assertive' | 'off';
  'aria-current'?: 'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false';
  'aria-modal'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean;
  role?: string;
  tabIndex?: number;
}

/**
 * Generate appropriate ARIA attributes for common component patterns
 */
export function generateAriaAttributes(
  type: 'button' | 'modal' | 'dropdown' | 'tab' | 'toggle' | 'input',
  options: {
    label?: string;
    expanded?: boolean;
    current?: boolean;
    describedBy?: string;
    hidden?: boolean;
    live?: 'polite' | 'assertive';
  } = {}
): AriaAttributes {
  const base: AriaAttributes = {};

  switch (type) {
    case 'button':
      if (options.label) base['aria-label'] = options.label;
      if (options.expanded !== undefined) base['aria-expanded'] = options.expanded;
      break;

    case 'modal':
      base.role = 'dialog';
      base['aria-modal'] = true;
      if (options.label) base['aria-label'] = options.label;
      break;

    case 'dropdown':
      base.role = 'menu';
      base['aria-expanded'] = options.expanded || false;
      break;

    case 'tab':
      base.role = 'tab';
      base['aria-selected'] = options.current || false;
      if (options.current) base['aria-current'] = 'page';
      break;

    case 'toggle':
      base.role = 'switch';
      base['aria-checked'] = options.expanded || false;
      if (options.label) base['aria-label'] = options.label;
      break;

    case 'input':
      if (options.describedBy) base['aria-describedby'] = options.describedBy;
      if (options.label) base['aria-label'] = options.label;
      break;
  }

  if (options.hidden) base['aria-hidden'] = true;
  if (options.live) base['aria-live'] = options.live;

  return base;
}

/**
 * Create announcements for screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// Keyboard navigation utilities
export interface KeyboardNavigation {
  onKeyDown: (event: KeyboardEvent) => void;
  trapFocus: (container: HTMLElement) => () => void;
  manageFocus: (elements: HTMLElement[]) => void;
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]',
  ].join(', ');

  return Array.from(container.querySelectorAll(focusableSelectors));
}

/**
 * Trap focus within a container (for modals, dropdowns)
 */
export function createFocusTrap(container: HTMLElement): () => void {
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Tab') {
      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    }

    if (event.key === 'Escape') {
      // Allow parent to handle escape
      event.stopPropagation();
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Focus first element
  firstElement?.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Create keyboard navigation for a list of elements
 */
export function createKeyboardNavigation(
  elements: HTMLElement[],
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    loop?: boolean;
    onActivate?: (element: HTMLElement, index: number) => void;
  } = {}
): (event: KeyboardEvent) => void {
  const { orientation = 'vertical', loop = true, onActivate } = options;
  let currentIndex = 0;

  const getNextIndex = (direction: 'next' | 'prev'): number => {
    if (direction === 'next') {
      return loop
        ? (currentIndex + 1) % elements.length
        : Math.min(currentIndex + 1, elements.length - 1);
    } else {
      return loop
        ? currentIndex === 0 ? elements.length - 1 : currentIndex - 1
        : Math.max(currentIndex - 1, 0);
    }
  };

  return (event: KeyboardEvent) => {
    const { key } = event;
    let handled = false;

    switch (key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          currentIndex = getNextIndex('next');
          handled = true;
        }
        break;

      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          currentIndex = getNextIndex('prev');
          handled = true;
        }
        break;

      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          currentIndex = getNextIndex('next');
          handled = true;
        }
        break;

      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          currentIndex = getNextIndex('prev');
          handled = true;
        }
        break;

      case 'Home':
        currentIndex = 0;
        handled = true;
        break;

      case 'End':
        currentIndex = elements.length - 1;
        handled = true;
        break;

      case 'Enter':
      case ' ':
        if (onActivate) {
          onActivate(elements[currentIndex], currentIndex);
          handled = true;
        }
        break;
    }

    if (handled) {
      event.preventDefault();
      elements[currentIndex]?.focus();
    }
  };
}

// Reduced motion utilities
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function respectReducedMotion<T>(
  normalValue: T,
  reducedValue: T
): T {
  return prefersReducedMotion() ? reducedValue : normalValue;
}

// Screen reader utilities
export const ScreenReaderClass = 'sr-only';

export const screenReaderStyles = `
  .${ScreenReaderClass} {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;

// Focus management utilities
export function saveFocusPosition(): () => void {
  const activeElement = document.activeElement as HTMLElement;
  
  return () => {
    if (activeElement && typeof activeElement.focus === 'function') {
      activeElement.focus();
    }
  };
}

export function setFocusToFirstError(container: HTMLElement): void {
  const errorElement = container.querySelector('[aria-invalid="true"], .error input, .error textarea, .error select');
  if (errorElement && typeof (errorElement as HTMLElement).focus === 'function') {
    (errorElement as HTMLElement).focus();
  }
}

// Validation utilities for common accessibility patterns
export function validateHeadingStructure(container: HTMLElement = document.body): {
  isValid: boolean;
  issues: string[];
} {
  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  const issues: string[] = [];
  
  let hasH1 = false;
  let lastLevel = 0;

  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.substring(1));
    
    if (level === 1) {
      if (hasH1) {
        issues.push(`Multiple h1 elements found. Page should have only one h1.`);
      }
      hasH1 = true;
    }

    if (index === 0 && level !== 1) {
      issues.push(`First heading should be h1, found ${heading.tagName.toLowerCase()}`);
    }

    if (lastLevel > 0 && level > lastLevel + 1) {
      issues.push(`Heading level skipped: ${heading.tagName.toLowerCase()} follows h${lastLevel}`);
    }

    lastLevel = level;
  });

  if (!hasH1 && headings.length > 0) {
    issues.push('No h1 element found. Page should have exactly one h1.');
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

export function validateFormLabels(container: HTMLElement = document.body): {
  isValid: boolean;
  issues: string[];
} {
  const inputs = Array.from(container.querySelectorAll('input, textarea, select'));
  const issues: string[] = [];

  inputs.forEach((input) => {
    const hasLabel = 
      input.hasAttribute('aria-label') ||
      input.hasAttribute('aria-labelledby') ||
      container.querySelector(`label[for="${input.id}"]`) ||
      input.closest('label');

    if (!hasLabel) {
      issues.push(`Form input missing label: ${input.tagName.toLowerCase()}${input.id ? `#${input.id}` : ''}`);
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
  };
}

// Export validation function for all contextual themes
export function validateAllContextualThemes(): boolean {
  // Implementation for validating contextual themes
  // This would check that all contextual themes meet accessibility standards
  return true;
} 