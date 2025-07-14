/**
 * Typography tokens for the OpsSight theme system
 * Comprehensive type scale and semantic typography mappings
 */

// Font family tokens
export const fontFamilies = {
  sans: [
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ],
  mono: [
    '"JetBrains Mono"',
    '"Fira Code"',
    'Consolas',
    '"Liberation Mono"',
    'Menlo',
    'Monaco',
    'monospace',
  ],
  serif: [
    '"Playfair Display"',
    'Georgia',
    '"Times New Roman"',
    'Times',
    'serif',
  ],
} as const;

// Font weight tokens
export const fontWeights = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;

// Font size tokens (using rem for scalability)
export const fontSizes = {
  xs: '0.75rem',     // 12px
  sm: '0.875rem',    // 14px
  base: '1rem',      // 16px
  lg: '1.125rem',    // 18px
  xl: '1.25rem',     // 20px
  '2xl': '1.5rem',   // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem',  // 36px
  '5xl': '3rem',     // 48px
  '6xl': '3.75rem',  // 60px
  '7xl': '4.5rem',   // 72px
  '8xl': '6rem',     // 96px
  '9xl': '8rem',     // 128px
} as const;

// Line height tokens
export const lineHeights = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
} as const;

// Letter spacing tokens
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

// Text transform tokens
export const textTransforms = {
  none: 'none',
  uppercase: 'uppercase',
  lowercase: 'lowercase',
  capitalize: 'capitalize',
} as const;

// Semantic typography scale
export const typographyScale = {
  // Display styles (for large headlines)
  display: {
    '2xl': {
      fontSize: fontSizes['8xl'],
      lineHeight: lineHeights.none,
      letterSpacing: letterSpacing.tighter,
      fontWeight: fontWeights.black,
    },
    xl: {
      fontSize: fontSizes['7xl'],
      lineHeight: lineHeights.none,
      letterSpacing: letterSpacing.tighter,
      fontWeight: fontWeights.black,
    },
    lg: {
      fontSize: fontSizes['6xl'],
      lineHeight: lineHeights.none,
      letterSpacing: letterSpacing.tight,
      fontWeight: fontWeights.bold,
    },
    md: {
      fontSize: fontSizes['5xl'],
      lineHeight: lineHeights.tight,
      letterSpacing: letterSpacing.tight,
      fontWeight: fontWeights.bold,
    },
    sm: {
      fontSize: fontSizes['4xl'],
      lineHeight: lineHeights.tight,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.semibold,
    },
  },

  // Heading styles
  heading: {
    h1: {
      fontSize: fontSizes['3xl'],
      lineHeight: lineHeights.tight,
      letterSpacing: letterSpacing.tight,
      fontWeight: fontWeights.bold,
    },
    h2: {
      fontSize: fontSizes['2xl'],
      lineHeight: lineHeights.snug,
      letterSpacing: letterSpacing.tight,
      fontWeight: fontWeights.semibold,
    },
    h3: {
      fontSize: fontSizes.xl,
      lineHeight: lineHeights.snug,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.semibold,
    },
    h4: {
      fontSize: fontSizes.lg,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.medium,
    },
    h5: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.medium,
    },
    h6: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacing.wide,
      fontWeight: fontWeights.medium,
      textTransform: textTransforms.uppercase,
    },
  },

  // Body text styles
  body: {
    lg: {
      fontSize: fontSizes.lg,
      lineHeight: lineHeights.relaxed,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.normal,
    },
    md: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.normal,
    },
    sm: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.normal,
    },
    xs: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.tight,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.normal,
    },
  },

  // Label and UI text styles
  label: {
    lg: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.medium,
    },
    md: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.medium,
    },
    sm: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.tight,
      letterSpacing: letterSpacing.wide,
      fontWeight: fontWeights.medium,
      textTransform: textTransforms.uppercase,
    },
  },

  // Code and monospace styles
  code: {
    lg: {
      fontSize: fontSizes.lg,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.normal,
      fontFamily: fontFamilies.mono.join(', '),
    },
    md: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.normal,
      fontFamily: fontFamilies.mono.join(', '),
    },
    sm: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.normal,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.normal,
      fontFamily: fontFamilies.mono.join(', '),
    },
    xs: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.tight,
      letterSpacing: letterSpacing.normal,
      fontWeight: fontWeights.normal,
      fontFamily: fontFamilies.mono.join(', '),
    },
  },
} as const;

// Theme-specific typography variants
export const typographyVariants = {
  // Minimal theme
  minimal: {
    fontFamily: fontFamilies.sans.join(', '),
    headingWeight: fontWeights.light,
    bodyWeight: fontWeights.light,
    letterspacing: letterSpacing.normal,
  },

  // Neo-brutalist theme
  neoBrutalist: {
    fontFamily: fontFamilies.sans.join(', '),
    headingWeight: fontWeights.black,
    bodyWeight: fontWeights.medium,
    letterspacing: letterSpacing.tight,
    textTransform: textTransforms.uppercase,
  },

  // Editorial theme
  editorial: {
    fontFamily: fontFamilies.serif.join(', '),
    headingWeight: fontWeights.normal,
    bodyWeight: fontWeights.normal,
    letterspacing: letterSpacing.normal,
  },

  // Cyberpunk theme
  cyberpunk: {
    fontFamily: fontFamilies.mono.join(', '),
    headingWeight: fontWeights.bold,
    bodyWeight: fontWeights.normal,
    letterspacing: letterSpacing.wider,
    textTransform: textTransforms.uppercase,
  },

  // Accessible theme
  accessible: {
    fontFamily: fontFamilies.sans.join(', '),
    headingWeight: fontWeights.semibold,
    bodyWeight: fontWeights.normal,
    letterspacing: letterSpacing.wide,
    lineHeight: lineHeights.relaxed,
  },
} as const;

// Function to generate CSS custom properties from typography tokens
export function generateTypographyVariables(): Record<string, string> {
  const variables: Record<string, string> = {};

  // Font families
  Object.entries(fontFamilies).forEach(([name, value]) => {
    variables[`--font-family-${name}`] = value.join(', ');
  });

  // Font weights
  Object.entries(fontWeights).forEach(([name, value]) => {
    variables[`--font-weight-${name}`] = value;
  });

  // Font sizes
  Object.entries(fontSizes).forEach(([name, value]) => {
    variables[`--font-size-${name}`] = value;
  });

  // Line heights
  Object.entries(lineHeights).forEach(([name, value]) => {
    variables[`--line-height-${name}`] = value;
  });

  // Letter spacing
  Object.entries(letterSpacing).forEach(([name, value]) => {
    variables[`--letter-spacing-${name}`] = value;
  });

  return variables;
}

// Utility function to create typography styles
export function createTypographyStyle(
  scale: keyof typeof typographyScale, 
  size: string
): Record<string, string> {
  const scaleObj = typographyScale[scale];
  if (!scaleObj) return {};
  
  const style = scaleObj[size as keyof typeof scaleObj] as any;
  if (!style) return {};

  const result: Record<string, string> = {
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    fontWeight: style.fontWeight,
  };

  if (style.fontFamily) {
    result.fontFamily = style.fontFamily;
  }

  if (style.textTransform) {
    result.textTransform = style.textTransform;
  }

  return result;
}

// Export default typography configuration
export const defaultTypographyConfig = {
  families: fontFamilies,
  weights: fontWeights,
  sizes: fontSizes,
  lineHeights,
  letterSpacing,
  scale: typographyScale,
  variants: typographyVariants,
  variables: generateTypographyVariables(),
}; 