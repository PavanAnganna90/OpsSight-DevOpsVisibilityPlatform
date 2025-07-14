/**
 * Theme Utility Tests
 * 
 * Comprehensive test suite for theme utility functions including
 * theme variants, color modes, contextual themes, and theme application.
 */

import {
  getThemeVariables,
  applyTheme,
  ThemeVariant,
  ColorMode,
  ThemeContext,
  ThemeConfig,
  motionTokens,
  spacingTokens,
  typographyTokens,
  shadowTokens,
} from '../theme';

describe('Theme Utilities', () => {
  let mockDocumentElement: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock element with setProperty method
    mockDocumentElement = {
      style: {
        setProperty: jest.fn(),
        removeProperty: jest.fn(),
        getPropertyValue: jest.fn(),
      },
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn(),
        toggle: jest.fn(),
      },
    } as any;
    
    // Mock document.documentElement
    Object.defineProperty(document, 'documentElement', {
      value: mockDocumentElement,
      writable: true,
      configurable: true,
    });

    // Mock Date for dynamic theme testing
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Theme Tokens', () => {
    it('should export motion tokens', () => {
      expect(motionTokens).toHaveProperty('duration');
      expect(motionTokens).toHaveProperty('easing');
      
      expect(motionTokens.duration).toHaveProperty('instant');
      expect(motionTokens.duration).toHaveProperty('fast');
      expect(motionTokens.duration).toHaveProperty('normal');
      expect(motionTokens.duration).toHaveProperty('slow');
      expect(motionTokens.duration).toHaveProperty('slower');
      
      expect(motionTokens.easing).toHaveProperty('bounce');
      expect(motionTokens.easing).toHaveProperty('smooth');
      expect(motionTokens.easing).toHaveProperty('gentle');
      expect(motionTokens.easing).toHaveProperty('spring');
    });

    it('should export spacing tokens', () => {
      expect('px' in spacingTokens).toBe(true);
      expect('0.5' in spacingTokens).toBe(true);
      expect('1' in spacingTokens).toBe(true);
      expect('64' in spacingTokens).toBe(true);
      
      expect(spacingTokens.px).toBe('1px');
      expect(spacingTokens['0.5']).toBe('0.125rem');
      expect(spacingTokens['4']).toBe('1rem');
      expect(spacingTokens['64']).toBe('16rem');
    });

    it('should export typography tokens', () => {
      expect(typographyTokens).toHaveProperty('fontSizes');
      expect(typographyTokens).toHaveProperty('fontWeights');
      expect(typographyTokens).toHaveProperty('letterSpacing');
      expect(typographyTokens).toHaveProperty('lineHeight');
      
      expect(typographyTokens.fontSizes.base).toBe('1rem');
      expect(typographyTokens.fontWeights.normal).toBe('400');
      expect(typographyTokens.letterSpacing.normal).toBe('0em');
      expect(typographyTokens.lineHeight.normal).toBe('1.5');
    });

    it('should export shadow tokens', () => {
      expect(shadowTokens).toHaveProperty('sm');
      expect(shadowTokens).toHaveProperty('base');
      expect(shadowTokens).toHaveProperty('md');
      expect(shadowTokens).toHaveProperty('lg');
      expect(shadowTokens).toHaveProperty('xl');
      expect(shadowTokens).toHaveProperty('2xl');
      expect(shadowTokens).toHaveProperty('inner');
      
      expect(typeof shadowTokens.sm).toBe('string');
      expect(shadowTokens.sm).toContain('rgb');
    });
  });

  describe('getThemeVariables', () => {
    it('should return theme variables for minimal light theme', () => {
      const config: ThemeConfig = {
        variant: 'minimal',
        colorMode: 'light',
        reducedMotion: false,
      };

      const variables = getThemeVariables(config);
      
      expect(variables).toHaveProperty('--bg-primary');
      expect(variables).toHaveProperty('--bg-secondary');
      expect(variables).toHaveProperty('--text-primary');
      expect(variables).toHaveProperty('--text-secondary');
      expect(variables).toHaveProperty('--border');
      expect(variables).toHaveProperty('--accent');
      expect(variables).toHaveProperty('--accent-hover');
      
      expect(typeof variables['--bg-primary']).toBe('string');
      expect(typeof variables['--text-primary']).toBe('string');
    });

    it('should return theme variables for minimal dark theme', () => {
      const config: ThemeConfig = {
        variant: 'minimal',
        colorMode: 'dark',
        reducedMotion: false,
      };

      const variables = getThemeVariables(config);
      
      expect(variables).toHaveProperty('--bg-primary');
      expect(variables).toHaveProperty('--text-primary');
      
      // Dark theme should have different colors than light
      const lightConfig: ThemeConfig = { ...config, colorMode: 'light' };
      const lightVariables = getThemeVariables(lightConfig);
      
      expect(variables['--bg-primary']).not.toBe(lightVariables['--bg-primary']);
    });

    it('should handle all theme variants', () => {
      const variants: ThemeVariant[] = [
        'minimal',
        'neo-brutalist',
        'glassmorphic',
        'cyberpunk',
        'editorial',
        'accessible',
        'dynamic',
      ];

      variants.forEach(variant => {
        const config: ThemeConfig = {
          variant,
          colorMode: 'light',
          reducedMotion: false,
        };

        const variables = getThemeVariables(config);
        expect(variables).toHaveProperty('--bg-primary');
        expect(variables).toHaveProperty('--text-primary');
      });
    });

    it('should handle all color modes', () => {
      const colorModes: ColorMode[] = ['light', 'dark', 'high-contrast', 'system'];

      colorModes.forEach(colorMode => {
        const config: ThemeConfig = {
          variant: 'minimal',
          colorMode,
          reducedMotion: false,
        };

        const variables = getThemeVariables(config);
        expect(variables).toHaveProperty('--bg-primary');
        expect(variables).toHaveProperty('--text-primary');
      });
    });

    it('should handle contextual themes', () => {
      const contexts: ThemeContext[] = ['default', 'focus', 'relax', 'energize'];

      contexts.forEach(context => {
        const config: ThemeConfig = {
          variant: 'minimal',
          colorMode: 'light',
          context,
          reducedMotion: false,
        };

        const variables = getThemeVariables(config);
        expect(variables).toHaveProperty('--bg-primary');
        expect(variables).toHaveProperty('--text-primary');
      });
    });

    it('should handle reduced motion preference', () => {
      const config: ThemeConfig = {
        variant: 'minimal',
        colorMode: 'light',
        reducedMotion: true,
      };

      const variables = getThemeVariables(config);
      expect(variables).toHaveProperty('--bg-primary');
      
      // Should still return valid theme variables
      expect(typeof variables['--bg-primary']).toBe('string');
    });

    it('should handle system color mode', () => {
      // Mock matchMedia for system preference
      const mockMatchMedia = jest.fn().mockImplementation((query) => ({
        matches: query.includes('prefers-color-scheme: dark'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      Object.defineProperty(window, 'matchMedia', {
        value: mockMatchMedia,
        writable: true,
      });

      const config: ThemeConfig = {
        variant: 'minimal',
        colorMode: 'system',
        reducedMotion: false,
      };

      const variables = getThemeVariables(config);
      expect(variables).toHaveProperty('--bg-primary');
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });
  });

  describe('Dynamic Theme', () => {
    it('should return morning theme during morning hours', () => {
      // Set time to 9 AM
      jest.setSystemTime(new Date('2023-01-01T09:00:00'));

      const config: ThemeConfig = {
        variant: 'dynamic',
        colorMode: 'light',
        reducedMotion: false,
      };

      const variables = getThemeVariables(config);
      expect(variables).toHaveProperty('--bg-primary');
      
      // Morning theme should have warm colors
      expect(variables['--bg-primary']).toContain('#fff');
    });

    it('should return afternoon theme during afternoon hours', () => {
      // Set time to 2 PM
      jest.setSystemTime(new Date('2023-01-01T14:00:00'));

      const config: ThemeConfig = {
        variant: 'dynamic',
        colorMode: 'light',
        reducedMotion: false,
      };

      const variables = getThemeVariables(config);
      expect(variables).toHaveProperty('--bg-primary');
      
      // Should return valid theme variables
      expect(typeof variables['--bg-primary']).toBe('string');
    });

    it('should return evening theme during evening hours', () => {
      // Set time to 8 PM
      jest.setSystemTime(new Date('2023-01-01T20:00:00'));

      const config: ThemeConfig = {
        variant: 'dynamic',
        colorMode: 'light',
        reducedMotion: false,
      };

      const variables = getThemeVariables(config);
      expect(variables).toHaveProperty('--bg-primary');
      
      // Evening theme should be darker
      expect(variables['--bg-primary']).toContain('#1a1a1a');
    });

    it('should handle midnight hours correctly', () => {
      // Set time to midnight
      jest.setSystemTime(new Date('2023-01-01T00:00:00'));

      const config: ThemeConfig = {
        variant: 'dynamic',
        colorMode: 'light',
        reducedMotion: false,
      };

      const variables = getThemeVariables(config);
      expect(variables).toHaveProperty('--bg-primary');
      
      // Should return valid theme variables
      expect(typeof variables['--bg-primary']).toBe('string');
    });
  });

  describe('applyTheme', () => {
    it('should apply theme variables to document element', () => {
      const config: ThemeConfig = {
        variant: 'minimal',
        colorMode: 'light',
        reducedMotion: false,
      };

      applyTheme(config);

      // Should call setProperty on document element style
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalled();
      
      // Should set CSS custom properties
      const setPropertyCalls = (mockDocumentElement.style.setProperty as jest.Mock).mock.calls;
      const propertyNames = setPropertyCalls.map(call => call[0]);
      
      expect(propertyNames).toContain('--bg-primary');
      expect(propertyNames).toContain('--text-primary');
      expect(propertyNames).toContain('--accent');
    });

    it('should apply different themes correctly', () => {
      const lightConfig: ThemeConfig = {
        variant: 'minimal',
        colorMode: 'light',
        reducedMotion: false,
      };

      const darkConfig: ThemeConfig = {
        variant: 'minimal',
        colorMode: 'dark',
        reducedMotion: false,
      };

      // Apply light theme
      applyTheme(lightConfig);
      const lightCalls = (mockDocumentElement.style.setProperty as jest.Mock).mock.calls.length;

      // Clear mock and apply dark theme
      jest.clearAllMocks();
      applyTheme(darkConfig);
      const darkCalls = (mockDocumentElement.style.setProperty as jest.Mock).mock.calls.length;

      // Both should set properties
      expect(lightCalls).toBeGreaterThan(0);
      expect(darkCalls).toBeGreaterThan(0);
    });

    it('should handle missing document element gracefully', () => {
      // Remove document element
      Object.defineProperty(document, 'documentElement', {
        value: null,
        writable: true,
        configurable: true,
      });

      const config: ThemeConfig = {
        variant: 'minimal',
        colorMode: 'light',
        reducedMotion: false,
      };

      // Should not throw when document element is missing
      expect(() => applyTheme(config)).not.toThrow();
    });
  });

  describe('Accessible Theme', () => {
    it('should provide high contrast colors for accessible theme', () => {
      const config: ThemeConfig = {
        variant: 'accessible',
        colorMode: 'light',
        reducedMotion: false,
      };

      const variables = getThemeVariables(config);
      
      // Accessible theme should have high contrast
      expect(variables).toHaveProperty('--bg-primary');
      expect(variables).toHaveProperty('--text-primary');
      
      // Should return valid color values
      expect(typeof variables['--bg-primary']).toBe('string');
      expect(typeof variables['--text-primary']).toBe('string');
    });

    it('should work with high-contrast color mode', () => {
      const config: ThemeConfig = {
        variant: 'accessible',
        colorMode: 'high-contrast',
        reducedMotion: false,
      };

      const variables = getThemeVariables(config);
      expect(variables).toHaveProperty('--bg-primary');
      expect(variables).toHaveProperty('--text-primary');
    });
  });

  describe('Contextual Theme Overrides', () => {
    it('should apply focus context overrides', () => {
      const defaultConfig: ThemeConfig = {
        variant: 'minimal',
        colorMode: 'light',
        context: 'default',
        reducedMotion: false,
      };

      const focusConfig: ThemeConfig = {
        variant: 'minimal',
        colorMode: 'light',
        context: 'focus',
        reducedMotion: false,
      };

      const defaultVariables = getThemeVariables(defaultConfig);
      const focusVariables = getThemeVariables(focusConfig);

      // Focus context might have different accent colors
      expect(defaultVariables).toHaveProperty('--accent');
      expect(focusVariables).toHaveProperty('--accent');
    });

    it('should apply relax context overrides', () => {
      const config: ThemeConfig = {
        variant: 'minimal',
        colorMode: 'light',
        context: 'relax',
        reducedMotion: false,
      };

      const variables = getThemeVariables(config);
      expect(variables).toHaveProperty('--bg-primary');
      expect(variables).toHaveProperty('--accent');
    });

    it('should apply energize context overrides', () => {
      const config: ThemeConfig = {
        variant: 'minimal',
        colorMode: 'light',
        context: 'energize',
        reducedMotion: false,
      };

      const variables = getThemeVariables(config);
      expect(variables).toHaveProperty('--bg-primary');
      expect(variables).toHaveProperty('--accent');
    });
  });

  describe('Theme Variant Specific Tests', () => {
    it('should handle neo-brutalist theme', () => {
      const config: ThemeConfig = {
        variant: 'neo-brutalist',
        colorMode: 'light',
        reducedMotion: false,
      };

      const variables = getThemeVariables(config);
      expect(variables).toHaveProperty('--bg-primary');
      expect(variables).toHaveProperty('--text-primary');
    });

    it('should handle glassmorphic theme', () => {
      const config: ThemeConfig = {
        variant: 'glassmorphic',
        colorMode: 'light',
        reducedMotion: false,
      };

      const variables = getThemeVariables(config);
      expect(variables).toHaveProperty('--bg-primary');
      expect(variables).toHaveProperty('--text-primary');
    });

    it('should handle cyberpunk theme', () => {
      const config: ThemeConfig = {
        variant: 'cyberpunk',
        colorMode: 'dark',
        reducedMotion: false,
      };

      const variables = getThemeVariables(config);
      expect(variables).toHaveProperty('--bg-primary');
      expect(variables).toHaveProperty('--text-primary');
    });

    it('should handle editorial theme', () => {
      const config: ThemeConfig = {
        variant: 'editorial',
        colorMode: 'light',
        reducedMotion: false,
      };

      const variables = getThemeVariables(config);
      expect(variables).toHaveProperty('--bg-primary');
      expect(variables).toHaveProperty('--text-primary');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid theme variant gracefully', () => {
      const config = {
        variant: 'invalid-variant' as ThemeVariant,
        colorMode: 'light' as ColorMode,
        reducedMotion: false,
      };

      // Should not throw with invalid variant
      expect(() => getThemeVariables(config)).not.toThrow();
    });

    it('should handle invalid color mode gracefully', () => {
      const config = {
        variant: 'minimal' as ThemeVariant,
        colorMode: 'invalid-mode' as ColorMode,
        reducedMotion: false,
      };

      // Should not throw with invalid color mode
      expect(() => getThemeVariables(config)).not.toThrow();
    });

    it('should handle invalid context gracefully', () => {
      const config = {
        variant: 'minimal' as ThemeVariant,
        colorMode: 'light' as ColorMode,
        context: 'invalid-context' as ThemeContext,
        reducedMotion: false,
      };

      // Should not throw with invalid context
      expect(() => getThemeVariables(config)).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should work with complete theme application workflow', () => {
      const config: ThemeConfig = {
        variant: 'minimal',
        colorMode: 'light',
        context: 'focus',
        reducedMotion: false,
      };

      // Get variables
      const variables = getThemeVariables(config);
      expect(Object.keys(variables).length).toBeGreaterThan(0);

      // Apply theme
      applyTheme(config);
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalled();

      // Should complete without errors
      expect(variables).toHaveProperty('--bg-primary');
    });

    it('should handle rapid theme changes', () => {
      const configs: ThemeConfig[] = [
        { variant: 'minimal', colorMode: 'light', reducedMotion: false },
        { variant: 'cyberpunk', colorMode: 'dark', reducedMotion: false },
        { variant: 'accessible', colorMode: 'high-contrast', reducedMotion: true },
        { variant: 'dynamic', colorMode: 'system', reducedMotion: false },
      ];

      // Rapidly apply different themes
      configs.forEach(config => {
        expect(() => {
          const variables = getThemeVariables(config);
          applyTheme(config);
        }).not.toThrow();
      });
    });
  });
}); 