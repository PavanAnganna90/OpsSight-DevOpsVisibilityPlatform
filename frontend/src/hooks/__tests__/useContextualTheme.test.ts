/**
 * Tests for the useContextualTheme hook
 */

import { renderHook, act } from '@testing-library/react';
import { useContextualTheme } from '../useContextualTheme';
import { ThemeContext, ThemeConfig } from '../../utils/theme';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock applyTheme
jest.mock('../../utils/theme', () => ({
  ...jest.requireActual('../../utils/theme'),
  applyTheme: jest.fn(),
  getThemeVariables: jest.fn(() => ({ '--bg-primary': '#ffffff' })),
}));

const { applyTheme, getThemeVariables } = require('../../utils/theme');

// Mock document and window
const documentMock = {
  documentElement: {
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
    },
    style: {
      setProperty: jest.fn(),
      removeProperty: jest.fn(),
    },
    setAttribute: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  body: {
    innerHTML: '',
    className: '',
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    insertBefore: jest.fn(),
    children: [],
    childNodes: [],
  },
  createElement: jest.fn((tagName) => ({
    tagName,
    focus: jest.fn(),
    blur: jest.fn(),
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    removeAttribute: jest.fn(),
    style: {},
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
    },
  })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const windowMock = {
  document: documentMock,
  localStorage: localStorageMock,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(global, 'document', {
  value: documentMock,
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: windowMock,
  writable: true,
});

describe('useContextualTheme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useContextualTheme());

      expect(result.current.state).toEqual({
        context: 'default',
        enabled: true,
        transitionsEnabled: true,
      });
    });

    it('should initialize with custom default values', () => {
      const { result } = renderHook(() => 
        useContextualTheme('custom-key', 'focus', false)
      );

      expect(result.current.state).toEqual({
        context: 'focus',
        enabled: true,
        transitionsEnabled: false,
      });
    });

    it('should load state from localStorage', () => {
      const storedState = {
        context: 'relax' as ThemeContext,
        enabled: false,
        transitionsEnabled: false,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedState));

      const { result } = renderHook(() => useContextualTheme());

      expect(result.current.state).toEqual(storedState);
    });

    it('should handle invalid localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      const { result } = renderHook(() => useContextualTheme());

      expect(result.current.state).toEqual({
        context: 'default',
        enabled: true,
        transitionsEnabled: true,
      });
    });
  });

  describe('setContext', () => {
    it('should update context and save to localStorage', () => {
      const { result } = renderHook(() => useContextualTheme());

      act(() => {
        result.current.setContext('focus');
      });

      expect(result.current.state.context).toBe('focus');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'opssight-contextual-theme',
        JSON.stringify({
          context: 'focus',
          enabled: true,
          transitionsEnabled: true,
        })
      );
    });

    it('should update context without affecting other state', () => {
      const { result } = renderHook(() => useContextualTheme());

      act(() => {
        result.current.toggleEnabled();
      });

      act(() => {
        result.current.setContext('energize');
      });

      expect(result.current.state).toEqual({
        context: 'energize',
        enabled: false,
        transitionsEnabled: true,
      });
    });
  });

  describe('toggleEnabled', () => {
    it('should toggle enabled state', () => {
      const { result } = renderHook(() => useContextualTheme());

      act(() => {
        result.current.toggleEnabled();
      });

      expect(result.current.state.enabled).toBe(false);

      act(() => {
        result.current.toggleEnabled();
      });

      expect(result.current.state.enabled).toBe(true);
    });

    it('should save state to localStorage when toggling', () => {
      const { result } = renderHook(() => useContextualTheme());

      act(() => {
        result.current.toggleEnabled();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'opssight-contextual-theme',
        JSON.stringify({
          context: 'default',
          enabled: false,
          transitionsEnabled: true,
        })
      );
    });
  });

  describe('setTransitionsEnabled', () => {
    it('should update transitions enabled state', () => {
      const { result } = renderHook(() => useContextualTheme());

      act(() => {
        result.current.setTransitionsEnabled(false);
      });

      expect(result.current.state.transitionsEnabled).toBe(false);
    });

    it('should update CSS properties when transitions are enabled/disabled', () => {
      const { result } = renderHook(() => useContextualTheme());

      act(() => {
        result.current.setTransitionsEnabled(false);
      });

      expect(documentMock.documentElement.style.removeProperty).toHaveBeenCalledWith('--theme-transition-duration');
      expect(documentMock.documentElement.style.removeProperty).toHaveBeenCalledWith('--theme-transition-easing');

      act(() => {
        result.current.setTransitionsEnabled(true);
      });

      expect(documentMock.documentElement.style.setProperty).toHaveBeenCalledWith('--theme-transition-duration', '300ms');
      expect(documentMock.documentElement.style.setProperty).toHaveBeenCalledWith('--theme-transition-easing', 'cubic-bezier(0.4, 0, 0.2, 1)');
    });
  });

  describe('resetToDefault', () => {
    it('should reset context to default', () => {
      const { result } = renderHook(() => useContextualTheme());

      act(() => {
        result.current.setContext('focus');
      });

      act(() => {
        result.current.resetToDefault();
      });

      expect(result.current.state.context).toBe('default');
    });

    it('should reset to custom default', () => {
      const { result } = renderHook(() => 
        useContextualTheme('custom-key', 'relax', true)
      );

      act(() => {
        result.current.setContext('focus');
      });

      act(() => {
        result.current.resetToDefault();
      });

      expect(result.current.state.context).toBe('relax');
    });
  });

  describe('applyContextualTheme', () => {
    const mockConfig: ThemeConfig = {
      variant: 'minimal',
      colorMode: 'light',
      reducedMotion: false,
    };

    it('should apply theme with contextual overrides when enabled', () => {
      const { result } = renderHook(() => useContextualTheme());

      act(() => {
        result.current.setContext('focus');
      });

      act(() => {
        result.current.applyContextualTheme(mockConfig);
      });

      expect(applyTheme).toHaveBeenCalledWith({
        ...mockConfig,
        context: 'focus',
      });
    });

    it('should not apply theme when disabled', () => {
      const { result } = renderHook(() => useContextualTheme());

      act(() => {
        result.current.toggleEnabled();
      });

      act(() => {
        result.current.applyContextualTheme(mockConfig);
      });

      expect(applyTheme).not.toHaveBeenCalled();
    });

    it('should handle transitions when enabled', () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useContextualTheme());

      act(() => {
        result.current.applyContextualTheme(mockConfig);
      });

      expect(documentMock.documentElement.classList.add).toHaveBeenCalledWith('theme-transitioning');

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(documentMock.documentElement.classList.remove).toHaveBeenCalledWith('theme-transitioning');

      jest.useRealTimers();
    });

    it('should not handle transitions when disabled', () => {
      const { result } = renderHook(() => useContextualTheme());

      act(() => {
        result.current.setTransitionsEnabled(false);
      });

      act(() => {
        result.current.applyContextualTheme(mockConfig);
      });

      expect(documentMock.documentElement.classList.add).not.toHaveBeenCalledWith('theme-transitioning');
    });
  });

  describe('getContextualVariables', () => {
    const mockConfig: ThemeConfig = {
      variant: 'minimal',
      colorMode: 'light',
      reducedMotion: false,
    };

    it('should return theme variables with context when enabled', () => {
      const { result } = renderHook(() => useContextualTheme());

      act(() => {
        result.current.setContext('relax');
      });

      result.current.getContextualVariables(mockConfig);

      expect(getThemeVariables).toHaveBeenCalledWith({
        ...mockConfig,
        context: 'relax',
      });
    });

    it('should return theme variables without context when disabled', () => {
      const { result } = renderHook(() => useContextualTheme());

      act(() => {
        result.current.toggleEnabled();
      });

      result.current.getContextualVariables(mockConfig);

      expect(getThemeVariables).toHaveBeenCalledWith(mockConfig);
    });
  });

  describe('DOM attributes', () => {
    it('should set data attributes on document element', () => {
      const { result } = renderHook(() => useContextualTheme());

      act(() => {
        result.current.setContext('energize');
      });

      expect(documentMock.documentElement.setAttribute).toHaveBeenCalledWith('data-contextual-theme', 'energize');
      expect(documentMock.documentElement.setAttribute).toHaveBeenCalledWith('data-contextual-enabled', 'true');

      act(() => {
        result.current.toggleEnabled();
      });

      expect(documentMock.documentElement.setAttribute).toHaveBeenCalledWith('data-contextual-enabled', 'false');
    });
  });

  describe('edge cases', () => {
    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const { result } = renderHook(() => useContextualTheme());

      expect(() => {
        act(() => {
          result.current.setContext('focus');
        });
      }).not.toThrow();

      expect(result.current.state.context).toBe('focus');
    });

    it('should handle partial localStorage data', () => {
      const partialState = { context: 'relax' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(partialState));

      const { result } = renderHook(() => useContextualTheme());

      expect(result.current.state).toEqual({
        context: 'relax',
        enabled: true,
        transitionsEnabled: true,
      });
    });

    it('should use custom storage key', () => {
      const { result } = renderHook(() => 
        useContextualTheme('custom-storage-key')
      );

      act(() => {
        result.current.setContext('focus');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'custom-storage-key',
        expect.any(String)
      );
    });
  });
}); 