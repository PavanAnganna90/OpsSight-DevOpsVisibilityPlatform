/**
 * Central export point for all styling utilities and tokens
 * Includes design tokens, themes, color modes, and utility functions
 */

// Design tokens
export * from './tokens/colors';
export * from './tokens/typography';
export * from './tokens/spacing';

// Theme system with color mode support
export * from './themes';

// Color mode hooks and utilities
export { useColorMode } from '../hooks/useColorMode';
export { ColorModeProvider, useColorModeContext, withColorMode } from '../contexts/ColorModeContext';

// Import CSS for animations, color modes, and enhanced theme variables
import './themes/animations.css';
import './themes/color-modes.css';
import './themes/theme-variables.css';

// Global styles
import './globals.css'; 