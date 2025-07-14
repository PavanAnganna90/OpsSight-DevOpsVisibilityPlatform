/**
 * Advanced theme system with multiple variants and dynamic features
 */

/**
 * Advanced theme system with multiple variants and dynamic features
 */

// Base theme type
export type ThemeVariant = 
  | 'minimal'      // Calm, whitespace-heavy design
  | 'neo-brutalist' // Bold typography and raw structure
  | 'glassmorphic' // Frosted glass effect with translucency
  | 'cyberpunk'    // Vibrant neon on dark backgrounds
  | 'editorial'    // Magazine-style sophisticated layout
  | 'accessible'   // High contrast, WCAG AAA compliant
  | 'dynamic';     // Time-of-day based adaptation

export type ColorMode = 'light' | 'dark' | 'high-contrast' | 'system';
export type ThemeContext = 'default' | 'focus' | 'relax' | 'energize';

export interface ThemeConfig {
  variant: ThemeVariant;
  colorMode: ColorMode;
  context?: ThemeContext;
  reducedMotion: boolean;
}

// Motion scales for animation
export const motionTokens = {
  duration: {
    instant: '50ms',
    fast: '100ms',
    normal: '200ms',
    slow: '400ms',
    slower: '600ms',
  },
  easing: {
    // Natural feeling easing curves
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    gentle: 'cubic-bezier(0.4, 0, 0.6, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
};

// Spacing scale using modular rhythm
export const spacingTokens = {
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  32: '8rem',
  40: '10rem',
  48: '12rem',
  56: '14rem',
  64: '16rem',
};

// Typography scale with modular rhythm
export const typographyTokens = {
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
    '7xl': '4.5rem',
    '8xl': '6rem',
    '9xl': '8rem',
  },
  fontWeights: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
};

// Shadow tokens for depth and elevation
export const shadowTokens = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
};

// Theme implementation
function getDynamicTheme(): Record<string, Record<string, string>> {
  const hour = new Date().getHours();
  
  // Morning theme (6AM - 12PM)
  if (hour >= 6 && hour < 12) {
    return {
      light: {
        '--bg-primary': '#fff9e6',
        '--bg-secondary': '#fff3cc',
        '--text-primary': '#1a1a1a',
        '--text-secondary': '#4d4d4d',
        '--border': '#ffd700',
        '--accent': '#ff9900',
        '--accent-hover': '#cc7a00',
      },
      dark: {
        '--bg-primary': '#1a1a1a',
        '--bg-secondary': '#262626',
        '--text-primary': '#ffd700',
        '--text-secondary': '#ffcc00',
        '--border': '#997a00',
        '--accent': '#ff9900',
        '--accent-hover': '#ffad33',
      },
    };
  }
  
  // Afternoon theme (12PM - 6PM)
  if (hour >= 12 && hour < 18) {
    return {
      light: {
        '--bg-primary': '#ffffff',
        '--bg-secondary': '#f5f5f5',
        '--text-primary': '#1a1a1a',
        '--text-secondary': '#4d4d4d',
        '--border': '#3b82f6',
        '--accent': '#2563eb',
        '--accent-hover': '#1d4ed8',
      },
      dark: {
        '--bg-primary': '#1a1a1a',
        '--bg-secondary': '#262626',
        '--text-primary': '#60a5fa',
        '--text-secondary': '#3b82f6',
        '--border': '#1d4ed8',
        '--accent': '#2563eb',
        '--accent-hover': '#3b82f6',
      },
    };
  }
  
  // Evening theme (6PM - 12AM)
  if (hour >= 18 || hour < 0) {
    return {
      light: {
        '--bg-primary': '#1a1a1a',
        '--bg-secondary': '#262626',
        '--text-primary': '#e6e6e6',
        '--text-secondary': '#bfbfbf',
        '--border': '#404040',
        '--accent': '#9333ea',
        '--accent-hover': '#7e22ce',
      },
      dark: {
        '--bg-primary': '#000000',
        '--bg-secondary': '#1a1a1a',
        '--text-primary': '#e6e6e6',
        '--text-secondary': '#bfbfbf',
        '--border': '#404040',
        '--accent': '#9333ea',
        '--accent-hover': '#a855f7',
      },
    };
  }
  
  // Night theme (12AM - 6AM)
  return {
    light: {
      '--bg-primary': '#1a1a1a',
      '--bg-secondary': '#262626',
      '--text-primary': '#bfbfbf',
      '--text-secondary': '#999999',
      '--border': '#404040',
      '--accent': '#6b7280',
      '--accent-hover': '#4b5563',
    },
    dark: {
      '--bg-primary': '#000000',
      '--bg-secondary': '#1a1a1a',
      '--text-primary': '#bfbfbf',
      '--text-secondary': '#999999',
      '--border': '#333333',
      '--accent': '#6b7280',
      '--accent-hover': '#9ca3af',
    },
  };
}

function getContextualOverrides(context: ThemeContext): Record<string, string> {
  const overrides: Record<string, Record<string, string>> = {
    default: {
      // Base theme with no overrides - uses the selected theme variant as-is
    },
    focus: {
      // Minimalist, distraction-free theme for deep work
      '--bg-primary': '#fefefe',
      '--bg-secondary': '#fafafa',
      '--bg-tertiary': '#f5f5f5',
      '--text-primary': '#2c3e50',
      '--text-secondary': '#546e7a',
      '--text-tertiary': '#90a4ae',
      '--border': '#eceff1',
      '--border-subtle': '#f5f5f5',
      '--border-strong': '#cfd8dc',
      '--accent': '#37474f',
      '--accent-hover': '#263238',
      '--accent-subtle': '#eceff1',
      
      // Interactive elements
      '--interactive-default': '#455a64',
      '--interactive-hover': '#37474f',
      '--interactive-active': '#263238',
      '--interactive-disabled': '#b0bec5',
      
      // Semantic colors - muted for less distraction
      '--status-success': '#66bb6a',
      '--status-warning': '#ffa726',
      '--status-error': '#ef5350',
      '--status-info': '#42a5f5',
      
      // Focus-specific design tokens
      '--spacing-base': '1rem',
      '--spacing-tight': '0.75rem',
      '--spacing-loose': '1.5rem',
      '--border-radius': '0.375rem',
      '--font-weight-normal': '400',
      '--font-weight-medium': '500',
      '--font-weight-semibold': '600',
      '--shadow-subtle': '0 1px 3px rgba(0, 0, 0, 0.08)',
      '--shadow-medium': '0 4px 12px rgba(0, 0, 0, 0.1)',
      
      // Animation/transition tokens
      '--transition-fast': '150ms cubic-bezier(0.4, 0, 0.2, 1)',
      '--transition-normal': '200ms cubic-bezier(0.4, 0, 0.2, 1)',
      '--transition-slow': '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    },
    relax: {
      // Calming blue/green theme for stress reduction
      '--bg-primary': '#f0f9ff',
      '--bg-secondary': '#e0f2fe',
      '--bg-tertiary': '#b3e5fc',
      '--text-primary': '#0c4a6e',
      '--text-secondary': '#0369a1',
      '--text-tertiary': '#0284c7',
      '--border': '#7dd3fc',
      '--border-subtle': '#e0f2fe',
      '--border-strong': '#38bdf8',
      '--accent': '#0284c7',
      '--accent-hover': '#0369a1',
      '--accent-subtle': '#e0f2fe',
      
      // Interactive elements with calming blues
      '--interactive-default': '#0ea5e9',
      '--interactive-hover': '#0284c7',
      '--interactive-active': '#0369a1',
      '--interactive-disabled': '#7dd3fc',
      
      // Soft, calming semantic colors
      '--status-success': '#059669',
      '--status-warning': '#d97706',
      '--status-error': '#dc2626',
      '--status-info': '#0284c7',
      
      // Relax-specific design tokens
      '--spacing-base': '1.25rem',
      '--spacing-tight': '1rem',
      '--spacing-loose': '2rem',
      '--border-radius': '0.75rem',
      '--font-weight-normal': '300',
      '--font-weight-medium': '400',
      '--font-weight-semibold': '500',
      '--shadow-subtle': '0 2px 8px rgba(14, 165, 233, 0.15)',
      '--shadow-medium': '0 8px 25px rgba(14, 165, 233, 0.2)',
      
      // Gentle, flowing animations
      '--transition-fast': '250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      '--transition-normal': '350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      '--transition-slow': '500ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      
      // Additional relax-specific properties
      '--backdrop-blur': '12px',
      '--gradient-primary': 'linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%)',
      '--gradient-accent': 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    },
    energize: {
      // Vibrant orange/yellow theme for high energy and motivation
      '--bg-primary': '#fff7ed',
      '--bg-secondary': '#ffedd5',
      '--bg-tertiary': '#fed7aa',
      '--text-primary': '#7c2d12',
      '--text-secondary': '#9a3412',
      '--text-tertiary': '#c2410c',
      '--border': '#fdba74',
      '--border-subtle': '#ffedd5',
      '--border-strong': '#fb923c',
      '--accent': '#ea580c',
      '--accent-hover': '#c2410c',
      '--accent-subtle': '#ffedd5',
      
      // High-energy interactive elements
      '--interactive-default': '#f97316',
      '--interactive-hover': '#ea580c',
      '--interactive-active': '#c2410c',
      '--interactive-disabled': '#fdba74',
      
      // Vibrant, energetic semantic colors
      '--status-success': '#16a34a',
      '--status-warning': '#eab308',
      '--status-error': '#dc2626',
      '--status-info': '#2563eb',
      
      // Energize-specific design tokens
      '--spacing-base': '1rem',
      '--spacing-tight': '0.5rem',
      '--spacing-loose': '1.75rem',
      '--border-radius': '0.5rem',
      '--font-weight-normal': '500',
      '--font-weight-medium': '600',
      '--font-weight-semibold': '700',
      '--shadow-subtle': '0 2px 8px rgba(249, 115, 22, 0.2)',
      '--shadow-medium': '0 8px 25px rgba(249, 115, 22, 0.3)',
      
      // Dynamic, energetic animations
      '--transition-fast': '100ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      '--transition-normal': '200ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      '--transition-slow': '300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      
      // Additional energize-specific properties
      '--backdrop-blur': '8px',
      '--gradient-primary': 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
      '--gradient-accent': 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      '--glow-accent': '0 0 20px rgba(249, 115, 22, 0.4)',
      '--pulse-duration': '2s',
    },
  };

  return overrides[context] || {};
}

function getBaseTheme(variant: ThemeVariant, mode: ColorMode): Record<string, string> {
  const themes = {
    minimal: {
      light: {
        '--bg-primary': '#ffffff',
        '--bg-secondary': '#f8fafc',
        '--text-primary': '#1e293b',
        '--text-secondary': '#64748b',
        '--border': '#e2e8f0',
        '--accent': '#3b82f6',
        '--accent-hover': '#2563eb',
      },
      dark: {
        '--bg-primary': '#0f172a',
        '--bg-secondary': '#1e293b',
        '--text-primary': '#f8fafc',
        '--text-secondary': '#94a3b8',
        '--border': '#334155',
        '--accent': '#60a5fa',
        '--accent-hover': '#3b82f6',
      },
    },
    'neo-brutalist': {
      light: {
        '--bg-primary': '#ffffff',
        '--bg-secondary': '#f5f5f5',
        '--text-primary': '#000000',
        '--text-secondary': '#404040',
        '--border': '#000000',
        '--accent': '#ff3333',
        '--accent-hover': '#cc0000',
      },
      dark: {
        '--bg-primary': '#000000',
        '--bg-secondary': '#1a1a1a',
        '--text-primary': '#ffffff',
        '--text-secondary': '#bfbfbf',
        '--border': '#ffffff',
        '--accent': '#ff3333',
        '--accent-hover': '#ff6666',
      },
    },
    glassmorphic: {
      light: {
        '--bg-primary': 'rgba(255, 255, 255, 0.7)',
        '--bg-secondary': 'rgba(255, 255, 255, 0.5)',
        '--text-primary': '#1a1a1a',
        '--text-secondary': '#4d4d4d',
        '--border': 'rgba(255, 255, 255, 0.3)',
        '--accent': 'rgba(59, 130, 246, 0.8)',
        '--accent-hover': 'rgba(37, 99, 235, 0.9)',
      },
      dark: {
        '--bg-primary': 'rgba(0, 0, 0, 0.7)',
        '--bg-secondary': 'rgba(0, 0, 0, 0.5)',
        '--text-primary': '#ffffff',
        '--text-secondary': '#bfbfbf',
        '--border': 'rgba(255, 255, 255, 0.1)',
        '--accent': 'rgba(96, 165, 250, 0.8)',
        '--accent-hover': 'rgba(59, 130, 246, 0.9)',
      },
    },
    cyberpunk: {
      light: {
        '--bg-primary': '#1a1a1a',
        '--bg-secondary': '#262626',
        '--text-primary': '#00ff00',
        '--text-secondary': '#00cc00',
        '--border': '#00ff00',
        '--accent': '#ff00ff',
        '--accent-hover': '#cc00cc',
      },
      dark: {
        '--bg-primary': '#000000',
        '--bg-secondary': '#1a1a1a',
        '--text-primary': '#00ff00',
        '--text-secondary': '#00cc00',
        '--border': '#00ff00',
        '--accent': '#ff00ff',
        '--accent-hover': '#ff33ff',
      },
    },
    editorial: {
      light: {
        '--bg-primary': '#ffffff',
        '--bg-secondary': '#f9f9f9',
        '--text-primary': '#1a1a1a',
        '--text-secondary': '#4d4d4d',
        '--border': '#e6e6e6',
        '--accent': '#000000',
        '--accent-hover': '#333333',
      },
      dark: {
        '--bg-primary': '#1a1a1a',
        '--bg-secondary': '#262626',
        '--text-primary': '#ffffff',
        '--text-secondary': '#bfbfbf',
        '--border': '#404040',
        '--accent': '#ffffff',
        '--accent-hover': '#e6e6e6',
      },
    },
    accessible: {
      light: {
        '--bg-primary': '#ffffff',
        '--bg-secondary': '#f5f5f5',
        '--text-primary': '#000000',
        '--text-secondary': '#595959',
        '--border': '#737373',
        '--accent': '#1a73e8',
        '--accent-hover': '#1557b0',
      },
      dark: {
        '--bg-primary': '#000000',
        '--bg-secondary': '#1f1f1f',
        '--text-primary': '#ffffff',
        '--text-secondary': '#bfbfbf',
        '--border': '#737373',
        '--accent': '#82b1ff',
        '--accent-hover': '#448aff',
      },
    },
    dynamic: getDynamicTheme(),
  };

  // Handle system preference
  if (mode === 'system') {
    mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // Handle invalid variant gracefully
  if (!themes[variant]) {
    console.warn(`Invalid theme variant: ${variant}. Falling back to minimal.`);
    variant = 'minimal';
  }

  const targetMode = mode === 'high-contrast' ? 'light' : mode;
  const baseTheme = themes[variant][targetMode];

  // Handle invalid mode gracefully
  if (!baseTheme) {
    console.warn(`Invalid color mode: ${mode} for variant: ${variant}. Falling back to light.`);
    return themes[variant]['light'] || themes['minimal']['light'];
  }
  
  // Add high contrast overrides if needed
  if (mode === 'high-contrast') {
    return {
      ...baseTheme,
      '--text-primary': '#000000',
      '--text-secondary': '#000000',
      '--border': '#000000',
      '--accent': '#000000',
      '--accent-hover': '#404040',
    };
  }

  return baseTheme;
}

// Get theme variables based on variant and mode
export function getThemeVariables(config: ThemeConfig): Record<string, string> {
  const baseTheme = getBaseTheme(config.variant, config.colorMode);
  const contextTheme = config.context ? getContextualOverrides(config.context) : {};
  
  return {
    ...baseTheme,
    ...contextTheme,
  };
}

// Apply theme to document
export function applyTheme(config: ThemeConfig) {
  // Handle missing document element gracefully
  if (!document || !document.documentElement) {
    console.warn('Document element not available. Cannot apply theme.');
    return;
  }

  const variables = getThemeVariables(config);
  
  // Apply CSS variables
  Object.entries(variables).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
  
  // Apply color mode class
  document.documentElement.classList.remove('light', 'dark', 'high-contrast');
  document.documentElement.classList.add(config.colorMode);
  
  // Apply variant class
  document.documentElement.classList.remove(
    'theme-minimal',
    'theme-neo-brutalist',
    'theme-glassmorphic',
    'theme-cyberpunk',
    'theme-editorial',
    'theme-accessible',
    'theme-dynamic'
  );
  document.documentElement.classList.add(`theme-${config.variant}`);
  
  // Apply reduced motion if needed
  if (config.reducedMotion) {
    document.documentElement.classList.add('reduce-motion');
  } else {
    document.documentElement.classList.remove('reduce-motion');
  }
  
  // Update meta tags
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', variables['--bg-primary']);
  }
} 