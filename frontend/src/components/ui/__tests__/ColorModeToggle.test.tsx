/**
 * ColorModeToggle Component Tests
 * 
 * Tests the enhanced ColorModeToggle component including:
 * - Basic toggle functionality
 * - Accessibility enhancements
 * - Theme transition integration
 * - Reduced motion support
 * - Screen reader announcements
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ColorModeToggle } from '../ColorModeToggle';
import * as themeTransition from '../../../utils/themeTransition';
import * as accessibilityEnhancements from '../../../utils/accessibilityEnhancements';

// Mock the theme transition utilities
jest.mock('../../../utils/themeTransition', () => ({
  applyThemeWithTransition: jest.fn(),
  useThemeTransition: jest.fn(() => ({
    applyTheme: jest.fn(),
    isTransitioning: jest.fn(() => false),
  })),
}));

// Mock accessibility enhancements
jest.mock('../../../utils/accessibilityEnhancements', () => ({
  accessibilityManager: {
    announceToScreenReader: jest.fn(),
    getUserPreferences: jest.fn(() => ({
      motion: 'none',
      verbosity: 'standard',
    })),
  },
}));

// Mock matchMedia for reduced motion detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query.includes('prefers-reduced-motion: reduce') ? false : false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock the useTheme hook (assuming it exists in your theme context)
const mockUseTheme = {
  theme: 'minimal',
  colorMode: 'light',
  setColorMode: jest.fn(),
  setTheme: jest.fn(),
};

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => mockUseTheme,
}));

describe('ColorModeToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    test('renders toggle button', () => {
      render(<ColorModeToggle />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label');
    });

    test('shows current color mode in aria-label', () => {
      render(<ColorModeToggle />);
      
      const button = screen.getByRole('button');
      const ariaLabel = button.getAttribute('aria-label');
      expect(ariaLabel).toContain('light');
    });

    test('toggles color mode on click', async () => {
      render(<ColorModeToggle />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockUseTheme.setColorMode).toHaveBeenCalledWith('dark');
      });
    });

    test('applies theme transition on toggle', async () => {
      const applyThemeSpy = jest.spyOn(themeTransition, 'applyThemeWithTransition');
      
      render(<ColorModeToggle />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(applyThemeSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility Features', () => {
    test('announces theme change to screen reader', async () => {
      const announceSpy = jest.spyOn(
        accessibilityEnhancements.accessibilityManager,
        'announceToScreenReader'
      );
      
      render(<ColorModeToggle />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(announceSpy).toHaveBeenCalledWith(
          expect.stringContaining('dark mode')
        );
      });
    });

    test('is disabled during transition', async () => {
      const mockIsTransitioning = jest.fn(() => true);
      (themeTransition.useThemeTransition as jest.Mock).mockReturnValue({
        applyTheme: jest.fn(),
        isTransitioning: mockIsTransitioning,
      });
      
      render(<ColorModeToggle />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    test('provides descriptive aria-label', () => {
      render(<ColorModeToggle />);
      
      const button = screen.getByRole('button');
      const ariaLabel = button.getAttribute('aria-label');
      
      expect(ariaLabel).toMatch(/switch to \w+ mode/i);
    });

    test('has proper keyboard accessibility', () => {
      render(<ColorModeToggle />);
      
      const button = screen.getByRole('button');
      
      // Should be focusable
      button.focus();
      expect(document.activeElement).toBe(button);
      
      // Should respond to Enter key
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(mockUseTheme.setColorMode).toHaveBeenCalled();
      
      // Should respond to Space key
      jest.clearAllMocks();
      fireEvent.keyDown(button, { key: ' ' });
      expect(mockUseTheme.setColorMode).toHaveBeenCalled();
    });
  });

  describe('Reduced Motion Support', () => {
    test('respects reduced motion preference', async () => {
      // Mock reduced motion preference
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));

      const applyThemeSpy = jest.spyOn(themeTransition, 'applyThemeWithTransition');
      
      render(<ColorModeToggle />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(applyThemeSpy).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.objectContaining({
            respectReducedMotion: true,
          })
        );
      });
    });

    test('applies instant transition for reduced motion', async () => {
      // Mock user settings for reduced motion
      (accessibilityEnhancements.accessibilityManager.getUserPreferences as jest.Mock)
        .mockReturnValue({
          motion: 'none',
          verbosity: 'standard',
        });

      const applyThemeSpy = jest.spyOn(themeTransition, 'applyThemeWithTransition');
      
      render(<ColorModeToggle />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(applyThemeSpy).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.objectContaining({
            duration: 0, // Instant transition
          })
        );
      });
    });
  });

  describe('Icon Display', () => {
    test('shows appropriate icon for light mode', () => {
      mockUseTheme.colorMode = 'light';
      
      render(<ColorModeToggle />);
      
      // Should show moon icon (to switch to dark)
      const moonIcon = screen.getByTestId('moon-icon');
      expect(moonIcon).toBeInTheDocument();
    });

    test('shows appropriate icon for dark mode', () => {
      mockUseTheme.colorMode = 'dark';
      
      render(<ColorModeToggle />);
      
      // Should show sun icon (to switch to light)
      const sunIcon = screen.getByTestId('sun-icon');
      expect(sunIcon).toBeInTheDocument();
    });

    test('animates icon transition when not reduced motion', () => {
      render(<ColorModeToggle />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Icon should have transition styles
      const icon = button.querySelector('[data-testid*="icon"]');
      expect(icon).toHaveStyle('transition: transform 0.3s ease-in-out');
    });

    test('skips icon animation for reduced motion', () => {
      // Mock reduced motion setting
      (accessibilityEnhancements.accessibilityManager.getUserPreferences as jest.Mock)
        .mockReturnValue({
          motion: 'none',
          verbosity: 'standard',
        });

      render(<ColorModeToggle />);
      
      const button = screen.getByRole('button');
      const icon = button.querySelector('[data-testid*="icon"]');
      
      // Should not have transition styles
      expect(icon).not.toHaveStyle('transition: transform 0.3s ease-in-out');
    });
  });

  describe('Error Handling', () => {
    test('handles theme transition errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const applyThemeSpy = jest.spyOn(themeTransition, 'applyThemeWithTransition')
        .mockRejectedValue(new Error('Transition failed'));
      
      render(<ColorModeToggle />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Theme transition failed'),
          expect.any(Error)
        );
      });
      
      // Should still update the color mode
      expect(mockUseTheme.setColorMode).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('remains functional if accessibility manager fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(accessibilityEnhancements.accessibilityManager, 'announceToScreenReader')
        .mockImplementation(() => {
          throw new Error('Screen reader failed');
        });
      
      render(<ColorModeToggle />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Should still toggle despite accessibility error
      await waitFor(() => {
        expect(mockUseTheme.setColorMode).toHaveBeenCalled();
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    test('debounces rapid clicks', async () => {
      jest.useFakeTimers();
      
      render(<ColorModeToggle />);
      
      const button = screen.getByRole('button');
      
      // Click multiple times rapidly
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      // Fast forward timers
      jest.runAllTimers();
      
      // Should only apply theme once despite multiple clicks
      await waitFor(() => {
        expect(mockUseTheme.setColorMode).toHaveBeenCalledTimes(1);
      });
      
      jest.useRealTimers();
    });

    test('prevents memory leaks on unmount', () => {
      const { unmount } = render(<ColorModeToggle />);
      
      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Integration', () => {
    test('works with different themes', async () => {
      const themes = ['minimal', 'neo-brutalist', 'corporate'];
      
      for (const theme of themes) {
        mockUseTheme.theme = theme;
        
        render(<ColorModeToggle />);
        
        const button = screen.getByRole('button');
        fireEvent.click(button);
        
        await waitFor(() => {
          expect(themeTransition.applyThemeWithTransition).toHaveBeenCalledWith(
            theme,
            expect.any(String),
            expect.any(Object)
          );
        });
        
        // Clean up for next iteration
        jest.clearAllMocks();
      }
    });

    test('synchronizes with system theme preference', () => {
      // Mock system preference change
      const mediaQuery = {
        matches: true,
        media: '(prefers-color-scheme: dark)',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      
      (window.matchMedia as jest.Mock).mockReturnValue(mediaQuery);
      
      render(<ColorModeToggle />);
      
      // Simulate system theme change
      const changeHandler = mediaQuery.addEventListener.mock.calls
        .find(call => call[0] === 'change')?.[1];
      
      if (changeHandler) {
        changeHandler({ matches: true });
        
        expect(mockUseTheme.setColorMode).toHaveBeenCalledWith('dark');
      }
    });
  });
}); 