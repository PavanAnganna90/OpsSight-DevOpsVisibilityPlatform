/**
 * Tests for useMonitoringSession hook
 * 
 * Tests monitoring session functionality including:
 * - Focus mode toggle
 * - Reduced motion preferences
 * - Break reminders
 * - Session metrics tracking
 * - Eye-strain reduction
 */

import { renderHook, act } from '@testing-library/react';
import { useMonitoringSession } from '../../hooks/useMonitoringSession';

// Mock DOM methods
const mockSetProperty = jest.fn();
const mockRemoveProperty = jest.fn();
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

// Mock document and window
Object.defineProperty(document, 'documentElement', {
  value: {
    style: {
      setProperty: mockSetProperty,
      removeProperty: mockRemoveProperty,
    },
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
    },
  },
  writable: true,
});

Object.defineProperty(document, 'body', {
  value: {
    style: {
      filter: '',
    },
  },
  writable: true,
});

Object.defineProperty(window, 'matchMedia', {
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
    dispatchEvent: jest.fn(),
  })),
  writable: true,
});

describe('useMonitoringSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useMonitoringSession());

      expect(result.current.isFocusMode).toBe(false);
      expect(result.current.isReducedMotion).toBe(false);
      expect(result.current.showBreakReminder).toBe(false);
      expect(result.current.sessionMetrics.breaksCount).toBe(0);
      expect(result.current.sessionMetrics.duration).toBeGreaterThan(0);
    });

    it('should respect custom options', () => {
      const options = {
        enableEyeStrainReduction: false,
        autoFocusAfter: 60000, // 1 minute
        breakReminderInterval: 120000, // 2 minutes
      };

      const { result } = renderHook(() => useMonitoringSession(options));

      expect(result.current.isFocusMode).toBe(false);
      expect(result.current.showBreakReminder).toBe(false);
    });

    it('should detect system reduced motion preference', () => {
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      }));

      const { result } = renderHook(() => useMonitoringSession());

      expect(result.current.isReducedMotion).toBe(true);
    });
  });

  describe('focus mode', () => {
    it('should toggle focus mode', () => {
      const { result } = renderHook(() => useMonitoringSession());

      expect(result.current.isFocusMode).toBe(false);

      act(() => {
        result.current.toggleFocusMode();
      });

      expect(result.current.isFocusMode).toBe(true);

      act(() => {
        result.current.toggleFocusMode();
      });

      expect(result.current.isFocusMode).toBe(false);
    });

    it('should apply focus mode styles when enabled', () => {
      const { result } = renderHook(() => useMonitoringSession());

      act(() => {
        result.current.toggleFocusMode();
      });

      expect(mockSetProperty).toHaveBeenCalledWith('--animation-duration-scale', '0.5');
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('focus-mode');
    });

    it('should remove focus mode styles when disabled', () => {
      const { result } = renderHook(() => useMonitoringSession());

      // Enable focus mode first
      act(() => {
        result.current.toggleFocusMode();
      });

      // Then disable it
      act(() => {
        result.current.toggleFocusMode();
      });

      expect(mockRemoveProperty).toHaveBeenCalledWith('--animation-duration-scale');
      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('focus-mode');
    });
  });

  describe('reduced motion', () => {
    it('should toggle reduced motion', () => {
      const { result } = renderHook(() => useMonitoringSession());

      act(() => {
        result.current.toggleReducedMotion();
      });

      expect(document.documentElement.classList.add).toHaveBeenCalledWith('reduce-motion');

      act(() => {
        result.current.toggleReducedMotion();
      });

      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('reduce-motion');
    });
  });

  describe('break reminders', () => {
    it('should show break reminder after interval', () => {
      const options = {
        breakReminderInterval: 60000, // 1 minute
      };

      const { result } = renderHook(() => useMonitoringSession(options));

      expect(result.current.showBreakReminder).toBe(false);

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(result.current.showBreakReminder).toBe(true);
    });

    it('should dismiss break reminder', () => {
      const options = {
        breakReminderInterval: 60000, // 1 minute
      };

      const { result } = renderHook(() => useMonitoringSession(options));

      // Trigger break reminder
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(result.current.showBreakReminder).toBe(true);

      // Dismiss reminder
      act(() => {
        result.current.dismissBreakReminder();
      });

      expect(result.current.showBreakReminder).toBe(false);
    });

    it('should take a break and reset timer', () => {
      const options = {
        breakReminderInterval: 60000, // 1 minute
      };

      const { result } = renderHook(() => useMonitoringSession(options));

      // Trigger break reminder
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      const initialBreaksCount = result.current.sessionMetrics.breaksCount;

      // Take a break
      act(() => {
        result.current.takeBreak();
      });

      expect(result.current.showBreakReminder).toBe(false);
      expect(result.current.sessionMetrics.breaksCount).toBe(initialBreaksCount + 1);
      expect(result.current.sessionMetrics.timeSinceLastBreak).toBeLessThan(1000);
    });
  });

  describe('session metrics', () => {
    it('should track session duration', () => {
      const { result } = renderHook(() => useMonitoringSession());

      const initialDuration = result.current.sessionMetrics.duration;

      act(() => {
        jest.advanceTimersByTime(5000); // 5 seconds
      });

      // Re-render to get updated metrics
      const { result: newResult } = renderHook(() => useMonitoringSession());
      
      expect(newResult.current.sessionMetrics.duration).toBeGreaterThan(initialDuration);
    });

    it('should track breaks count', () => {
      const { result } = renderHook(() => useMonitoringSession());

      expect(result.current.sessionMetrics.breaksCount).toBe(0);

      act(() => {
        result.current.takeBreak();
      });

      expect(result.current.sessionMetrics.breaksCount).toBe(1);

      act(() => {
        result.current.takeBreak();
      });

      expect(result.current.sessionMetrics.breaksCount).toBe(2);
    });

    it('should indicate when break is needed', () => {
      const options = {
        breakReminderInterval: 60000, // 1 minute
      };

      const { result } = renderHook(() => useMonitoringSession(options));

      expect(result.current.sessionMetrics.shouldTakeBreak).toBe(false);

      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // Re-render to get updated metrics
      const { result: newResult } = renderHook(() => useMonitoringSession(options));
      
      expect(newResult.current.sessionMetrics.shouldTakeBreak).toBe(true);
    });
  });

  describe('eye-strain reduction', () => {
    it('should apply eye-strain reduction filters', () => {
      const { result } = renderHook(() => useMonitoringSession({
        enableEyeStrainReduction: true,
      }));

      act(() => {
        result.current.enableEyeStrain();
      });

      expect(mockSetProperty).toHaveBeenCalledWith('--filter-blue-light', 'sepia(10%) saturate(90%)');
      expect(mockSetProperty).toHaveBeenCalledWith('--contrast-enhanced', '1.05');
      expect(mockSetProperty).toHaveBeenCalledWith('--brightness-reduced', '0.95');
    });

    it('should disable eye-strain reduction filters', () => {
      const { result } = renderHook(() => useMonitoringSession());

      act(() => {
        result.current.disableEyeStrain();
      });

      expect(document.body.style.filter).toBe('');
    });
  });

  describe('auto-focus mode', () => {
    it('should enable focus mode automatically after timeout', () => {
      const options = {
        autoFocusAfter: 30000, // 30 seconds
      };

      const { result } = renderHook(() => useMonitoringSession(options));

      expect(result.current.isFocusMode).toBe(false);

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(result.current.isFocusMode).toBe(true);
    });

    it('should not auto-enable focus mode if already enabled', () => {
      const options = {
        autoFocusAfter: 30000, // 30 seconds
      };

      const { result } = renderHook(() => useMonitoringSession(options));

      // Manually enable focus mode
      act(() => {
        result.current.toggleFocusMode();
      });

      expect(result.current.isFocusMode).toBe(true);

      // Fast-forward past auto-focus time
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should still be in focus mode (not toggled again)
      expect(result.current.isFocusMode).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should cleanup styles on unmount', () => {
      const { unmount } = renderHook(() => useMonitoringSession());

      unmount();

      expect(document.body.style.filter).toBe('');
      expect(mockRemoveProperty).toHaveBeenCalledWith('--filter-blue-light');
      expect(mockRemoveProperty).toHaveBeenCalledWith('--contrast-enhanced');
      expect(mockRemoveProperty).toHaveBeenCalledWith('--brightness-reduced');
      expect(mockRemoveProperty).toHaveBeenCalledWith('--animation-duration-scale');
      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('focus-mode', 'reduce-motion');
    });

    it('should cleanup event listeners on unmount', () => {
      const { unmount } = renderHook(() => useMonitoringSession());

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle rapid toggle operations', () => {
      const { result } = renderHook(() => useMonitoringSession());

      // Rapidly toggle focus mode
      act(() => {
        result.current.toggleFocusMode();
        result.current.toggleFocusMode();
        result.current.toggleFocusMode();
      });

      expect(result.current.isFocusMode).toBe(true);
    });

    it('should handle multiple break operations', () => {
      const { result } = renderHook(() => useMonitoringSession());

      act(() => {
        result.current.takeBreak();
        result.current.takeBreak();
        result.current.takeBreak();
      });

      expect(result.current.sessionMetrics.breaksCount).toBe(3);
    });
  });
}); 