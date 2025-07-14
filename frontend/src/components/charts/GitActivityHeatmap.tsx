/**
 * Git Activity Heatmap Component
 * 
 * Calendar-style heatmap visualization showing Git activity data including commits,
 * pull requests, and contributor activity over time.
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfYear, endOfYear, getDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  GitActivityHeatmapProps,
  ActivityHeatmapData,
  HeatmapCellData,
  HeatmapTooltipData
} from '../../types/git-activity';
import { calculateActivityLevel, fillMissingDates } from '../../services/gitActivityService';

/**
 * Tooltip component for heatmap cells
 */
const HeatmapTooltip: React.FC<{
  data: HeatmapTooltipData | null;
  visible: boolean;
}> = ({ data, visible }) => {
  if (!data || !visible) return null;

  const { date, dayOfWeek, activityData, position } = data;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
        className="absolute z-50 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-3 pointer-events-none max-w-xs"
        style={{
          left: position.x,
          top: position.y - 10,
          transform: 'translateX(-50%) translateY(-100%)'
        }}
      >
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {format(new Date(date), 'MMM d, yyyy')}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
          {dayOfWeek}
        </div>
        
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Total Activity:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {activityData.activity_count}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Commits:</span>
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {activityData.commit_count}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Pull Requests:</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              {activityData.pr_count}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Contributors:</span>
            <span className="font-medium text-purple-600 dark:text-purple-400">
              {activityData.contributor_count}
            </span>
          </div>
          
          {activityData.lines_added > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Lines Added:</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                +{activityData.lines_added.toLocaleString()}
              </span>
            </div>
          )}
          
          {activityData.lines_deleted > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Lines Deleted:</span>
              <span className="font-medium text-red-600 dark:text-red-400">
                -{activityData.lines_deleted.toLocaleString()}
              </span>
            </div>
          )}
        </div>
        
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2">
          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-200 dark:border-t-gray-700"></div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Individual heatmap cell component
 */
const HeatmapCell: React.FC<{
  data: HeatmapCellData;
  size: number;
  gap: number;
  colorScheme: string;
  onClick: (date: string, data: ActivityHeatmapData) => void;
  onHover: (date: string, data: ActivityHeatmapData, position: { x: number; y: number }) => void;
  onLeave: () => void;
}> = ({ data, size, gap, colorScheme, onClick, onHover, onLeave }) => {
  const cellRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback((event: React.MouseEvent) => {
    if (cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      const position = {
        x: rect.left + rect.width / 2,
        y: rect.top
      };
      onHover(data.date, data.activityData, position);
    }
  }, [data, onHover]);

  const handleClick = useCallback(() => {
    onClick(data.date, data.activityData);
  }, [data, onClick]);

  const getColorClass = (level: number, scheme: string): string => {
    const schemes = {
      green: [
        'bg-gray-100 dark:bg-gray-800',
        'bg-green-200 dark:bg-green-900',
        'bg-green-300 dark:bg-green-700',
        'bg-green-400 dark:bg-green-600',
        'bg-green-500 dark:bg-green-500'
      ],
      blue: [
        'bg-gray-100 dark:bg-gray-800',
        'bg-blue-200 dark:bg-blue-900',
        'bg-blue-300 dark:bg-blue-700',
        'bg-blue-400 dark:bg-blue-600',
        'bg-blue-500 dark:bg-blue-500'
      ],
      purple: [
        'bg-gray-100 dark:bg-gray-800',
        'bg-purple-200 dark:bg-purple-900',
        'bg-purple-300 dark:bg-purple-700',
        'bg-purple-400 dark:bg-purple-600',
        'bg-purple-500 dark:bg-purple-500'
      ],
      red: [
        'bg-gray-100 dark:bg-gray-800',
        'bg-red-200 dark:bg-red-900',
        'bg-red-300 dark:bg-red-700',
        'bg-red-400 dark:bg-red-600',
        'bg-red-500 dark:bg-red-500'
      ]
    };

    return schemes[scheme as keyof typeof schemes]?.[level] || schemes.green[level];
  };

  return (
    <motion.div
      ref={cellRef}
      className={clsx(
        'rounded-sm cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-blue-400 hover:scale-110',
        getColorClass(data.level, colorScheme)
      )}
      style={{
        width: size,
        height: size,
        marginRight: gap,
        marginBottom: gap
      }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onLeave}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      title={data.tooltip}
    />
  );
};

/**
 * Main Git Activity Heatmap Component
 */
export const GitActivityHeatmap: React.FC<GitActivityHeatmapProps> = ({
  data,
  repository,
  dateRange,
  colorScheme = 'green',
  showWeekdays = true,
  showMonthLabels = true,
  cellSize = 12,
  cellGap = 2,
  loading = false,
  error = null,
  onCellClick,
  onCellHover,
  className = ''
}) => {
  const [tooltip, setTooltip] = useState<HeatmapTooltipData | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine date range
  const { startDate, endDate } = useMemo(() => {
    if (dateRange) {
      return dateRange;
    }
    
    // Default to current year if no data or date range provided
    if (data.length === 0) {
      const now = new Date();
      return {
        startDate: startOfYear(now),
        endDate: endOfYear(now)
      };
    }
    
    // Use data range
    const dates = data.map(d => new Date(d.date));
    return {
      startDate: new Date(Math.min(...dates.map(d => d.getTime()))),
      endDate: new Date(Math.max(...dates.map(d => d.getTime())))
    };
  }, [data, dateRange]);

  // Process heatmap data
  const processedData = useMemo(() => {
    if (loading || data.length === 0) return [];

    // Fill missing dates and convert to heatmap cells
    const filledData = fillMissingDates(data, startDate, endDate);
    const maxActivity = Math.max(...filledData.map(d => d.activity_count));

    return filledData.map(item => {
      const date = new Date(item.date);
      const level = calculateActivityLevel(item.activity_count, maxActivity);
      
      return {
        date: item.date,
        value: item.activity_count,
        level,
        tooltip: `${item.activity_count} activities on ${format(date, 'MMM d, yyyy')}`,
        activityData: item
      } as HeatmapCellData;
    });
  }, [data, startDate, endDate, loading]);

  // Organize data by weeks
  const weekData = useMemo(() => {
    if (processedData.length === 0) return [];

    const weeks: HeatmapCellData[][] = [];
    const dataMap = new Map(processedData.map(d => [d.date, d]));
    
    // Start from the beginning of the week containing startDate
    let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 0 }); // Sunday
    
    while (currentWeekStart <= endDate) {
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });
      const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
      
      const week = weekDays.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return dataMap.get(dateStr) || {
          date: dateStr,
          value: 0,
          level: 0 as const,
          tooltip: 'No activity',
          activityData: {
            date: dateStr,
            activity_count: 0,
            commit_count: 0,
            pr_count: 0,
            contributor_count: 0,
            lines_added: 0,
            lines_deleted: 0,
            files_changed: 0,
            activity_types: []
          }
        };
      });
      
      weeks.push(week);
      currentWeekStart = new Date(currentWeekStart);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    return weeks;
  }, [processedData, startDate, endDate]);

  // Handle cell interactions
  const handleCellClick = useCallback((date: string, activityData: ActivityHeatmapData) => {
    onCellClick?.(date, activityData);
  }, [onCellClick]);

  const handleCellHover = useCallback((
    date: string, 
    activityData: ActivityHeatmapData, 
    position: { x: number; y: number }
  ) => {
    const dayOfWeek = format(new Date(date), 'EEEE');
    
    setTooltip({
      date,
      dayOfWeek,
      activityData,
      position
    });
    setShowTooltip(true);
    onCellHover?.(date, activityData);
  }, [onCellHover]);

  const handleCellLeave = useCallback(() => {
    setShowTooltip(false);
    onCellHover?.(tooltip?.date || '', null);
  }, [tooltip, onCellHover]);

  // Month labels
  const monthLabels = useMemo(() => {
    if (!showMonthLabels || weekData.length === 0) return [];
    
    const labels: Array<{ month: string; x: number }> = [];
    let currentMonth = '';
    
    weekData.forEach((week, weekIndex) => {
      const firstDay = week[0];
      if (firstDay) {
        const month = format(new Date(firstDay.date), 'MMM');
        if (month !== currentMonth) {
          currentMonth = month;
          labels.push({
            month,
            x: weekIndex * (cellSize + cellGap)
          });
        }
      }
    });
    
    return labels;
  }, [weekData, showMonthLabels, cellSize, cellGap]);

  // Weekday labels
  const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  if (loading) {
    return (
      <div className={clsx('flex items-center justify-center p-8', className)}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading activity data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={clsx('flex items-center justify-center p-8 text-red-600 dark:text-red-400', className)}>
        <span>Error loading activity data: {error}</span>
      </div>
    );
  }

  if (processedData.length === 0) {
    return (
      <div className={clsx('flex items-center justify-center p-8 text-gray-600 dark:text-gray-400', className)}>
        <span>No activity data available for {repository}</span>
      </div>
    );
  }

  return (
    <div className={clsx('relative', className)} ref={containerRef}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Git Activity for {repository}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
        </p>
      </div>

      {/* Heatmap Container */}
      <div className="flex">
        {/* Weekday Labels */}
        {showWeekdays && (
          <div className="flex flex-col mr-3">
            <div style={{ height: showMonthLabels ? 20 : 0 }} />
            {weekdayLabels.map((day, index) => (
              <div
                key={day}
                className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-center"
                style={{ 
                  height: cellSize + cellGap,
                  lineHeight: `${cellSize}px`
                }}
              >
                {index % 2 === 1 ? day : ''} {/* Show only alternate labels for compactness */}
              </div>
            ))}
          </div>
        )}

        {/* Main Heatmap */}
        <div>
          {/* Month Labels */}
          {showMonthLabels && (
            <div 
              className="flex relative mb-2"
              style={{ height: 20 }}
            >
              {monthLabels.map(({ month, x }) => (
                <div
                  key={`${month}-${x}`}
                  className="absolute text-xs text-gray-600 dark:text-gray-400"
                  style={{ left: x }}
                >
                  {month}
                </div>
              ))}
            </div>
          )}

          {/* Heatmap Grid */}
          <div className="flex">
            {weekData.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col">
                {week.map((day, dayIndex) => (
                  <HeatmapCell
                    key={`${weekIndex}-${dayIndex}`}
                    data={day}
                    size={cellSize}
                    gap={cellGap}
                    colorScheme={colorScheme}
                    onClick={handleCellClick}
                    onHover={handleCellHover}
                    onLeave={handleCellLeave}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map(level => (
          <div
            key={level}
            className={clsx(
              'rounded-sm',
              level === 0 && 'bg-gray-100 dark:bg-gray-800',
              level === 1 && colorScheme === 'green' && 'bg-green-200 dark:bg-green-900',
              level === 2 && colorScheme === 'green' && 'bg-green-300 dark:bg-green-700',
              level === 3 && colorScheme === 'green' && 'bg-green-400 dark:bg-green-600',
              level === 4 && colorScheme === 'green' && 'bg-green-500 dark:bg-green-500',
              level === 1 && colorScheme === 'blue' && 'bg-blue-200 dark:bg-blue-900',
              level === 2 && colorScheme === 'blue' && 'bg-blue-300 dark:bg-blue-700',
              level === 3 && colorScheme === 'blue' && 'bg-blue-400 dark:bg-blue-600',
              level === 4 && colorScheme === 'blue' && 'bg-blue-500 dark:bg-blue-500'
            )}
            style={{ width: cellSize, height: cellSize }}
          />
        ))}
        <span>More</span>
      </div>

      {/* Tooltip */}
      <HeatmapTooltip data={tooltip} visible={showTooltip} />
    </div>
  );
};

export default GitActivityHeatmap; 