/**
 * Metric Card Component
 * 
 * Reusable card component for displaying key metrics with
 * icons, values, trends, and contextual information.
 */

import React from 'react';

export type TrendDirection = 'up' | 'down' | 'neutral';
export type MetricSize = 'sm' | 'md' | 'lg';

interface MetricCardProps {
  /** Metric title/label */
  title: string;
  /** Main metric value */
  value: string | number;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Icon component or element */
  icon?: React.ReactNode;
  /** Trend information */
  trend?: {
    value: string;
    direction: TrendDirection;
    label?: string;
  };
  /** Additional context or help text */
  context?: string;
  /** Card size variant */
  size?: MetricSize;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: string;
  /** Click handler for interactive cards */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * MetricCard Component
 * 
 * Displays metrics in a visually appealing card format with support for:
 * - Icons and visual indicators
 * - Trend arrows and percentage changes
 * - Loading and error states
 * - Multiple size variants
 * - Interactive capabilities
 * - Accessibility features
 * 
 * @param title - Metric title/label
 * @param value - Main metric value
 * @param subtitle - Optional subtitle
 * @param icon - Icon component
 * @param trend - Trend information
 * @param context - Additional context
 * @param size - Size variant
 * @param isLoading - Loading state
 * @param error - Error message
 * @param onClick - Click handler
 * @param className - Additional CSS classes
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  context,
  size = 'md',
  isLoading = false,
  error,
  onClick,
  className = '',
}) => {
  /**
   * Get size configuration
   */
  const getSizeConfig = (size: MetricSize) => {
    const configs = {
      sm: {
        padding: 'p-4',
        titleText: 'text-sm',
        valueText: 'text-2xl',
        subtitleText: 'text-xs',
        iconSize: 'h-6 w-6',
        trendText: 'text-xs'
      },
      md: {
        padding: 'p-5',
        titleText: 'text-sm',
        valueText: 'text-3xl',
        subtitleText: 'text-sm',
        iconSize: 'h-8 w-8',
        trendText: 'text-sm'
      },
      lg: {
        padding: 'p-6',
        titleText: 'text-base',
        valueText: 'text-4xl',
        subtitleText: 'text-base',
        iconSize: 'h-10 w-10',
        trendText: 'text-base'
      }
    };

    return configs[size];
  };

  /**
   * Get trend styling based on direction
   */
  const getTrendConfig = (direction: TrendDirection) => {
    const configs = {
      up: {
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900',
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
          </svg>
        )
      },
      down: {
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900',
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
          </svg>
        )
      },
      neutral: {
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-900',
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        )
      }
    };

    return configs[direction];
  };

  const sizeConfig = getSizeConfig(size);
  const trendConfig = trend ? getTrendConfig(trend.direction) : null;

  /**
   * Render loading skeleton
   */
  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${sizeConfig.padding} ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className={`${sizeConfig.iconSize} bg-gray-200 dark:bg-gray-700 rounded`}></div>
          </div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${sizeConfig.padding} border-l-4 border-red-500 ${className}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Main card content
   */
  return (
    <div 
      className={`
        bg-white dark:bg-gray-800 rounded-lg shadow ${sizeConfig.padding}
        ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow duration-200' : ''}
        ${className}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Header with title and icon */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className={`${sizeConfig.titleText} font-medium text-gray-500 dark:text-gray-400 truncate`}>
            {title}
          </h3>
          {subtitle && (
            <p className={`${sizeConfig.subtitleText} text-gray-400 dark:text-gray-500 truncate mt-1`}>
              {subtitle}
            </p>
          )}
        </div>
        
        {icon && (
          <div className={`${sizeConfig.iconSize} text-gray-400 dark:text-gray-500 flex-shrink-0 ml-3`}>
            {icon}
          </div>
        )}
      </div>

      {/* Main value */}
      <div className="mb-3">
        <p className={`${sizeConfig.valueText} font-bold text-gray-900 dark:text-white`}>
          {value}
        </p>
      </div>

      {/* Trend and context information */}
      {(trend || context) && (
        <div className="space-y-2">
          {/* Trend */}
          {trend && trendConfig && (
            <div className="flex items-center">
              <div className={`flex items-center px-2 py-1 rounded-full ${trendConfig.bgColor}`}>
                <div className={`${trendConfig.color} mr-1`}>
                  {trendConfig.icon}
                </div>
                <span className={`${sizeConfig.trendText} font-medium ${trendConfig.color}`}>
                  {trend.value}
                </span>
              </div>
              {trend.label && (
                <span className={`${sizeConfig.trendText} text-gray-500 dark:text-gray-400 ml-2`}>
                  {trend.label}
                </span>
              )}
            </div>
          )}

          {/* Context */}
          {context && (
            <p className={`${sizeConfig.trendText} text-gray-500 dark:text-gray-400`}>
              {context}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Metric Card Grid Component
 * 
 * Container for displaying multiple metric cards in a responsive grid
 */
interface MetricCardGridProps {
  /** Child metric cards */
  children: React.ReactNode;
  /** Number of columns (responsive) */
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  /** Gap between cards */
  gap?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

export const MetricCardGrid: React.FC<MetricCardGridProps> = ({
  children,
  columns = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 'md',
  className = '',
}) => {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-5',
    lg: 'gap-6'
  };

  const gridCols = `
    grid-cols-${columns.sm || 1}
    ${columns.md ? `sm:grid-cols-${columns.md}` : ''}
    ${columns.lg ? `lg:grid-cols-${columns.lg}` : ''}
    ${columns.xl ? `xl:grid-cols-${columns.xl}` : ''}
  `;

  return (
    <div className={`grid ${gridCols} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
};

export default MetricCard; 