# OpsSight Theme System

The OpsSight theme system provides a flexible, accessible, and extensible approach to styling the application with multiple visual variants while maintaining consistency and usability.

## Overview

The theme system is built on top of design tokens and provides:

- **6 Pre-built Theme Variants**: Minimal, Neo-Brutalist, Glassmorphic, Cyberpunk, Editorial, and Accessible
- **Dynamic Theme Generation**: Create themes programmatically from seed colors
- **Full TypeScript Support**: Type-safe theme creation and customization
- **Accessibility First**: Built-in accessibility features and WCAG compliance
- **CSS Custom Properties**: Dynamic styling with CSS variables
- **Animation Support**: Theme-specific animations and effects

## Quick Start

### Basic Usage

```typescript
import { themes, applyTheme } from '../styles/themes';

// Apply a pre-built theme
applyTheme(themes.minimal);

// Or apply by name
import { getTheme } from '../styles/themes';
applyTheme(getTheme('cyberpunk'));
```

### React Component Integration

```tsx
import React from 'react';
import { ThemePreview } from '../components/ui/ThemePreview';

function App() {
  return (
    <div className="app">
      <ThemePreview />
      {/* Your app content */}
    </div>
  );
}
```

## Theme Variants

### 1. Minimal Theme

**Philosophy**: Clean, spacious design with subtle colors and increased spacing.

```typescript
import { themes } from '../styles/themes';
applyTheme(themes.minimal);
```

**Features**:
- Muted primary colors (`oklch(0.45 0.05 250)`)
- Increased spacing (2rem, 3rem, 4rem)
- Subtle shadows (`0 1px 3px rgba(0, 0, 0, 0.02)`)
- Clean typography focus

**Best for**: Professional interfaces, dashboards, documentation

### 2. Neo-Brutalist Theme

**Philosophy**: Bold, geometric design with high contrast and thick borders.

```typescript
applyTheme(themes['neo-brutalist']);
```

**Features**:
- Pure black primary (`oklch(0.00 0.00 0)`)
- Thick borders (3px, 5px, 8px)
- Hard shadows (`6px 6px 0px oklch(0.00 0.00 0)`)
- Bold, geometric aesthetics

**Best for**: Creative portfolios, art platforms, bold brand expressions

### 3. Glassmorphic Theme

**Philosophy**: Translucent elements with blur effects and subtle transparency.

```typescript
applyTheme(themes.glassmorphic);
```

**Features**:
- Glass-like transparency effects
- Backdrop blur filters (`blur(10px) saturate(180%)`)
- Subtle borders with transparency
- Floating animation effects

**Best for**: Modern web apps, mobile interfaces, futuristic designs

### 4. Cyberpunk Theme

**Philosophy**: Dark theme with neon colors and futuristic glow effects.

```typescript
applyTheme(themes.cyberpunk);
```

**Features**:
- Neon cyan primary (`oklch(0.80 0.30 200)`)
- Dark backgrounds (`oklch(0.08 0.02 250)`)
- Glow effects and animations
- Neon color palette (cyan, magenta, yellow, green)

**Best for**: Gaming interfaces, tech demos, sci-fi applications

### 5. Editorial Theme

**Philosophy**: Typography-focused with optimized fonts for reading.

```typescript
applyTheme(themes.editorial);
```

**Features**:
- Serif heading fonts (Playfair Display)
- Improved line heights (1.6, 1.7, 1.8)
- Optimal reading width (65ch)
- Typography-first design

**Best for**: Blogs, news sites, documentation, content-heavy applications

### 6. Accessible Theme

**Philosophy**: High contrast theme optimized for accessibility.

```typescript
applyTheme(themes.accessible);
```

**Features**:
- High contrast colors (`oklch(0.20 0.00 0)`)
- Larger tap targets (44px minimum)
- Enhanced focus indicators
- WCAG AAA compliance

**Best for**: Government sites, healthcare applications, accessibility-first interfaces

## Dynamic Theme Generation

Create themes programmatically using color theory:

```typescript
import { generateDynamicTheme, applyTheme } from '../styles/themes';

// Generate theme from hue (0-360)
const customTheme = generateDynamicTheme(240); // Blue-based theme
applyTheme(customTheme);

// The system automatically calculates:
// - Complementary colors (240 + 180 = 60)
// - Triadic colors (240 + 120 = 0)
// - Full color scales for each
```

## Custom Theme Creation

### Basic Custom Theme

```typescript
import { createTheme, applyTheme } from '../styles/themes';

const myTheme = createTheme('my-brand', {
  colors: {
    primary: {
      500: '#your-brand-color',
    },
  },
  customProperties: {
    '--brand-font': 'YourBrandFont, sans-serif',
    '--brand-radius': '8px',
  },
});

applyTheme(myTheme);
```

### Advanced Custom Theme

```typescript
const advancedTheme = createTheme('advanced', {
  colors: {
    primary: {
      50: '#f0f9ff',
      500: '#0ea5e9',
      900: '#0c4a6e',
    },
    semantic: {
      success: {
        500: '#10b981',
      },
    },
  },
  typography: {
    families: {
      heading: '"Custom Heading Font", serif',
      body: '"Custom Body Font", sans-serif',
    },
    sizes: {
      xl: '1.5rem',
    },
  },
  spacing: {
    spacing: {
      lg: '3rem',
    },
  },
  customProperties: {
    '--custom-shadow': '0 4px 6px rgba(0, 0, 0, 0.1)',
    '--custom-transition': 'all 0.3s ease',
  },
  effects: {
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
    borderStyle: '2px solid',
    animations: {
      pulse: 'pulse 2s infinite',
    },
  },
});
```

## CSS Integration

### Using Theme Classes

Each theme automatically adds a class to the body element:

```css
/* Minimal theme specific styles */
.theme-minimal .my-component {
  transition: all 0.3s ease;
}

/* Cyberpunk theme specific styles */
.theme-cyberpunk .neon-text {
  animation: neonGlow 2s infinite alternate;
}

/* Neo-brutalist theme specific styles */
.theme-neo-brutalist .button {
  box-shadow: 6px 6px 0px 0px rgba(0, 0, 0, 1);
  border: 3px solid rgba(0, 0, 0, 1);
}
```

### Using CSS Custom Properties

Themes generate CSS custom properties automatically:

```css
.my-component {
  color: var(--color-primary-500);
  background: var(--color-neutral-50);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
}

/* Theme-specific variables */
.cyberpunk-card {
  box-shadow: var(--cyberpunk-glow);
  text-shadow: var(--cyberpunk-text-shadow);
}

.glass-panel {
  background: var(--glass-background);
  backdrop-filter: var(--glass-backdrop);
  border: var(--glass-border);
}
```

## Animations and Effects

### Theme-Specific Animations

```css
/* Available in cyberpunk theme */
.neon-glow {
  animation: neonGlow 2s ease-in-out infinite alternate;
}

.text-flicker {
  animation: textFlicker 1.5s infinite;
}

/* Available in glassmorphic theme */
.glass-morph {
  animation: glassMorph 3s ease-in-out infinite;
}

.float-glass {
  animation: floatGlass 4s ease-in-out infinite;
}

/* Available in neo-brutalist theme */
.brutalist-shake:hover {
  animation: brutalistShake 0.5s ease-in-out;
}

/* Available in minimal theme */
.gentle-float {
  animation: gentleFloat 3s ease-in-out infinite;
}
```

### Accessibility Considerations

```css
/* Respects user preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .theme-accessible .high-contrast-pulse {
    animation: none;
    background-color: var(--accessible-focus);
  }
}
```

## React Hooks

### useTheme Hook

```typescript
import { useState, useCallback } from 'react';
import { themes, applyTheme, type ThemeName } from '../styles/themes';

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('minimal');

  const switchTheme = useCallback((themeName: ThemeName) => {
    setCurrentTheme(themeName);
    applyTheme(themes[themeName]);
  }, []);

  const generateDynamic = useCallback((seedColor: number) => {
    const dynamicTheme = generateDynamicTheme(seedColor);
    applyTheme(dynamicTheme);
  }, []);

  return {
    currentTheme,
    switchTheme,
    generateDynamic,
    availableThemes: Object.keys(themes) as ThemeName[],
  };
}
```

### Usage in Components

```tsx
import React from 'react';
import { useTheme } from '../hooks/useTheme';

function ThemeSwatcher() {
  const { currentTheme, switchTheme, availableThemes } = useTheme();

  return (
    <div className="theme-switcher">
      {availableThemes.map((themeName) => (
        <button
          key={themeName}
          onClick={() => switchTheme(themeName)}
          className={currentTheme === themeName ? 'active' : ''}
        >
          {themeName}
        </button>
      ))}
    </div>
  );
}
```

## TypeScript Integration

### Type Definitions

```typescript
import type { Theme, ThemeName } from '../styles/themes';

// Theme-aware component props
interface ThemedComponentProps {
  theme?: ThemeName;
  customTheme?: Partial<Theme>;
}

// Theme context type
interface ThemeContext {
  currentTheme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  themes: Record<ThemeName, Theme>;
}
```

### Type-Safe Theme Customization

```typescript
import { createTheme } from '../styles/themes';

// TypeScript ensures correct structure
const typedTheme = createTheme('typed', {
  colors: {
    primary: {
      500: '#ff0000', // ✅ Valid
      // 500: 123,     // ❌ TypeScript error
    },
  },
  customProperties: {
    '--valid-property': '16px', // ✅ Valid
    // invalidProperty: 'value', // ❌ TypeScript error
  },
});
```

## Performance Considerations

### Lazy Loading

```typescript
// Lazy load theme animations only when needed
const loadThemeAnimations = async () => {
  if (document.body.classList.contains('theme-cyberpunk')) {
    await import('../styles/themes/cyberpunk-animations.css');
  }
};
```

### CSS Custom Properties Performance

```typescript
// Efficient theme switching using CSS custom properties
function switchThemeEfficient(theme: Theme) {
  const root = document.documentElement;
  const variables = generateThemeVariables(theme);
  
  // Batch DOM updates
  Object.entries(variables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
}
```

## Accessibility Guidelines

### Color Contrast

All themes meet WCAG guidelines:

- **Minimal**: AA compliance (4.5:1 minimum)
- **Accessible**: AAA compliance (7:1 minimum)
- **Other themes**: AA compliance with high contrast alternatives

### Focus Management

```css
/* Consistent focus indicators across themes */
.theme-accessible .accessible-focus:focus {
  outline: 3px solid var(--accessible-focus);
  outline-offset: 2px;
}

/* Theme-specific focus styles */
.theme-cyberpunk .neon-focus:focus {
  box-shadow: 0 0 0 3px var(--neon-cyan);
}
```

### Screen Reader Support

```typescript
// Announce theme changes to screen readers
function announceThemeChange(themeName: string) {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = `Theme changed to ${themeName}`;
  
  document.body.appendChild(announcement);
  setTimeout(() => document.body.removeChild(announcement), 1000);
}
```

## Testing

### Unit Tests

```typescript
import { createTheme, generateThemeVariables } from '../styles/themes';

describe('Theme System', () => {
  it('should create valid themes', () => {
    const theme = createTheme('test');
    expect(theme.name).toBe('test');
    expect(theme.colors).toBeDefined();
  });

  it('should generate CSS variables', () => {
    const theme = createTheme('test', {
      customProperties: { '--test': 'value' }
    });
    const variables = generateThemeVariables(theme);
    expect(variables['--test']).toBe('value');
  });
});
```

### Visual Regression Testing

```typescript
// Playwright test example
test('theme variants render correctly', async ({ page }) => {
  for (const themeName of Object.keys(themes)) {
    await page.goto(`/theme-preview?theme=${themeName}`);
    await expect(page).toHaveScreenshot(`${themeName}-theme.png`);
  }
});
```

## Best Practices

### Theme Selection

1. **Consider your audience**: Accessible theme for government/healthcare, Editorial for content sites
2. **Brand alignment**: Match theme aesthetic to brand personality
3. **User preferences**: Provide theme switching capability
4. **Context-aware**: Different themes for different sections

### Performance

1. **Lazy load animations**: Only load CSS animations when theme is active
2. **CSS custom properties**: Use for dynamic theming instead of class switching
3. **Minimal overrides**: Only override necessary properties in custom themes
4. **Batch updates**: Group DOM changes when switching themes

### Accessibility

1. **Test with screen readers**: Ensure all themes work with assistive technology
2. **Respect user preferences**: Honor `prefers-reduced-motion` and `prefers-contrast`
3. **Provide alternatives**: Offer high contrast versions of colorful themes
4. **Focus management**: Ensure focus indicators are visible in all themes

### Maintenance

1. **Consistent naming**: Use descriptive, consistent naming for custom properties
2. **Documentation**: Document theme-specific behaviors and edge cases
3. **Version control**: Track theme changes and breaking updates
4. **Testing**: Automated testing for theme consistency and accessibility

## Troubleshooting

### Common Issues

**Theme not applying correctly**:
```typescript
// Ensure theme is applied after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(themes.minimal);
});
```

**CSS custom properties not updating**:
```typescript
// Force style recalculation
document.documentElement.style.setProperty('--force-update', Date.now().toString());
```

**Animations not working**:
```css
/* Ensure theme class is present */
.theme-cyberpunk .neon-glow {
  animation: neonGlow 2s infinite alternate;
}
```

### Browser Support

- **CSS Custom Properties**: All modern browsers (IE 11+ with polyfill)
- **Backdrop Filter**: Modern browsers (Safari 9+, Chrome 76+, Firefox 103+)
- **OKLCH Colors**: Modern browsers (Safari 15.4+, Chrome 111+, Firefox 113+)

### Migration Guide

From v1 to v2 themes:
```typescript
// Old approach (v1)
import { applyTheme } from '../styles/themes-v1';
applyTheme('dark');

// New approach (v2)
import { themes, applyTheme } from '../styles/themes';
applyTheme(themes.cyberpunk); // or appropriate equivalent
```

## Examples

See the `ThemePreview` component for complete implementation examples and interactive demonstrations of all theme variants.

## Contributing

When adding new themes:

1. Follow the existing theme structure
2. Ensure accessibility compliance
3. Add comprehensive tests
4. Update documentation
5. Consider performance impact

For theme requests or issues, please see our contribution guidelines. 