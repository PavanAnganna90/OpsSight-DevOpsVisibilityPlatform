'use client';

import React from 'react';

type MetricStatus = 'success' | 'warning' | 'error' | 'info';
type MetricVariant = 'default' | 'compact';

interface MetricCardProps {
  title: string;
  value: string;
  trend?: string;
  status?: MetricStatus;
  description?: string;
  variant?: MetricVariant;
  className?: string;
  onClick?: () => void;
}

/**
 * Metric card component for displaying system metrics with status indicators.
 * Supports different variants and status colors.
 */
export function MetricCard({
  title,
  value,
  trend,
  status = 'info',
  description,
  variant = 'default',
  className = '',
  onClick,
}: MetricCardProps) {
  const getStatusColor = (status: MetricStatus) => {
    switch (status) {
      case 'success':
        return 'border-l-green-500 text-green-600';
      case 'warning':
        return 'border-l-yellow-500 text-yellow-600';
      case 'error':
        return 'border-l-red-500 text-red-600';
      case 'info':
      default:
        return 'border-l-blue-500 text-blue-600';
    }
  };

  const getTrendColor = (trend?: string) => {
    if (!trend) return 'text-muted-foreground';
    
    if (trend.startsWith('+')) {
      return 'text-red-500'; // Increases might be bad (costs, errors)
    } else if (trend.startsWith('-')) {
      return 'text-green-500'; // Decreases might be good (errors, latency)
    }
    return 'text-muted-foreground';
  };

  const cardClasses = `
    bg-card border border-border rounded-lg p-4 
    border-l-4 ${getStatusColor(status)}
    transition-all duration-200 ease-in-out
    ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''}
    ${variant === 'compact' ? 'p-3' : 'p-4'}
    ${className}
  `;

  return (
    <div className={cardClasses} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className={`font-medium text-foreground ${
            variant === 'compact' ? 'text-sm' : 'text-base'
          }`}>
            {title}
          </h3>
          
          <div className="mt-1">
            <span className={`font-semibold ${
              variant === 'compact' ? 'text-lg' : 'text-2xl'
            } text-foreground`}>
              {value}
            </span>
            
            {trend && (
              <span className={`ml-2 text-xs font-medium ${getTrendColor(trend)}`}>
                {trend}
              </span>
            )}
          </div>
          
          {description && (
            <p className={`text-muted-foreground ${
              variant === 'compact' ? 'text-xs' : 'text-sm'
            } mt-1`}>
              {description}
            </p>
          )}
        </div>

        {/* Status indicator */}
        <div className="ml-2">
          <div className={`w-2 h-2 rounded-full ${
            status === 'success' ? 'bg-green-500' :
            status === 'warning' ? 'bg-yellow-500' :
            status === 'error' ? 'bg-red-500' :
            'bg-blue-500'
          }`} />
        </div>
      </div>

      {/* Sparkline placeholder for future implementation */}
      {variant === 'default' && (
        <div className="mt-3 h-8 bg-muted/50 rounded flex items-center justify-center">
          <span className="text-xs text-muted-foreground">
            Sparkline chart
          </span>
        </div>
      )}
    </div>
  );
} 