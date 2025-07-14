/**
 * Keyboard Navigation Hook
 * 
 * Provides keyboard navigation utilities for dashboard components
 * including focus management and keyboard shortcuts.
 */

import { useEffect, useCallback, useRef } from 'react';

interface UseKeyboardNavigationOptions {
  /** Enable arrow key navigation */
  enableArrowKeys?: boolean;
  /** Enable Tab/Shift+Tab navigation */
  enableTabNavigation?: boolean;
  /** Enable Enter/Space activation */
  enableActivation?: boolean;
  /** Enable Escape key handling */
  enableEscape?: boolean;
  /** Custom keyboard shortcuts */
  shortcuts?: Record<string, () => void>;
  /** Focus trap within container */
  trapFocus?: boolean;
}

interface UseKeyboardNavigationReturn {
  /** Ref to attach to the container element */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Ref to attach to focusable elements */
  registerFocusable: (element: HTMLElement | null) => void;
  /** Programmatically focus first element */
  focusFirst: () => void;
  /** Programmatically focus last element */
  focusLast: () => void;
  /** Programmatically focus next element */
  focusNext: () => void;
  /** Programmatically focus previous element */
  focusPrevious: () => void;
}

/**
 * Get all focusable elements within a container
 */
const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const selectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ');

  return Array.from(container.querySelectorAll(selectors)) as HTMLElement[];
};

/**
 * Check if element is currently visible
 */
const isElementVisible = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

/**
 * Keyboard Navigation Hook
 * 
 * Provides comprehensive keyboard navigation support:
 * - Arrow key navigation between elements
 * - Tab/Shift+Tab navigation
 * - Enter/Space activation
 * - Escape key handling
 * - Custom keyboard shortcuts
 * - Focus trapping
 * 
 * @param options - Configuration options for keyboard navigation
 * @returns Navigation utilities and element refs
 */
export const useKeyboardNavigation = (
  options: UseKeyboardNavigationOptions = {}
): UseKeyboardNavigationReturn => {
  const {
    enableArrowKeys = true,
    enableTabNavigation = true,
    enableActivation = true,
    enableEscape = true,
    shortcuts = {},
    trapFocus = false,
  } = options;

  const containerRef = useRef<HTMLElement>(null);
  const focusableElementsRef = useRef<Set<HTMLElement>>(new Set());

  /**
   * Register a focusable element
   */
  const registerFocusable = useCallback((element: HTMLElement | null) => {
    if (element) {
      focusableElementsRef.current.add(element);
    }
  }, []);

  /**
   * Get all focusable elements in order
   */
  const getFocusableElementsInOrder = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];

    const allFocusable = getFocusableElements(containerRef.current);
    const registered = Array.from(focusableElementsRef.current);

    // Merge and deduplicate, maintaining DOM order
    const combined = [...allFocusable, ...registered];
    const unique = Array.from(new Set(combined));

    // Sort by DOM order
    return unique.sort((a, b) => {
      const position = a.compareDocumentPosition(b);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
  }, []);

  /**
   * Focus first focusable element
   */
  const focusFirst = useCallback(() => {
    const focusable = getFocusableElementsInOrder();
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }, [getFocusableElementsInOrder]);

  /**
   * Focus last focusable element
   */
  const focusLast = useCallback(() => {
    const focusable = getFocusableElementsInOrder();
    if (focusable.length > 0) {
      focusable[focusable.length - 1].focus();
    }
  }, [getFocusableElementsInOrder]);

  /**
   * Focus next element in sequence
   */
  const focusNext = useCallback(() => {
    const focusable = getFocusableElementsInOrder();
    const currentIndex = focusable.findIndex(el => el === document.activeElement);
    
    if (currentIndex >= 0 && currentIndex < focusable.length - 1) {
      focusable[currentIndex + 1].focus();
    } else if (trapFocus && focusable.length > 0) {
      focusable[0].focus(); // Wrap to first
    }
  }, [getFocusableElementsInOrder, trapFocus]);

  /**
   * Focus previous element in sequence
   */
  const focusPrevious = useCallback(() => {
    const focusable = getFocusableElementsInOrder();
    const currentIndex = focusable.findIndex(el => el === document.activeElement);
    
    if (currentIndex > 0) {
      focusable[currentIndex - 1].focus();
    } else if (trapFocus && focusable.length > 0) {
      focusable[focusable.length - 1].focus(); // Wrap to last
    }
  }, [getFocusableElementsInOrder, trapFocus]);

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Handle custom shortcuts first
    const shortcutKey = `${event.ctrlKey ? 'Ctrl+' : ''}${event.altKey ? 'Alt+' : ''}${event.shiftKey ? 'Shift+' : ''}${event.key}`;
    if (shortcuts[shortcutKey]) {
      event.preventDefault();
      shortcuts[shortcutKey]();
      return;
    }

    // Handle built-in navigation
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        if (enableArrowKeys) {
          event.preventDefault();
          focusNext();
        }
        break;

      case 'ArrowUp':
      case 'ArrowLeft':
        if (enableArrowKeys) {
          event.preventDefault();
          focusPrevious();
        }
        break;

      case 'Tab':
        if (enableTabNavigation && trapFocus) {
          event.preventDefault();
          if (event.shiftKey) {
            focusPrevious();
          } else {
            focusNext();
          }
        }
        break;

      case 'Home':
        event.preventDefault();
        focusFirst();
        break;

      case 'End':
        event.preventDefault();
        focusLast();
        break;

      case 'Enter':
      case ' ':
        if (enableActivation && document.activeElement) {
          const target = document.activeElement as HTMLElement;
          if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
            event.preventDefault();
            target.click();
          }
        }
        break;

      case 'Escape':
        if (enableEscape && containerRef.current) {
          event.preventDefault();
          containerRef.current.focus();
        }
        break;

      default:
        break;
    }
  }, [
    shortcuts,
    enableArrowKeys,
    enableTabNavigation,
    enableActivation,
    enableEscape,
    trapFocus,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
  ]);

  /**
   * Setup keyboard event listeners
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  /**
   * Setup container accessibility attributes
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Make container focusable if not already
    if (!container.hasAttribute('tabindex')) {
      container.setAttribute('tabindex', '-1');
    }

    // Add accessibility attributes
    container.setAttribute('role', 'application');
    container.setAttribute('aria-label', 'Dashboard navigation area');
  }, []);

  return {
    containerRef,
    registerFocusable,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
  };
};

export default useKeyboardNavigation; 