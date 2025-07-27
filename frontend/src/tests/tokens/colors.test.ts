/**
 * Unit tests for color tokens
 * Tests color token generation, validation, and utility functions
 */

import {
  colorTokens,
  semanticColorMap,
  generateColorVariables,
  defaultColorConfig,
} from '../../styles/tokens/colors';

describe('Color Tokens', () => {
  describe('colorTokens structure', () => {
    // Expected use test
    it('should have all required color categories', () => {
      expect(colorTokens).toHaveProperty('primary');
      expect(colorTokens).toHaveProperty('secondary');
      expect(colorTokens).toHaveProperty('accent');
      expect(colorTokens).toHaveProperty('neutral');
      expect(colorTokens).toHaveProperty('semantic');
      expect(colorTokens).toHaveProperty('special');
    });

    // Expected use test
    it('should have complete color scales', () => {
      // Primary should have all shades
      expect(Object.keys(colorTokens.primary)).toHaveLength(11);
      expect(colorTokens.primary).toHaveProperty('50');
      expect(colorTokens.primary).toHaveProperty('500'); // Base color
      expect(colorTokens.primary).toHaveProperty('950');

      // Neutral should include extended range
      expect(colorTokens.neutral).toHaveProperty('0');
      expect(colorTokens.neutral).toHaveProperty('1000');
    });

    // Expected use test
    it('should use OKLCH color space for modern colors', () => {
      expect(colorTokens.primary[500]).toMatch(/oklch\(/);
      expect(colorTokens.semantic.success[500]).toMatch(/oklch\(/);
      expect(colorTokens.accent[500]).toMatch(/oklch\(/);
    });

    // Edge case test
    it('should handle special colors with different formats', () => {
      expect(colorTokens.special.glass.light).toMatch(/rgba\(/);
      expect(colorTokens.special.neon.cyan).toMatch(/oklch\(/);
      expect(colorTokens.special.highContrast.black).toMatch(/oklch\(/);
    });
  });

  describe('semanticColorMap', () => {
    // Expected use test
    it('should provide semantic mappings for all contexts', () => {
      expect(semanticColorMap).toHaveProperty('background');
      expect(semanticColorMap).toHaveProperty('text');
      expect(semanticColorMap).toHaveProperty('border');
      expect(semanticColorMap).toHaveProperty('interactive');
      expect(semanticColorMap).toHaveProperty('status');
    });

    // Expected use test
    it('should use CSS custom property format', () => {
      expect(semanticColorMap.background.primary).toMatch(/var\(--color-/);
      expect(semanticColorMap.text.primary).toMatch(/var\(--color-/);
      expect(semanticColorMap.status.success).toMatch(/var\(--color-/);
    });

    // Edge case test
    it('should handle all semantic color categories', () => {
      const backgroundKeys = Object.keys(semanticColorMap.background);
      expect(backgroundKeys).toContain('primary');
      expect(backgroundKeys).toContain('inverse');

      const statusKeys = Object.keys(semanticColorMap.status);
      expect(statusKeys).toEqual(['success', 'warning', 'error', 'info']);
    });
  });

  describe('generateColorVariables', () => {
    let variables: Record<string, string>;

    beforeEach(() => {
      variables = generateColorVariables(colorTokens);
    });

    // Expected use test
    it('should generate CSS custom properties for all color tokens', () => {
      expect(variables).toHaveProperty('--color-primary-500');
      expect(variables).toHaveProperty('--color-neutral-0');
      expect(variables).toHaveProperty('--color-semantic-success-500');
      expect(variables).toHaveProperty('--color-special-glass-light');
    });

    // Expected use test
    it('should maintain original color values', () => {
      expect(variables['--color-primary-500']).toBe(colorTokens.primary[500]);
      expect(variables['--color-semantic-error-500']).toBe(colorTokens.semantic.error[500]);
      expect(variables['--color-special-neon-cyan']).toBe(colorTokens.special.neon.cyan);
    });

    // Edge case test
    it('should handle numeric keys correctly', () => {
      expect(variables).toHaveProperty('--color-neutral-0');
      expect(variables).toHaveProperty('--color-neutral-1000');
      expect(variables['--color-neutral-0']).toBe('oklch(1.00 0.00 0)');
    });

    // Edge case test
    it('should generate variables for all special color categories', () => {
      expect(variables).toHaveProperty('--color-special-glass-light');
      expect(variables).toHaveProperty('--color-special-neon-cyan');
      expect(variables).toHaveProperty('--color-special-highContrast-black');
    });

    // Failure case test
    it('should handle empty or malformed input gracefully', () => {
      const emptyResult = generateColorVariables({} as any);
      expect(emptyResult).toEqual({});

      // Should not throw on missing properties
      expect(() => {
        generateColorVariables({
          primary: {},
          secondary: {},
          accent: {},
          neutral: {},
          semantic: {},
          special: {},
        } as any);
      }).not.toThrow();
    });
  });

  describe('defaultColorConfig', () => {
    // Expected use test
    it('should export complete configuration object', () => {
      expect(defaultColorConfig).toHaveProperty('tokens');
      expect(defaultColorConfig).toHaveProperty('semantic');
      expect(defaultColorConfig).toHaveProperty('variables');
    });

    // Expected use test
    it('should reference the same token objects', () => {
      expect(defaultColorConfig.tokens).toBe(colorTokens);
      expect(defaultColorConfig.semantic).toBe(semanticColorMap);
    });

    // Edge case test
    it('should have pre-generated variables', () => {
      expect(typeof defaultColorConfig.variables).toBe('object');
      expect(Object.keys(defaultColorConfig.variables).length).toBeGreaterThan(0);
      expect(defaultColorConfig.variables).toHaveProperty('--color-primary-500');
    });
  });

  describe('Color value validation', () => {
    // Expected use test
    it('should have valid OKLCH values', () => {
      const oklchRegex = /oklch\(\d+\.?\d*\s+\d+\.?\d*\s+\d+\.?\d*\)/;
      expect(colorTokens.primary[500]).toMatch(oklchRegex);
      expect(colorTokens.semantic.success[500]).toMatch(oklchRegex);
    });

    // Edge case test
    it('should handle special format colors', () => {
      const rgbaRegex = /rgba\(\d+,\s*\d+,\s*\d+,\s*\d+\.?\d*\)/;
      expect(colorTokens.special.glass.light).toMatch(rgbaRegex);
    });

    // Failure case test - simulate invalid color format
    it('should be resilient to potential invalid color formats', () => {
      // This tests that our structure allows for different color formats
      // without breaking the system
      const testTokens = {
        ...colorTokens,
        test: {
          invalid: 'not-a-color',
          valid: 'oklch(0.5 0.2 250)',
        },
      };

      expect(() => {
        generateColorVariables(testTokens as any);
      }).not.toThrow();
    });
  });
}); 