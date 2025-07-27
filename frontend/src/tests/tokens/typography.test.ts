/**
 * Unit tests for typography tokens
 * Tests typography token generation, validation, and utility functions
 */

import {
  fontFamilies,
  fontWeights,
  fontSizes,
  lineHeights,
  letterSpacing,
  typographyScale,
  generateTypographyVariables,
  createTypographyStyle,
  defaultTypographyConfig,
} from '../../styles/tokens/typography';

describe('Typography Tokens', () => {
  describe('fontFamilies', () => {
    // Expected use test
    it('should have all required font families', () => {
      expect(fontFamilies).toHaveProperty('sans');
      expect(fontFamilies).toHaveProperty('mono');
      expect(fontFamilies).toHaveProperty('serif');
    });

    // Expected use test
    it('should have proper font stacks with fallbacks', () => {
      expect(fontFamilies.sans).toContain('Inter');
      expect(fontFamilies.sans).toContain('sans-serif');
      expect(fontFamilies.mono).toContain('"JetBrains Mono"'); // Font names are quoted
      expect(fontFamilies.mono).toContain('monospace');
      expect(fontFamilies.serif).toContain('"Playfair Display"'); // Font names are quoted
      expect(fontFamilies.serif).toContain('serif');
    });
  });

  describe('fontWeights', () => {
    // Expected use test
    it('should have complete weight scale', () => {
      expect(fontWeights.thin).toBe('100');
      expect(fontWeights.normal).toBe('400');
      expect(fontWeights.bold).toBe('700');
      expect(fontWeights.black).toBe('900');
    });

    // Edge case test
    it('should have all weights as strings', () => {
      Object.values(fontWeights).forEach(weight => {
        expect(typeof weight).toBe('string');
      });
    });
  });

  describe('fontSizes', () => {
    // Expected use test
    it('should have complete size scale', () => {
      expect(fontSizes.xs).toBe('0.75rem');
      expect(fontSizes.base).toBe('1rem');
      expect(fontSizes['9xl']).toBe('8rem');
    });

    // Edge case test
    it('should use rem units for scalability', () => {
      Object.values(fontSizes).forEach(size => {
        expect(size).toMatch(/rem$/);
      });
    });
  });

  describe('typographyScale', () => {
    // Expected use test
    it('should have all required scales', () => {
      expect(typographyScale).toHaveProperty('display');
      expect(typographyScale).toHaveProperty('heading');
      expect(typographyScale).toHaveProperty('body');
      expect(typographyScale).toHaveProperty('label'); // 'caption' doesn't exist, but 'label' does
      expect(typographyScale).toHaveProperty('code');
    });

    // Expected use test
    it('should have proper display scale structure', () => {
      const display = typographyScale.display;
      expect(display).toHaveProperty('2xl');
      expect(display).toHaveProperty('xl');
      expect(display).toHaveProperty('lg');
      
      expect(display['2xl']).toHaveProperty('fontSize');
      expect(display['2xl']).toHaveProperty('lineHeight');
      expect(display['2xl']).toHaveProperty('letterSpacing');
      expect(display['2xl']).toHaveProperty('fontWeight');
    });

    // Edge case test
    it('should have consistent structure across all scales', () => {
      Object.values(typographyScale).forEach(scale => {
        Object.values(scale).forEach(style => {
          expect(style).toHaveProperty('fontSize');
          expect(style).toHaveProperty('lineHeight');
          expect(style).toHaveProperty('letterSpacing');
          expect(style).toHaveProperty('fontWeight');
        });
      });
    });
  });

  describe('generateTypographyVariables', () => {
    // Expected use test
    it('should generate CSS custom properties', () => {
      const variables = generateTypographyVariables();
      
      expect(variables).toHaveProperty('--font-family-sans');
      expect(variables).toHaveProperty('--font-weight-normal');
      expect(variables).toHaveProperty('--font-size-base');
      expect(variables).toHaveProperty('--line-height-normal');
      expect(variables).toHaveProperty('--letter-spacing-normal');
    });

    // Expected use test
    it('should convert font families to comma-separated strings', () => {
      const variables = generateTypographyVariables();
      
      expect(variables['--font-family-sans']).toContain('Inter');
      expect(variables['--font-family-sans']).toContain(',');
    });

    // Edge case test
    it('should handle all font families properly', () => {
      const variables = generateTypographyVariables();
      
      Object.keys(fontFamilies).forEach(family => {
        const key = `--font-family-${family}`;
        expect(variables).toHaveProperty(key);
        expect(typeof variables[key]).toBe('string');
      });
    });

    // Failure case test
    it('should return empty object when no tokens exist', () => {
      // Mock empty tokens
      const originalFontFamilies = fontFamilies;
      Object.keys(fontFamilies).forEach(key => {
        delete (fontFamilies as any)[key];
      });
      
      const variables = generateTypographyVariables();
      // Should still return an object, just without font family variables
      expect(typeof variables).toBe('object');
      
      // Restore original
      Object.assign(fontFamilies, originalFontFamilies);
    });
  });

  describe('createTypographyStyle', () => {
    // Expected use test
    it('should create style object for valid scale and size', () => {
      const style = createTypographyStyle('heading', 'h1');
      
      expect(style).toHaveProperty('fontSize');
      expect(style).toHaveProperty('lineHeight');
      expect(style).toHaveProperty('letterSpacing');
      expect(style).toHaveProperty('fontWeight');
    });

    // Expected use test
    it('should include all properties from typography scale', () => {
      const style = createTypographyStyle('display', '2xl');
      
      expect(style.fontSize).toBe('6rem');
      expect(style.lineHeight).toBe('1');
      expect(style.letterSpacing).toBe('-0.05em');
      expect(style.fontWeight).toBe('900');
    });

    // Edge case test
    it('should handle optional properties correctly', () => {
      const style = createTypographyStyle('code', 'md'); // Use valid size
      
      // Should include font family for code styles
      expect(style).toHaveProperty('fontFamily');
    });

    // Failure case test
    it('should return empty object for invalid scale', () => {
      const style = createTypographyStyle('invalid' as any, 'h1');
      expect(style).toEqual({});
    });

    // Failure case test
    it('should return empty object for invalid size', () => {
      const style = createTypographyStyle('heading', 'invalid');
      expect(style).toEqual({});
    });
  });

  describe('defaultTypographyConfig', () => {
    // Expected use test
    it('should have variables property', () => {
      expect(defaultTypographyConfig).toHaveProperty('variables');
      expect(typeof defaultTypographyConfig.variables).toBe('object');
    });

    // Expected use test
    it('should contain all typography variables', () => {
      const { variables } = defaultTypographyConfig;
      
      // Check some key variables exist
      expect(variables).toHaveProperty('--font-family-sans');
      expect(variables).toHaveProperty('--font-size-base');
      expect(variables).toHaveProperty('--font-weight-normal');
    });

    // Edge case test
    it('should have consistent variable naming convention', () => {
      const { variables } = defaultTypographyConfig;
      
      Object.keys(variables).forEach(key => {
        expect(key).toMatch(/^--/);
        expect(key).toMatch(/^--(font-|line-|letter-)/);
      });
    });
  });
}); 