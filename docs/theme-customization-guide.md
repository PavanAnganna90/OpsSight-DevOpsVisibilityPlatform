# Theme Customization Guide

A practical guide for customizing and extending the OpsSight theme system to match your brand and design requirements.

## Quick Start

### 1. Basic Color Customization

The fastest way to customize OpsSight is to modify the primary brand color:

```typescript
import { createTheme, applyTheme } from '../styles/themes';

// Create a theme with your brand color
const brandTheme = createTheme('my-brand', {
  colors: {
    primary: {
      500: '#your-brand-color', // Your main brand color
    },
  },
});

// Apply the theme
applyTheme(brandTheme);
```

### 2. Using Color Mode Variations

OpsSight supports light, dark, and high-contrast modes:

```typescript
import { applyTheme, getThemeWithColorMode } from '../styles/themes';

// Apply theme with specific color mode
applyTheme(getThemeWithColorMode('minimal', 'dark'));

// Or apply and let the system detect user preference
applyTheme(themes.minimal); // Automatically uses system preference
```

## Theme Architecture

### Design Token Hierarchy

OpsSight uses a three-tier token system:

```
Raw Tokens (colors.ts, typography.ts, spacing.ts)
    ↓
Semantic Tokens (semantic color mapping)
    ↓
Component Tokens (theme-specific overrides)
```

### Theme Structure

```typescript
interface Theme {
  name: string;
  colors: Record<string, any>;        // Raw color tokens
  semantic: Record<string, any>;      // Semantic color mapping
  typography: Record<string, any>;    // Font and text styling
  spacing: Record<string, any>;       // Layout spacing
  customProperties: Record<string, string>; // CSS custom properties
  effects?: {                         // Visual effects
    blur?: string;
    backdropFilter?: string;
    boxShadow?: string;
    borderStyle?: string;
    animations?: Record<string, string>;
  };
  colorModes?: {                      // Color mode variations
    light?: Partial<Theme>;
    dark?: Partial<Theme>;
    'high-contrast'?: Partial<Theme>;
  };
}
```

## Customization Methods

### Method 1: Extending Existing Themes

Build upon existing themes by extending them:

```typescript
import { themes, createTheme, applyTheme } from '../styles/themes';

// Extend the minimal theme with your brand colors
const customMinimal = createTheme('custom-minimal', {
  ...themes.minimal,
  colors: {
    ...themes.minimal.colors,
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9', // Your brand blue
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
  },
  customProperties: {
    ...themes.minimal.customProperties,
    '--brand-font': 'Inter, sans-serif',
    '--brand-radius': '8px',
  },
});

applyTheme(customMinimal);
```

### Method 2: CSS Custom Property Overrides

For quick tweaks, override CSS custom properties:

```css
/* In your global CSS */
:root {
  /* Override primary color */
  --color-primary-500: oklch(0.55 0.20 240);
  
  /* Override spacing */
  --spacing-md: 1.5rem;
  
  /* Override typography */
  --font-family-heading: 'Playfair Display', serif;
  
  /* Override effects */
  --shadow-intensity: 0.1;
}
```

### Method 3: Component-Specific Customization

Target specific components with theme overrides:

```typescript
// Create theme with component-specific styling
const componentTheme = createTheme('component-custom', {
  customProperties: {
    // Button-specific overrides
    '--button-border-radius': '12px',
    '--button-font-weight': '600',
    '--button-padding-x': '1.5rem',
    
    // Card-specific overrides
    '--card-border-radius': '16px',
    '--card-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    
    // MetricCard-specific overrides
    '--metric-card-background': 'var(--color-neutral-50)',
    '--metric-card-border': '1px solid var(--color-neutral-200)',
  },
});
```

## Creating Custom Themes

### Step 1: Define Your Theme Concept

Start with a clear design direction:

```typescript
// Example: Corporate theme concept
const corporateThemeConcept = {
  name: 'corporate',
  philosophy: 'Professional, trustworthy, accessible',
  primaryColor: '#1e40af', // Corporate blue
  accentColor: '#059669',  // Success green
  typography: 'system-ui', // System fonts for familiarity
  spacing: 'comfortable',  // Generous spacing
  effects: 'subtle',       // Minimal shadows and effects
};
```

### Step 2: Implement Base Theme

```typescript
import { createThemeWithColorModes } from '../styles/themes';

const corporateTheme = createThemeWithColorModes('corporate', {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#1e40af', // Corporate blue
      600: '#1d4ed8',
      700: '#1e3a8a',
      800: '#1e3a8a',
      900: '#1e3a8a',
    },
    secondary: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#059669', // Success green
      600: '#047857',
      700: '#065f46',
      800: '#064e3b',
      900: '#022c22',
    },
  },
  typography: {
    fontFamily: {
      heading: 'system-ui, -apple-system, sans-serif',
      body: 'system-ui, -apple-system, sans-serif',
      mono: 'ui-monospace, monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  spacing: {
    spacing: {
      xs: '0.5rem',
      sm: '0.75rem',
      md: '1.5rem',  // Generous spacing
      lg: '2.5rem',
      xl: '4rem',
    },
  },
  customProperties: {
    '--corporate-emphasis': 'professional',
    '--border-radius': '6px',
    '--shadow-intensity': '0.05', // Subtle shadows
  },
  effects: {
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    borderStyle: '1px solid var(--color-neutral-200)',
  },
}, {
  // Dark mode variation
  dark: {
    colors: {
      neutral: {
        0: '#0f172a',   // Dark blue background
        50: '#1e293b',
        100: '#334155',
        200: '#475569',
      },
      primary: {
        500: '#3b82f6', // Brighter blue for dark mode
      },
    },
    effects: {
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
    },
  },
  // High contrast variation
  'high-contrast': {
    colors: {
      primary: {
        500: '#000000', // Pure black for maximum contrast
      },
      neutral: {
        0: '#ffffff',
        1000: '#000000',
      },
    },
    customProperties: {
      '--border-width': '2px',
      '--focus-ring-width': '3px',
    },
  },
});
```

### Step 3: Register and Apply Theme

```typescript
// Add to your theme registry
export const themes = {
  // ... existing themes
  corporate: corporateTheme,
};

// Apply the theme
import { applyTheme } from '../styles/themes';
applyTheme(corporateTheme);
```

### Step 4: Create Theme-Specific Styling

```css
/* corporate-theme.css */
[data-theme="corporate"] {
  /* Component-specific overrides */
  .button {
    font-weight: 500;
    letter-spacing: 0.025em;
  }
  
  .metric-card {
    border: 1px solid var(--color-neutral-200);
    background: var(--color-neutral-0);
  }
  
  .status-indicator {
    border-radius: 4px;
    font-weight: 600;
  }
}
```

## Advanced Customization

### Dynamic Theme Generation

Create themes programmatically based on user input:

```typescript
import { generateDynamicTheme } from '../styles/themes';

// Generate theme from brand color hue
function createBrandTheme(brandHue: number, brandName: string) {
  const dynamicTheme = generateDynamicTheme(brandHue);
  
  // Customize the generated theme
  return createTheme(`brand-${brandName}`, {
    ...dynamicTheme,
    name: `brand-${brandName}`,
    customProperties: {
      ...dynamicTheme.customProperties,
      '--brand-name': brandName,
      '--brand-hue': brandHue.toString(),
    },
  });
}

// Usage
const acmeBrandTheme = createBrandTheme(210, 'acme'); // Blue-based theme
applyTheme(acmeBrandTheme);
```

### Contextual Theme Switching

Switch themes based on context or user preferences:

```typescript
// Theme context manager
class ThemeManager {
  private currentTheme: Theme | null = null;
  private currentColorMode: ColorMode = 'light';
  
  constructor() {
    // Detect system preference
    this.currentColorMode = this.detectSystemColorMode();
    
    // Listen for system changes
    this.setupSystemColorModeListener();
  }
  
  applyTheme(themeName: ThemeName, colorMode?: ColorMode) {
    const mode = colorMode || this.currentColorMode;
    const theme = getThemeWithColorMode(themeName, mode);
    
    applyTheme(theme, mode);
    this.currentTheme = theme;
    
    // Persist preference
    localStorage.setItem('preferred-theme', themeName);
    localStorage.setItem('preferred-color-mode', mode);
  }
  
  private detectSystemColorMode(): ColorMode {
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      return 'high-contrast';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  private setupSystemColorModeListener() {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    
    const updateColorMode = () => {
      const newMode = this.detectSystemColorMode();
      if (newMode !== this.currentColorMode) {
        this.currentColorMode = newMode;
        // Re-apply current theme with new color mode
        if (this.currentTheme) {
          this.applyTheme(this.currentTheme.name as ThemeName, newMode);
        }
      }
    };
    
    darkModeQuery.addEventListener('change', updateColorMode);
    highContrastQuery.addEventListener('change', updateColorMode);
  }
}

// Usage
const themeManager = new ThemeManager();
themeManager.applyTheme('corporate', 'dark');
```

### Theme Persistence

Save and restore user theme preferences:

```typescript
// Theme persistence utilities
export const ThemePersistence = {
  save(themeName: ThemeName, colorMode: ColorMode) {
    localStorage.setItem('opssight-theme', JSON.stringify({
      theme: themeName,
      colorMode,
      timestamp: Date.now(),
    }));
  },
  
  load(): { theme: ThemeName; colorMode: ColorMode } | null {
    try {
      const stored = localStorage.getItem('opssight-theme');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          theme: parsed.theme,
          colorMode: parsed.colorMode,
        };
      }
    } catch (error) {
      console.warn('Failed to load theme preference:', error);
    }
    return null;
  },
  
  clear() {
    localStorage.removeItem('opssight-theme');
  },
};

// Auto-restore theme on app load
export function initializeThemeFromStorage() {
  const stored = ThemePersistence.load();
  if (stored) {
    applyTheme(getThemeWithColorMode(stored.theme, stored.colorMode), stored.colorMode);
  }
}
```

## Integration Patterns

### React Context Integration

```tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Theme, ThemeName, ColorMode, getThemeWithColorMode, applyTheme } from '../styles/themes';

interface ThemeContextValue {
  currentTheme: ThemeName;
  currentColorMode: ColorMode;
  setTheme: (theme: ThemeName) => void;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('minimal');
  const [currentColorMode, setCurrentColorMode] = useState<ColorMode>('light');
  
  useEffect(() => {
    // Apply theme when context changes
    applyTheme(getThemeWithColorMode(currentTheme, currentColorMode), currentColorMode);
    
    // Persist preference
    ThemePersistence.save(currentTheme, currentColorMode);
  }, [currentTheme, currentColorMode]);
  
  const toggleColorMode = () => {
    setCurrentColorMode(prev => {
      switch (prev) {
        case 'light': return 'dark';
        case 'dark': return 'high-contrast';
        case 'high-contrast': return 'light';
        default: return 'light';
      }
    });
  };
  
  return (
    <ThemeContext.Provider value={{
      currentTheme,
      currentColorMode,
      setTheme: setCurrentTheme,
      setColorMode: setCurrentColorMode,
      toggleColorMode,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
```

### Component Props Integration

```tsx
// Component with theme override support
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  themeOverride?: Partial<Theme>;
  children: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', themeOverride, children }: ButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  useEffect(() => {
    if (themeOverride && buttonRef.current) {
      // Apply theme override to this component only
      const variables = generateThemeVariables(themeOverride);
      Object.entries(variables).forEach(([key, value]) => {
        buttonRef.current!.style.setProperty(key, value);
      });
    }
  }, [themeOverride]);
  
  return (
    <button
      ref={buttonRef}
      className={`button button--${variant} button--${size}`}
    >
      {children}
    </button>
  );
}

// Usage with theme override
<Button
  variant="primary"
  themeOverride={{
    colors: {
      primary: { 500: '#ff6b6b' } // Red override for this button only
    }
  }}
>
  Special Button
</Button>
```

### CSS-in-JS Integration

```tsx
import styled from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';

// Styled component with theme access
const StyledCard = styled.div<{ $variant?: 'default' | 'elevated' }>`
  background: var(--color-neutral-0);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--border-radius, 8px);
  padding: var(--spacing-md);
  
  ${props => props.$variant === 'elevated' && `
    box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
    transform: translateY(-2px);
  `}
  
  /* Theme-specific overrides */
  [data-theme="cyberpunk"] & {
    border-color: var(--color-primary-500);
    box-shadow: 0 0 10px var(--color-primary-500);
  }
  
  [data-theme="glassmorphic"] & {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
`;

// Component using styled component
export function Card({ variant, children }: { variant?: 'default' | 'elevated'; children: React.ReactNode }) {
  return (
    <StyledCard $variant={variant}>
      {children}
    </StyledCard>
  );
}
```

## Best Practices

### 1. Design Token Consistency

Always use design tokens instead of hardcoded values:

```css
/* ✅ Good - Uses design tokens */
.my-component {
  color: var(--color-primary-500);
  padding: var(--spacing-md);
  border-radius: var(--border-radius);
}

/* ❌ Bad - Hardcoded values */
.my-component {
  color: #0ea5e9;
  padding: 16px;
  border-radius: 8px;
}
```

### 2. Semantic Color Usage

Use semantic color mappings for better maintainability:

```css
/* ✅ Good - Semantic colors */
.error-message {
  color: var(--semantic-text-error);
  background: var(--semantic-background-error);
}

/* ❌ Bad - Direct color reference */
.error-message {
  color: var(--color-red-600);
  background: var(--color-red-50);
}
```

### 3. Color Mode Considerations

Design for all color modes from the start:

```typescript
// ✅ Good - Considers all color modes
const alertTheme = createThemeWithColorModes('alert', {
  colors: {
    alert: {
      500: '#ef4444', // Red for light mode
    },
  },
}, {
  dark: {
    colors: {
      alert: {
        500: '#f87171', // Lighter red for dark mode
      },
    },
  },
  'high-contrast': {
    colors: {
      alert: {
        500: '#dc2626', // Darker red for high contrast
      },
    },
  },
});
```

### 4. Performance Optimization

Minimize theme switching overhead:

```typescript
// ✅ Good - Batch theme updates
function applyThemeOptimized(theme: Theme, colorMode?: ColorMode) {
  // Use requestAnimationFrame to batch DOM updates
  requestAnimationFrame(() => {
    const variables = generateThemeVariables(theme);
    const root = document.documentElement;
    
    // Batch all CSS custom property updates
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    // Update theme attribute once
    root.setAttribute('data-theme', theme.name);
    if (colorMode) {
      root.setAttribute('data-color-mode', colorMode);
    }
  });
}
```

### 5. Accessibility Guidelines

Ensure themes meet accessibility standards:

```typescript
// Accessibility validation utility
function validateThemeAccessibility(theme: Theme): string[] {
  const issues: string[] = [];
  
  // Check contrast ratios
  const primaryColor = theme.colors.primary[500];
  const backgroundColor = theme.colors.neutral[0];
  
  if (getContrastRatio(primaryColor, backgroundColor) < 4.5) {
    issues.push('Primary color contrast ratio is below WCAG AA standard (4.5:1)');
  }
  
  // Check focus indicators
  if (!theme.customProperties['--focus-ring-width']) {
    issues.push('Missing focus ring width definition');
  }
  
  // Check minimum tap target sizes
  const minTapTarget = theme.customProperties['--min-tap-target'];
  if (!minTapTarget || parseInt(minTapTarget) < 44) {
    issues.push('Minimum tap target size should be at least 44px');
  }
  
  return issues;
}
```

## Troubleshooting

### Common Issues

#### 1. Theme Not Applying

**Problem**: Theme changes don't appear in the UI.

**Solutions**:
- Check if CSS custom properties are properly defined
- Verify theme is applied to the correct DOM element (usually `:root`)
- Ensure component CSS uses `var()` functions for theme tokens

```typescript
// Debug theme application
function debugTheme() {
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  
  console.log('Current theme:', root.getAttribute('data-theme'));
  console.log('Primary color:', computedStyle.getPropertyValue('--color-primary-500'));
  console.log('All custom properties:', 
    Array.from(document.styleSheets)
      .flatMap(sheet => Array.from(sheet.cssRules))
      .filter(rule => rule.style && rule.selectorText === ':root')
  );
}
```

#### 2. Color Mode Not Switching

**Problem**: Dark/light mode toggle doesn't work.

**Solutions**:
- Check if color mode variations are defined in theme
- Verify color mode attribute is set on root element
- Ensure CSS selectors target the correct color mode

```css
/* Correct color mode targeting */
:root[data-color-mode="dark"] {
  --color-neutral-0: #0f172a;
}

/* Or using theme-specific selectors */
[data-theme="minimal"][data-color-mode="dark"] {
  --color-primary-500: oklch(0.65 0.08 250);
}
```

#### 3. Performance Issues

**Problem**: Theme switching causes layout shifts or is slow.

**Solutions**:
- Use CSS custom properties instead of class-based theming
- Batch DOM updates in `requestAnimationFrame`
- Preload theme CSS to avoid FOUC (Flash of Unstyled Content)

```typescript
// Preload theme CSS
function preloadThemeCSS(themeName: string) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'style';
  link.href = `/themes/${themeName}.css`;
  document.head.appendChild(link);
}
```

#### 4. TypeScript Errors

**Problem**: TypeScript errors when creating custom themes.

**Solutions**:
- Ensure theme objects match the `Theme` interface
- Use proper type assertions for dynamic properties
- Extend theme types for custom properties

```typescript
// Extend theme types for custom properties
declare module '../styles/themes' {
  interface Theme {
    customProperties: Record<string, string> & {
      '--my-custom-property'?: string;
    };
  }
}
```

### Debug Tools

#### Theme Inspector

```typescript
// Theme debugging utility
export const ThemeDebugger = {
  logCurrentTheme() {
    const root = document.documentElement;
    const theme = root.getAttribute('data-theme');
    const colorMode = root.getAttribute('data-color-mode');
    
    console.group(`Theme Debug: ${theme} (${colorMode})`);
    
    // Log all CSS custom properties
    const style = getComputedStyle(root);
    const properties = Array.from(document.styleSheets)
      .flatMap(sheet => {
        try {
          return Array.from(sheet.cssRules);
        } catch {
          return [];
        }
      })
      .filter(rule => rule.selectorText === ':root')
      .flatMap(rule => Array.from(rule.style))
      .filter(prop => prop.startsWith('--'));
    
    properties.forEach(prop => {
      console.log(`${prop}: ${style.getPropertyValue(prop)}`);
    });
    
    console.groupEnd();
  },
  
  validateTheme(theme: Theme) {
    const issues = validateThemeAccessibility(theme);
    if (issues.length > 0) {
      console.warn('Theme accessibility issues:', issues);
    } else {
      console.log('Theme passes accessibility validation');
    }
  },
  
  compareThemes(theme1: Theme, theme2: Theme) {
    const diff = {
      colors: this.deepDiff(theme1.colors, theme2.colors),
      typography: this.deepDiff(theme1.typography, theme2.typography),
      spacing: this.deepDiff(theme1.spacing, theme2.spacing),
    };
    
    console.table(diff);
  },
  
  deepDiff(obj1: any, obj2: any, path = ''): Record<string, any> {
    const diff: Record<string, any> = {};
    
    for (const key in obj1) {
      const currentPath = path ? `${path}.${key}` : key;
      if (obj1[key] !== obj2[key]) {
        diff[currentPath] = { from: obj1[key], to: obj2[key] };
      }
    }
    
    return diff;
  },
};
```

## Migration Guide

### From v1 to v2 Theme System

If migrating from an older theme system:

```typescript
// Old theme format (v1)
const oldTheme = {
  primaryColor: '#0ea5e9',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
};

// New theme format (v2)
const newTheme = createTheme('migrated', {
  colors: {
    primary: {
      500: oldTheme.primaryColor,
    },
    neutral: {
      0: oldTheme.backgroundColor,
      900: oldTheme.textColor,
    },
  },
});
```

### Breaking Changes

- CSS class-based theming replaced with CSS custom properties
- Theme structure now uses nested color scales instead of single colors
- Color mode support requires theme restructuring

### Migration Script

```typescript
// Automated migration utility
function migrateTheme(oldTheme: any): Theme {
  return createTheme('migrated', {
    colors: {
      primary: generateColorScale(oldTheme.primaryColor || '#0ea5e9'),
      neutral: generateColorScale(oldTheme.backgroundColor || '#ffffff'),
    },
    customProperties: {
      '--migrated-from': 'v1',
      '--migration-date': new Date().toISOString(),
    },
  });
}
```

---

For more detailed information about the theme system architecture and available themes, see the [Theme System Documentation](./theme-system.md). 