/**
 * Loading Skeleton Component
 * 
 * Reusable skeleton loading components for various UI elements
 * providing consistent loading experiences across the application.
 */

import React from 'react';

export type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'card' | 'list' | 'table';
export type SkeletonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface LoadingSkeletonProps {
  /** Skeleton variant */
  variant?: SkeletonVariant;
  /** Size configuration */
  size?: SkeletonSize;
  /** Custom width */
  width?: string | number;
  /** Custom height */
  height?: string | number;
  /** Number of skeleton items (for list/table variants) */
  count?: number;
  /** Animation type */
  animation?: 'pulse' | 'wave' | 'none';
  /** Additional CSS classes */
  className?: string;
}

/**
 * LoadingSkeleton Component
 * 
 * Flexible skeleton component supporting multiple variants and animations.
 * 
 * Features:
 * - Multiple skeleton variants (text, card, list, table, etc.)
 * - Configurable size presets and custom dimensions
 * - Different animation types (pulse, wave, none)
 * - Dark mode support
 * - Accessibility compliant
 * 
 * @param variant - Skeleton type/shape
 * @param size - Size preset
 * @param width - Custom width
 * @param height - Custom height
 * @param count - Number of items for list/table
 * @param animation - Animation type
 * @param className - Additional CSS classes
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'rectangular',
  size = 'md',
  width,
  height,
  count = 1,
  animation = 'pulse',
  className = '',
}) => {
  /**
   * Get size configuration
   */
  const getSizeConfig = (variant: SkeletonVariant, size: SkeletonSize) => {
    const configs = {
      text: {
        xs: 'h-3',
        sm: 'h-4',
        md: 'h-4',
        lg: 'h-5',
        xl: 'h-6'
      },
      circular: {
        xs: 'h-6 w-6',
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16'
      },
      rectangular: {
        xs: 'h-16',
        sm: 'h-20',
        md: 'h-24',
        lg: 'h-32',
        xl: 'h-40'
      },
      card: {
        xs: 'h-32',
        sm: 'h-40',
        md: 'h-48',
        lg: 'h-56',
        xl: 'h-64'
      },
      list: {
        xs: 'h-12',
        sm: 'h-14',
        md: 'h-16',
        lg: 'h-18',
        xl: 'h-20'
      },
      table: {
        xs: 'h-10',
        sm: 'h-12',
        md: 'h-14',
        lg: 'h-16',
        xl: 'h-18'
      }
    };

    return configs[variant][size];
  };

  /**
   * Get animation classes
   */
  const getAnimationClass = (animation: 'pulse' | 'wave' | 'none') => {
    const animations = {
      pulse: 'animate-pulse',
      wave: 'animate-wave',
      none: ''
    };

    return animations[animation] || '';
  };

  const sizeClass = getSizeConfig(variant, size);
  const animationClass = getAnimationClass(animation);
  const baseClass = 'bg-gray-200 dark:bg-gray-700 rounded';

  /**
   * Get custom dimensions
   */
  const getCustomStyle = () => {
    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;
    return style;
  };

  /**
   * Render skeleton based on variant
   */
  const renderSkeleton = () => {
    switch (variant) {
      case 'text':
        return (
          <div className="space-y-2">
            {Array.from({ length: count }).map((_, index) => (
              <div
                key={index}
                className={`${baseClass} ${sizeClass} ${animationClass} ${className}`}
                style={getCustomStyle()}
              />
            ))}
          </div>
        );

      case 'circular':
        return (
          <div
            className={`${baseClass} rounded-full ${sizeClass} ${animationClass} ${className}`}
            style={getCustomStyle()}
          />
        );

      case 'card':
        return (
          <div className={`${baseClass} ${sizeClass} ${animationClass} p-4 ${className}`} style={getCustomStyle()}>
            <div className="space-y-3">
              {/* Card header skeleton */}
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
              </div>
              
              {/* Card content skeleton */}
              <div className="space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-4/5"></div>
              </div>
            </div>
          </div>
        );

      case 'list':
        return (
          <div className="space-y-3">
            {Array.from({ length: count }).map((_, index) => (
              <div key={index} className={`${baseClass} ${sizeClass} ${animationClass} p-3 ${className}`}>
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'table':
        return (
          <div className={`${baseClass} ${animationClass} ${className}`} style={getCustomStyle()}>
            {/* Table header */}
            <div className="border-b border-gray-300 dark:border-gray-600 p-4">
              <div className="flex space-x-4">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
              </div>
            </div>
            
            {/* Table rows */}
            <div className="space-y-0">
              {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="border-b border-gray-300 dark:border-gray-600 p-4">
                  <div className="flex space-x-4">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div
            className={`${baseClass} ${sizeClass} ${animationClass} ${className}`}
            style={getCustomStyle()}
          />
        );
    }
  };

  return (
    <div role="status" aria-label="Loading content" aria-live="polite">
      <span className="sr-only">Loading...</span>
      {renderSkeleton()}
    </div>
  );
};

/**
 * Predefined Skeleton Components for Common Use Cases
 */

/**
 * MetricCardSkeleton - Skeleton for metric cards
 */
export const MetricCardSkeleton: React.FC<{ count?: number; className?: string }> = ({ 
  count = 1, 
  className = '' 
}) => (
  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 ${className}`}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-3"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
      </div>
    ))}
  </div>
);

/**
 * ActivityFeedSkeleton - Skeleton for activity feeds
 */
export const ActivityFeedSkeleton: React.FC<{ count?: number; className?: string }> = ({ 
  count = 3, 
  className = '' 
}) => (
  <div className={`space-y-6 ${className}`}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex items-start space-x-3 animate-pulse">
        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        </div>
      </div>
    ))}
  </div>
);

/**
 * DashboardSkeleton - Complete dashboard loading skeleton
 */
export const DashboardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`space-y-6 ${className}`}>
    {/* Header skeleton */}
    <div className="flex justify-between items-center animate-pulse">
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96"></div>
      </div>
      <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>

    {/* Metric cards skeleton */}
    <MetricCardSkeleton count={4} />

    {/* Content grid skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <LoadingSkeleton variant="card" size="lg" />
      </div>
      <div className="lg:col-span-1">
        <LoadingSkeleton variant="card" size="lg" />
      </div>
    </div>
  </div>
);

export default LoadingSkeleton; 