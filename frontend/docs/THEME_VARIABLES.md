# Theme Variables Documentation

## Overview

The OpsSight theme system provides a comprehensive set of CSS custom properties (variables) for consistent theming across all components. This system extends the existing color-modes.css with semantic naming and component-specific variables.

## Architecture

The theme system consists of three layers:

1. **Base Layer** (`color-modes.css`) - Core color mode variables (`--mode-*`)
2. **Semantic Layer** (`theme-variables.css`) - Semantic component variables (`--theme-*`)
3. **Component Layer** - Component-specific implementations using theme variables

## Available Variables

### Colors

#### Background Colors
```css
--theme-background-primary     /* Main background */
--theme-background-secondary   /* Secondary surfaces */
--theme-background-tertiary    /* Tertiary surfaces */
--theme-background-elevated    /* Elevated surfaces (cards, modals) */
--theme-background-inverse     /* Inverse background color */
```

#### Text Colors
```css
--theme-text-primary           /* Primary text */
--theme-text-secondary         /* Secondary text (70% opacity) */
--theme-text-tertiary          /* Tertiary text (50% opacity) */
--theme-text-disabled          /* Disabled text (30% opacity) */
--theme-text-inverse           /* Inverse text color */
```

#### Border Colors
```css
--theme-border-primary         /* Primary borders */
--theme-border-secondary       /* Secondary borders (50% opacity) */
--theme-border-focus           /* Focus state borders */
--theme-border-error           /* Error state borders */
--theme-border-success         /* Success state borders */
```

### Component Variables

#### Buttons
```css
/* Primary Button */
--theme-button-primary-bg
--theme-button-primary-text
--theme-button-primary-hover
--theme-button-primary-active
--theme-button-primary-disabled

/* Secondary Button */
--theme-button-secondary-bg
--theme-button-secondary-text
--theme-button-secondary-border
--theme-button-secondary-hover
--theme-button-secondary-active

/* Destructive Button */
--theme-button-destructive-bg
--theme-button-destructive-text
--theme-button-destructive-hover
--theme-button-destructive-active
```

#### Form Elements
```css
--theme-input-bg
--theme-input-text
--theme-input-border
--theme-input-border-focus
--theme-input-placeholder
--theme-input-disabled-bg
--theme-input-disabled-text
```

#### Cards & Surfaces
```css
--theme-card-bg
--theme-card-border
--theme-card-shadow
--theme-card-shadow-hover
--theme-card-radius
```

#### Navigation
```css
--theme-nav-bg
--theme-nav-border
--theme-nav-item-text
--theme-nav-item-text-active
--theme-nav-item-bg-hover
--theme-nav-item-bg-active
```

#### Status Colors
```css
/* Success */
--theme-status-success-bg
--theme-status-success-text
--theme-status-success-border

/* Error */
--theme-status-error-bg
--theme-status-error-text
--theme-status-error-border

/* Warning */
--theme-status-warning-bg
--theme-status-warning-text
--theme-status-warning-border

/* Info */
--theme-status-info-bg
--theme-status-info-text
--theme-status-info-border
```

### Transitions
```css
--theme-transition-fast        /* 150ms - for quick interactions */
--theme-transition-normal      /* 300ms - standard transitions */
--theme-transition-slow        /* 500ms - for complex animations */
```

### Typography Scale
```css
--theme-font-size-xs           /* 0.75rem */
--theme-font-size-sm           /* 0.875rem */
--theme-font-size-base         /* 1rem */
--theme-font-size-lg           /* 1.125rem */
--theme-font-size-xl           /* 1.25rem */
--theme-font-size-2xl          /* 1.5rem */
--theme-font-size-3xl          /* 1.875rem */
--theme-font-size-4xl          /* 2.25rem */

--theme-line-height-tight      /* 1.25 */
--theme-line-height-normal     /* 1.5 */
--theme-line-height-relaxed    /* 1.75 */
```

### Spacing Scale
```css
--theme-space-0                /* 0 */
--theme-space-1                /* 0.25rem */
--theme-space-2                /* 0.5rem */
--theme-space-3                /* 0.75rem */
--theme-space-4                /* 1rem */
--theme-space-5                /* 1.25rem */
--theme-space-6                /* 1.5rem */
--theme-space-8                /* 2rem */
--theme-space-10               /* 2.5rem */
--theme-space-12               /* 3rem */
--theme-space-16               /* 4rem */
--theme-space-20               /* 5rem */
```

### Z-Index Scale
```css
--theme-z-dropdown             /* 1000 */
--theme-z-sticky               /* 1020 */
--theme-z-fixed                /* 1030 */
--theme-z-modal-backdrop       /* 1040 */
--theme-z-modal                /* 1050 */
--theme-z-popover              /* 1060 */
--theme-z-tooltip              /* 1070 */
--theme-z-toast                /* 1080 */
```

## Utility Classes

### Background Classes
```css
.theme-bg-primary              /* Primary background */
.theme-bg-secondary            /* Secondary background */
.theme-bg-tertiary             /* Tertiary background */
.theme-bg-elevated             /* Elevated background */
```

### Text Classes
```css
.theme-text-primary            /* Primary text color */
.theme-text-secondary          /* Secondary text color */
.theme-text-tertiary           /* Tertiary text color */
```

### Border Classes
```css
.theme-border                  /* Primary border */
.theme-border-secondary        /* Secondary border */
```

### Transition Classes
```css
.theme-transition              /* Normal transition */
.theme-transition-fast         /* Fast transition */
.theme-transition-slow         /* Slow transition */
```

### Component Classes
```css
.theme-card                    /* Card styling */
.theme-button-primary          /* Primary button styling */
.theme-button-secondary        /* Secondary button styling */
.theme-input                   /* Input styling */
.theme-status-success          /* Success status styling */
.theme-status-error            /* Error status styling */
.theme-status-warning          /* Warning status styling */
.theme-status-info             /* Info status styling */
```

## Theme-Specific Adaptations

Each theme variant has specific adaptations:

### Minimal Theme
- Subtle shadows and rounded corners
- Clean, spacious design with minimal visual noise

### Neo-Brutalist Theme
- Sharp corners (no border radius)
- Bold, high-contrast borders
- Distinct shadow effects

### Glassmorphic Theme
- Semi-transparent backgrounds
- Backdrop blur effects
- Subtle glass-like borders

### Cyberpunk Theme
- Cyan-focused color palette
- Glowing effects and shadows
- Futuristic aesthetic

### Editorial Theme
- Optimized typography for reading
- Enhanced line spacing and measure

### Accessible Theme
- Enhanced focus indicators
- Larger touch targets
- High contrast ratios

## Usage Examples

### Using CSS Custom Properties
```css
.my-component {
  background-color: var(--theme-background-elevated);
  color: var(--theme-text-primary);
  border: 1px solid var(--theme-border-primary);
  border-radius: var(--theme-card-radius);
  transition: all var(--theme-transition-normal);
}

.my-component:hover {
  box-shadow: var(--theme-card-shadow-hover);
}
```

### Using Utility Classes
```jsx
<div className="theme-card theme-transition">
  <h2 className="theme-text-primary">Card Title</h2>
  <p className="theme-text-secondary">Card content</p>
  <button className="theme-button-primary">
    Action Button
  </button>
</div>
```

### Replacing Tailwind Classes
```jsx
// Before - using hard-coded Tailwind classes
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">

// After - using theme variables
<div className="theme-bg-elevated theme-text-primary">

// Or with custom CSS
<div style={{
  backgroundColor: 'var(--theme-background-elevated)',
  color: 'var(--theme-text-primary)'
}}>
```

## Color Mode Adaptations

All theme variables automatically adapt to different color modes:

- **Light Mode**: Default values optimized for light backgrounds
- **Dark Mode**: Automatically adjusted for dark backgrounds with proper contrast
- **High Contrast**: Simplified palette with maximum contrast ratios
- **System**: Follows user's system preference

## Accessibility Features

### Reduced Motion
The system respects `prefers-reduced-motion: reduce`:
```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --theme-transition-fast: 0s;
    --theme-transition-normal: 0s;
    --theme-transition-slow: 0s;
  }
}
```

### High Contrast Mode
High contrast mode simplifies the color palette and removes decorative effects:
- All shadows are removed
- Background variations are unified
- Text uses maximum contrast
- Status colors use the same high-contrast palette

## Migration Guide

### From Tailwind Classes
Replace hard-coded Tailwind classes with theme variables:

```jsx
// Replace background classes
bg-white → theme-bg-primary or var(--theme-background-primary)
bg-gray-50 → theme-bg-secondary or var(--theme-background-secondary)
bg-gray-100 → theme-bg-tertiary or var(--theme-background-tertiary)

// Replace text classes
text-gray-900 → theme-text-primary or var(--theme-text-primary)
text-gray-600 → theme-text-secondary or var(--theme-text-secondary)
text-gray-400 → theme-text-tertiary or var(--theme-text-tertiary)

// Replace border classes
border-gray-200 → theme-border or var(--theme-border-primary)
border-gray-300 → theme-border-secondary or var(--theme-border-secondary)
```

### Best Practices

1. **Use semantic variables** instead of color-specific ones
2. **Prefer utility classes** for simple styling
3. **Use CSS custom properties** for complex components
4. **Test in all color modes** (light, dark, high-contrast)
5. **Respect motion preferences** by using theme transition variables
6. **Follow the component patterns** established in the utility classes

## Advanced Usage

### Creating Custom Components
```css
.custom-notification {
  background-color: var(--theme-card-bg);
  border: 1px solid var(--theme-border-primary);
  border-radius: var(--theme-card-radius);
  padding: var(--theme-space-4);
  box-shadow: var(--theme-card-shadow);
  transition: all var(--theme-transition-normal);
}

.custom-notification.success {
  background-color: var(--theme-status-success-bg);
  color: var(--theme-status-success-text);
  border-color: var(--theme-status-success-border);
}
```

### Theme-Specific Customizations
```css
.theme-cyberpunk .custom-notification {
  /* Custom styling for cyberpunk theme */
  box-shadow: var(--theme-card-shadow), 0 0 10px var(--color-cyan-500);
}

.theme-minimal .custom-notification {
  /* Minimal theme adjustments */
  box-shadow: var(--theme-card-shadow);
  border: none;
}
```

This theme variables system provides a robust foundation for consistent, accessible, and theme-aware UI components throughout the OpsSight application. 