/**
 * ColorModeToggle component for switching between color modes
 * Provides intuitive interface for light, dark, high-contrast, and system modes
 * Enhanced with accessibility features including reduced motion support
 */

import React from 'react';
import { useColorModeContext } from '../../contexts/ColorModeContext';
import { useAccessibility } from '../../utils/accessibilityEnhancements';
import { useTheme } from '../../contexts/ThemeContext';

interface ColorModeToggleProps {
  variant?: 'button' | 'select' | 'tabs';
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

/**
 * ColorModeToggle component with multiple variants
 * 
 * Features:
 * - Multiple UI variants (button, select, tabs)
 * - Icon representation for each mode
 * - Keyboard navigation support
 * - ARIA accessibility
 * - Smooth animations
 * 
 * Props:
 *   variant: UI style ('button' | 'select' | 'tabs')
 *   size: Component size ('sm' | 'md' | 'lg')
 *   showLabels: Whether to show text labels
 *   className: Additional CSS classes
 */
export function ColorModeToggle({
  variant = 'button',
  size = 'md',
  showLabels = false,
  className = '',
}: ColorModeToggleProps) {
  const { colorMode, setColorMode, resolvedColorMode, systemPreference } = useColorModeContext();
  const { announceToScreenReader, prefersReducedMotion } = useAccessibility();
  const { isTransitioning } = useTheme();

  // Handle color mode change with accessibility announcements
  const handleColorModeChange = async (newMode: any) => {
    const modeNames = {
      light: 'Light mode',
      dark: 'Dark mode',
      'high-contrast': 'High contrast mode',
      system: 'System preference mode'
    };
    
    // Announce the change to screen readers
    announceToScreenReader(
      `Switching to ${modeNames[newMode as keyof typeof modeNames] || newMode}`, 
      'assertive'
    );
    
    setColorMode(newMode);
  };

  // Icon components for each color mode
  const SunIcon = () => (
    <svg 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
      className="color-mode-icon"
    >
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );

  const MoonIcon = () => (
    <svg 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
      className="color-mode-icon"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );

  const ContrastIcon = () => (
    <svg 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
      className="color-mode-icon"
    >
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2v20" strokeWidth="3"/>
    </svg>
  );

  const SystemIcon = () => (
    <svg 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
      className="color-mode-icon"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );

  const colorModeConfig = {
    light: {
      label: 'Light',
      icon: <SunIcon />,
      description: 'Light color mode',
    },
    dark: {
      label: 'Dark',
      icon: <MoonIcon />,
      description: 'Dark color mode',
    },
    'high-contrast': {
      label: 'High Contrast',
      icon: <ContrastIcon />,
      description: 'High contrast mode for accessibility',
    },
    system: {
      label: `System (${systemPreference})`,
      icon: <SystemIcon />,
      description: `Follow system preference (currently ${systemPreference})`,
    },
  };

  const sizeClasses = {
    sm: 'text-sm p-1',
    md: 'text-base p-2',
    lg: 'text-lg p-3',
  };

  const baseClasses = `
    color-mode-toggle
    ${sizeClasses[size]}
    ${prefersReducedMotion() ? '' : 'transition-all duration-200 ease-in-out'}
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
    ${isTransitioning() ? 'pointer-events-none opacity-75' : ''}
    ${className}
  `;

  // Button variant - cycles through modes
  if (variant === 'button') {
    const currentConfig = colorModeConfig[colorMode];
    
    return (
      <button
        onClick={() => {
          const modes = ['light', 'dark', 'high-contrast', 'system'] as const;
          const currentIndex = modes.indexOf(colorMode);
          const nextIndex = (currentIndex + 1) % modes.length;
          handleColorModeChange(modes[nextIndex]);
        }}
        disabled={isTransitioning()}
        className={`
          ${baseClasses}
          bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700
          rounded-md border border-gray-300 dark:border-gray-600
          flex items-center gap-2
        `}
        title={currentConfig.description}
        aria-label={`Current color mode: ${currentConfig.label}. Click to cycle to next mode.`}
      >
        <span className="flex-shrink-0">{currentConfig.icon}</span>
        {showLabels && (
          <span className="text-sm font-medium">{currentConfig.label}</span>
        )}
      </button>
    );
  }

  // Select variant - dropdown selection
  if (variant === 'select') {
    return (
      <div className={`${baseClasses} relative`}>
        <select
          value={colorMode}
          onChange={(e) => handleColorModeChange(e.target.value as any)}
          disabled={isTransitioning()}
          className={`
            appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
            rounded-md px-3 py-2 pr-8 text-sm font-medium
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            cursor-pointer
          `}
          aria-label="Select color mode"
        >
          {Object.entries(colorModeConfig).map(([mode, config]) => (
            <option key={mode} value={mode}>
              {config.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }

  // Tabs variant - segmented control
  if (variant === 'tabs') {
    return (
      <div className={`${baseClasses} flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1`}>
        {Object.entries(colorModeConfig).map(([mode, config]) => (
          <button
            key={mode}
            onClick={() => setColorMode(mode as any)}
            className={`
              flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-all duration-200
              ${colorMode === mode
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }
            `}
            title={config.description}
            aria-pressed={colorMode === mode}
            aria-label={`${config.label} color mode`}
          >
            <span className="flex-shrink-0 scale-75">{config.icon}</span>
            {showLabels && <span>{config.label}</span>}
          </button>
        ))}
      </div>
    );
  }

  return null;
}

/**
 * Compact color mode toggle - just the current mode icon with tooltip
 */
export function ColorModeToggleCompact({ className = '' }: { className?: string }) {
  const { colorMode, toggleColorMode, resolvedColorMode } = useColorModeContext();

  const SunIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );

  const MoonIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );

  const ContrastIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2v20" strokeWidth="3"/>
    </svg>
  );

  const icons = {
    light: <SunIcon />,
    dark: <MoonIcon />,
    'high-contrast': <ContrastIcon />,
  };

  return (
    <button
      onClick={toggleColorMode}
      className={`
        p-2 rounded-md transition-all duration-200
        hover:bg-gray-100 dark:hover:bg-gray-800
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${className}
      `}
      title={`Current: ${resolvedColorMode} mode. Click to cycle.`}
      aria-label={`Color mode toggle. Current: ${resolvedColorMode}. Click to cycle through modes.`}
    >
      <span className="block transform transition-transform duration-200 hover:scale-110">
        {colorMode === 'system' ? icons[resolvedColorMode] : icons[resolvedColorMode]}
      </span>
    </button>
  );
}

// CSS for icons and animations
const colorModeStyles = `
  .color-mode-icon {
    transition: transform 0.2s ease-in-out;
  }
  
  .color-mode-toggle:hover .color-mode-icon {
    transform: scale(1.1) rotate(5deg);
  }
  
  .color-mode-light .color-mode-icon {
    color: #f59e0b;
  }
  
  .color-mode-dark .color-mode-icon {
    color: #60a5fa;
  }
  
  .color-mode-high-contrast .color-mode-icon {
    color: #ffffff;
  }
`;

// Inject styles if not already present
if (typeof window !== 'undefined' && !document.getElementById('color-mode-toggle-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'color-mode-toggle-styles';
  styleElement.textContent = colorModeStyles;
  document.head.appendChild(styleElement);
} 