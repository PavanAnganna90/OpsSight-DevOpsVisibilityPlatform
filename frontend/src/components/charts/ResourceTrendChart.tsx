/**
 * Resource Trend Chart Component
 * 
 * Displays line charts for historical resource usage trends including CPU, Memory, 
 * Network I/O with interactive tooltips, time range selection, and real-time updates.
 */

import React, { useState, useMemo, useRef } from 'react';

export interface DataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface TrendSeries {
  id: string;
  name: string;
  data: DataPoint[];
  color: string;
  unit: string;
  strokeWidth?: number;
  showDots?: boolean;
}

export interface ResourceTrendChartProps {
  /** Array of data series to display */
  series: TrendSeries[];
  /** Chart title */
  title: string;
  /** Chart height in pixels */
  height?: number;
  /** Chart width - 'auto' for responsive */
  width?: number | 'auto';
  /** Time range for display */
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d';
  /** Show grid lines */
  showGrid?: boolean;
  /** Enable interactive tooltips */
  interactive?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Real-time update interval */
  updateInterval?: number;
  /** Enable animations */
  animated?: boolean;
  /** Custom styling */
  className?: string;
  /** Callback for data point hover */
  onHover?: (point: DataPoint | null, series: TrendSeries | null) => void;
}

interface TooltipData {
  x: number;
  y: number;
  point: DataPoint;
  series: TrendSeries;
}

/**
 * ResourceTrendChart Component
 * 
 * Interactive line chart for visualizing resource usage trends over time.
 */
export const ResourceTrendChart: React.FC<ResourceTrendChartProps> = ({
  series,
  title,
  height = 300,
  width = 'auto',
  timeRange = '24h',
  showGrid = true,
  interactive = true,
  showLegend = true,
  animated = true,
  className = '',
  onHover
}) => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ seriesId: string; pointIndex: number } | null>(null);
  const chartRef = useRef<SVGSVGElement>(null);

  // Chart dimensions and margins
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  const chartWidth = width === 'auto' ? 600 : width;
  const chartHeight = height;
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  // Calculate data ranges
  const { xDomain, yDomain } = useMemo(() => {
    if (series.length === 0) return { xDomain: [0, 1], yDomain: [0, 100] };

    const allPoints = series.flatMap(s => s.data);
    const timestamps = allPoints.map(p => new Date(p.timestamp).getTime());
    const values = allPoints.map(p => p.value);

    const xMin = Math.min(...timestamps);
    const xMax = Math.max(...timestamps);
    const yMin = Math.max(0, Math.min(...values) - 5);
    const yMax = Math.max(...values) + 5;

    return {
      xDomain: [xMin, xMax],
      yDomain: [yMin, yMax]
    };
  }, [series]);

  // Scale functions
  const xScale = (timestamp: string | number) => {
    const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
    return ((time - xDomain[0]) / (xDomain[1] - xDomain[0])) * innerWidth;
  };

  const yScale = (value: number) => {
    return innerHeight - ((value - yDomain[0]) / (yDomain[1] - yDomain[0])) * innerHeight;
  };

  // Generate path string for line
  const generatePath = (data: DataPoint[]): string => {
    if (data.length === 0) return '';
    
    return data
      .map((point, index) => {
        const x = xScale(point.timestamp);
        const y = yScale(point.value);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  // Generate grid lines
  const generateGridLines = () => {
    const xTicks = 6;
    const yTicks = 5;
    const lines = [];

    // Vertical grid lines
    for (let i = 0; i <= xTicks; i++) {
      const x = (i / xTicks) * innerWidth;
      lines.push(
        <line
          key={`vgrid-${i}`}
          x1={x}
          y1={0}
          x2={x}
          y2={innerHeight}
          stroke="#E5E7EB"
          strokeWidth={1}
          opacity={0.5}
          className="dark:stroke-gray-600"
        />
      );
    }

    // Horizontal grid lines
    for (let i = 0; i <= yTicks; i++) {
      const y = (i / yTicks) * innerHeight;
      lines.push(
        <line
          key={`hgrid-${i}`}
          x1={0}
          y1={y}
          x2={innerWidth}
          y2={y}
          stroke="#E5E7EB"
          strokeWidth={1}
          opacity={0.5}
          className="dark:stroke-gray-600"
        />
      );
    }

    return lines;
  };

  // Generate axis labels
  const generateAxisLabels = () => {
    const xTicks = 6;
    const yTicks = 5;
    const labels = [];

    // X-axis labels (time)
    for (let i = 0; i <= xTicks; i++) {
      const timestamp = xDomain[0] + (i / xTicks) * (xDomain[1] - xDomain[0]);
      const x = (i / xTicks) * innerWidth;
      const date = new Date(timestamp);
      const label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      labels.push(
        <text
          key={`xlabel-${i}`}
          x={x}
          y={innerHeight + 20}
          textAnchor="middle"
          className="text-xs fill-gray-600 dark:fill-gray-400"
        >
          {label}
        </text>
      );
    }

    // Y-axis labels (values)
    for (let i = 0; i <= yTicks; i++) {
      const value = yDomain[0] + (i / yTicks) * (yDomain[1] - yDomain[0]);
      const y = innerHeight - (i / yTicks) * innerHeight;
      
      labels.push(
        <text
          key={`ylabel-${i}`}
          x={-10}
          y={y + 4}
          textAnchor="end"
          className="text-xs fill-gray-600 dark:fill-gray-400"
        >
          {Math.round(value)}
        </text>
      );
    }

    return labels;
  };

  // Handle mouse events
  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive || !chartRef.current) return;

    const rect = chartRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left - margin.left;
    const y = event.clientY - rect.top - margin.top;

    // Find closest data point
    let closestPoint: TooltipData | null = null;
    let minDistance = Infinity;

    series.forEach(serie => {
      serie.data.forEach((point, index) => {
        const pointX = xScale(point.timestamp);
        const pointY = yScale(point.value);
        const distance = Math.sqrt(Math.pow(x - pointX, 2) + Math.pow(y - pointY, 2));

        if (distance < minDistance && distance < 30) { // 30px tolerance
          minDistance = distance;
          closestPoint = {
            x: pointX + margin.left,
            y: pointY + margin.top,
            point,
            series: serie
          };
          setHoveredPoint({ seriesId: serie.id, pointIndex: index });
        }
      });
    });

    setTooltip(closestPoint);
    if (closestPoint) {
      onHover?.((closestPoint as TooltipData).point, (closestPoint as TooltipData).series);
    } else {
      onHover?.(null, null);
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
    setHoveredPoint(null);
    onHover?.(null, null);
  };

  // Format time range for display
  const formatTimeRange = (range: string): string => {
    const formats = {
      '1h': 'Last Hour',
      '6h': 'Last 6 Hours',
      '24h': 'Last 24 Hours',
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days'
    };
    return formats[range as keyof typeof formats] || 'Custom Range';
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatTimeRange(timeRange)}
          </p>
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="flex items-center space-x-4">
            {series.map(serie => (
              <div key={serie.id} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: serie.color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {serie.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="relative">
        <svg
          ref={chartRef}
          width={chartWidth}
          height={chartHeight}
          className="overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Grid */}
            {showGrid && generateGridLines()}

            {/* Axis Labels */}
            {generateAxisLabels()}

            {/* Data Lines */}
            {series.map(serie => (
              <g key={serie.id}>
                {/* Line Path */}
                <path
                  d={generatePath(serie.data)}
                  fill="none"
                  stroke={serie.color}
                  strokeWidth={serie.strokeWidth || 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={animated ? 'transition-all duration-300' : ''}
                  style={{
                    filter: `drop-shadow(0 1px 3px ${serie.color}40)`
                  }}
                />

                {/* Data Points */}
                {(serie.showDots || hoveredPoint?.seriesId === serie.id) && 
                  serie.data.map((point, index) => (
                    <circle
                      key={`${serie.id}-point-${index}`}
                      cx={xScale(point.timestamp)}
                      cy={yScale(point.value)}
                      r={hoveredPoint?.seriesId === serie.id && hoveredPoint?.pointIndex === index ? 6 : 3}
                      fill={serie.color}
                      stroke="white"
                      strokeWidth={2}
                      className={`${animated ? 'transition-all duration-200' : ''} ${
                        hoveredPoint?.seriesId === serie.id && hoveredPoint?.pointIndex === index 
                          ? 'opacity-100' : 'opacity-70'
                      }`}
                    />
                  ))
                }
              </g>
            ))}

            {/* Axis Lines */}
            <line
              x1={0}
              y1={innerHeight}
              x2={innerWidth}
              y2={innerHeight}
              stroke="#374151"
              strokeWidth={1}
              className="dark:stroke-gray-500"
            />
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={innerHeight}
              stroke="#374151"
              strokeWidth={1}
              className="dark:stroke-gray-500"
            />
          </g>
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-10 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-3 py-2 rounded-lg shadow-lg text-sm"
            style={{
              left: tooltip.x,
              top: tooltip.y - 50,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="font-medium">{tooltip.series.name}</div>
            <div>
              {Math.round(tooltip.point.value * 100) / 100}{tooltip.series.unit}
            </div>
            <div className="text-xs opacity-75">
              {new Date(tooltip.point.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* No Data State */}
      {series.length === 0 || series.every(s => s.data.length === 0) ? (
        <div className="text-center py-8">
          <div className="text-gray-400 dark:text-gray-600">
            <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Data Available
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No metrics data available for the selected time range.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ResourceTrendChart; 