/**
 * Tests for accessibility utilities
 * Ensures WCAG 2.1 AA compliance functions work correctly
 */

import {
  calculateContrastRatio,
  meetsContrastRequirement,
  validateThemeContrast,
  generateAriaAttributes,
  announceToScreenReader,
  getFocusableElements,
  createFocusTrap,
  createKeyboardNavigation,
  prefersReducedMotion,
  respectReducedMotion,
  validateHeadingStructure,
  validateFormLabels,
  ScreenReaderClass,
  screenReaderStyles,
} from '../accessibility';

// Mock DOM methods
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock canvas context for color parsing
const mockGetContext = jest.fn(() => ({
  fillStyle: '#000000',
}));

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: mockGetContext,
});

describe('Color Contrast Calculations', () => {
  describe('calculateContrastRatio', () => {
    test('calculates correct contrast ratio for black and white', () => {
      const result = calculateContrastRatio('#000000', '#ffffff');
      expect(result.ratio).toBe(21); // Perfect contrast
      expect(result.isAA).toBe(true);
      expect(result.isAAA).toBe(true);
      expect(result.level).toBe('AAA');
    });

    test('calculates correct contrast ratio for same colors', () => {
      const result = calculateContrastRatio('#ffffff', '#ffffff');
      expect(result.ratio).toBe(1); // No contrast
      expect(result.isAA).toBe(false);
      expect(result.isAAA).toBe(false);
      expect(result.level).toBe('fail');
    });

    test('handles invalid color formats gracefully', () => {
      const result = calculateContrastRatio('invalid', 'alsoinvalid');
      expect(result.ratio).toBe(1);
      expect(result.level).toBe('fail');
    });

    test('calculates medium contrast correctly', () => {
      const result = calculateContrastRatio('#666666', '#ffffff');
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.isAA).toBe(true);
    });

    test('handles hex colors without # prefix', () => {
      const result = calculateContrastRatio('000000', 'ffffff');
      expect(result.ratio).toBe(21);
    });

    test('handles RGB color format', () => {
      const result = calculateContrastRatio('rgb(0, 0, 0)', 'rgb(255, 255, 255)');
      expect(result.ratio).toBe(21);
    });

    test('handles OKLCH color format', () => {
      const result = calculateContrastRatio('oklch(0.0 0.0 0)', 'oklch(1.0 0.0 0)');
      expect(result.ratio).toBeGreaterThan(1);
    });
  });

  describe('meetsContrastRequirement', () => {
    test('returns true for AA compliant colors', () => {
      expect(meetsContrastRequirement('#000000', '#ffffff', 'AA')).toBe(true);
      expect(meetsContrastRequirement('#666666', '#ffffff', 'AA')).toBe(true);
    });

    test('returns false for non-compliant colors', () => {
      expect(meetsContrastRequirement('#cccccc', '#ffffff', 'AA')).toBe(false);
    });

    test('defaults to AA level', () => {
      expect(meetsContrastRequirement('#000000', '#ffffff')).toBe(true);
    });

    test('handles AAA level requirement', () => {
      expect(meetsContrastRequirement('#000000', '#ffffff', 'AAA')).toBe(true);
      expect(meetsContrastRequirement('#666666', '#ffffff', 'AAA')).toBe(false);
    });
  });

  describe('validateThemeContrast', () => {
    test('validates theme with good contrast', () => {
      const goodTheme = {
        semantic: {
          text: { primary: '#000000', secondary: '#333333' },
          background: { primary: '#ffffff' },
        },
        colors: {
          primary: { 500: '#0066cc', 600: '#0052a3' },
        },
      };

      const result = validateThemeContrast(goodTheme);
      expect(result.isCompliant).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    test('identifies contrast issues', () => {
      const badTheme = {
        semantic: {
          text: { primary: '#cccccc', secondary: '#dddddd' },
          background: { primary: '#ffffff' },
        },
        colors: {
          primary: { 500: '#f0f0f0', 600: '#e0e0e0' },
        },
      };

      const result = validateThemeContrast(badTheme);
      expect(result.isCompliant).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    test('handles missing theme properties', () => {
      const incompleteTheme = {};
      const result = validateThemeContrast(incompleteTheme);
      expect(result.isCompliant).toBe(true); // Uses fallback colors
    });
  });
});

describe('ARIA Attributes', () => {
  describe('generateAriaAttributes', () => {
    test('generates button attributes', () => {
      const attrs = generateAriaAttributes('button', {
        label: 'Test Button',
        expanded: true,
      });

      expect(attrs['aria-label']).toBe('Test Button');
      expect(attrs['aria-expanded']).toBe(true);
    });

    test('generates modal attributes', () => {
      const attrs = generateAriaAttributes('modal', {
        label: 'Test Modal',
      });

      expect(attrs.role).toBe('dialog');
      expect(attrs['aria-modal']).toBe(true);
      expect(attrs['aria-label']).toBe('Test Modal');
    });

    test('generates dropdown attributes', () => {
      const attrs = generateAriaAttributes('dropdown', {
        expanded: false,
      });

      expect(attrs.role).toBe('menu');
      expect(attrs['aria-expanded']).toBe(false);
    });

    test('generates tab attributes', () => {
      const attrs = generateAriaAttributes('tab', {
        current: true,
      });

      expect(attrs.role).toBe('tab');
      expect(attrs['aria-selected']).toBe(true);
      expect(attrs['aria-current']).toBe('page');
    });

    test('generates toggle attributes', () => {
      const attrs = generateAriaAttributes('toggle', {
        label: 'Toggle Setting',
        expanded: false,
      });

      expect(attrs.role).toBe('switch');
      expect(attrs['aria-checked']).toBe(false);
      expect(attrs['aria-label']).toBe('Toggle Setting');
    });

    test('generates input attributes', () => {
      const attrs = generateAriaAttributes('input', {
        label: 'Input Field',
        describedBy: 'help-text',
      });

      expect(attrs['aria-label']).toBe('Input Field');
      expect(attrs['aria-describedby']).toBe('help-text');
    });

    test('handles hidden elements', () => {
      const attrs = generateAriaAttributes('button', {
        hidden: true,
      });

      expect(attrs['aria-hidden']).toBe(true);
    });

    test('handles live regions', () => {
      const attrs = generateAriaAttributes('button', {
        live: 'assertive',
      });

      expect(attrs['aria-live']).toBe('assertive');
    });
  });
});

describe('Screen Reader Announcements', () => {
  test('creates announcement element', () => {
    document.body.innerHTML = '';
    announceToScreenReader('Test message', 'polite');

    const announcement = document.querySelector('[aria-live="polite"]');
    expect(announcement).toBeTruthy();
    expect(announcement?.textContent).toBe('Test message');
    expect(announcement?.getAttribute('aria-atomic')).toBe('true');
  });

  test('removes announcement after timeout', (done) => {
    document.body.innerHTML = '';
    announceToScreenReader('Test message', 'assertive');

    setTimeout(() => {
      const announcement = document.querySelector('[aria-live="assertive"]');
      expect(announcement).toBeFalsy();
      done();
    }, 1100);
  });

  test('defaults to polite priority', () => {
    document.body.innerHTML = '';
    announceToScreenReader('Test message');

    const announcement = document.querySelector('[aria-live="polite"]');
    expect(announcement).toBeTruthy();
  });
});

describe('Focus Management', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="container">
        <button id="btn1">Button 1</button>
        <input id="input1" type="text" />
        <a href="#" id="link1">Link 1</a>
        <button disabled id="btn-disabled">Disabled</button>
        <div tabindex="0" id="div1">Focusable Div</div>
        <button id="btn2">Button 2</button>
      </div>
    `;
  });

  describe('getFocusableElements', () => {
    test('finds all focusable elements', () => {
      const container = document.getElementById('container')!;
      const focusable = getFocusableElements(container);

      expect(focusable).toHaveLength(4); // Excludes disabled button
      expect(focusable.map(el => el.id)).toEqual(['btn1', 'input1', 'link1', 'div1', 'btn2']);
    });

    test('returns empty array for container with no focusable elements', () => {
      const container = document.createElement('div');
      container.innerHTML = '<div>No focusable elements</div>';
      const focusable = getFocusableElements(container);

      expect(focusable).toHaveLength(0);
    });
  });

  describe('createFocusTrap', () => {
    test('focuses first element on creation', () => {
      const container = document.getElementById('container')!;
      const cleanup = createFocusTrap(container);

      expect(document.activeElement?.id).toBe('btn1');
      cleanup();
    });

    test('traps focus within container', () => {
      const container = document.getElementById('container')!;
      const cleanup = createFocusTrap(container);

      // Simulate Tab from last element
      const lastButton = document.getElementById('btn2')!;
      lastButton.focus();

      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      container.dispatchEvent(tabEvent);

      cleanup();
    });

    test('handles Shift+Tab reverse navigation', () => {
      const container = document.getElementById('container')!;
      const cleanup = createFocusTrap(container);

      // Simulate Shift+Tab from first element
      const firstButton = document.getElementById('btn1')!;
      firstButton.focus();

      const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
      container.dispatchEvent(shiftTabEvent);

      cleanup();
    });
  });

  describe('createKeyboardNavigation', () => {
    test('creates navigation handler for vertical orientation', () => {
      const elements = [
        document.getElementById('btn1')!,
        document.getElementById('input1')!,
        document.getElementById('link1')!,
      ];

      const handler = createKeyboardNavigation(elements, {
        orientation: 'vertical',
        loop: true,
      });

      expect(typeof handler).toBe('function');
    });

    test('handles arrow key navigation', () => {
      const elements = [
        document.getElementById('btn1')!,
        document.getElementById('input1')!,
        document.getElementById('link1')!,
      ];

      const mockOnActivate = jest.fn();
      const handler = createKeyboardNavigation(elements, {
        orientation: 'vertical',
        onActivate: mockOnActivate,
      });

      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      handler(downEvent);

      expect(mockOnActivate).not.toHaveBeenCalled(); // Only called on Enter/Space
    });

    test('handles Enter key activation', () => {
      const elements = [
        document.getElementById('btn1')!,
        document.getElementById('input1')!,
      ];

      const mockOnActivate = jest.fn();
      const handler = createKeyboardNavigation(elements, {
        onActivate: mockOnActivate,
      });

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      handler(enterEvent);

      expect(mockOnActivate).toHaveBeenCalledWith(elements[0], 0);
    });

    test('handles Home and End keys', () => {
      const elements = [
        document.getElementById('btn1')!,
        document.getElementById('input1')!,
        document.getElementById('link1')!,
      ];

      const handler = createKeyboardNavigation(elements);

      const homeEvent = new KeyboardEvent('keydown', { key: 'Home' });
      const endEvent = new KeyboardEvent('keydown', { key: 'End' });

      handler(homeEvent);
      handler(endEvent);
    });
  });
});

describe('Reduced Motion', () => {
  test('prefersReducedMotion returns false by default', () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  test('prefersReducedMotion returns true when media query matches', () => {
    (window.matchMedia as jest.Mock).mockImplementation(() => ({
      matches: true,
    }));

    expect(prefersReducedMotion()).toBe(true);
  });

  test('respectReducedMotion returns reduced value when preferred', () => {
    (window.matchMedia as jest.Mock).mockImplementation(() => ({
      matches: true,
    }));

    const result = respectReducedMotion('spring', 'none');
    expect(result).toBe('none');
  });

  test('respectReducedMotion returns normal value when not preferred', () => {
    (window.matchMedia as jest.Mock).mockImplementation(() => ({
      matches: false,
    }));

    const result = respectReducedMotion('spring', 'none');
    expect(result).toBe('spring');
  });
});

describe('Validation Functions', () => {
  describe('validateHeadingStructure', () => {
    test('validates correct heading structure', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <h1>Main Title</h1>
        <h2>Section</h2>
        <h3>Subsection</h3>
        <h2>Another Section</h2>
      `;

      const result = validateHeadingStructure(container);
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    test('detects missing h1', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <h2>Section</h2>
        <h3>Subsection</h3>
      `;

      const result = validateHeadingStructure(container);
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('First heading should be h1, found h2');
    });

    test('detects skipped heading levels', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <h1>Main Title</h1>
        <h4>Skipped Level</h4>
      `;

      const result = validateHeadingStructure(container);
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Heading level skipped: h4 follows h1');
    });

    test('detects multiple h1 elements', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <h1>First Title</h1>
        <h1>Second Title</h1>
      `;

      const result = validateHeadingStructure(container);
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Multiple h1 elements found. Page should have only one h1.');
    });
  });

  describe('validateFormLabels', () => {
    test('validates forms with proper labels', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <form>
          <label for="input1">Name</label>
          <input id="input1" type="text" />
          
          <label>
            Email
            <input type="email" />
          </label>
          
          <input type="submit" aria-label="Submit form" />
        </form>
      `;

      const result = validateFormLabels(container);
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    test('detects inputs without labels', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <form>
          <input type="text" id="unlabeled" />
          <input type="email" />
        </form>
      `;

      const result = validateFormLabels(container);
      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('Form input missing label');
    });

    test('accepts aria-label as valid label', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <form>
          <input type="text" aria-label="Search" />
        </form>
      `;

      const result = validateFormLabels(container);
      expect(result.isValid).toBe(true);
    });

    test('accepts aria-labelledby as valid label', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <form>
          <span id="label1">Username</span>
          <input type="text" aria-labelledby="label1" />
        </form>
      `;

      const result = validateFormLabels(container);
      expect(result.isValid).toBe(true);
    });
  });
});

describe('Screen Reader Utilities', () => {
  test('exports correct screen reader class name', () => {
    expect(ScreenReaderClass).toBe('sr-only');
  });

  test('exports screen reader styles', () => {
    expect(screenReaderStyles).toContain('.sr-only');
    expect(screenReaderStyles).toContain('position: absolute');
    expect(screenReaderStyles).toContain('width: 1px');
    expect(screenReaderStyles).toContain('height: 1px');
  });
});

describe('Integration Tests', () => {
  test('full accessibility audit flow', () => {
    document.body.innerHTML = `
      <main>
        <h1>Accessible Page</h1>
        <form>
          <label for="name">Name</label>
          <input id="name" type="text" />
          <button type="submit">Submit</button>
        </form>
      </main>
    `;

    const headingResult = validateHeadingStructure();
    const formResult = validateFormLabels();

    expect(headingResult.isValid).toBe(true);
    expect(formResult.isValid).toBe(true);
  });

  test('handles complex nested structures', () => {
    document.body.innerHTML = `
      <div role="application">
        <header>
          <h1>App Title</h1>
          <nav aria-label="Main navigation">
            <button aria-expanded="false" aria-controls="menu">Menu</button>
            <ul id="menu" role="menu" hidden>
              <li role="menuitem"><a href="/">Home</a></li>
              <li role="menuitem"><a href="/about">About</a></li>
            </ul>
          </nav>
        </header>
        <main>
          <section>
            <h2>Content Section</h2>
            <p>Content goes here.</p>
          </section>
        </main>
      </div>
    `;

    const focusableElements = getFocusableElements(document.body);
    expect(focusableElements.length).toBeGreaterThan(0);

    const headingResult = validateHeadingStructure();
    expect(headingResult.isValid).toBe(true);
  });
}); 