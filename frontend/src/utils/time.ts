/**
 * Time utility functions for formatting durations and timestamps
 */

/**
 * Format duration in seconds to human-readable string
 * @param seconds Duration in seconds
 * @returns Formatted duration string (e.g., "2m 30s", "1h 15m", "45s")
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 0 || !Number.isFinite(seconds)) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const parts: string[] = [];
  
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(`${remainingSeconds}s`);
  }

  return parts.join(' ');
};

/**
 * Format duration with more precision for shorter durations
 * @param seconds Duration in seconds (can include milliseconds as decimal)
 * @returns Formatted duration string with appropriate precision
 */
export const formatPreciseDuration = (seconds: number): string => {
  if (seconds < 0 || !Number.isFinite(seconds)) return '0s';
  
  if (seconds < 1) {
    return `${Math.round(seconds * 1000)}ms`;
  }
  
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  
  return formatDuration(seconds);
};

/**
 * Format timestamp to relative time (e.g., "2 minutes ago", "in 1 hour")
 * @param timestamp Date or timestamp to format
 * @returns Relative time string
 */
export const formatRelativeTime = (timestamp: Date | string | number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (Math.abs(diffSeconds) < 60) {
    return diffSeconds > 0 ? 'just now' : 'in a moment';
  }
  
  if (Math.abs(diffMinutes) < 60) {
    const minutes = Math.abs(diffMinutes);
    return diffMinutes > 0 
      ? `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
      : `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  if (Math.abs(diffHours) < 24) {
    const hours = Math.abs(diffHours);
    return diffHours > 0 
      ? `${hours} hour${hours !== 1 ? 's' : ''} ago`
      : `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  const days = Math.abs(diffDays);
  return diffDays > 0 
    ? `${days} day${days !== 1 ? 's' : ''} ago`
    : `in ${days} day${days !== 1 ? 's' : ''}`;
};

/**
 * Parse duration string to seconds
 * @param duration Duration string (e.g., "2m 30s", "1h 15m", "45s")
 * @returns Duration in seconds
 */
export const parseDurationToSeconds = (duration: string): number => {
  // Process patterns in order of specificity to avoid conflicts
  // ms must come before s to avoid partial matches
  const patterns = [
    { pattern: /(\d+)h/g, multiplier: 3600 },
    { pattern: /(\d+)ms/g, multiplier: 0.001 },
    { pattern: /(\d+)m(?!s)/g, multiplier: 60 }, // negative lookahead to exclude 'ms'
    { pattern: /(\d+)s(?![\w])/g, multiplier: 1 } // negative lookahead to exclude 'ms'
  ];

  let totalSeconds = 0;

  patterns.forEach(({ pattern, multiplier }) => {
    // Create new regex instance to avoid global state issues
    const regex = new RegExp(pattern.source, 'g');
    let match;
    while ((match = regex.exec(duration)) !== null) {
      totalSeconds += parseInt(match[1], 10) * multiplier;
    }
  });

  return totalSeconds;
}; 