/**
 * Design tokens index - OpsSight theme system
 * Central export for all design tokens
 */

export * from './colors';
export * from './typography';
export * from './spacing';

import { defaultColorConfig } from './colors';
import { defaultTypographyConfig } from './typography';
import { defaultSpacingConfig } from './spacing';

// Combined design tokens configuration
export const designTokens = {
  colors: defaultColorConfig,
  typography: defaultTypographyConfig,
  spacing: defaultSpacingConfig,
} as const;

// Function to generate all CSS custom properties
export function generateAllTokenVariables(): Record<string, string> {
  return {
    ...defaultColorConfig.variables,
    ...defaultTypographyConfig.variables,
    ...defaultSpacingConfig.variables,
  };
}

// Export token categories for convenience
export const tokens = {
  // Color tokens
  colors: defaultColorConfig.tokens,
  semanticColors: defaultColorConfig.semantic,
  
  // Typography tokens
  fontFamilies: defaultTypographyConfig.families,
  fontWeights: defaultTypographyConfig.weights,
  fontSizes: defaultTypographyConfig.sizes,
  lineHeights: defaultTypographyConfig.lineHeights,
  letterSpacing: defaultTypographyConfig.letterSpacing,
  typographyScale: defaultTypographyConfig.scale,
  typographyVariants: defaultTypographyConfig.variants,
  
  // Spacing tokens
  spacing: defaultSpacingConfig.spacing,
  borderRadius: defaultSpacingConfig.borderRadius,
  borderWidth: defaultSpacingConfig.borderWidth,
  shadows: defaultSpacingConfig.shadows,
  zIndex: defaultSpacingConfig.zIndex,
  opacity: defaultSpacingConfig.opacity,
  containers: defaultSpacingConfig.containers,
  breakpoints: defaultSpacingConfig.breakpoints,
  grid: defaultSpacingConfig.grid,
  transitions: defaultSpacingConfig.transitions,
  durations: defaultSpacingConfig.durations,
  easingFunctions: defaultSpacingConfig.easingFunctions,
  semanticSpacing: defaultSpacingConfig.semantic,
} as const;

// Type exports for TypeScript usage
export type ColorTokens = typeof defaultColorConfig.tokens;
export type TypographyTokens = typeof defaultTypographyConfig;
export type SpacingTokens = typeof defaultSpacingConfig;
export type AllTokens = typeof tokens;

export default designTokens; 