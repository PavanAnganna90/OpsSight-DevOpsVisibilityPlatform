/**
 * Color tokens for the OpsSight theme system
 * Using modern color functions and semantic naming
 */

// Base color palettes using OKLCH for better color management
export const colorTokens = {
  // Primary brand colors
  primary: {
    50: 'oklch(0.97 0.01 250)',
    100: 'oklch(0.94 0.03 250)',
    200: 'oklch(0.87 0.06 250)',
    300: 'oklch(0.78 0.10 250)',
    400: 'oklch(0.67 0.15 250)',
    500: 'oklch(0.55 0.20 250)', // Base primary
    600: 'oklch(0.45 0.18 250)',
    700: 'oklch(0.37 0.15 250)',
    800: 'oklch(0.29 0.12 250)',
    900: 'oklch(0.22 0.09 250)',
    950: 'oklch(0.15 0.06 250)',
  },

  // Secondary colors
  secondary: {
    50: 'oklch(0.97 0.01 200)',
    100: 'oklch(0.94 0.03 200)',
    200: 'oklch(0.87 0.06 200)',
    300: 'oklch(0.78 0.10 200)',
    400: 'oklch(0.67 0.15 200)',
    500: 'oklch(0.55 0.20 200)', // Base secondary
    600: 'oklch(0.45 0.18 200)',
    700: 'oklch(0.37 0.15 200)',
    800: 'oklch(0.29 0.12 200)',
    900: 'oklch(0.22 0.09 200)',
    950: 'oklch(0.15 0.06 200)',
  },

  // Accent colors
  accent: {
    50: 'oklch(0.97 0.01 300)',
    100: 'oklch(0.94 0.03 300)',
    200: 'oklch(0.87 0.06 300)',
    300: 'oklch(0.78 0.10 300)',
    400: 'oklch(0.67 0.15 300)',
    500: 'oklch(0.55 0.20 300)', // Base accent
    600: 'oklch(0.45 0.18 300)',
    700: 'oklch(0.37 0.15 300)',
    800: 'oklch(0.29 0.12 300)',
    900: 'oklch(0.22 0.09 300)',
    950: 'oklch(0.15 0.06 300)',
  },

  // Neutral/Gray colors
  neutral: {
    0: 'oklch(1.00 0.00 0)', // Pure white
    50: 'oklch(0.98 0.00 0)',
    100: 'oklch(0.96 0.00 0)',
    200: 'oklch(0.92 0.00 0)',
    300: 'oklch(0.86 0.00 0)',
    400: 'oklch(0.74 0.00 0)',
    500: 'oklch(0.62 0.00 0)', // Mid gray
    600: 'oklch(0.50 0.00 0)',
    700: 'oklch(0.38 0.00 0)',
    800: 'oklch(0.26 0.00 0)',
    900: 'oklch(0.16 0.00 0)',
    950: 'oklch(0.10 0.00 0)',
    1000: 'oklch(0.00 0.00 0)', // Pure black
  },

  // Semantic colors
  semantic: {
    // Success colors
    success: {
      50: 'oklch(0.97 0.02 150)',
      100: 'oklch(0.93 0.04 150)',
      200: 'oklch(0.85 0.08 150)',
      300: 'oklch(0.75 0.12 150)',
      400: 'oklch(0.65 0.16 150)',
      500: 'oklch(0.55 0.20 150)', // Base success
      600: 'oklch(0.45 0.18 150)',
      700: 'oklch(0.37 0.15 150)',
      800: 'oklch(0.29 0.12 150)',
      900: 'oklch(0.22 0.09 150)',
    },

    // Warning colors
    warning: {
      50: 'oklch(0.97 0.02 80)',
      100: 'oklch(0.93 0.04 80)',
      200: 'oklch(0.85 0.08 80)',
      300: 'oklch(0.75 0.12 80)',
      400: 'oklch(0.65 0.16 80)',
      500: 'oklch(0.55 0.20 80)', // Base warning
      600: 'oklch(0.45 0.18 80)',
      700: 'oklch(0.37 0.15 80)',
      800: 'oklch(0.29 0.12 80)',
      900: 'oklch(0.22 0.09 80)',
    },

    // Error colors
    error: {
      50: 'oklch(0.97 0.02 20)',
      100: 'oklch(0.93 0.04 20)',
      200: 'oklch(0.85 0.08 20)',
      300: 'oklch(0.75 0.12 20)',
      400: 'oklch(0.65 0.16 20)',
      500: 'oklch(0.55 0.20 20)', // Base error
      600: 'oklch(0.45 0.18 20)',
      700: 'oklch(0.37 0.15 20)',
      800: 'oklch(0.29 0.12 20)',
      900: 'oklch(0.22 0.09 20)',
    },

    // Info colors
    info: {
      50: 'oklch(0.97 0.02 220)',
      100: 'oklch(0.93 0.04 220)',
      200: 'oklch(0.85 0.08 220)',
      300: 'oklch(0.75 0.12 220)',
      400: 'oklch(0.65 0.16 220)',
      500: 'oklch(0.55 0.20 220)', // Base info
      600: 'oklch(0.45 0.18 220)',
      700: 'oklch(0.37 0.15 220)',
      800: 'oklch(0.29 0.12 220)',
      900: 'oklch(0.22 0.09 220)',
    },
  },

  // Special colors for different theme variants
  special: {
    // Glassmorphic effects
    glass: {
      light: 'rgba(255, 255, 255, 0.1)',
      medium: 'rgba(255, 255, 255, 0.2)',
      heavy: 'rgba(255, 255, 255, 0.3)',
    },

    // Neon colors for cyberpunk theme
    neon: {
      cyan: 'oklch(0.8 0.3 200)',
      magenta: 'oklch(0.7 0.3 320)',
      yellow: 'oklch(0.9 0.2 90)',
      green: 'oklch(0.8 0.3 140)',
    },

    // High contrast colors for accessibility
    highContrast: {
      black: 'oklch(0.00 0.00 0)',
      white: 'oklch(1.00 0.00 0)',
      darkGray: 'oklch(0.25 0.00 0)',
      lightGray: 'oklch(0.75 0.00 0)',
    },
  },
};

// Semantic color mappings for different contexts
export const semanticColorMap = {
  // Background colors
  background: {
    primary: 'var(--color-neutral-0)',
    secondary: 'var(--color-neutral-50)',
    tertiary: 'var(--color-neutral-100)',
    inverse: 'var(--color-neutral-900)',
  },

  // Text colors
  text: {
    primary: 'var(--color-neutral-900)',
    secondary: 'var(--color-neutral-700)',
    tertiary: 'var(--color-neutral-500)',
    inverse: 'var(--color-neutral-0)',
    accent: 'var(--color-primary-600)',
  },

  // Border colors
  border: {
    default: 'var(--color-neutral-200)',
    subtle: 'var(--color-neutral-100)',
    strong: 'var(--color-neutral-300)',
    accent: 'var(--color-primary-500)',
  },

  // Interactive colors
  interactive: {
    default: 'var(--color-primary-500)',
    hover: 'var(--color-primary-600)',
    active: 'var(--color-primary-700)',
    disabled: 'var(--color-neutral-300)',
  },

  // Status colors
  status: {
    success: 'var(--color-semantic-success-500)',
    warning: 'var(--color-semantic-warning-500)',
    error: 'var(--color-semantic-error-500)',
    info: 'var(--color-semantic-info-500)',
  },
};

// Function to generate CSS custom properties from color tokens
export function generateColorVariables(tokens: typeof colorTokens): Record<string, string> {
  const variables: Record<string, string> = {};

  // Handle empty or invalid input
  if (!tokens || typeof tokens !== 'object') {
    return variables;
  }

  // Process primary, secondary, accent colors
  ['primary', 'secondary', 'accent'].forEach(category => {
    const colors = tokens[category as keyof typeof tokens] as Record<string, string>;
    if (colors && typeof colors === 'object') {
      Object.entries(colors).forEach(([shade, value]) => {
        variables[`--color-${category}-${shade}`] = value;
      });
    }
  });

  // Process neutral colors
  if (tokens.neutral && typeof tokens.neutral === 'object') {
    Object.entries(tokens.neutral).forEach(([shade, value]) => {
      variables[`--color-neutral-${shade}`] = value;
    });
  }

  // Process semantic colors
  if (tokens.semantic && typeof tokens.semantic === 'object') {
    Object.entries(tokens.semantic).forEach(([category, shades]) => {
      if (shades && typeof shades === 'object') {
        Object.entries(shades).forEach(([shade, value]) => {
          variables[`--color-semantic-${category}-${shade}`] = value;
        });
      }
    });
  }

  // Process special colors
  if (tokens.special && typeof tokens.special === 'object') {
    Object.entries(tokens.special).forEach(([category, colors]) => {
      if (colors && typeof colors === 'object') {
        Object.entries(colors).forEach(([name, value]) => {
          variables[`--color-special-${category}-${name}`] = value;
        });
      }
    });
  }

  return variables;
}

// Export default color configuration
export const defaultColorConfig = {
  tokens: colorTokens,
  semantic: semanticColorMap,
  variables: generateColorVariables(colorTokens),
}; 