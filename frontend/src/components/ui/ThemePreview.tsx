/**
 * ThemePreview component for demonstrating and testing different theme variants
 * Updated with color mode support and enhanced functionality
 */

import React, { useState } from 'react';
import { themes, getThemeWithColorMode, applyTheme, generateDynamicTheme, type ThemeName, type ColorMode } from '../../styles/themes';
import { ColorModeToggle, ColorModeToggleCompact } from './ColorModeToggle';
import { useColorModeContext } from '../../contexts/ColorModeContext';

export function ThemePreview() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>('minimal');
  const [dynamicHue, setDynamicHue] = useState(180);
  const [previewMode, setPreviewMode] = useState<'themes' | 'color-modes' | 'dynamic'>('themes');
  const { colorMode, resolvedColorMode } = useColorModeContext();

  // Apply theme with current color mode
  const handleThemeChange = (themeName: ThemeName) => {
    setSelectedTheme(themeName);
    const theme = getThemeWithColorMode(themeName, resolvedColorMode);
    applyTheme(theme, resolvedColorMode);
  };

  // Apply dynamic theme
  const handleDynamicThemeChange = (hue: number) => {
    setDynamicHue(hue);
    const dynamicTheme = generateDynamicTheme(hue);
    const themeWithColorMode = resolvedColorMode !== 'light' && dynamicTheme.colorModes?.[resolvedColorMode]
      ? getThemeWithColorMode('dynamic' as ThemeName, resolvedColorMode)
      : dynamicTheme;
    applyTheme(themeWithColorMode, resolvedColorMode);
  };

  // Theme descriptions with color mode considerations
  const themeDescriptions = {
    minimal: 'Clean, spacious design with subtle effects. Optimized for focus and readability.',
    'neo-brutalist': 'Bold, geometric aesthetics with thick borders and hard shadows. Makes a strong visual statement.',
    glassmorphic: 'Translucent, blurred backgrounds with modern glass-like effects.',
    cyberpunk: 'Neon colors and dark backgrounds with futuristic glow effects.',
    editorial: 'Typography-focused design optimized for reading and content consumption.',
    accessible: 'High contrast, WCAG compliant design optimized for accessibility.',
  };

  // Color mode descriptions
  const colorModeDescriptions = {
    light: 'Standard light mode with dark text on light backgrounds.',
    dark: 'Dark mode with light text on dark backgrounds for reduced eye strain.',
    'high-contrast': 'High contrast mode meeting WCAG AAA standards for accessibility.',
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          OpsSight Theme System
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Explore our comprehensive theme variants and color modes. Each theme adapts to light, dark, and high-contrast modes.
        </p>
        
        {/* Global Color Mode Toggle */}
        <div className="flex justify-center items-center gap-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Color Mode:</span>
          <ColorModeToggle variant="tabs" showLabels />
        </div>
        
        {/* Current Status */}
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Active: <span className="font-medium">{selectedTheme}</span> theme in <span className="font-medium">{resolvedColorMode}</span> mode
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex justify-center">
        <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
          {[
            { key: 'themes', label: 'Theme Variants' },
            { key: 'color-modes', label: 'Color Modes' },
            { key: 'dynamic', label: 'Dynamic Generator' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPreviewMode(key as any)}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                ${previewMode === key
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Theme Variants Preview */}
      {previewMode === 'themes' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">
            Theme Variants
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(themes).map(([name, theme]) => (
              <div
                key={name}
                className={`
                  relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200
                  ${selectedTheme === name
                    ? 'border-blue-500 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
                onClick={() => handleThemeChange(name as ThemeName)}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                      {name.replace('-', ' ')}
                    </h3>
                    {selectedTheme === name && (
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {themeDescriptions[name as keyof typeof themeDescriptions]}
                  </p>
                  
                  {/* Theme Color Preview */}
                  <div className="flex space-x-2">
                    <div 
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: 'var(--color-primary-500)' }}
                    ></div>
                    <div 
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: 'var(--color-secondary-500)' }}
                    ></div>
                    <div 
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: 'var(--color-accent-500)' }}
                    ></div>
                  </div>
                  
                  {/* Color Mode Adaptations */}
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Adapts to: Light, Dark, High Contrast
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Color Modes Preview */}
      {previewMode === 'color-modes' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">
            Color Mode Demonstrations
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {(['light', 'dark', 'high-contrast'] as ColorMode[]).map((mode) => (
              <div
                key={mode}
                className={`
                  border-2 rounded-lg p-6 space-y-4
                  ${resolvedColorMode === mode
                    ? 'border-blue-500 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                    {mode.replace('-', ' ')} Mode
                  </h3>
                  {resolvedColorMode === mode && (
                    <div className="text-blue-500 text-sm font-medium">Current</div>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {colorModeDescriptions[mode]}
                </p>
                
                {/* Mode-specific features */}
                <div className="space-y-2 text-xs">
                  {mode === 'light' && (
                    <div className="text-gray-600">
                      • Dark text on light backgrounds<br/>
                      • Standard contrast ratios<br/>
                      • Optimized for daylight use
                    </div>
                  )}
                  {mode === 'dark' && (
                    <div className="text-gray-400">
                      • Light text on dark backgrounds<br/>
                      • Reduced blue light emission<br/>
                      • Better for low-light environments
                    </div>
                  )}
                  {mode === 'high-contrast' && (
                    <div className="text-gray-300">
                      • Maximum contrast ratios (7:1+)<br/>
                      • WCAG AAA compliance<br/>
                      • Enhanced focus indicators<br/>
                      • Larger touch targets
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Theme Generator */}
      {previewMode === 'dynamic' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">
            Dynamic Theme Generator
          </h2>
          
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Generate themes dynamically using color theory. Adjust the hue slider to create complementary and triadic color schemes.
              </p>
              
              {/* Hue Slider */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Base Hue: {dynamicHue}°
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={dynamicHue}
                  onChange={(e) => handleDynamicThemeChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  style={{
                    background: `linear-gradient(to right, 
                      hsl(0, 70%, 50%) 0%, 
                      hsl(60, 70%, 50%) 16.66%, 
                      hsl(120, 70%, 50%) 33.33%, 
                      hsl(180, 70%, 50%) 50%, 
                      hsl(240, 70%, 50%) 66.66%, 
                      hsl(300, 70%, 50%) 83.33%, 
                      hsl(360, 70%, 50%) 100%)`
                  }}
                />
              </div>
              
              {/* Color Preview */}
              <div className="flex justify-center space-x-4 mt-6">
                <div className="text-center">
                  <div 
                    className="w-16 h-16 rounded-full border-4 border-white shadow-lg mx-auto"
                    style={{ backgroundColor: `oklch(0.55 0.20 ${dynamicHue})` }}
                  ></div>
                  <div className="text-sm mt-2 text-gray-600 dark:text-gray-400">Primary</div>
                </div>
                <div className="text-center">
                  <div 
                    className="w-16 h-16 rounded-full border-4 border-white shadow-lg mx-auto"
                    style={{ backgroundColor: `oklch(0.55 0.20 ${(dynamicHue + 180) % 360})` }}
                  ></div>
                  <div className="text-sm mt-2 text-gray-600 dark:text-gray-400">Complementary</div>
                </div>
                <div className="text-center">
                  <div 
                    className="w-16 h-16 rounded-full border-4 border-white shadow-lg mx-auto"
                    style={{ backgroundColor: `oklch(0.55 0.20 ${(dynamicHue + 120) % 360})` }}
                  ></div>
                  <div className="text-sm mt-2 text-gray-600 dark:text-gray-400">Triadic</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Theme Usage Examples */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">
          Theme Examples
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Typography Example */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Typography</h3>
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Heading 1</h1>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Heading 2</h2>
              <p className="text-gray-700 dark:text-gray-300">
                This is a paragraph demonstrating how text renders in the current theme and color mode. 
                The design system ensures proper contrast ratios and readability across all modes.
              </p>
              <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                Code snippet example
              </code>
            </div>
          </div>

          {/* UI Components Example */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">UI Components</h3>
            <div className="space-y-4">
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors">
                Primary Button
              </button>
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  placeholder="Input field" 
                  className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <ColorModeToggleCompact />
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded p-3">
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  This is an alert component that adapts to the current color mode.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-8 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          OpsSight Design System • Theme variants with comprehensive color mode support
        </p>
      </div>
    </div>
  );
} 