/**
 * Theme variants for the OpsSight design system
 * Implements multiple aesthetic approaches while maintaining accessibility
 * Extended with color mode support (light, dark, high-contrast)
 */

import { colorTokens, semanticColorMap } from '../tokens/colors';
import { defaultTypographyConfig } from '../tokens/typography';
import { defaultSpacingConfig } from '../tokens/spacing';

// Color mode type
export type ColorMode = 'light' | 'dark' | 'high-contrast';

// Theme interface with flexible structure and color mode support
export interface Theme {
  name: string;
  colors: Record<string, any>;
  semantic: Record<string, any>;
  typography: Record<string, any>;
  spacing: Record<string, any>;
  customProperties: Record<string, string>;
  effects?: {
    blur?: string;
    backdropFilter?: string;
    boxShadow?: string;
    borderStyle?: string;
    animations?: Record<string, string>;
  };
  // New: Color mode variations
  colorModes?: {
    light?: Partial<Theme>;
    dark?: Partial<Theme>;
    'high-contrast'?: Partial<Theme>;
  };
}

// Utility function to generate color variants
function generateColorScale(baseColor: string, steps: number = 10): Record<string, string> {
  const colors: Record<string, string> = {};
  for (let i = 0; i < steps; i++) {
    const lightness = 0.95 - (i * 0.1);
    colors[`${(i + 1) * 50}`] = `oklch(${lightness.toFixed(2)} 0.15 ${baseColor})`;
  }
  return colors;
}

// Utility function to invert colors for dark mode
function invertColorScale(colorScale: Record<string, string>): Record<string, string> {
  const inverted: Record<string, string> = {};
  const keys = Object.keys(colorScale).reverse();
  const values = Object.values(colorScale);
  
  keys.forEach((key, index) => {
    inverted[key] = values[index];
  });
  
  return inverted;
}

// Dynamic theme generator function
export function generateDynamicTheme(seedColor: number): Theme {
  const complementary = (seedColor + 180) % 360;
  const triadic1 = (seedColor + 120) % 360;

  const dynamicColors = {
    ...colorTokens,
    primary: generateColorScale(seedColor.toString()),
    secondary: generateColorScale(complementary.toString()),
    accent: generateColorScale(triadic1.toString()),
  };

  return createTheme('dynamic', {
    colors: dynamicColors,
    customProperties: {
      '--dynamic-seed': seedColor.toString(),
      '--dynamic-primary-hue': seedColor.toString(),
      '--dynamic-secondary-hue': complementary.toString(),
    },
  });
}

// Main theme creation function
export function createTheme(
  name: string,
  overrides: Partial<Theme> = {}
): Theme {
  const baseTheme: Theme = {
    name,
    colors: JSON.parse(JSON.stringify(colorTokens)),
    semantic: JSON.parse(JSON.stringify(semanticColorMap)),
    typography: JSON.parse(JSON.stringify(defaultTypographyConfig)),
    spacing: JSON.parse(JSON.stringify(defaultSpacingConfig)),
    customProperties: {},
  };

  // Deep merge function
  function deepMerge(target: any, source: any): any {
    if (source === null || source === undefined) return target;
    if (typeof source !== 'object') return source;
    
    const result = { ...target };
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    return result;
  }

  return deepMerge(baseTheme, overrides);
}

// Function to create theme with color mode variations
export function createThemeWithColorModes(
  name: string,
  baseTheme: Partial<Theme> = {},
  colorModes: Theme['colorModes'] = {}
): Theme {
  const theme = createTheme(name, baseTheme);
  theme.colorModes = colorModes;
  return theme;
}

// Minimal Theme - Clean, spacious, and focused
export const minimalTheme: Theme = createThemeWithColorModes('minimal', {
  colors: {
    primary: {
      ...colorTokens.primary,
      500: 'oklch(0.45 0.05 250)', // Muted primary
    },
    neutral: {
      ...colorTokens.neutral,
      50: 'oklch(0.99 0.00 0)', // Very light background
    },
  },
  spacing: {
    spacing: {
      xs: '0.75rem',
      sm: '1rem',
      md: '2rem', // Increased spacing
      lg: '3rem',
      xl: '4rem',
    },
  },
  customProperties: {
    '--minimal-emphasis': 'subtle',
    '--border-style': 'none',
    '--shadow-intensity': '0.02',
  },
  effects: {
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
    borderStyle: 'none',
  },
}, {
  dark: {
    colors: {
      neutral: {
        ...colorTokens.neutral,
        0: 'oklch(0.08 0.00 0)', // Dark background
        50: 'oklch(0.12 0.00 0)',
        100: 'oklch(0.16 0.00 0)',
      },
      primary: {
        ...colorTokens.primary,
        500: 'oklch(0.65 0.08 250)', // Brighter in dark mode
      },
    },
    semantic: {
      background: {
        primary: 'var(--color-neutral-0)',
        secondary: 'var(--color-neutral-50)',
        tertiary: 'var(--color-neutral-100)',
        inverse: 'var(--color-neutral-0)',
      },
      text: {
        primary: 'var(--color-neutral-0)',
        secondary: 'var(--color-neutral-100)',
        tertiary: 'var(--color-neutral-200)',
        inverse: 'var(--color-neutral-900)',
      },
    },
    effects: {
      boxShadow: '0 1px 3px rgba(255, 255, 255, 0.05)',
    },
  },
  'high-contrast': {
    colors: {
      primary: {
        ...colorTokens.primary,
        500: 'oklch(0.00 0.00 0)', // Pure black
      },
      neutral: {
        ...colorTokens.neutral,
        0: 'oklch(1.00 0.00 0)', // Pure white background
        1000: 'oklch(0.00 0.00 0)', // Pure black
      },
    },
    customProperties: {
      '--minimal-emphasis': 'strong',
      '--border-style': '2px solid',
      '--shadow-intensity': '0',
    },
    effects: {
      boxShadow: 'none',
      borderStyle: '2px solid oklch(0.00 0.00 0)',
    },
  },
});

// Neo-Brutalist Theme - Bold, geometric, high contrast
export const neoBrutalistTheme: Theme = createThemeWithColorModes('neo-brutalist', {
  colors: {
    primary: {
      50: 'oklch(1.00 0.00 0)',
      100: 'oklch(0.95 0.00 0)',
      200: 'oklch(0.90 0.00 0)',
      300: 'oklch(0.80 0.00 0)',
      400: 'oklch(0.60 0.00 0)',
      500: 'oklch(0.00 0.00 0)', // Pure black primary
      600: 'oklch(0.00 0.00 0)',
      700: 'oklch(0.00 0.00 0)',
      800: 'oklch(0.00 0.00 0)',
      900: 'oklch(0.00 0.00 0)',
      950: 'oklch(0.00 0.00 0)',
    },
    accent: {
      ...colorTokens.accent,
      500: 'oklch(0.70 0.25 60)', // Bright yellow accent
    },
  },
  spacing: {
    borderWidth: {
      thin: '1px',
      default: '3px', // Thicker borders
      thick: '5px',
      thicker: '8px',
    },
    shadows: {
      sm: '3px 3px 0px oklch(0.00 0.00 0)',
      md: '6px 6px 0px oklch(0.00 0.00 0)',
      lg: '9px 9px 0px oklch(0.00 0.00 0)',
    },
  },
  customProperties: {
    '--brutalist-border': '3px solid oklch(0.00 0.00 0)',
    '--brutalist-shadow': '6px 6px 0px oklch(0.00 0.00 0)',
  },
  effects: {
    boxShadow: '6px 6px 0px oklch(0.00 0.00 0)',
    borderStyle: 'solid',
  },
}, {
  dark: {
    colors: {
      primary: {
        500: 'oklch(1.00 0.00 0)', // White primary on dark
      },
      neutral: {
        0: 'oklch(0.00 0.00 0)', // Black background
        50: 'oklch(0.10 0.00 0)',
        100: 'oklch(0.20 0.00 0)',
      },
    },
    customProperties: {
      '--brutalist-border': '3px solid oklch(1.00 0.00 0)',
      '--brutalist-shadow': '6px 6px 0px oklch(1.00 0.00 0)',
    },
    effects: {
      boxShadow: '6px 6px 0px oklch(1.00 0.00 0)',
    },
  },
  'high-contrast': {
    colors: {
      primary: {
        500: 'oklch(0.00 0.00 0)', // Pure black
      },
      accent: {
        500: 'oklch(1.00 0.00 0)', // Pure white accent
      },
    },
    spacing: {
      borderWidth: {
        default: '5px', // Extra thick borders
        thick: '8px',
        thicker: '12px',
      },
    },
  },
});

// Glassmorphic Theme - Translucent, blurred backgrounds
export const glassmorphicTheme: Theme = createThemeWithColorModes('glassmorphic', {
  colors: {
    special: {
      glass: {
        light: 'rgba(255, 255, 255, 0.1)',
        medium: 'rgba(255, 255, 255, 0.15)',
        heavy: 'rgba(255, 255, 255, 0.25)',
        dark: 'rgba(0, 0, 0, 0.1)',
      },
    },
  },
  customProperties: {
    '--glass-backdrop': 'blur(10px) saturate(180%)',
    '--glass-border': '1px solid rgba(255, 255, 255, 0.2)',
    '--glass-background': 'rgba(255, 255, 255, 0.1)',
  },
  effects: {
    backdropFilter: 'blur(10px) saturate(180%)',
    boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)',
    borderStyle: '1px solid rgba(255, 255, 255, 0.2)',
  },
}, {
  dark: {
    colors: {
      special: {
        glass: {
          light: 'rgba(255, 255, 255, 0.05)',
          medium: 'rgba(255, 255, 255, 0.08)',
          heavy: 'rgba(255, 255, 255, 0.12)',
          dark: 'rgba(0, 0, 0, 0.3)',
        },
      },
    },
    customProperties: {
      '--glass-backdrop': 'blur(15px) saturate(120%)',
      '--glass-border': '1px solid rgba(255, 255, 255, 0.1)',
      '--glass-background': 'rgba(0, 0, 0, 0.2)',
    },
    effects: {
      backdropFilter: 'blur(15px) saturate(120%)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      borderStyle: '1px solid rgba(255, 255, 255, 0.1)',
    },
  },
  'high-contrast': {
    colors: {
      special: {
        glass: {
          light: 'rgba(255, 255, 255, 0.9)',
          medium: 'rgba(255, 255, 255, 0.95)',
          heavy: 'rgba(255, 255, 255, 1.0)',
          dark: 'rgba(0, 0, 0, 0.9)',
        },
      },
    },
    customProperties: {
      '--glass-backdrop': 'none',
      '--glass-border': '2px solid oklch(0.00 0.00 0)',
      '--glass-background': 'oklch(1.00 0.00 0)',
    },
    effects: {
      backdropFilter: 'none',
      boxShadow: 'none',
      borderStyle: '2px solid oklch(0.00 0.00 0)',
    },
  },
});

// Cyberpunk Theme - Neon colors, dark backgrounds
export const cyberpunkTheme: Theme = createThemeWithColorModes('cyberpunk', {
  colors: {
    primary: {
      50: 'oklch(0.20 0.00 0)',
      100: 'oklch(0.25 0.05 200)',
      200: 'oklch(0.30 0.10 200)',
      300: 'oklch(0.40 0.15 200)',
      400: 'oklch(0.60 0.25 200)',
      500: 'oklch(0.80 0.30 200)', // Neon cyan
      600: 'oklch(0.75 0.28 200)',
      700: 'oklch(0.70 0.25 200)',
      800: 'oklch(0.60 0.20 200)',
      900: 'oklch(0.50 0.15 200)',
      950: 'oklch(0.40 0.10 200)',
    },
    accent: {
      ...colorTokens.accent,
      500: 'oklch(0.70 0.30 320)', // Neon magenta
    },
    neutral: {
      ...colorTokens.neutral,
      0: 'oklch(0.08 0.02 250)', // Very dark background
      50: 'oklch(0.12 0.02 250)',
      100: 'oklch(0.16 0.02 250)',
      200: 'oklch(0.20 0.02 250)',
    },
    special: {
      neon: {
        cyan: 'oklch(0.80 0.30 200)',
        magenta: 'oklch(0.70 0.30 320)',
        yellow: 'oklch(0.90 0.25 90)',
        green: 'oklch(0.80 0.30 140)',
      },
    },
  },
  customProperties: {
    '--cyberpunk-glow': '0 0 10px currentColor',
    '--cyberpunk-text-shadow': '0 0 5px currentColor',
  },
  effects: {
    boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)',
    animations: {
      neonGlow: 'neonGlow 2s ease-in-out infinite alternate',
      textFlicker: 'textFlicker 1.5s infinite',
    },
  },
}, {
  light: {
    colors: {
      neutral: {
        0: 'oklch(0.98 0.00 0)', // Light background
        50: 'oklch(0.95 0.00 0)',
        100: 'oklch(0.90 0.00 0)',
      },
      primary: {
        500: 'oklch(0.40 0.25 200)', // Darker cyan for light mode
      },
    },
    customProperties: {
      '--cyberpunk-glow': '0 0 5px currentColor',
      '--cyberpunk-text-shadow': 'none',
    },
    effects: {
      boxShadow: '0 2px 10px rgba(0, 150, 150, 0.2)',
    },
  },
  'high-contrast': {
    colors: {
      primary: {
        500: 'oklch(0.00 0.00 0)', // Pure black
      },
      accent: {
        500: 'oklch(1.00 0.00 0)', // Pure white
      },
      special: {
        neon: {
          cyan: 'oklch(0.00 0.00 0)',
          magenta: 'oklch(1.00 0.00 0)',
          yellow: 'oklch(0.00 0.00 0)',
          green: 'oklch(1.00 0.00 0)',
        },
      },
    },
    customProperties: {
      '--cyberpunk-glow': 'none',
      '--cyberpunk-text-shadow': 'none',
    },
    effects: {
      boxShadow: 'none',
      animations: {},
    },
  },
});

// Editorial Theme - Typography-focused, readable
export const editorialTheme: Theme = createThemeWithColorModes('editorial', {
  typography: {
    families: {
      heading: '"Playfair Display", "Georgia", serif',
      body: '"Source Sans Pro", "system-ui", sans-serif',
      code: '"IBM Plex Mono", "Consolas", monospace',
    },
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem', // Larger base reading size
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    lineHeights: {
      normal: '1.6', // Improved reading line height
      relaxed: '1.7',
      loose: '1.8',
    },
  },
  colors: {
    neutral: {
      ...colorTokens.neutral,
      900: 'oklch(0.20 0.00 0)', // Slightly softer black for text
    },
  },
  customProperties: {
    '--editorial-measure': '65ch', // Optimal reading width
    '--editorial-leading': '1.6',
  },
}, {
  dark: {
    colors: {
      neutral: {
        0: 'oklch(0.10 0.00 0)', // Dark reading background
        50: 'oklch(0.15 0.00 0)',
        100: 'oklch(0.20 0.00 0)',
        900: 'oklch(0.85 0.00 0)', // Light text
      },
    },
    customProperties: {
      '--editorial-measure': '60ch', // Slightly narrower for dark mode
      '--editorial-leading': '1.7',
    },
  },
  'high-contrast': {
    colors: {
      neutral: {
        0: 'oklch(1.00 0.00 0)', // Pure white
        900: 'oklch(0.00 0.00 0)', // Pure black text
      },
    },
    typography: {
      sizes: {
        base: '1.125rem', // Larger text for accessibility
        lg: '1.25rem',
        xl: '1.5rem',
      },
      lineHeights: {
        normal: '1.8', // Increased line height
        relaxed: '1.9',
        loose: '2.0',
      },
    },
  },
});

// Accessible Theme - High contrast, optimized for screen readers
export const accessibleTheme: Theme = createThemeWithColorModes('accessible', {
  colors: {
    primary: {
      50: 'oklch(0.98 0.00 0)',
      100: 'oklch(0.95 0.00 0)',
      200: 'oklch(0.90 0.00 0)',
      300: 'oklch(0.80 0.00 0)',
      400: 'oklch(0.60 0.00 0)',
      500: 'oklch(0.20 0.00 0)', // High contrast primary
      600: 'oklch(0.15 0.00 0)',
      700: 'oklch(0.10 0.00 0)',
      800: 'oklch(0.05 0.00 0)',
      900: 'oklch(0.00 0.00 0)',
      950: 'oklch(0.00 0.00 0)',
    },
    special: {
      highContrast: {
        black: 'oklch(0.00 0.00 0)',
        white: 'oklch(1.00 0.00 0)',
        darkGray: 'oklch(0.20 0.00 0)',
        lightGray: 'oklch(0.80 0.00 0)',
      },
    },
  },
  spacing: {
    spacing: {
      xs: '0.5rem',
      sm: '1rem',
      md: '1.5rem',
      lg: '2.5rem', // Larger tap targets
      xl: '3rem',
    },
  },
  customProperties: {
    '--accessible-focus': '3px solid oklch(0.60 0.25 250)',
    '--accessible-target-size': '44px', // Minimum touch target
  },
}, {
  dark: {
    colors: {
      primary: {
        500: 'oklch(0.85 0.00 0)', // Light primary on dark
      },
      neutral: {
        0: 'oklch(0.00 0.00 0)', // Pure black background
        50: 'oklch(0.05 0.00 0)',
        900: 'oklch(1.00 0.00 0)', // Pure white text
      },
    },
    customProperties: {
      '--accessible-focus': '3px solid oklch(0.70 0.25 250)',
    },
  },
  'high-contrast': {
    colors: {
      primary: {
        500: 'oklch(0.00 0.00 0)', // Pure black
      },
      neutral: {
        0: 'oklch(1.00 0.00 0)', // Pure white background
        900: 'oklch(0.00 0.00 0)', // Pure black text
      },
    },
    spacing: {
      spacing: {
        lg: '3rem', // Even larger tap targets
        xl: '4rem',
      },
    },
    customProperties: {
      '--accessible-focus': '4px solid oklch(0.00 0.00 0)',
      '--accessible-target-size': '48px', // Larger touch targets
    },
  },
});

// Theme registry
export const themes = {
  minimal: minimalTheme,
  'neo-brutalist': neoBrutalistTheme,
  glassmorphic: glassmorphicTheme,
  cyberpunk: cyberpunkTheme,
  editorial: editorialTheme,
  accessible: accessibleTheme,
} as const;

export type ThemeName = keyof typeof themes;

// Function to get a theme by name
export function getTheme(name: ThemeName): Theme {
  return themes[name];
}

// Function to get a theme with color mode applied
export function getThemeWithColorMode(name: ThemeName, colorMode: ColorMode): Theme {
  const baseTheme = themes[name];
  
  if (!baseTheme.colorModes || !baseTheme.colorModes[colorMode]) {
    return baseTheme;
  }

  const colorModeOverrides = baseTheme.colorModes[colorMode];
  
  // Deep merge the color mode overrides with the base theme
  function deepMerge(target: any, source: any): any {
    if (source === null || source === undefined) return target;
    if (typeof source !== 'object') return source;
    
    const result = { ...target };
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    return result;
  }

  return deepMerge(baseTheme, colorModeOverrides);
}

// Function to generate CSS custom properties for a theme
export function generateThemeVariables(theme: Theme): Record<string, string> {
  const variables: Record<string, string> = {};

  // Color variables
  function processColors(colors: any, prefix: string = 'color'): void {
    Object.entries(colors).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        processColors(value, `${prefix}-${key}`);
      } else if (typeof value === 'string') {
        variables[`--${prefix}-${key}`] = value;
      }
    });
  }

  processColors(theme.colors);

  // Custom properties
  Object.entries(theme.customProperties).forEach(([key, value]) => {
    variables[key] = value;
  });

  return variables;
}

// Function to apply theme to document with color mode support
export function applyTheme(theme: Theme, colorMode?: ColorMode): void {
  const root = document.documentElement;
  
  // Get theme with color mode applied if specified
  const appliedTheme = colorMode && theme.colorModes?.[colorMode] 
    ? getThemeWithColorMode(theme.name as ThemeName, colorMode)
    : theme;
    
  const variables = generateThemeVariables(appliedTheme);

  Object.entries(variables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });

  // Add theme class to body for CSS targeting
  document.body.className = document.body.className
    .replace(/theme-\w+/g, '')
    .concat(` theme-${appliedTheme.name}`);
    
  // Add color mode class if specified
  if (colorMode) {
    document.body.className = document.body.className
      .replace(/color-mode-\w+/g, '')
      .concat(` color-mode-${colorMode}`);
  }
}

export default themes; 