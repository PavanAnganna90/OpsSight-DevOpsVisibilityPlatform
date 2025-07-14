'use client';

import React, { useState, useRef, useEffect } from 'react';

interface DateRange {
  start: Date;
  end: Date;
}

interface DateRangeFilterProps {
  onDateRangeChange: (range: DateRange) => void;
  onTimezoneChange: (timezone: string) => void;
  initialRange?: DateRange;
  className?: string;
}

const PRESET_RANGES = [
  { label: 'Last 1 hour', value: { hours: 1 } },
  { label: 'Last 6 hours', value: { hours: 6 } },
  { label: 'Last 24 hours', value: { hours: 24 } },
  { label: 'Last 7 days', value: { days: 7 } },
  { label: 'Last 30 days', value: { days: 30 } },
  { label: 'Last 90 days', value: { days: 90 } },
];

const COMMON_TIMEZONES = [
  { label: 'Local Time', value: Intl.DateTimeFormat().resolvedOptions().timeZone },
  { label: 'UTC', value: 'UTC' },
  { label: 'Eastern (ET)', value: 'America/New_York' },
  { label: 'Central (CT)', value: 'America/Chicago' },
  { label: 'Mountain (MT)', value: 'America/Denver' },
  { label: 'Pacific (PT)', value: 'America/Los_Angeles' },
  { label: 'London', value: 'Europe/London' },
  { label: 'Tokyo', value: 'Asia/Tokyo' },
];

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  onDateRangeChange,
  onTimezoneChange,
  initialRange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(
    initialRange || {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      end: new Date()
    }
  );
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Update custom date inputs when dateRange changes
    const formatDateTimeLocal = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setCustomStart(formatDateTimeLocal(dateRange.start));
    setCustomEnd(formatDateTimeLocal(dateRange.end));
  }, [dateRange]);

  const handlePresetClick = (preset: any) => {
    const now = new Date();
    let start: Date;

    if (preset.value.hours) {
      start = new Date(now.getTime() - preset.value.hours * 60 * 60 * 1000);
    } else if (preset.value.days) {
      start = new Date(now.getTime() - preset.value.days * 24 * 60 * 60 * 1000);
    } else {
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const newRange = { start, end: now };
    setDateRange(newRange);
    onDateRangeChange(newRange);
    setIsOpen(false);
  };

  const handleCustomDateChange = () => {
    if (customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      
      if (start <= end) {
        const newRange = { start, end };
        setDateRange(newRange);
        onDateRangeChange(newRange);
      }
    }
  };

  const handleTimezoneChange = (newTimezone: string) => {
    setTimezone(newTimezone);
    onTimezoneChange(newTimezone);
  };

  const formatDateDisplay = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const getRelativeTimeLabel = () => {
    const diffMs = dateRange.end.getTime() - dateRange.start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 24) {
      return `Last ${Math.round(diffHours)} hour${Math.round(diffHours) !== 1 ? 's' : ''}`;
    } else {
      return `Last ${Math.round(diffDays)} day${Math.round(diffDays) !== 1 ? 's' : ''}`;
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-slate-800/60 border border-slate-600 rounded-lg text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Select date range and timezone"
      >
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-medium">{getRelativeTimeLabel()}</span>
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-slate-800/95 backdrop-blur-lg border border-slate-700 rounded-lg shadow-xl z-50">
          <div className="p-4">
            {/* Quick Presets */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Quick Select</h4>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_RANGES.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    className="px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-colors text-left focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Custom Range</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    value={customStart}
                    onChange={(e) => {
                      setCustomStart(e.target.value);
                      if (e.target.value && customEnd) {
                        handleCustomDateChange();
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={customEnd}
                    onChange={(e) => {
                      setCustomEnd(e.target.value);
                      if (customStart && e.target.value) {
                        handleCustomDateChange();
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Timezone Selection */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Timezone</h4>
              <select
                value={timezone}
                onChange={(e) => handleTimezoneChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Current Selection Display */}
            <div className="pt-4 border-t border-slate-700">
              <div className="text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>From:</span>
                  <span className="text-slate-300">{formatDateDisplay(dateRange.start)}</span>
                </div>
                <div className="flex justify-between">
                  <span>To:</span>
                  <span className="text-slate-300">{formatDateDisplay(dateRange.end)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Timezone:</span>
                  <span className="text-slate-300">{timezone}</span>
                </div>
              </div>
            </div>

            {/* Apply Button */}
            <div className="mt-4">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800"
              >
                Apply Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 