/**
 * Axe-core setup for automated accessibility testing
 * Configures accessibility testing for development and production
 */

import { announceToScreenReader } from './accessibility';

// Dynamic import for axe-core to avoid SSR issues
let axeCore: any = null;

const axeConfig = {
  rules: {
    // Enable all WCAG 2.1 AA rules
    'color-contrast': { enabled: true },
    'color-contrast-enhanced': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'hidden-content': { enabled: true },
    'keyboard': { enabled: true },
    'landmark-banner-is-top-level': { enabled: true },
    'landmark-main-is-top-level': { enabled: true },
    'landmark-no-duplicate-banner': { enabled: true },
    'landmark-no-duplicate-contentinfo': { enabled: true },
    'landmark-no-duplicate-main': { enabled: true },
    'landmark-one-main': { enabled: true },
    'page-has-heading-one': { enabled: true },
    'region': { enabled: true },
    'skip-link': { enabled: true },
    'tabindex': { enabled: true },
    'valid-lang': { enabled: true },
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
};

/**
 * Initialize axe-core accessibility testing
 * Should be called in development mode only
 */
export async function initializeAxe(): Promise<void> {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    try {
      // Dynamic import to avoid bundling in production
      const axe = await import('axe-core');
      axeCore = axe.default || axe;
      
      console.log('🔍 Axe accessibility testing initialized');
      announceToScreenReader('Accessibility testing active', 'polite');
    } catch (error) {
      console.warn('Failed to initialize axe-core:', error);
    }
  }
}

/**
 * Get axe-core instance
 */
async function getAxe(): Promise<any> {
  if (!axeCore && typeof window !== 'undefined') {
    try {
      const axe = await import('axe-core');
      axeCore = axe.default || axe;
    } catch (error) {
      console.warn('Failed to load axe-core:', error);
      return null;
    }
  }
  return axeCore;
}

/**
 * Run accessibility audit on a specific element
 */
export async function runAccessibilityAudit(
  element: HTMLElement = document.body,
  options: {
    rules?: Record<string, { enabled: boolean }>;
    tags?: string[];
    announce?: boolean;
  } = {}
): Promise<{
  violations: any[];
  passes: any[];
  inaccessible: any[];
  incomplete: any[];
  summary: {
    violationCount: number;
    passCount: number;
    incompleteCount: number;
    inaccessibleCount: number;
  };
}> {
  const { rules, tags = ['wcag2a', 'wcag2aa', 'wcag21aa'], announce = true } = options;
  
  try {
    const axe = await getAxe();
    if (!axe) {
      throw new Error('Axe-core not available');
    }

    const results = await axe.run(element, {
      rules: rules || axeConfig.rules,
      tags,
    });

    const summary = {
      violationCount: results.violations.length,
      passCount: results.passes.length,
      incompleteCount: results.incomplete.length,
      inaccessibleCount: results.inaccessible.length,
    };

    if (announce && summary.violationCount > 0) {
      announceToScreenReader(
        `Accessibility audit found ${summary.violationCount} violations`,
        'polite'
      );
    }

    // Log results in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🔍 Accessibility Audit Results');
      console.log('Violations:', results.violations);
      console.log('Passes:', results.passes.length);
      console.log('Incomplete:', results.incomplete.length);
      console.groupEnd();
    }

    return {
      violations: results.violations,
      passes: results.passes,
      inaccessible: results.inaccessible,
      incomplete: results.incomplete,
      summary,
    };
  } catch (error) {
    console.error('Accessibility audit failed:', error);
    return {
      violations: [],
      passes: [],
      inaccessible: [],
      incomplete: [],
      summary: {
        violationCount: 0,
        passCount: 0,
        incompleteCount: 0,
        inaccessibleCount: 0,
      },
    };
  }
}

/**
 * Test color contrast for all elements with specific selectors
 */
export async function testColorContrast(
  selectors: string[] = [
    'button',
    'a',
    'input',
    'textarea',
    'select',
    '[role="button"]',
    '[role="link"]',
  ]
): Promise<{
  results: Array<{
    selector: string;
    element: HTMLElement;
    violations: any[];
  }>;
  totalViolations: number;
}> {
  const results: Array<{
    selector: string;
    element: HTMLElement;
    violations: any[];
  }> = [];
  
  let totalViolations = 0;

  try {
    const axe = await getAxe();
    if (!axe) {
      return { results, totalViolations };
    }

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      
      for (const element of Array.from(elements)) {
        try {
          const auditResult = await axe.run(element as HTMLElement, {
            rules: {
              'color-contrast': { enabled: true },
              'color-contrast-enhanced': { enabled: true },
            },
          });

          if (auditResult.violations.length > 0) {
            results.push({
              selector,
              element: element as HTMLElement,
              violations: auditResult.violations,
            });
            totalViolations += auditResult.violations.length;
          }
        } catch (error) {
          console.warn(`Color contrast test failed for ${selector}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Color contrast testing failed:', error);
  }

  return { results, totalViolations };
}

/**
 * Test keyboard navigation accessibility
 */
export async function testKeyboardNavigation(): Promise<{
  focusableElements: HTMLElement[];
  violations: any[];
  recommendations: string[];
}> {
  const focusableElements = Array.from(
    document.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"]), [contenteditable]'
    )
  ) as HTMLElement[];

  const violations: any[] = [];
  const recommendations: string[] = [];

  try {
    const axe = await getAxe();
    if (axe) {
      // Test for proper tab order
      const auditResult = await axe.run(document.body, {
        rules: {
          'tabindex': { enabled: true },
          'focus-order-semantics': { enabled: true },
        },
      });

      violations.push(...auditResult.violations);
    }

    // Check for elements without visible focus indicators
    focusableElements.forEach((element, index) => {
      const computedStyle = window.getComputedStyle(element, ':focus');
      const hasVisibleFocus = 
        computedStyle.outline !== 'none' ||
        computedStyle.outlineWidth !== '0px' ||
        computedStyle.boxShadow !== 'none';

      if (!hasVisibleFocus) {
        recommendations.push(
          `Element ${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''} at index ${index} lacks visible focus indicator`
        );
      }
    });
  } catch (error) {
    console.error('Keyboard navigation testing failed:', error);
  }

  return {
    focusableElements,
    violations,
    recommendations,
  };
}

/**
 * Test heading structure
 */
export async function testHeadingStructure(): Promise<{
  violations: any[];
  headings: Array<{
    level: number;
    text: string;
    element: HTMLElement;
  }>;
  isValid: boolean;
  issues: string[];
}> {
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((heading) => ({
    level: parseInt(heading.tagName.substring(1)),
    text: heading.textContent || '',
    element: heading as HTMLElement,
  }));

  const issues: string[] = [];
  const violations: any[] = [];

  try {
    const axe = await getAxe();
    if (axe) {
      const auditResult = await axe.run(document.body, {
        rules: {
          'page-has-heading-one': { enabled: true },
          'heading-order': { enabled: true },
        },
      });
      violations.push(...auditResult.violations);
    }

    // Check for proper heading hierarchy
    let lastLevel = 0;
    headings.forEach((heading, index) => {
      if (index === 0 && heading.level !== 1) {
        issues.push('Page should start with an h1 heading');
      }
      
      if (lastLevel > 0 && heading.level > lastLevel + 1) {
        issues.push(`Heading level skipped: h${heading.level} follows h${lastLevel}`);
      }
      
      lastLevel = heading.level;
    });
  } catch (error) {
    console.error('Heading structure testing failed:', error);
  }

  return {
    violations,
    headings,
    isValid: violations.length === 0 && issues.length === 0,
    issues,
  };
}

/**
 * Test form accessibility
 */
export async function testFormAccessibility(): Promise<{
  violations: any[];
  forms: Array<{
    element: HTMLFormElement;
    inputs: HTMLElement[];
    missingLabels: HTMLElement[];
  }>;
  totalIssues: number;
}> {
  const violations: any[] = [];

  try {
    const axe = await getAxe();
    if (axe) {
      const auditResult = await axe.run(document.body, {
        rules: {
          'label': { enabled: true },
          'label-title-only': { enabled: true },
          'form-field-multiple-labels': { enabled: true },
        },
      });
      violations.push(...auditResult.violations);
    }
  } catch (error) {
    console.error('Form accessibility testing failed:', error);
  }

  const forms = Array.from(document.querySelectorAll('form')).map((form) => {
    const inputs = Array.from(form.querySelectorAll('input, textarea, select')) as HTMLElement[];
    const missingLabels = inputs.filter((input) => {
      const hasLabel = 
        input.hasAttribute('aria-label') ||
        input.hasAttribute('aria-labelledby') ||
        form.querySelector(`label[for="${input.id}"]`) ||
        input.closest('label');
      return !hasLabel;
    });

    return {
      element: form as HTMLFormElement,
      inputs,
      missingLabels,
    };
  });

  const totalIssues = violations.length + 
    forms.reduce((sum, form) => sum + form.missingLabels.length, 0);

  return {
    violations,
    forms,
    totalIssues,
  };
}

/**
 * Run comprehensive accessibility test suite
 */
export async function runComprehensiveAudit(): Promise<{
  overall: {
    violations: any[];
    passes: any[];
    summary: any;
  };
  colorContrast: Awaited<ReturnType<typeof testColorContrast>>;
  keyboardNavigation: Awaited<ReturnType<typeof testKeyboardNavigation>>;
  headingStructure: Awaited<ReturnType<typeof testHeadingStructure>>;
  formAccessibility: Awaited<ReturnType<typeof testFormAccessibility>>;
  isCompliant: boolean;
  totalIssues: number;
}> {
  console.log('🔍 Running comprehensive accessibility audit...');
  
  const [overall, colorContrast, keyboardNavigation, headingStructure, formAccessibility] = await Promise.all([
    runAccessibilityAudit(),
    testColorContrast(),
    testKeyboardNavigation(),
    testHeadingStructure(),
    testFormAccessibility(),
  ]);

  const totalIssues = 
    overall.summary.violationCount +
    colorContrast.totalViolations +
    keyboardNavigation.violations.length +
    headingStructure.violations.length +
    formAccessibility.totalIssues;

  const isCompliant = totalIssues === 0;

  console.log(`✅ Accessibility audit complete. ${totalIssues} issues found.`);
  
  if (totalIssues > 0) {
    announceToScreenReader(
      `Accessibility audit complete. ${totalIssues} issues found.`,
      'polite'
    );
  }

  return {
    overall,
    colorContrast,
    keyboardNavigation,
    headingStructure,
    formAccessibility,
    isCompliant,
    totalIssues,
  };
}

/**
 * Initialize React axe in development mode
 * This version uses @axe-core/react for React-specific testing
 */
export async function initializeReactAxe(): Promise<void> {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    try {
      const React = await import('react');
      const ReactDOM = await import('react-dom');
      const axeReact = await import('@axe-core/react');
      
      // Initialize axe with React
      axeReact.default(React, ReactDOM, 1000);
      
      console.log('🔍 React Axe accessibility testing initialized');
      announceToScreenReader('React accessibility testing active', 'polite');
    } catch (error) {
      console.warn('Failed to initialize @axe-core/react:', error);
      // Fallback to regular axe
      await initializeAxe();
    }
  }
} 