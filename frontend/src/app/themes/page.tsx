'use client';

import React, { useState } from 'react';

export default function ThemesPage() {
  const [activeTheme, setActiveTheme] = useState('Light');

  const themes = [
    { 
      name: 'Light', 
      gradient: 'from-slate-50 to-white', 
      accent: 'from-blue-500 to-purple-600',
      description: 'Clean and bright for optimal visibility',
      color: 'text-slate-900',
      preview: { bg: 'bg-white', text: 'text-slate-900', accent: 'bg-blue-600' }
    },
    { 
      name: 'Dark', 
      gradient: 'from-slate-900 to-slate-800', 
      accent: 'from-purple-500 to-blue-600',
      description: 'Elegant dark mode for reduced eye strain',
      color: 'text-white',
      preview: { bg: 'bg-slate-900', text: 'text-white', accent: 'bg-purple-600' }
    },
    { 
      name: 'Ocean', 
      gradient: 'from-blue-50 to-cyan-50', 
      accent: 'from-blue-500 to-cyan-600',
      description: 'Calming ocean-inspired palette',
      color: 'text-blue-900',
      preview: { bg: 'bg-blue-50', text: 'text-blue-900', accent: 'bg-blue-600' }
    },
    { 
      name: 'Forest', 
      gradient: 'from-green-50 to-emerald-50', 
      accent: 'from-green-500 to-emerald-600',
      description: 'Natural green tones for tranquility',
      color: 'text-green-900',
      preview: { bg: 'bg-green-50', text: 'text-green-900', accent: 'bg-green-600' }
    },
    { 
      name: 'Sunset', 
      gradient: 'from-orange-50 to-red-50', 
      accent: 'from-orange-500 to-red-600',
      description: 'Warm sunset colors for energy',
      color: 'text-orange-900',
      preview: { bg: 'bg-orange-50', text: 'text-orange-900', accent: 'bg-orange-600' }
    },
    { 
      name: 'Royal', 
      gradient: 'from-purple-50 to-pink-50', 
      accent: 'from-purple-500 to-pink-600',
      description: 'Elegant purple for premium feel',
      color: 'text-purple-900',
      preview: { bg: 'bg-purple-50', text: 'text-purple-900', accent: 'bg-purple-600' }
    },
    { 
      name: 'Monochrome', 
      gradient: 'from-gray-50 to-slate-50', 
      accent: 'from-gray-600 to-slate-700',
      description: 'Professional grayscale aesthetic',
      color: 'text-gray-900',
      preview: { bg: 'bg-gray-50', text: 'text-gray-900', accent: 'bg-gray-600' }
    },
  ];

  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: 'Instant Switching',
      description: 'Dynamic theme changes with CSS custom properties and smooth transitions',
      gradient: 'from-yellow-500 to-orange-600'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
        </svg>
      ),
      title: 'Color Harmony',
      description: 'Scientifically crafted palettes for optimal visual hierarchy and balance',
      gradient: 'from-pink-500 to-purple-600'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'WCAG Compliance',
      description: 'AAA accessibility standards with proper contrast and readable typography',
      gradient: 'from-green-500 to-teal-600'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      title: 'Responsive Design',
      description: 'Optimized for all devices from mobile phones to ultra-wide monitors',
      gradient: 'from-blue-500 to-cyan-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-teal-600/10 animate-pulse"></div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full -translate-x-1/2 translate-y-1/2 blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-sm font-medium text-purple-800 dark:text-purple-200 mb-8">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
              </svg>
              7 Stunning Themes
            </div>

            {/* Title */}
            <h1 className="text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 dark:from-white dark:via-purple-200 dark:to-white mb-6">
              Theme{' '}
              <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
                Variants
              </span>
            </h1>

            {/* Description */}
            <p className="max-w-3xl mx-auto text-xl lg:text-2xl text-slate-600 dark:text-slate-300 leading-relaxed mb-12">
              Experience the power of dynamic theming with our collection of{' '}
              <span className="font-semibold text-purple-600 dark:text-purple-400">carefully crafted</span>{' '}
              color palettes designed for{' '}
              <span className="font-semibold text-pink-600 dark:text-pink-400">optimal user experience</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Theme Showcase */}
      <div className="py-24 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {themes.map((theme, index) => (
              <div
                key={theme.name}
                className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} p-8 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-2xl transform hover:-translate-y-3 transition-all duration-500 cursor-pointer ${
                  activeTheme === theme.name ? 'ring-4 ring-purple-500/50 shadow-2xl scale-105' : ''
                }`}
                onClick={() => setActiveTheme(theme.name)}
              >
                {/* Theme Header */}
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-2xl font-bold ${theme.color}`}>
                      {theme.name}
                    </h3>
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${theme.accent} shadow-lg`}></div>
                  </div>
                  
                  <p className={`${theme.color} opacity-75 mb-8 leading-relaxed`}>
                    {theme.description}
                  </p>
                </div>

                {/* Theme Preview */}
                <div className="relative z-10 space-y-4">
                  {/* Preview Card */}
                  <div className={`${theme.preview.bg} rounded-2xl p-6 shadow-lg border border-white/20`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${theme.accent}`}></div>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-current opacity-25 rounded-full"></div>
                        <div className="w-2 h-2 bg-current opacity-50 rounded-full"></div>
                        <div className="w-2 h-2 bg-current opacity-75 rounded-full"></div>
                      </div>
                    </div>
                    <div className={`${theme.preview.text} space-y-2`}>
                      <div className="h-3 bg-current opacity-60 rounded w-3/4"></div>
                      <div className="h-3 bg-current opacity-40 rounded w-1/2"></div>
                      <div className="h-3 bg-current opacity-30 rounded w-2/3"></div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <div className={`${theme.preview.accent} rounded-lg px-4 py-2 text-white text-sm font-medium flex-1 text-center`}>
                      Primary Action
                    </div>
                    <div className={`${theme.preview.bg} border border-current border-opacity-20 rounded-lg px-4 py-2 ${theme.preview.text} text-sm font-medium flex-1 text-center`}>
                      Secondary
                    </div>
                  </div>
                </div>

                {/* Hover Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${theme.accent} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                
                {/* Active Indicator */}
                {activeTheme === theme.name && (
                  <div className="absolute top-4 right-4 w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse shadow-lg"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Advanced{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Features
              </span>
            </h2>
            <p className="max-w-2xl mx-auto text-xl text-slate-600 dark:text-slate-300">
              Built with modern web standards and accessibility in mind
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-500"
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.gradient} text-white mb-6 shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                  {feature.title}
                </h3>
                
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to Experience Dynamic Theming?
          </h3>
          <p className="text-xl text-purple-100 mb-8">
            Explore the dashboard with your preferred theme or dive into our component library
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/dashboard"
              className="inline-flex items-center px-8 py-4 bg-white text-purple-600 font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Dashboard
            </a>
            <a
              href="http://localhost:6006"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-xl hover:bg-white hover:text-purple-600 transform hover:-translate-y-1 transition-all duration-300"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Explore Components
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 