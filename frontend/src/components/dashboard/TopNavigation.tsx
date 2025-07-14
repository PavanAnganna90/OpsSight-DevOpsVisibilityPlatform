'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface TopNavigationProps {
  className?: string;
}

/**
 * Top navigation bar component with auto-hide behavior on scroll.
 * Layout: Left (logo) | Center (project name + git branch) | Right (profile menu)
 */
export function TopNavigation({ className = '' }: TopNavigationProps) {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <nav 
      className={`
        fixed top-0 left-0 right-0 z-50 
        bg-background/95 backdrop-blur-sm border-b border-border
        transition-transform duration-300 ease-in-out
        ${isVisible ? 'translate-y-0' : '-translate-y-full'}
        ${className}
      `}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">OS</span>
              </div>
              <span className="hidden md:block font-semibold text-foreground">
                OpsSight
              </span>
            </Link>
          </div>

          {/* Center: Project Name + Git Branch */}
          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Project:</span>
              <span className="font-medium">OpsSight Platform</span>
            </div>
            <div className="hidden lg:flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Branch:</span>
              <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                main
              </span>
            </div>
          </div>

          {/* Right: Profile Menu */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button 
              className="p-2 hover:bg-muted rounded-md transition-colors"
              aria-label="Toggle theme"
            >
              <svg 
                className="w-5 h-5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" 
                />
              </svg>
            </button>

            {/* Alerts */}
            <button 
              className="relative p-2 hover:bg-muted rounded-md transition-colors"
              aria-label="View alerts"
            >
              <svg 
                className="w-5 h-5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 17h5l-5 5v-5zM10.5 3.75a6 6 0 016 6v0a6 6 0 01-6 6v0a6 6 0 01-6-6v0a6 6 0 016-6v0z" 
                />
              </svg>
              {/* Alert badge */}
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
            </button>

            {/* Profile Menu */}
            <div className="relative">
              <button 
                className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md transition-colors"
                aria-label="Open profile menu"
              >
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-xs text-primary-foreground font-medium">
                    U
                  </span>
                </div>
                <span className="hidden md:block text-sm font-medium">
                  User
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 