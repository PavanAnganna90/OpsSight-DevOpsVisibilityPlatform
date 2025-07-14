/**
 * AccessibilitySettings Component
 * 
 * Comprehensive accessibility settings panel for theme transitions and general accessibility preferences.
 * Provides user control over motion preferences, screen reader announcements, color contrast validation,
 * and other accessibility features.
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAccessibility } from '../../utils/accessibilityEnhancements';
import { AccessibilityConfig } from '../../utils/accessibilityEnhancements';

// Component props interface
interface AccessibilitySettingsProps {
  isOpen?: boolean;
  onClose?: () => void;
  showAsPanel?: boolean;
  className?: string;
}

// Settings sections for organization
type SettingSection = 'motion' | 'visual' | 'audio' | 'interaction';

interface SettingItem {
  id: keyof AccessibilityConfig;
  label: string;
  description: string;
  section: SettingSection;
  type: 'toggle' | 'select';
  options?: Array<{ value: string; label: string }>;
}

/**
 * AccessibilitySettings Component
 * 
 * Features:
 * - Motion preference controls (reduced motion, animation speed)
 * - Visual accessibility settings (high contrast, color validation)
 * - Audio settings (screen reader announcements, verbosity)
 * - Interaction preferences (keyboard shortcuts, focus management)
 * - Live preview of settings effects
 * - Integration with theme transition system
 */
export function AccessibilitySettings({
  isOpen = true,
  onClose,
  showAsPanel = false,
  className = '',
}: AccessibilitySettingsProps) {
  const { config: themeConfig, systemPreferences } = useTheme();
  const { 
    updateConfig, 
    announceToScreenReader, 
    getReport, 
    prefersReducedMotion, 
    prefersHighContrast 
  } = useAccessibility();

  // Local state for accessibility configuration
  const [accessibilityConfig, setAccessibilityConfig] = useState<AccessibilityConfig>({
    respectReducedMotion: true,
    announceThemeChanges: true,
    manageFocusDuringTransitions: true,
    enableHighContrastMode: false,
    validateColorContrast: true,
    enableKeyboardShortcuts: true,
    motionSensitivityLevel: 'reduced',
    screenReaderVerbosity: 'standard',
  });

  const [activeSection, setActiveSection] = useState<SettingSection>('motion');
  const [previewMode, setPreviewMode] = useState(false);

  // Settings configuration
  const settings: SettingItem[] = [
    // Motion Settings
    {
      id: 'respectReducedMotion',
      label: 'Respect Reduced Motion',
      description: 'Automatically disable animations when system reduced motion is enabled',
      section: 'motion',
      type: 'toggle',
    },
    {
      id: 'motionSensitivityLevel',
      label: 'Motion Sensitivity',
      description: 'Control the level of motion reduction for theme transitions',
      section: 'motion',
      type: 'select',
      options: [
        { value: 'none', label: 'No Motion (Static)' },
        { value: 'minimal', label: 'Minimal Motion' },
        { value: 'reduced', label: 'Reduced Motion' },
      ],
    },
    // Visual Settings
    {
      id: 'enableHighContrastMode',
      label: 'Enhanced High Contrast',
      description: 'Enable enhanced high contrast mode for better visibility',
      section: 'visual',
      type: 'toggle',
    },
    {
      id: 'validateColorContrast',
      label: 'Color Contrast Validation',
      description: 'Automatically validate color contrast during theme changes',
      section: 'visual',
      type: 'toggle',
    },
    // Audio Settings
    {
      id: 'announceThemeChanges',
      label: 'Announce Theme Changes',
      description: 'Have screen readers announce when themes are changed',
      section: 'audio',
      type: 'toggle',
    },
    {
      id: 'screenReaderVerbosity',
      label: 'Screen Reader Verbosity',
      description: 'Control how much information is announced to screen readers',
      section: 'audio',
      type: 'select',
      options: [
        { value: 'minimal', label: 'Minimal' },
        { value: 'standard', label: 'Standard' },
        { value: 'verbose', label: 'Verbose' },
      ],
    },
    // Interaction Settings
    {
      id: 'enableKeyboardShortcuts',
      label: 'Keyboard Shortcuts',
      description: 'Enable keyboard shortcuts for theme switching (Alt+T, Alt+D, etc.)',
      section: 'interaction',
      type: 'toggle',
    },
    {
      id: 'manageFocusDuringTransitions',
      label: 'Focus Management',
      description: 'Maintain focus position during theme transitions',
      section: 'interaction',
      type: 'toggle',
    },
  ];

  // Load current accessibility settings
  useEffect(() => {
    const report = getReport();
    setAccessibilityConfig({
      respectReducedMotion: report.reducedMotionEnabled,
      announceThemeChanges: report.screenReaderSupport,
      manageFocusDuringTransitions: report.focusManagementEnabled,
      enableHighContrastMode: report.highContrastEnabled,
      validateColorContrast: report.colorContrastValidation,
      enableKeyboardShortcuts: report.keyboardShortcutsEnabled,
      motionSensitivityLevel: systemPreferences.reducedMotion ? 'none' : 'reduced',
      screenReaderVerbosity: 'standard',
    });
  }, [getReport, systemPreferences.reducedMotion]);

  // Handle setting changes
  const handleSettingChange = (settingId: keyof AccessibilityConfig, value: any) => {
    const newConfig = { ...accessibilityConfig, [settingId]: value };
    setAccessibilityConfig(newConfig);
    
    // Apply settings immediately
    updateConfig({ [settingId]: value });
    
    // Announce changes to screen readers
    if (newConfig.announceThemeChanges) {
      const setting = settings.find(s => s.id === settingId);
      const announcement = `${setting?.label} ${value ? 'enabled' : value === false ? 'disabled' : `set to ${value}`}`;
      announceToScreenReader(announcement, 'polite');
    }
  };

  // Get settings by section
  const getSettingsBySection = (section: SettingSection) => {
    return settings.filter(setting => setting.section === section);
  };

  // Section icons
  const getSectionIcon = (section: SettingSection) => {
    const icons = {
      motion: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      visual: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      audio: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18 12a9 9 0 01-9 9m4.5-1.206a7 7 0 010-15.588" />
        </svg>
      ),
      interaction: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a4 4 0 004-4V5z" />
        </svg>
      ),
    };
    return icons[section];
  };

  // Render setting item
  const renderSettingItem = (setting: SettingItem) => {
    const currentValue = accessibilityConfig[setting.id];

    return (
      <div key={setting.id} className="setting-item p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <label 
              htmlFor={setting.id}
              className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
            >
              {setting.label}
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {setting.description}
            </p>
          </div>
          
          <div className="ml-4 flex-shrink-0">
            {setting.type === 'toggle' ? (
              <button
                id={setting.id}
                type="button"
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                  transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  ${currentValue ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}
                `}
                role="switch"
                aria-checked={currentValue as boolean}
                aria-labelledby={`${setting.id}-label`}
                onClick={() => handleSettingChange(setting.id, !currentValue)}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                    transition duration-200 ease-in-out
                    ${currentValue ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            ) : (
              <select
                id={setting.id}
                value={currentValue as string}
                onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                className="
                  mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                  focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                  sm:text-sm rounded-md
                "
                aria-labelledby={`${setting.id}-label`}
              >
                {setting.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Preview mode toggle
  const togglePreviewMode = () => {
    setPreviewMode(!previewMode);
    announceToScreenReader(
      `Preview mode ${!previewMode ? 'enabled' : 'disabled'}`, 
      'assertive'
    );
  };

  // System preferences indicator
  const SystemPreferencesIndicator = () => (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
      <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
        System Preferences Detected
      </h4>
      <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
        {systemPreferences.reducedMotion && (
          <li>• Reduced motion preference enabled</li>
        )}
        {systemPreferences.highContrast && (
          <li>• High contrast preference enabled</li>
        )}
        <li>• Color scheme: {systemPreferences.colorScheme}</li>
      </ul>
    </div>
  );

  // Content wrapper classes
  const wrapperClasses = showAsPanel 
    ? `accessibility-settings-panel ${className}` 
    : `accessibility-settings-modal ${className}`;

  const contentClasses = showAsPanel
    ? "w-full max-w-none"
    : "bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden";

  if (!showAsPanel && !isOpen) return null;

  return (
    <div className={wrapperClasses}>
      {!showAsPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={contentClasses}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Accessibility Settings
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-2"
                aria-label="Close accessibility settings"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={showAsPanel ? "w-full" : "flex-1 overflow-y-auto"}>
        {/* System Preferences Indicator */}
        <div className="p-6">
          <SystemPreferencesIndicator />
        </div>

        {/* Section Navigation */}
        <div className="px-6 pb-4">
          <nav className="flex space-x-1" role="tablist">
            {(['motion', 'visual', 'audio', 'interaction'] as SettingSection[]).map((section) => (
              <button
                key={section}
                type="button"
                role="tab"
                aria-selected={activeSection === section}
                aria-controls={`${section}-panel`}
                className={`
                  flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md capitalize
                  transition-colors duration-200
                  ${activeSection === section
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }
                `}
                onClick={() => setActiveSection(section)}
              >
                {getSectionIcon(section)}
                {section}
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="px-6 pb-6">
          {(['motion', 'visual', 'audio', 'interaction'] as SettingSection[]).map((section) => (
            <div
              key={section}
              id={`${section}-panel`}
              role="tabpanel"
              aria-labelledby={`${section}-tab`}
              className={activeSection === section ? 'block' : 'hidden'}
            >
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
                {getSettingsBySection(section).map(renderSettingItem)}
              </div>
            </div>
          ))}
        </div>

        {/* Preview Mode Toggle */}
        <div className="px-6 pb-6">
          <button
            onClick={togglePreviewMode}
            className={`
              w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md
              transition-colors duration-200
              ${previewMode
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
              }
              hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500
            `}
            aria-pressed={previewMode}
          >
            {previewMode ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Preview Mode Active
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Enable Preview Mode
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact accessibility settings toggle for quick access
 */
export function AccessibilityQuickToggle({ className = '' }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { prefersReducedMotion, announceToScreenReader } = useAccessibility();

  const toggleSettings = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      announceToScreenReader('Accessibility settings opened', 'polite');
    }
  };

  return (
    <>
      <button
        onClick={toggleSettings}
        className={`
          accessibility-quick-toggle p-2 rounded-md 
          bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700
          border border-gray-300 dark:border-gray-600
          focus:outline-none focus:ring-2 focus:ring-blue-500
          transition-colors duration-200
          ${className}
        `}
        aria-label="Open accessibility settings"
        title="Accessibility Settings"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        {prefersReducedMotion() && (
          <span className="sr-only">Reduced motion active</span>
        )}
      </button>

      <AccessibilitySettings
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        showAsPanel={false}
      />
    </>
  );
} 