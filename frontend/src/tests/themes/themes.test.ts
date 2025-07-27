/**
 * Unit tests for the theme system
 * Tests theme creation, variants, and functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  createTheme,
  themes,
  getTheme,
  generateThemeVariables,
  applyTheme,
  generateDynamicTheme,
  type ThemeName,
} from '../../styles/themes';

// Mock DOM methods
const mockSetProperty = jest.fn();
const mockDocumentElement = {
  style: {
    setProperty: mockSetProperty,
  },
};

const mockBody = {
  className: '',
};

Object.defineProperty(global, 'document', {
  value: {
    documentElement: mockDocumentElement,
    body: mockBody,
  },
  writable: true,
});

describe('Theme System', () => {
  beforeEach(() => {
    mockSetProperty.mockClear();
    mockBody.className = '';
  });

  describe('createTheme function', () => {
    it('should create a basic theme with default values', () => {
      const theme = createTheme('test-theme');
      
      expect(theme.name).toBe('test-theme');
      expect(theme.colors).toBeDefined();
      expect(theme.semantic).toBeDefined();
      expect(theme.typography).toBeDefined();
      expect(theme.spacing).toBeDefined();
      expect(theme.customProperties).toEqual({});
    });

    it('should merge custom properties correctly', () => {
      const customProps = {
        '--test-color': '#ff0000',
        '--test-size': '16px',
      };

      const theme = createTheme('test-theme', {
        customProperties: customProps,
      });

      expect(theme.customProperties).toEqual(customProps);
    });

    it('should deep merge color overrides', () => {
      const colorOverrides = {
        primary: {
          500: 'oklch(0.60 0.20 180)',
        },
      };

      const theme = createTheme('test-theme', {
        colors: colorOverrides,
      });

      expect(theme.colors.primary['500']).toBe('oklch(0.60 0.20 180)');
      expect(theme.colors.primary['600']).toBeDefined(); // Should preserve other values
    });

    it('should handle typography overrides', () => {
      const typographyOverrides = {
        families: {
          heading: '"Custom Font", serif',
        },
      };

      const theme = createTheme('test-theme', {
        typography: typographyOverrides,
      });

      expect(theme.typography.families.heading).toBe('"Custom Font", serif');
    });

    it('should handle spacing overrides', () => {
      const spacingOverrides = {
        spacing: {
          xs: '0.25rem',
          custom: '2.5rem',
        },
      };

      const theme = createTheme('test-theme', {
        spacing: spacingOverrides,
      });

      expect(theme.spacing.spacing.xs).toBe('0.25rem');
      expect(theme.spacing.spacing.custom).toBe('2.5rem');
    });

    it('should handle effects configuration', () => {
      const effects = {
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        borderStyle: 'solid',
        animations: {
          fade: 'fadeIn 0.3s ease',
        },
      };

      const theme = createTheme('test-theme', {
        effects,
      });

      expect(theme.effects).toEqual(effects);
    });
  });

  describe('Pre-defined themes', () => {
    it('should have all expected theme variants', () => {
      const expectedThemes: ThemeName[] = [
        'minimal',
        'neo-brutalist',
        'glassmorphic',
        'cyberpunk',
        'editorial',
        'accessible',
      ];

      expectedThemes.forEach((themeName) => {
        expect(themes[themeName]).toBeDefined();
        expect(themes[themeName].name).toBe(themeName);
      });
    });

    it('should have unique theme names', () => {
      const themeNames = Object.keys(themes);
      const uniqueNames = new Set(themeNames);
      
      expect(themeNames.length).toBe(uniqueNames.size);
    });

    describe('Minimal theme', () => {
      it('should have muted primary color', () => {
        const minimalTheme = themes.minimal;
        expect(minimalTheme.colors.primary['500']).toBe('oklch(0.45 0.05 250)');
      });

      it('should have increased spacing', () => {
        const minimalTheme = themes.minimal;
        expect(minimalTheme.spacing.spacing.md).toBe('2rem');
        expect(minimalTheme.spacing.spacing.lg).toBe('3rem');
      });

      it('should have subtle effects', () => {
        const minimalTheme = themes.minimal;
        expect(minimalTheme.effects?.boxShadow).toBe('0 1px 3px rgba(0, 0, 0, 0.02)');
      });
    });

    describe('Neo-Brutalist theme', () => {
      it('should have black primary color', () => {
        const brutalistTheme = themes['neo-brutalist'];
        expect(brutalistTheme.colors.primary['500']).toBe('oklch(0.00 0.00 0)');
      });

      it('should have thick borders', () => {
        const brutalistTheme = themes['neo-brutalist'];
        expect(brutalistTheme.spacing.borderWidth.default).toBe('3px');
        expect(brutalistTheme.spacing.borderWidth.thick).toBe('5px');
      });

      it('should have hard shadows', () => {
        const brutalistTheme = themes['neo-brutalist'];
        expect(brutalistTheme.spacing.shadows.md).toBe('6px 6px 0px oklch(0.00 0.00 0)');
      });
    });

    describe('Glassmorphic theme', () => {
      it('should have glass effects', () => {
        const glassTheme = themes.glassmorphic;
        expect(glassTheme.colors.special.glass.dark).toBe('rgba(0, 0, 0, 0.1)');
      });

      it('should have backdrop filter effects', () => {
        const glassTheme = themes.glassmorphic;
        expect(glassTheme.effects?.backdropFilter).toBe('blur(10px) saturate(180%)');
      });
    });

    describe('Cyberpunk theme', () => {
      it('should have neon cyan primary', () => {
        const cyberpunkTheme = themes.cyberpunk;
        expect(cyberpunkTheme.colors.primary['500']).toBe('oklch(0.80 0.30 200)');
      });

      it('should have dark backgrounds', () => {
        const cyberpunkTheme = themes.cyberpunk;
        expect(cyberpunkTheme.colors.neutral['0']).toBe('oklch(0.08 0.02 250)');
      });

      it('should have neon colors', () => {
        const cyberpunkTheme = themes.cyberpunk;
        expect(cyberpunkTheme.colors.special.neon.cyan).toBe('oklch(0.80 0.30 200)');
        expect(cyberpunkTheme.colors.special.neon.magenta).toBe('oklch(0.70 0.30 320)');
      });

      it('should have glow effects', () => {
        const cyberpunkTheme = themes.cyberpunk;
        expect(cyberpunkTheme.effects?.boxShadow).toBe('0 0 20px rgba(0, 255, 255, 0.3)');
      });
    });

    describe('Editorial theme', () => {
      it('should have serif heading font', () => {
        const editorialTheme = themes.editorial;
        expect(editorialTheme.typography.families.heading).toBe('"Playfair Display", "Georgia", serif');
      });

      it('should have improved line heights', () => {
        const editorialTheme = themes.editorial;
        expect(editorialTheme.typography.lineHeights.normal).toBe('1.6');
        expect(editorialTheme.typography.lineHeights.relaxed).toBe('1.7');
      });

      it('should have optimal reading width', () => {
        const editorialTheme = themes.editorial;
        expect(editorialTheme.customProperties['--editorial-measure']).toBe('65ch');
      });
    });

    describe('Accessible theme', () => {
      it('should have high contrast colors', () => {
        const accessibleTheme = themes.accessible;
        expect(accessibleTheme.colors.primary['500']).toBe('oklch(0.20 0.00 0)');
      });

      it('should have larger tap targets', () => {
        const accessibleTheme = themes.accessible;
        expect(accessibleTheme.spacing.spacing.lg).toBe('2.5rem');
        expect(accessibleTheme.customProperties['--accessible-target-size']).toBe('44px');
      });

      it('should have focus indicators', () => {
        const accessibleTheme = themes.accessible;
        expect(accessibleTheme.customProperties['--accessible-focus']).toBe('3px solid oklch(0.60 0.25 250)');
      });
    });
  });

  describe('getTheme function', () => {
    it('should return the correct theme by name', () => {
      const minimalTheme = getTheme('minimal');
      expect(minimalTheme.name).toBe('minimal');
      expect(minimalTheme).toBe(themes.minimal);
    });

    it('should work with all theme names', () => {
      const themeNames: ThemeName[] = [
        'minimal',
        'neo-brutalist',
        'glassmorphic',
        'cyberpunk',
        'editorial',
        'accessible',
      ];

      themeNames.forEach((themeName) => {
        const theme = getTheme(themeName);
        expect(theme.name).toBe(themeName);
      });
    });
  });

  describe('generateThemeVariables function', () => {
    it('should generate CSS custom properties from theme', () => {
      const testTheme = createTheme('test', {
        colors: {
          primary: {
            500: '#ff0000',
          },
        },
        customProperties: {
          '--test-var': '16px',
        },
      });

      const variables = generateThemeVariables(testTheme);

      expect(variables['--color-primary-500']).toBe('#ff0000');
      expect(variables['--test-var']).toBe('16px');
    });

    it('should handle nested color objects', () => {
      const testTheme = createTheme('test', {
        colors: {
          semantic: {
            success: {
              500: '#00ff00',
            },
          },
        },
      });

      const variables = generateThemeVariables(testTheme);
      expect(variables['--color-semantic-success-500']).toBe('#00ff00');
    });

    it('should only include string values', () => {
      const testTheme = createTheme('test', {
        colors: {
          test: {
            number: 42,
            string: '#ffffff',
            object: { nested: 'value' },
          },
        },
      });

      const variables = generateThemeVariables(testTheme);
      expect(variables['--color-test-string']).toBe('#ffffff');
      expect(variables['--color-test-number']).toBeUndefined();
    });
  });

  describe('applyTheme function', () => {
    it('should set CSS custom properties on document root', () => {
      const testTheme = createTheme('test', {
        customProperties: {
          '--test-color': '#ff0000',
          '--test-size': '16px',
        },
      });

      applyTheme(testTheme);

      expect(mockSetProperty).toHaveBeenCalledWith('--test-color', '#ff0000');
      expect(mockSetProperty).toHaveBeenCalledWith('--test-size', '16px');
    });

    it('should add theme class to body', () => {
      const testTheme = createTheme('test-theme');
      
      applyTheme(testTheme);

      expect(mockBody.className).toContain('theme-test-theme');
    });

    it('should replace existing theme classes', () => {
      mockBody.className = 'some-class theme-old-theme other-class';
      
      const testTheme = createTheme('new-theme');
      applyTheme(testTheme);

      expect(mockBody.className).toBe('some-class  other-class theme-new-theme');
      expect(mockBody.className).not.toContain('theme-old-theme');
    });
  });

  describe('generateDynamicTheme function', () => {
    it('should generate theme with specified seed color', () => {
      const seedColor = 120; // Green
      const dynamicTheme = generateDynamicTheme(seedColor);

      expect(dynamicTheme.name).toBe('dynamic');
      expect(dynamicTheme.customProperties['--dynamic-seed']).toBe('120');
      expect(dynamicTheme.customProperties['--dynamic-primary-hue']).toBe('120');
    });

    it('should calculate complementary colors correctly', () => {
      const seedColor = 180; // Cyan
      const dynamicTheme = generateDynamicTheme(seedColor);

      // Complementary should be 180 + 180 = 360 % 360 = 0
      expect(dynamicTheme.customProperties['--dynamic-secondary-hue']).toBe('0');
    });

    it('should handle edge cases for hue values', () => {
      // Test with 0
      const theme0 = generateDynamicTheme(0);
      expect(theme0.customProperties['--dynamic-secondary-hue']).toBe('180');

      // Test with 350
      const theme350 = generateDynamicTheme(350);
      expect(theme350.customProperties['--dynamic-secondary-hue']).toBe('170'); // (350 + 180) % 360
    });

    it('should generate color scales for primary, secondary, and accent', () => {
      const dynamicTheme = generateDynamicTheme(240);

      expect(dynamicTheme.colors.primary).toBeDefined();
      expect(dynamicTheme.colors.secondary).toBeDefined();
      expect(dynamicTheme.colors.accent).toBeDefined();

      // Check that color scales have expected structure
      expect(dynamicTheme.colors.primary['50']).toBeDefined();
      expect(dynamicTheme.colors.primary['500']).toBeDefined();
      expect(dynamicTheme.colors.primary['950']).toBeDefined();
    });
  });

  describe('Theme accessibility', () => {
    it('should have sufficient color contrast in accessible theme', () => {
      const accessibleTheme = themes.accessible;
      
      // High contrast primary should be very dark
      expect(accessibleTheme.colors.primary['500']).toBe('oklch(0.20 0.00 0)');
      
      // Should have specific high contrast colors
      expect(accessibleTheme.colors.special.highContrast.black).toBe('oklch(0.00 0.00 0)');
      expect(accessibleTheme.colors.special.highContrast.white).toBe('oklch(1.00 0.00 0)');
    });

    it('should have appropriate focus indicators in accessible theme', () => {
      const accessibleTheme = themes.accessible;
      
      expect(accessibleTheme.customProperties['--accessible-focus']).toBeDefined();
      expect(accessibleTheme.customProperties['--accessible-target-size']).toBe('44px');
    });
  });

  describe('Theme consistency', () => {
    it('should have all required properties for each theme', () => {
      const requiredProperties = ['name', 'colors', 'semantic', 'typography', 'spacing', 'customProperties'];
      
      Object.values(themes).forEach((theme) => {
        requiredProperties.forEach((prop) => {
          expect(theme).toHaveProperty(prop);
        });
      });
    });

    it('should have consistent color structure across themes', () => {
      Object.values(themes).forEach((theme) => {
        expect(theme.colors).toHaveProperty('primary');
        expect(theme.colors).toHaveProperty('neutral');
        
        // Each color group should have shade variations
        if (theme.colors.primary && typeof theme.colors.primary === 'object') {
          expect(theme.colors.primary).toHaveProperty('500');
        }
      });
    });
  });
}); 