import { useState } from 'react';
import { ColorModeToggleCompact } from '../ui/ColorModeToggle';
import { useTheme } from '../../contexts/ThemeContext';
import { SunIcon, BeakerIcon, SparklesIcon, BoltIcon, NewspaperIcon, EyeIcon, EyeDropperIcon, HeartIcon, FireIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import type { ThemeName } from '../../styles/themes';
import type { ContextualTheme } from '../../contexts/ThemeContext';

const themeOptions: { value: ThemeName; label: string; icon: any; color: string }[] = [
  { value: 'minimal', label: 'Minimal', icon: SunIcon, color: '#fbbf24' },
  { value: 'neo-brutalist', label: 'Neo-Brutalist', icon: BeakerIcon, color: '#ef4444' },
  { value: 'glassmorphic', label: 'Glassmorphic', icon: SparklesIcon, color: '#38bdf8' },
  { value: 'cyberpunk', label: 'Cyberpunk', icon: BoltIcon, color: '#a21caf' },
  { value: 'editorial', label: 'Editorial', icon: NewspaperIcon, color: '#f59e42' },
  { value: 'accessible', label: 'Accessible', icon: EyeIcon, color: '#2563eb' },
];

const contextOptions: { value: ContextualTheme; label: string; icon: any; color: string }[] = [
  { value: 'default', label: 'Default', icon: EyeDropperIcon, color: '#3b82f6' },
  { value: 'focus', label: 'Focus', icon: EyeIcon, color: '#8b5cf6' },
  { value: 'relax', label: 'Relax', icon: HeartIcon, color: '#10b981' },
  { value: 'energize', label: 'Energize', icon: FireIcon, color: '#ef4444' },
];

/**
 * Navbar - Top navigation bar for OpsSight UI.
 * Includes app name/logo and theme toggle button.
 * Responsive and supports dark mode.
 */
export default function Navbar() {
  const { config, setThemeVariant, setContextualTheme } = useTheme();
  const [themeOpen, setThemeOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const currentTheme = themeOptions.find(opt => opt.value === config.variant) || themeOptions[0];
  const currentContext = contextOptions.find(opt => opt.value === config.contextualTheme) || contextOptions[0];

  // Persist theme variant in localStorage (if not already handled)
  const handleThemeChange = (variant: ThemeName) => {
    setThemeVariant(variant);
    try {
      localStorage.setItem('opssight-theme-variant', variant);
    } catch {}
    setThemeOpen(false);
  };

  // Persist contextual theme in localStorage (if not already handled)
  const handleContextChange = (context: ContextualTheme) => {
    setContextualTheme(context);
    try {
      localStorage.setItem('opssight-contextual-theme', context);
    } catch {}
    setContextOpen(false);
  };

  return (
    <nav className="w-full flex justify-between items-center px-6 py-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow">
      <span className="font-bold text-lg">OpsSight</span>
      <div className="flex items-center gap-2 relative">
        {/* Contextual Theme Switcher */}
        <button
          className={`flex items-center gap-1 p-2 rounded-md border hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 relative ${config.contextualTheme !== 'default' ? 'border-2 border-blue-500' : ''}`}
          aria-label={`Context: ${currentContext.label}`}
          onClick={() => setContextOpen(v => !v)}
          onBlur={() => setTimeout(() => setContextOpen(false), 100)}
        >
          <currentContext.icon className="h-5 w-5" />
          {/* Visual indicator for current context */}
          {config.contextualTheme !== 'default' && (
            <span
              className="absolute left-1/2 -bottom-1.5 -translate-x-1/2"
              aria-hidden="true"
            >
              <span
                className="block h-1.5 w-4 rounded-full"
                style={{ background: currentContext.color, opacity: 0.7 }}
              />
            </span>
          )}
          <span className="sr-only">{currentContext.label}</span>
        </button>
        <AnimatePresence>
          {contextOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50"
              style={{ top: '2.5rem', right: '8.5rem' }}
            >
              {contextOptions.map(opt => (
                <button
                  key={opt.value}
                  className={`flex items-center w-full px-3 py-2 gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-blue-100 dark:focus:bg-blue-900/30 transition-all duration-150 ${config.contextualTheme === opt.value ? 'font-bold text-blue-600 dark:text-blue-400' : ''}`}
                  onClick={() => handleContextChange(opt.value)}
                  aria-label={`Switch to ${opt.label} context`}
                >
                  <opt.icon className="h-4 w-4" />
                  <span>{opt.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        {/* Theme Variant Switcher */}
        <button
          className="flex items-center gap-1 p-2 rounded-md border hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 relative"
          aria-label={`Theme: ${currentTheme.label}`}
          onClick={() => setThemeOpen(v => !v)}
          onBlur={() => setTimeout(() => setThemeOpen(false), 100)}
        >
          <currentTheme.icon className="h-5 w-5" />
          {/* Visual indicator for current theme */}
          <span
            className="absolute left-1/2 -bottom-1.5 -translate-x-1/2"
            aria-hidden="true"
          >
            <span
              className="block h-1.5 w-4 rounded-full"
              style={{ background: currentTheme.color, opacity: 0.7 }}
            />
          </span>
          <span className="sr-only">{currentTheme.label}</span>
        </button>
        <AnimatePresence>
          {themeOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50"
            >
              {themeOptions.map(opt => (
                <button
                  key={opt.value}
                  className={`flex items-center w-full px-3 py-2 gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-blue-100 dark:focus:bg-blue-900/30 transition-all duration-150 ${config.variant === opt.value ? 'font-bold text-blue-600 dark:text-blue-400' : ''}`}
                  onClick={() => handleThemeChange(opt.value)}
                  aria-label={`Switch to ${opt.label} theme`}
                >
                  <opt.icon className="h-4 w-4" />
                  <span>{opt.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        {/* Color mode toggle with hover/focus animation */}
        <span className="transition-transform duration-150 hover:scale-110 focus-within:scale-110">
          <ColorModeToggleCompact />
        </span>
      </div>
    </nav>
  );
} 