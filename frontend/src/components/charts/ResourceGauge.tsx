/**
 * Resource Usage Gauge Component
 * 
 * Displays circular progress indicators for resource metrics like CPU, Memory, and Storage
 * with animated progress, threshold markers, and real-time updates.
 */

import React, { useEffect, useState, useMemo } from 'react';

export interface ResourceGaugeProps {
  /** Current usage value (0-100) */
  value: number;
  /** Maximum value for the gauge (default: 100) */
  max?: number;
  /** Resource label */
  label: string;
  /** Resource unit (%, GB, etc.) */
  unit?: string;
  /** Size of the gauge */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Show threshold markers */
  showThresholds?: boolean;
  /** Custom threshold values */
  thresholds?: {
    warning: number;
    critical: number;
  };
  /** Enable animations */
  animated?: boolean;
  /** Show value text in center */
  showValue?: boolean;
  /** Additional styling */
  className?: string;
  /** Callback when value changes */
  onValueChange?: (value: number) => void;
}

interface GaugeSize {
  radius: number;
  strokeWidth: number;
  fontSize: string;
  labelSize: string;
  width: number;
  height: number;
}

/**
 * ResourceGauge Component
 * 
 * Circular progress indicator for visualizing resource usage with thresholds and animations.
 */
export const ResourceGauge: React.FC<ResourceGaugeProps> = ({
  value,
  max = 100,
  label,
  unit = '%',
  size = 'md',
  showThresholds = true,
  thresholds = { warning: 70, critical: 85 },
  animated = true,
  showValue = true,
  className = '',
  onValueChange
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Size configurations
  const sizeConfig: Record<string, GaugeSize> = {
    sm: {
      radius: 30,
      strokeWidth: 4,
      fontSize: 'text-sm',
      labelSize: 'text-xs',
      width: 80,
      height: 80
    },
    md: {
      radius: 40,
      strokeWidth: 6,
      fontSize: 'text-lg',
      labelSize: 'text-sm',
      width: 100,
      height: 100
    },
    lg: {
      radius: 50,
      strokeWidth: 8,
      fontSize: 'text-xl',
      labelSize: 'text-base',
      width: 120,
      height: 120
    },
    xl: {
      radius: 60,
      strokeWidth: 10,
      fontSize: 'text-2xl',
      labelSize: 'text-lg',
      width: 140,
      height: 140
    }
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const normalizedValue = Math.min(Math.max(value, 0), max);
  const percentage = (normalizedValue / max) * 100;

  // Animate value changes
  useEffect(() => {
    if (!animated) {
      setAnimatedValue(percentage);
      return;
    }

    setIsAnimating(true);
    const startValue = animatedValue;
    const difference = percentage - startValue;
    const duration = 1000; // 1 second animation
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (difference * easeProgress);
      
      setAnimatedValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        onValueChange?.(normalizedValue);
      }
    };

    requestAnimationFrame(animate);
  }, [percentage, animated, onValueChange, normalizedValue]);

  // Calculate stroke dash offset for progress
  const progressOffset = circumference - (animatedValue / 100) * circumference;

  // Determine color based on value and thresholds
  const getColor = useMemo(() => {
    const val = animatedValue;
    if (val >= thresholds.critical) {
      return {
        stroke: '#EF4444', // red-500
        fill: '#FEE2E2', // red-100
        text: '#DC2626' // red-600
      };
    } else if (val >= thresholds.warning) {
      return {
        stroke: '#F59E0B', // yellow-500
        fill: '#FEF3C7', // yellow-100
        text: '#D97706' // yellow-600
      };
    } else {
      return {
        stroke: '#10B981', // green-500
        fill: '#D1FAE5', // green-100
        text: '#059669' // green-600
      };
    }
  }, [animatedValue, thresholds]);

  // Calculate threshold marker positions
  const getThresholdPosition = (threshold: number) => {
    const angle = (threshold / max) * 2 * Math.PI - Math.PI / 2;
    const innerRadius = config.radius - config.strokeWidth / 2;
    const outerRadius = config.radius + config.strokeWidth / 2;
    
    return {
      x1: config.width / 2 + Math.cos(angle) * innerRadius,
      y1: config.height / 2 + Math.sin(angle) * innerRadius,
      x2: config.width / 2 + Math.cos(angle) * outerRadius,
      y2: config.height / 2 + Math.sin(angle) * outerRadius
    };
  };

  const warningMarker = getThresholdPosition(thresholds.warning);
  const criticalMarker = getThresholdPosition(thresholds.critical);

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      {/* SVG Gauge */}
      <div className="relative">
        <svg 
          width={config.width} 
          height={config.height} 
          className="transform -rotate-90"
        >
          {/* Background Circle */}
          <circle
            cx={config.width / 2}
            cy={config.height / 2}
            r={config.radius}
            stroke="#E5E7EB" // gray-200
            strokeWidth={config.strokeWidth}
            fill="none"
            className="dark:stroke-gray-700"
          />
          
          {/* Threshold Markers */}
          {showThresholds && (
            <g>
              {/* Warning Threshold */}
              <line
                x1={warningMarker.x1}
                y1={warningMarker.y1}
                x2={warningMarker.x2}
                y2={warningMarker.y2}
                stroke="#F59E0B"
                strokeWidth={2}
                opacity={0.7}
              />
              
              {/* Critical Threshold */}
              <line
                x1={criticalMarker.x1}
                y1={criticalMarker.y1}
                x2={criticalMarker.x2}
                y2={criticalMarker.y2}
                stroke="#EF4444"
                strokeWidth={2}
                opacity={0.7}
              />
            </g>
          )}
          
          {/* Progress Circle */}
          <circle
            cx={config.width / 2}
            cy={config.height / 2}
            r={config.radius}
            stroke={getColor.stroke}
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            className={`transition-all duration-300 ${isAnimating ? 'ease-out' : ''}`}
            style={{
              filter: `drop-shadow(0 0 6px ${getColor.stroke}40)`
            }}
          />
          
          {/* Glow Effect */}
          <circle
            cx={config.width / 2}
            cy={config.height / 2}
            r={config.radius - config.strokeWidth / 2}
            fill={getColor.fill}
            opacity={0.1}
          />
        </svg>
        
        {/* Center Value Display */}
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`font-bold ${config.fontSize}`} style={{ color: getColor.text }}>
              {Math.round(animatedValue)}
            </div>
            <div className={`text-gray-500 dark:text-gray-400 ${config.labelSize}`}>
              {unit}
            </div>
          </div>
        )}
        
        {/* Animation Pulse Effect */}
        {isAnimating && (
          <div 
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              backgroundColor: `${getColor.stroke}20`,
              animation: 'pulse 1s ease-in-out'
            }}
          />
        )}
      </div>
      
      {/* Label */}
      <div className={`text-center ${config.labelSize} font-medium text-gray-700 dark:text-gray-300`}>
        {label}
      </div>
      
      {/* Status Indicator */}
      <div className="flex items-center space-x-1">
        <div 
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: getColor.stroke }}
        />
        <span className={`text-xs text-gray-500 dark:text-gray-400`}>
          {animatedValue >= thresholds.critical ? 'Critical' :
           animatedValue >= thresholds.warning ? 'Warning' : 'Normal'}
        </span>
      </div>
    </div>
  );
};

/**
 * ResourceGaugeGrid Component
 * 
 * Grid layout for multiple resource gauges with responsive design.
 */
export interface ResourceGaugeGridProps {
  gauges: Array<Omit<ResourceGaugeProps, 'size'> & { id: string }>;
  size?: ResourceGaugeProps['size'];
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ResourceGaugeGrid: React.FC<ResourceGaugeGridProps> = ({
  gauges,
  size = 'md',
  columns = { sm: 1, md: 2, lg: 3 },
  gap = 'md',
  className = ''
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };

  const gridClasses = `
    grid 
    grid-cols-${columns.sm || 1} 
    md:grid-cols-${columns.md || 2} 
    lg:grid-cols-${columns.lg || 3} 
    ${gapClasses[gap]}
  `.trim();

  return (
    <div className={`${gridClasses} ${className}`}>
      {gauges.map((gauge) => (
        <ResourceGauge
          key={gauge.id}
          {...gauge}
          size={size}
        />
      ))}
    </div>
  );
};

export default ResourceGauge; 