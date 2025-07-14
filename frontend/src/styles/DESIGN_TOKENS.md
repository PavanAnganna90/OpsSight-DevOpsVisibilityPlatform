# OpsSight Design Token System

## Overview

The OpsSight design token system provides a comprehensive set of design tokens for building consistent, scalable, and accessible user interfaces. The system is built using modern CSS custom properties and TypeScript for type safety.

## Architecture

The design token system is organized into three main categories:

- **Colors**: Primary, secondary, accent, neutral palettes with semantic mappings
- **Typography**: Font families, weights, sizes, line heights, and letter spacing
- **Spacing**: Layout tokens including spacing, borders, shadows, and animations

## Usage

### Basic Import

```typescript
import { tokens } from '@/styles/tokens';
import { generateAllTokenVariables } from '@/styles/tokens';

// Use individual token categories
const primaryColor = tokens.colors.primary['500'];
const headingFont = tokens.fontFamilies.heading;
const baseSpacing = tokens.spacing.base;
```

### CSS Custom Properties

```css
/* All tokens are available as CSS custom properties */
.my-component {
  color: var(--color-primary-500);
  font-family: var(--font-family-heading);
  padding: var(--spacing-base);
  border-radius: var(--border-radius-md);
}
```

## Color Tokens

### Primary Palette
Modern OKLCH-based color system with 11 shades from 50-950:

```typescript
// Available color scales
tokens.colors.primary['50']   // Lightest
tokens.colors.primary['100']
tokens.colors.primary['200']
tokens.colors.primary['300']
tokens.colors.primary['400']
tokens.colors.primary['500']  // Base color
tokens.colors.primary['600']
tokens.colors.primary['700']
tokens.colors.primary['800']
tokens.colors.primary['900']
tokens.colors.primary['950']  // Darkest
```

### Color Categories

- **Primary**: Main brand colors (blue-based)
- **Secondary**: Supporting colors (purple-based)
- **Accent**: Attention colors (green-based)
- **Neutral**: Grayscale colors (slate-based)

### Semantic Colors

```typescript
// Status colors
tokens.semanticColors.success     // Green variants
tokens.semanticColors.warning     // Yellow variants
tokens.semanticColors.error       // Red variants
tokens.semanticColors.info        // Blue variants

// UI element colors
tokens.semanticColors.background  // Page backgrounds
tokens.semanticColors.surface     // Card/panel backgrounds
tokens.semanticColors.border      // Border colors
tokens.semanticColors.text        // Text colors
```

### Special Color Sets

```typescript
// Glassmorphic theme colors
tokens.colors.glass.primary
tokens.colors.glass.accent

// Neon/cyberpunk colors
tokens.colors.neon.electric
tokens.colors.neon.cyber

// High contrast colors
tokens.colors.contrast.background
tokens.colors.contrast.text
```

## Typography Tokens

### Font Families

```typescript
tokens.fontFamilies.sans        // Inter (primary)
tokens.fontFamilies.serif       // Crimson Pro
tokens.fontFamilies.mono        // JetBrains Mono
tokens.fontFamilies.heading     // Inter
tokens.fontFamilies.body        // Inter
```

### Font Weights

```typescript
tokens.fontWeights.thin         // 100
tokens.fontWeights.extralight   // 200
tokens.fontWeights.light        // 300
tokens.fontWeights.normal       // 400
tokens.fontWeights.medium       // 500
tokens.fontWeights.semibold     // 600
tokens.fontWeights.bold         // 700
tokens.fontWeights.extrabold    // 800
tokens.fontWeights.black        // 900
```

### Font Sizes & Typography Scale

```typescript
// Base sizes
tokens.fontSizes.xs             // 12px
tokens.fontSizes.sm             // 14px
tokens.fontSizes.base           // 16px
tokens.fontSizes.lg             // 18px
tokens.fontSizes.xl             // 20px
tokens.fontSizes['2xl']         // 24px
tokens.fontSizes['3xl']         // 30px
tokens.fontSizes['4xl']         // 36px
tokens.fontSizes['5xl']         // 48px
tokens.fontSizes['6xl']         // 60px
tokens.fontSizes['7xl']         // 72px

// Typography variants
tokens.typographyVariants.h1    // Heading 1 style
tokens.typographyVariants.h2    // Heading 2 style
tokens.typographyVariants.body  // Body text style
tokens.typographyVariants.caption // Caption style
```

## Spacing Tokens

### Base Spacing Scale

```typescript
tokens.spacing.xxs              // 2px
tokens.spacing.xs               // 4px
tokens.spacing.sm               // 8px
tokens.spacing.base             // 16px
tokens.spacing.md               // 20px
tokens.spacing.lg               // 24px
tokens.spacing.xl               // 32px
tokens.spacing['2xl']           // 40px
tokens.spacing['3xl']           // 48px
tokens.spacing['4xl']           // 64px
tokens.spacing['5xl']           // 80px
tokens.spacing['6xl']           // 96px
```

### Border Radius

```typescript
tokens.borderRadius.none        // 0px
tokens.borderRadius.sm          // 2px
tokens.borderRadius.base        // 4px
tokens.borderRadius.md          // 6px
tokens.borderRadius.lg          // 8px
tokens.borderRadius.xl          // 12px
tokens.borderRadius['2xl']      // 16px
tokens.borderRadius['3xl']      // 24px
tokens.borderRadius.full        // 9999px
```

### Shadows

```typescript
tokens.shadows.xs               // Subtle shadow
tokens.shadows.sm               // Small shadow
tokens.shadows.base             // Base shadow
tokens.shadows.md               // Medium shadow
tokens.shadows.lg               // Large shadow
tokens.shadows.xl               // Extra large shadow
tokens.shadows['2xl']           // 2X large shadow
tokens.shadows.inner            // Inner shadow
```

### Animation & Transitions

```typescript
// Duration
tokens.durations.instant        // 0ms
tokens.durations.fast           // 150ms
tokens.durations.normal         // 300ms
tokens.durations.slow           // 500ms
tokens.durations.slower         // 750ms

// Easing functions
tokens.easingFunctions.linear   // linear
tokens.easingFunctions.ease     // ease
tokens.easingFunctions.easeIn   // ease-in
tokens.easingFunctions.easeOut  // ease-out
```

## Implementation Examples

### Using Tokens in React Components

```typescript
import React from 'react';
import styled from 'styled-components';
import { tokens } from '@/styles/tokens';

const Card = styled.div`
  background: var(--color-surface-primary);
  border: var(--border-width-sm) solid var(--color-border-subtle);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-md);
  transition: var(--transition-shadow);

  &:hover {
    box-shadow: var(--shadow-lg);
  }
`;

const CardTitle = styled.h2`
  font-family: var(--font-family-heading);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-sm);
`;
```

### Using Semantic Spacing

```typescript
// Semantic spacing for consistent layouts
tokens.semanticSpacing.component.padding     // Standard component padding
tokens.semanticSpacing.component.margin      // Standard component margin
tokens.semanticSpacing.section.padding       // Section padding
tokens.semanticSpacing.container.padding     // Container padding
```

### Responsive Breakpoints

```typescript
tokens.breakpoints.xs           // 480px
tokens.breakpoints.sm           // 640px
tokens.breakpoints.md           // 768px
tokens.breakpoints.lg           // 1024px
tokens.breakpoints.xl           // 1280px
tokens.breakpoints['2xl']       // 1536px
```

## CSS Custom Properties Generation

The token system automatically generates CSS custom properties:

```typescript
import { generateAllTokenVariables } from '@/styles/tokens';

// Generates an object with all CSS custom properties
const cssVariables = generateAllTokenVariables();

// Usage in a global style component
const GlobalStyles = createGlobalStyle`
  :root {
    ${Object.entries(cssVariables)
      .map(([key, value]) => `${key}: ${value};`)
      .join('\n    ')}
  }
`;
```

## Theme Integration

The design tokens work seamlessly with the OpsSight theme system:

```typescript
// Tokens automatically adapt to different theme variants
// - Minimal theme uses subtle colors and spacing
// - Neo-brutalist theme uses bold colors and sharp edges
// - Glassmorphic theme uses transparency and blur effects
// - Cyberpunk theme uses neon colors and dramatic shadows
```

## Accessibility

The token system ensures WCAG 2.1 AA compliance:

- **Color Contrast**: All color combinations meet minimum contrast ratios
- **Focus States**: Dedicated focus tokens for keyboard navigation
- **High Contrast Mode**: Special high-contrast color variants
- **Typography**: Optimized font sizes and line heights for readability

## Best Practices

### Do's ✅

- Always use semantic color tokens for UI elements
- Use the spacing scale consistently across components
- Leverage typography variants for consistent text styling
- Use CSS custom properties for dynamic theming

### Don'ts ❌

- Don't hardcode color values or spacing
- Don't bypass the token system for one-off designs
- Don't modify token values directly in components
- Don't use non-semantic color tokens for UI elements

## Token Maintenance

The token system is designed for easy maintenance:

1. **Central Configuration**: All tokens defined in organized files
2. **Type Safety**: Full TypeScript support prevents errors
3. **Automatic Generation**: CSS variables generated automatically
4. **Testing**: Comprehensive unit tests ensure reliability
5. **Documentation**: This guide stays in sync with implementation

## File Structure

```
src/styles/tokens/
├── index.ts           # Main exports and combined configuration
├── colors.ts          # Color tokens and palettes
├── typography.ts      # Typography tokens and scales
└── spacing.ts         # Spacing, layout, and animation tokens

src/tests/tokens/
├── colors.test.ts     # Color token tests
├── typography.test.ts # Typography token tests
└── spacing.test.ts    # Spacing token tests
```

---

**Last Updated**: 2025-06-05  
**Version**: 1.0.0  
**Total Tokens**: 200+ design tokens across all categories 