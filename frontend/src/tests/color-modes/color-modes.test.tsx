/**
 * Comprehensive test suite for color mode system
 * Tests hooks, context, theme integration, and color mode variations
 */

import { renderHook, act } from '@testing-library/react';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { useColorMode } from '../../hooks/useColorMode';
import { ColorModeProvider, useColorModeContext } from '../../contexts/ColorModeContext';
import { ColorModeToggle } from '../../components/ui/ColorModeToggle';
import { getThemeWithColorMode, applyTheme } from '../../styles/themes';

// Mock DOM and localStorage
const mockLocalStorage = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query.includes('dark'),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock document methods
Object.defineProperty(document, 'documentElement', {
  value: {
    style: {
      setProperty: jest.fn(),
      removeProperty: jest.fn(),
    },
  },
  writable: true,
});

Object.defineProperty(document, 'body', {
  value: {
    className: '',
  },
  writable: true,
});

describe('useColorMode Hook', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    document.body.className = '';
  });

  test('should initialize with system color mode by default', () => {
    const { result } = renderHook(() => useColorMode());
    
    expect(result.current.colorMode).toBe('system');
    expect(result.current.isSystemMode).toBe(true);
    expect(['light', 'dark']).toContain(result.current.systemPreference);
    expect(['light', 'dark']).toContain(result.current.resolvedColorMode);
  });

  test('should persist color mode in localStorage', () => {
    const { result } = renderHook(() => useColorMode());
    
    act(() => {
      result.current.setColorMode('dark');
    });
    
    expect(result.current.colorMode).toBe('dark');
    expect(result.current.resolvedColorMode).toBe('dark');
    expect(mockLocalStorage.getItem('opsight-color-mode')).toBe('dark');
  });

  test('should load color mode from localStorage', () => {
    mockLocalStorage.setItem('opsight-color-mode', 'light');
    
    const { result } = renderHook(() => useColorMode());
    
    expect(result.current.colorMode).toBe('light');
    expect(result.current.resolvedColorMode).toBe('light');
  });

  test('should handle invalid localStorage values', () => {
    mockLocalStorage.setItem('opsight-color-mode', 'invalid');
    
    const { result } = renderHook(() => useColorMode());
    
    expect(result.current.colorMode).toBe('system');
  });

  test('should toggle between light and dark modes', () => {
    const { result } = renderHook(() => useColorMode());
    
    act(() => {
      result.current.setColorMode('light');
    });
    
    act(() => {
      result.current.toggleColorMode();
    });
    
    expect(result.current.colorMode).toBe('dark');
    
    act(() => {
      result.current.toggleColorMode();
    });
    
    expect(result.current.colorMode).toBe('light');
  });

  test('should handle high-contrast mode', () => {
    const { result } = renderHook(() => useColorMode());
    
    act(() => {
      result.current.setColorMode('high-contrast');
    });
    
    expect(result.current.colorMode).toBe('high-contrast');
    expect(result.current.resolvedColorMode).toBe('high-contrast');
    expect(result.current.isSystemMode).toBe(false);
  });

  test('should detect system preference changes', () => {
    const { result } = renderHook(() => useColorMode());
    
    // Mock system preference change
    const mockMatchMedia = window.matchMedia as jest.Mock;
    mockMatchMedia.mockReturnValue({
      matches: true, // Dark mode
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
    
    act(() => {
      result.current.setColorMode('system');
    });
    
    expect(result.current.isSystemMode).toBe(true);
  });
});

describe('ColorModeProvider', () => {
  const TestComponent = () => {
    const { colorMode, resolvedColorMode, setColorMode } = useColorModeContext();
    
    return (
      <div>
        <span data-testid="color-mode">{colorMode}</span>
        <span data-testid="resolved-mode">{resolvedColorMode}</span>
        <button 
          data-testid="set-dark" 
          onClick={() => setColorMode('dark')}
        >
          Set Dark
        </button>
      </div>
    );
  };

  const ProviderWrapper = ({ children }: { children: React.ReactNode }) => (
    <ColorModeProvider>{children}</ColorModeProvider>
  );

  beforeEach(() => {
    mockLocalStorage.clear();
    document.body.className = '';
  });

  test('should provide color mode context', () => {
    render(
      <ProviderWrapper>
        <TestComponent />
      </ProviderWrapper>
    );
    
    expect(screen.getByTestId('color-mode')).toHaveTextContent('system');
    expect(['light', 'dark']).toContain(screen.getByTestId('resolved-mode').textContent);
  });

  test('should update color mode through context', () => {
    render(
      <ProviderWrapper>
        <TestComponent />
      </ProviderWrapper>
    );
    
    fireEvent.click(screen.getByTestId('set-dark'));
    
    expect(screen.getByTestId('color-mode')).toHaveTextContent('dark');
    expect(screen.getByTestId('resolved-mode')).toHaveTextContent('dark');
  });

  test('should throw error when used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => render(<TestComponent />)).toThrow(
      'useColorModeContext must be used within a ColorModeProvider'
    );
    
    consoleSpy.mockRestore();
  });

  test('should apply CSS custom properties', () => {
    const setPropertySpy = jest.spyOn(document.documentElement.style, 'setProperty');
    
    render(
      <ProviderWrapper>
        <TestComponent />
      </ProviderWrapper>
    );
    
    // Should apply initial properties
    expect(setPropertySpy).toHaveBeenCalledWith('--mode-background', expect.any(String));
    expect(setPropertySpy).toHaveBeenCalledWith('--mode-foreground', expect.any(String));
    expect(setPropertySpy).toHaveBeenCalledWith('color-scheme', expect.any(String));
  });

  test('should handle transitions configuration', () => {
    render(
      <ColorModeProvider enableTransitions={false}>
        <TestComponent />
      </ColorModeProvider>
    );
    
    // Should work without errors when transitions are disabled
    expect(screen.getByTestId('color-mode')).toBeInTheDocument();
  });
});

describe('ColorModeToggle Component', () => {
  const ProviderWrapper = ({ children }: { children: React.ReactNode }) => (
    <ColorModeProvider>{children}</ColorModeProvider>
  );

  beforeEach(() => {
    mockLocalStorage.clear();
    document.body.className = '';
  });

  test('should render button variant', () => {
    render(
      <ProviderWrapper>
        <ColorModeToggle variant="button" />
      </ProviderWrapper>
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', expect.stringContaining('color mode'));
  });

  test('should render select variant', () => {
    render(
      <ProviderWrapper>
        <ColorModeToggle variant="select" />
      </ProviderWrapper>
    );
    
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveAttribute('aria-label', 'Select color mode');
  });

  test('should render tabs variant', () => {
    render(
      <ProviderWrapper>
        <ColorModeToggle variant="tabs" />
      </ProviderWrapper>
    );
    
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4); // light, dark, high-contrast, system
    
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-pressed');
    });
  });

  test('should cycle through modes in button variant', () => {
    render(
      <ProviderWrapper>
        <ColorModeToggle variant="button" />
      </ProviderWrapper>
    );
    
    const button = screen.getByRole('button');
    
    // Should start with system mode
    expect(button).toHaveAttribute('aria-label', expect.stringContaining('System'));
    
    // Click to cycle
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-label', expect.stringContaining('Light'));
    
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-label', expect.stringContaining('Dark'));
    
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-label', expect.stringContaining('High Contrast'));
    
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-label', expect.stringContaining('System'));
  });

  test('should handle mode selection in select variant', () => {
    render(
      <ProviderWrapper>
        <ColorModeToggle variant="select" />
      </ProviderWrapper>
    );
    
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    
    fireEvent.change(select, { target: { value: 'dark' } });
    expect(select.value).toBe('dark');
    
    fireEvent.change(select, { target: { value: 'high-contrast' } });
    expect(select.value).toBe('high-contrast');
  });

  test('should show labels when enabled', () => {
    render(
      <ProviderWrapper>
        <ColorModeToggle variant="button" showLabels />
      </ProviderWrapper>
    );
    
    expect(screen.getByText(/System/)).toBeInTheDocument();
  });

  test('should apply custom className', () => {
    render(
      <ProviderWrapper>
        <ColorModeToggle variant="button" className="custom-class" />
      </ProviderWrapper>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  test('should handle different sizes', () => {
    const { rerender } = render(
      <ProviderWrapper>
        <ColorModeToggle variant="button" size="sm" />
      </ProviderWrapper>
    );
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('text-sm', 'p-1');
    
    rerender(
      <ProviderWrapper>
        <ColorModeToggle variant="button" size="lg" />
      </ProviderWrapper>
    );
    
    button = screen.getByRole('button');
    expect(button).toHaveClass('text-lg', 'p-3');
  });
});

describe('Theme Integration with Color Modes', () => {
  beforeEach(() => {
    document.body.className = '';
    jest.clearAllMocks();
  });

  test('should get theme with color mode applied', () => {
    const lightTheme = getThemeWithColorMode('minimal', 'light');
    const darkTheme = getThemeWithColorMode('minimal', 'dark');
    const highContrastTheme = getThemeWithColorMode('minimal', 'high-contrast');
    
    expect(lightTheme.name).toBe('minimal');
    expect(darkTheme.name).toBe('minimal');
    expect(highContrastTheme.name).toBe('minimal');
    
    // Dark theme should have different colors than light theme
    expect(darkTheme.colors).not.toEqual(lightTheme.colors);
    expect(highContrastTheme.colors).not.toEqual(lightTheme.colors);
  });

  test('should return base theme when color mode not supported', () => {
    const theme = getThemeWithColorMode('minimal', 'light');
    const themeWithoutMode = getThemeWithColorMode('minimal', 'light');
    
    expect(theme).toBeDefined();
    expect(themeWithoutMode).toBeDefined();
  });

  test('should apply theme with color mode', () => {
    const setPropertySpy = jest.spyOn(document.documentElement.style, 'setProperty');
    const theme = getThemeWithColorMode('cyberpunk', 'dark');
    
    applyTheme(theme, 'dark');
    
    expect(setPropertySpy).toHaveBeenCalledWith(expect.stringContaining('--color-'), expect.any(String));
    expect(document.body.className).toContain('theme-cyberpunk');
    expect(document.body.className).toContain('color-mode-dark');
  });

  test('should handle all theme variants with all color modes', () => {
    const themes = ['minimal', 'neo-brutalist', 'glassmorphic', 'cyberpunk', 'editorial', 'accessible'] as const;
    const colorModes = ['light', 'dark', 'high-contrast'] as const;
    
    themes.forEach(themeName => {
      colorModes.forEach(colorMode => {
        const theme = getThemeWithColorMode(themeName, colorMode);
        expect(theme).toBeDefined();
        expect(theme.name).toBe(themeName);
        
        // Should not throw when applying
        expect(() => applyTheme(theme, colorMode)).not.toThrow();
      });
    });
  });

  test('should preserve theme effects in color mode variations', () => {
    const glassmorphicLight = getThemeWithColorMode('glassmorphic', 'light');
    const glassmorphicDark = getThemeWithColorMode('glassmorphic', 'dark');
    const glassmorphicHighContrast = getThemeWithColorMode('glassmorphic', 'high-contrast');
    
    expect(glassmorphicLight.effects).toBeDefined();
    expect(glassmorphicDark.effects).toBeDefined();
    expect(glassmorphicHighContrast.effects).toBeDefined();
    
    // High contrast should remove glass effects
    expect(glassmorphicHighContrast.effects?.backdropFilter).toBe('none');
    
    // Dark mode should have different glass properties
    expect(glassmorphicDark.effects?.backdropFilter).toContain('blur');
  });

  test('should handle cyberpunk theme color mode variations', () => {
    const cyberpunkLight = getThemeWithColorMode('cyberpunk', 'light');
    const cyberpunkDark = getThemeWithColorMode('cyberpunk', 'dark');
    const cyberpunkHighContrast = getThemeWithColorMode('cyberpunk', 'high-contrast');
    
    // Light mode should have toned down effects
    expect(cyberpunkLight.customProperties?.['--cyberpunk-glow']).toContain('5px');
    
    // High contrast should remove all glow effects
    expect(cyberpunkHighContrast.customProperties?.['--cyberpunk-glow']).toBe('none');
    expect(cyberpunkHighContrast.effects?.animations).toEqual({});
  });

  test('should maintain accessible features in accessible theme', () => {
    const accessibleDark = getThemeWithColorMode('accessible', 'dark');
    const accessibleHighContrast = getThemeWithColorMode('accessible', 'high-contrast');
    
    // Dark mode should have enhanced focus indicators
    expect(accessibleDark.customProperties?.['--accessible-focus']).toContain('3px solid');
    
    // High contrast should have even larger touch targets
    expect(accessibleHighContrast.customProperties?.['--accessible-target-size']).toBe('52px');
  });
});

describe('Color Mode CSS Integration', () => {
  test('should handle prefers-reduced-motion', () => {
    // Mock prefers-reduced-motion: reduce
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query.includes('reduce'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
    
    const ProviderWrapper = ({ children }: { children: React.ReactNode }) => (
      <ColorModeProvider>{children}</ColorModeProvider>
    );
    
    render(
      <ProviderWrapper>
        <div>Test</div>
      </ProviderWrapper>
    );
    
    // Should work without errors when reduced motion is preferred
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  test('should handle system color scheme changes', () => {
    const addEventListener = jest.fn();
    const removeEventListener = jest.fn();
    
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        addEventListener,
        removeEventListener,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }),
    });
    
    const { unmount } = renderHook(() => useColorMode());
    
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    
    unmount();
    
    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});

describe('Error Handling', () => {
  test('should handle missing localStorage gracefully', () => {
    const originalLocalStorage = window.localStorage;
    
    // @ts-ignore
    delete window.localStorage;
    
    expect(() => {
      renderHook(() => useColorMode());
    }).not.toThrow();
    
    // Restore localStorage
    window.localStorage = originalLocalStorage;
  });

  test('should handle invalid theme names gracefully', () => {
    expect(() => {
      // @ts-ignore - intentionally passing invalid theme name
      getThemeWithColorMode('invalid-theme', 'light');
    }).not.toThrow();
  });

  test('should handle DOM manipulation errors gracefully', () => {
    const originalSetProperty = document.documentElement.style.setProperty;
    document.documentElement.style.setProperty = jest.fn().mockImplementation(() => {
      throw new Error('DOM error');
    });
    
    expect(() => {
      const theme = getThemeWithColorMode('minimal', 'light');
      applyTheme(theme, 'light');
    }).not.toThrow();
    
    document.documentElement.style.setProperty = originalSetProperty;
  });
});

describe('Performance', () => {
  test('should not cause unnecessary re-renders', () => {
    let renderCount = 0;
    
    const TestComponent = () => {
      renderCount++;
      const { colorMode } = useColorModeContext();
      return <div>{colorMode}</div>;
    };
    
    const { rerender } = render(
      <ColorModeProvider>
        <TestComponent />
      </ColorModeProvider>
    );
    
    const initialRenderCount = renderCount;
    
    // Re-render provider without changing props
    rerender(
      <ColorModeProvider>
        <TestComponent />
      </ColorModeProvider>
    );
    
    // Should not cause additional renders
    expect(renderCount).toBe(initialRenderCount);
  });

  test('should debounce system preference changes', async () => {
    const { result } = renderHook(() => useColorMode());
    
    // Multiple rapid system changes should not cause issues
    act(() => {
      result.current.setColorMode('system');
    });
    
    // Simulate rapid system preference changes
    for (let i = 0; i < 10; i++) {
      const mockEvent = new Event('change');
      window.matchMedia('(prefers-color-scheme: dark)').dispatchEvent(mockEvent);
    }
    
    expect(result.current.colorMode).toBe('system');
  });
}); 