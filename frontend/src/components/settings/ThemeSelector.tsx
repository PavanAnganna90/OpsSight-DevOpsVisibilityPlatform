'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RadioGroup } from '@headlessui/react';
import { 
  SunIcon, 
  MoonIcon, 
  ComputerDesktopIcon,
  SparklesIcon,
  BeakerIcon,
  NewspaperIcon,
  EyeIcon,
  ClockIcon,
  BoltIcon,
  HeartIcon,
  FireIcon,
  SwatchIcon,
  Cog6ToothIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '@/contexts/ThemeContext';
import type { Theme, ThemeName as StaticThemeName, ColorMode } from '@/styles/themes';
import type { ContextualTheme } from '@/contexts/ThemeContext';
import { cn } from '@/utils/cn';

// Locally extend ThemeName to allow 'dynamic' for runtime theme
// (not in static themes registry)
type ThemeName = StaticThemeName | 'dynamic';

/**
 * Theme variant configuration with icons and descriptions
 */
const themeVariants: { 
  value: ThemeName; 
  label: string; 
  icon: typeof SunIcon; 
  description: string;
  preview: string[];
}[] = [
  { 
    value: 'minimal', 
    label: 'Minimal', 
    icon: SunIcon,
    description: 'Clean and focused design with ample whitespace',
    preview: ['#ffffff', '#f8fafc', '#e2e8f0', '#64748b']
  },
  { 
    value: 'neo-brutalist', 
    label: 'Neo-Brutalist', 
    icon: BeakerIcon,
    description: 'Bold typography and raw structural elements',
    preview: ['#000000', '#ffffff', '#ff0000', '#00ff00']
  },
  { 
    value: 'glassmorphic', 
    label: 'Glassmorphic', 
    icon: SparklesIcon,
    description: 'Modern frosted glass effect with translucency',
    preview: ['#f0f9ff', '#e0f2fe', '#0ea5e9', '#0284c7']
  },
  { 
    value: 'cyberpunk', 
    label: 'Cyberpunk', 
    icon: BoltIcon,
    description: 'High contrast neon aesthetics on dark backgrounds',
    preview: ['#0a0a0a', '#1a1a2e', '#16213e', '#e94560']
  },
  { 
    value: 'editorial', 
    label: 'Editorial', 
    icon: NewspaperIcon,
    description: 'Sophisticated magazine-style layout',
    preview: ['#fef7f0', '#1c1917', '#78716c', '#a8a29e']
  },
  { 
    value: 'accessible', 
    label: 'Accessible', 
    icon: EyeIcon,
    description: 'High contrast, WCAG AAA compliant design',
    preview: ['#ffffff', '#000000', '#0066cc', '#ffaa00']
  },
];

/**
 * Color mode configuration
 */
const colorModes: { 
  value: ColorMode | 'system'; 
  label: string; 
  icon: typeof SunIcon;
  description: string;
}[] = [
  { 
    value: 'light', 
    label: 'Light', 
    icon: SunIcon,
    description: 'Bright theme for well-lit environments'
  },
  { 
    value: 'dark', 
    label: 'Dark', 
    icon: MoonIcon,
    description: 'Dark theme for low-light environments'
  },
  { 
    value: 'system', 
    label: 'System', 
    icon: ComputerDesktopIcon,
    description: 'Follows your system preference'
  },
  { 
    value: 'high-contrast', 
    label: 'High Contrast', 
    icon: EyeIcon,
    description: 'Enhanced contrast for accessibility'
  },
];

/**
 * Contextual theme configuration
 */
const contextualThemes: { 
  value: ContextualTheme; 
  label: string; 
  icon: typeof SunIcon; 
  description: string;
  accent: string;
}[] = [
  { 
    value: 'default', 
    label: 'Default', 
    icon: SwatchIcon,
    description: 'Standard theme experience',
    accent: '#3b82f6'
  },
  { 
    value: 'focus', 
    label: 'Focus', 
    icon: EyeIcon,
    description: 'Minimizes distractions for deep work',
    accent: '#8b5cf6'
  },
  { 
    value: 'relax', 
    label: 'Relax', 
    icon: HeartIcon,
    description: 'Calming colors for reduced stress',
    accent: '#10b981'
  },
  { 
    value: 'energize', 
    label: 'Energize', 
    icon: FireIcon,
    description: 'Vibrant colors for high energy',
    accent: '#ef4444'
  },
];

/**
 * Animation variants for smooth transitions
 */
const animationVariants = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  },
  item: {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20
      }
    }
  },
  preview: {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 25
      }
    },
    exit: {
      scale: 0.8,
      opacity: 0,
      transition: {
        duration: 0.2
      }
    }
  }
};

/**
 * Theme preview component showing color palette
 */
const ThemePreview: React.FC<{ 
  colors: string[]; 
  title: string; 
  isVisible: boolean;
}> = ({ colors, title, isVisible }) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div
        className="fixed bottom-6 right-6 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 min-w-[200px]"
        variants={animationVariants.preview}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <h4 className="text-sm font-semibold mb-3 text-gray-900 dark:text-gray-100">
          {title} Preview
        </h4>
        <div className="grid grid-cols-4 gap-2">
          {colors.map((color, index) => (
            <motion.div
              key={color}
              className="h-8 rounded-md border border-gray-200"
              style={{ backgroundColor: color }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 }}
            />
          ))}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

/**
 * Interactive Theme Selector Component
 * 
 * Provides a comprehensive interface for selecting theme variants, color modes,
 * and contextual themes with live preview functionality and smooth animations.
 */
export function ThemeSelector() {
  const { 
    config,
    currentTheme,
    resolvedColorMode,
    setThemeVariant,
    setColorMode,
    setContextualTheme,
    toggleSystemPreferences,
    toggleTransitions,
    hasTransitions,
    isReducedMotion,
    generateDynamicTheme
  } = useTheme();

  // Preview state for hover effects
  const [previewTheme, setPreviewTheme] = useState<{
    colors: string[];
    title: string;
  } | null>(null);

  // Dynamic Theme Generator State
  const [dynamicHue, setDynamicHue] = useState<number>(180);
  const [dynamicPreview, setDynamicPreview] = useState<Theme | null>(null);

  /**
   * Handle theme variant selection with preview
   */
  const handleVariantHover = useCallback((variant: ThemeName | null) => {
    if (!variant) {
      setPreviewTheme(null);
      return;
    }
    
    const themeConfig = themeVariants.find(t => t.value === variant);
    if (themeConfig) {
      setPreviewTheme({
        colors: themeConfig.preview,
        title: themeConfig.label
      });
    }
  }, []);

  /**
   * Handle contextual theme hover preview
   */
  const handleContextHover = useCallback((context: ContextualTheme | null) => {
    if (!context) {
      setPreviewTheme(null);
      return;
    }
    
    const contextConfig = contextualThemes.find(c => c.value === context);
    if (contextConfig) {
      setPreviewTheme({
        colors: [contextConfig.accent, '#ffffff', '#f8fafc', '#64748b'],
        title: `${contextConfig.label} Context`
      });
    }
  }, []);

  const handleDynamicPreview = () => {
    try {
      const theme = generateDynamicTheme(dynamicHue);
      if (theme !== undefined && theme !== null) {
        setDynamicPreview(theme);
      }
    } catch (error) {
      console.error('Error generating dynamic theme:', error);
    }
  };

  const handleDynamicApply = () => {
    setThemeVariant('dynamic' as ThemeName);
    setDynamicPreview(null);
  };

  return (
    <motion.div 
      className="space-y-8 max-w-4xl mx-auto p-6"
      variants={animationVariants.container}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={animationVariants.item} className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Theme Customization
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Personalize your OpsSight experience with themes, colors, and accessibility options
        </p>
      </motion.div>

      {/* Theme Variant Selection */}
      <motion.div variants={animationVariants.item} className="space-y-4">
        <div className="flex items-center gap-2">
          <SwatchIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Theme Style
          </h3>
        </div>
        
        <RadioGroup
          value={config.variant}
          onChange={setThemeVariant}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {themeVariants.map((variant) => {
            const Icon = variant.icon;
            const isSelected = config.variant === variant.value;
            
            return (
              <RadioGroup.Option
                key={variant.value}
                value={variant.value}
                className="cursor-pointer"
                onMouseEnter={() => handleVariantHover(variant.value)}
                onMouseLeave={() => handleVariantHover(null)}
              >
                {({ checked, active }) => (
                  <motion.div
                    className={cn(
                      'relative flex flex-col p-4 rounded-xl border-2 transition-all duration-200',
                      checked 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                      active && 'ring-2 ring-blue-500 ring-offset-2'
                    )}
                    whileHover={{ scale: hasTransitions ? 1.02 : 1 }}
                    whileTap={{ scale: hasTransitions ? 0.98 : 1 }}
                  >
                    {/* Selection indicator */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <CheckIcon className="w-4 h-4 text-white" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-center gap-3 mb-2">
                      <Icon className={cn(
                        'h-6 w-6',
                        checked ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'
                      )} />
                      <span className={cn(
                        'font-medium',
                        checked ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'
                      )}>
                        {variant.label}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {variant.description}
                    </p>
                    
                    {/* Color preview */}
                    <div className="flex gap-1">
                      {variant.preview.slice(0, 4).map((color, index) => (
                        <div
                          key={index}
                          className="h-3 w-3 rounded-full border border-gray-200"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </RadioGroup.Option>
            );
          })}
        </RadioGroup>
      </motion.div>

      {/* Dynamic Theme Generator */}
      <motion.div variants={animationVariants.item} className="space-y-4">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Dynamic Theme Generator
          </h3>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <label htmlFor="dynamic-hue" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Seed Hue:
          </label>
          <input
            id="dynamic-hue"
            type="range"
            min={0}
            max={359}
            value={dynamicHue}
            onChange={e => setDynamicHue(Number(e.target.value))}
            className="w-48 accent-blue-500"
            aria-valuenow={dynamicHue}
            aria-valuemin={0}
            aria-valuemax={359}
            aria-label="Dynamic theme hue seed"
          />
          <input
            type="number"
            min={0}
            max={359}
            value={dynamicHue}
            onChange={e => setDynamicHue(Number(e.target.value))}
            className="w-16 px-2 py-1 border rounded text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
            aria-label="Dynamic theme hue seed value"
          />
          <button
            type="button"
            className="ml-2 px-3 py-1 rounded bg-blue-500 text-white font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={handleDynamicPreview}
          >
            Preview
          </button>
          <button
            type="button"
            className="ml-2 px-3 py-1 rounded bg-green-500 text-white font-medium hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            onClick={handleDynamicApply}
          >
            Apply
          </button>
        </div>
        {dynamicPreview && (
          <div className="mt-4 flex flex-col items-start gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Preview:</span>
            <div className="flex gap-2">
              {['primary', 'secondary', 'accent'].map(key => (
                <div
                  key={key}
                  className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-700"
                  style={{ background: dynamicPreview.colors[key]?.['500'] || '#ccc' }}
                  title={key.charAt(0).toUpperCase() + key.slice(1)}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Theme name: dynamic (hue {dynamicHue})</span>
          </div>
        )}
      </motion.div>

      {/* Color Mode Selection */}
      <motion.div variants={animationVariants.item} className="space-y-4">
        <div className="flex items-center gap-2">
          <SunIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Color Mode
          </h3>
        </div>
        
        <RadioGroup
          value={config.colorMode}
          onChange={setColorMode}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {colorModes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = config.colorMode === mode.value;
            
            return (
              <RadioGroup.Option
                key={mode.value}
                value={mode.value}
                className="cursor-pointer"
              >
                {({ checked, active }) => (
                  <motion.div
                    className={cn(
                      'relative flex items-center gap-3 p-3 rounded-lg border transition-all duration-200',
                      checked 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                      active && 'ring-2 ring-blue-500 ring-offset-1'
                    )}
                    whileHover={{ scale: hasTransitions ? 1.02 : 1 }}
                    whileTap={{ scale: hasTransitions ? 0.98 : 1 }}
                  >
                    <Icon className={cn(
                      'h-5 w-5',
                      checked ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        'block font-medium text-sm',
                        checked ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'
                      )}>
                        {mode.label}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {mode.description}
                      </span>
                    </div>
                    
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"
                      >
                        <CheckIcon className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </RadioGroup.Option>
            );
          })}
        </RadioGroup>
      </motion.div>

      {/* Contextual Theme Selection */}
      <motion.div variants={animationVariants.item} className="space-y-4">
        <div className="flex items-center gap-2">
          <Cog6ToothIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Theme Context
          </h3>
        </div>
        
        <RadioGroup
          value={config.contextualTheme}
          onChange={setContextualTheme}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {contextualThemes.map((context) => {
            const Icon = context.icon;
            const isSelected = config.contextualTheme === context.value;
            
            return (
              <RadioGroup.Option
                key={context.value}
                value={context.value}
                className="cursor-pointer"
                onMouseEnter={() => handleContextHover(context.value)}
                onMouseLeave={() => handleContextHover(null)}
              >
                {({ checked, active }) => (
                  <motion.div
                    className={cn(
                      'relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200',
                      checked 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                      active && 'ring-2 ring-blue-500 ring-offset-2'
                    )}
                    whileHover={{ scale: hasTransitions ? 1.01 : 1 }}
                    whileTap={{ scale: hasTransitions ? 0.99 : 1 }}
                  >
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${context.accent}20` }}
                    >
                      <Icon 
                        className="h-6 w-6"
                        style={{ color: context.accent }}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className={cn(
                        'font-medium',
                        checked ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'
                      )}>
                        {context.label}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {context.description}
                      </p>
                    </div>
                    
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                      >
                        <CheckIcon className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </RadioGroup.Option>
            );
          })}
        </RadioGroup>
      </motion.div>

      {/* Accessibility Settings */}
      <motion.div variants={animationVariants.item} className="space-y-4">
        <div className="flex items-center gap-2">
          <EyeIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Accessibility & Preferences
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* System Preferences Toggle */}
          <motion.label
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
            whileHover={{ scale: hasTransitions ? 1.01 : 1 }}
            whileTap={{ scale: hasTransitions ? 0.99 : 1 }}
          >
            <input
              type="checkbox"
              checked={config.respectSystemPreferences}
              onChange={toggleSystemPreferences}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Respect System Preferences
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Follow OS settings for motion and contrast
              </p>
            </div>
          </motion.label>

          {/* Transitions Toggle */}
          <motion.label
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
            whileHover={{ scale: hasTransitions ? 1.01 : 1 }}
            whileTap={{ scale: hasTransitions ? 0.99 : 1 }}
          >
            <input
              type="checkbox"
              checked={config.enableTransitions}
              onChange={toggleTransitions}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Enable Animations
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isReducedMotion ? 'Disabled by system settings' : 'Smooth transitions and effects'}
              </p>
            </div>
          </motion.label>
        </div>
      </motion.div>

      {/* Current Theme Status */}
      <motion.div 
        variants={animationVariants.item}
        className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
      >
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
          Current Configuration
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Theme:</span>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {currentTheme.name}
            </p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Color Mode:</span>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {resolvedColorMode}
            </p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Context:</span>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {config.contextualTheme}
            </p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Animations:</span>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {hasTransitions ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Theme Preview Overlay */}
      <ThemePreview
        colors={previewTheme?.colors || []}
        title={previewTheme?.title || ''}
        isVisible={!!previewTheme}
      />
    </motion.div>
  );
} 