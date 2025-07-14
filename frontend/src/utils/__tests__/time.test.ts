/**
 * Time Utility Tests
 * 
 * Comprehensive test suite for time utility functions including
 * duration formatting, relative time formatting, and duration parsing.
 */

import {
  formatDuration,
  formatPreciseDuration,
  formatRelativeTime,
  parseDurationToSeconds,
} from '../time';

describe('Time Utilities', () => {
  describe('formatDuration', () => {
    it('should format seconds only', () => {
      expect(formatDuration(0)).toBe('0s');
      expect(formatDuration(30)).toBe('30s');
      expect(formatDuration(59)).toBe('59s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(60)).toBe('1m');
      expect(formatDuration(90)).toBe('1m 30s');
      expect(formatDuration(150)).toBe('2m 30s');
      expect(formatDuration(3599)).toBe('59m 59s');
    });

    it('should format hours, minutes, and seconds', () => {
      expect(formatDuration(3600)).toBe('1h');
      expect(formatDuration(3660)).toBe('1h 1m');
      expect(formatDuration(3690)).toBe('1h 1m 30s');
      expect(formatDuration(7200)).toBe('2h');
      expect(formatDuration(7290)).toBe('2h 1m 30s');
    });

    it('should handle large durations', () => {
      expect(formatDuration(86400)).toBe('24h'); // 1 day
      expect(formatDuration(90061)).toBe('25h 1m 1s'); // 25 hours, 1 minute, 1 second
    });

    it('should handle negative durations', () => {
      expect(formatDuration(-1)).toBe('0s');
      expect(formatDuration(-100)).toBe('0s');
    });

    it('should handle decimal seconds by flooring', () => {
      expect(formatDuration(30.9)).toBe('30s');
      expect(formatDuration(90.7)).toBe('1m 30s');
    });

    it('should omit zero components', () => {
      expect(formatDuration(3600)).toBe('1h'); // No minutes or seconds
      expect(formatDuration(3601)).toBe('1h 1s'); // No minutes
      expect(formatDuration(61)).toBe('1m 1s'); // No hours
    });
  });

  describe('formatPreciseDuration', () => {
    it('should format milliseconds for sub-second durations', () => {
      expect(formatPreciseDuration(0)).toBe('0ms');
      expect(formatPreciseDuration(0.1)).toBe('100ms');
      expect(formatPreciseDuration(0.5)).toBe('500ms');
      expect(formatPreciseDuration(0.999)).toBe('999ms');
    });

    it('should format seconds with decimal precision for short durations', () => {
      expect(formatPreciseDuration(1)).toBe('1.0s');
      expect(formatPreciseDuration(1.5)).toBe('1.5s');
      expect(formatPreciseDuration(30.7)).toBe('30.7s');
      expect(formatPreciseDuration(59.9)).toBe('59.9s');
    });

    it('should fall back to regular formatting for longer durations', () => {
      expect(formatPreciseDuration(60)).toBe('1m');
      expect(formatPreciseDuration(90)).toBe('1m 30s');
      expect(formatPreciseDuration(3600)).toBe('1h');
    });

    it('should handle negative durations', () => {
      expect(formatPreciseDuration(-0.5)).toBe('0s');
      expect(formatPreciseDuration(-1)).toBe('0s');
    });

    it('should round milliseconds appropriately', () => {
      expect(formatPreciseDuration(0.0001)).toBe('0ms');
      expect(formatPreciseDuration(0.0005)).toBe('1ms');
      expect(formatPreciseDuration(0.0009)).toBe('1ms');
    });
  });

  describe('formatRelativeTime', () => {
    let mockDate: Date;

    beforeEach(() => {
      // Mock current time to January 1, 2023, 12:00:00 UTC
      mockDate = new Date('2023-01-01T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(mockDate);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle recent times (under 1 minute)', () => {
      const now = new Date('2023-01-01T12:00:00Z');
      const thirtySecondsAgo = new Date('2023-01-01T11:59:30Z');
      const thirtySecondsFromNow = new Date('2023-01-01T12:00:30Z');

      expect(formatRelativeTime(now)).toBe('in a moment');
      expect(formatRelativeTime(thirtySecondsAgo)).toBe('just now');
      expect(formatRelativeTime(thirtySecondsFromNow)).toBe('in a moment');
    });

    it('should handle minutes', () => {
      const oneMinuteAgo = new Date('2023-01-01T11:59:00Z');
      const fiveMinutesAgo = new Date('2023-01-01T11:55:00Z');
      const oneMinuteFromNow = new Date('2023-01-01T12:01:00Z');
      const fiveMinutesFromNow = new Date('2023-01-01T12:05:00Z');

      expect(formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
      expect(formatRelativeTime(oneMinuteFromNow)).toBe('in 1 minute');
      expect(formatRelativeTime(fiveMinutesFromNow)).toBe('in 5 minutes');
    });

    it('should handle hours', () => {
      const oneHourAgo = new Date('2023-01-01T11:00:00Z');
      const threeHoursAgo = new Date('2023-01-01T09:00:00Z');
      const oneHourFromNow = new Date('2023-01-01T13:00:00Z');
      const threeHoursFromNow = new Date('2023-01-01T15:00:00Z');

      expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');
      expect(formatRelativeTime(threeHoursAgo)).toBe('3 hours ago');
      expect(formatRelativeTime(oneHourFromNow)).toBe('in 1 hour');
      expect(formatRelativeTime(threeHoursFromNow)).toBe('in 3 hours');
    });

    it('should handle days', () => {
      const oneDayAgo = new Date('2022-12-31T12:00:00Z');
      const threeDaysAgo = new Date('2022-12-29T12:00:00Z');
      const oneDayFromNow = new Date('2023-01-02T12:00:00Z');
      const threeDaysFromNow = new Date('2023-01-04T12:00:00Z');

      expect(formatRelativeTime(oneDayAgo)).toBe('1 day ago');
      expect(formatRelativeTime(threeDaysAgo)).toBe('3 days ago');
      expect(formatRelativeTime(oneDayFromNow)).toBe('in 1 day');
      expect(formatRelativeTime(threeDaysFromNow)).toBe('in 3 days');
    });

    it('should handle string timestamps', () => {
      const timestamp = '2023-01-01T11:55:00Z';
      expect(formatRelativeTime(timestamp)).toBe('5 minutes ago');
    });

    it('should handle numeric timestamps', () => {
      const timestamp = new Date('2023-01-01T11:55:00Z').getTime();
      expect(formatRelativeTime(timestamp)).toBe('5 minutes ago');
    });

    it('should handle singular vs plural correctly', () => {
      const oneMinuteAgo = new Date('2023-01-01T11:59:00Z');
      const twoMinutesAgo = new Date('2023-01-01T11:58:00Z');
      const oneHourAgo = new Date('2023-01-01T11:00:00Z');
      const twoHoursAgo = new Date('2023-01-01T10:00:00Z');
      const oneDayAgo = new Date('2022-12-31T12:00:00Z');
      const twoDaysAgo = new Date('2022-12-30T12:00:00Z');

      expect(formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
      expect(formatRelativeTime(twoMinutesAgo)).toBe('2 minutes ago');
      expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');
      expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');
      expect(formatRelativeTime(oneDayAgo)).toBe('1 day ago');
      expect(formatRelativeTime(twoDaysAgo)).toBe('2 days ago');
    });

    it('should handle edge cases at boundaries', () => {
      const exactlyOneMinuteAgo = new Date('2023-01-01T11:59:00Z');
      const exactlyOneHourAgo = new Date('2023-01-01T11:00:00Z');
      const exactlyOneDayAgo = new Date('2022-12-31T12:00:00Z');

      expect(formatRelativeTime(exactlyOneMinuteAgo)).toBe('1 minute ago');
      expect(formatRelativeTime(exactlyOneHourAgo)).toBe('1 hour ago');
      expect(formatRelativeTime(exactlyOneDayAgo)).toBe('1 day ago');
    });
  });

  describe('parseDurationToSeconds', () => {
    it('should parse seconds only', () => {
      expect(parseDurationToSeconds('30s')).toBe(30);
      expect(parseDurationToSeconds('0s')).toBe(0);
      expect(parseDurationToSeconds('59s')).toBe(59);
    });

    it('should parse minutes only', () => {
      expect(parseDurationToSeconds('1m')).toBe(60);
      expect(parseDurationToSeconds('5m')).toBe(300);
      expect(parseDurationToSeconds('30m')).toBe(1800);
    });

    it('should parse hours only', () => {
      expect(parseDurationToSeconds('1h')).toBe(3600);
      expect(parseDurationToSeconds('2h')).toBe(7200);
      expect(parseDurationToSeconds('24h')).toBe(86400);
    });

    it('should parse milliseconds only', () => {
      expect(parseDurationToSeconds('100ms')).toBe(0.1);
      expect(parseDurationToSeconds('500ms')).toBe(0.5);
      expect(parseDurationToSeconds('1000ms')).toBe(1);
    });

    it('should parse combined durations', () => {
      expect(parseDurationToSeconds('1m 30s')).toBe(90);
      expect(parseDurationToSeconds('1h 30m')).toBe(5400);
      expect(parseDurationToSeconds('1h 30m 45s')).toBe(5445);
      expect(parseDurationToSeconds('2h 15m 30s')).toBe(8130);
    });

    it('should parse durations with milliseconds', () => {
      expect(parseDurationToSeconds('1s 500ms')).toBe(1.5);
      expect(parseDurationToSeconds('30s 250ms')).toBe(30.25);
      expect(parseDurationToSeconds('1m 30s 500ms')).toBe(90.5);
    });

    it('should handle mixed order', () => {
      expect(parseDurationToSeconds('30s 1m')).toBe(90);
      expect(parseDurationToSeconds('45s 2h 15m')).toBe(8145);
      expect(parseDurationToSeconds('500ms 30s 1m')).toBe(90.5);
    });

    it('should handle duplicate units by summing', () => {
      expect(parseDurationToSeconds('30s 45s')).toBe(75);
      expect(parseDurationToSeconds('1m 2m')).toBe(180);
      expect(parseDurationToSeconds('1h 2h')).toBe(10800);
    });

    it('should handle empty or invalid strings', () => {
      expect(parseDurationToSeconds('')).toBe(0);
      expect(parseDurationToSeconds('invalid')).toBe(0);
      expect(parseDurationToSeconds('no numbers here')).toBe(0);
    });

    it('should handle strings with no units', () => {
      expect(parseDurationToSeconds('123')).toBe(0);
      expect(parseDurationToSeconds('45 67')).toBe(0);
    });

    it('should handle extra whitespace', () => {
      expect(parseDurationToSeconds(' 1m 30s ')).toBe(90);
      expect(parseDurationToSeconds('1h  30m   45s')).toBe(5445);
    });

    it('should be case sensitive (lowercase only)', () => {
      expect(parseDurationToSeconds('1H 30M 45S')).toBe(0);
      expect(parseDurationToSeconds('1Ms')).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should format and parse durations consistently', () => {
      const testDurations = [30, 90, 150, 3600, 3690, 7290];

      testDurations.forEach(seconds => {
        const formatted = formatDuration(seconds);
        const parsed = parseDurationToSeconds(formatted);
        expect(parsed).toBe(seconds);
      });
    });

    it('should handle round-trip conversion for precise durations', () => {
      // Note: formatPreciseDuration uses different format for sub-minute durations
      const testDurations = [60, 90, 150, 3600]; // Only test >= 1 minute

      testDurations.forEach(seconds => {
        const formatted = formatPreciseDuration(seconds);
        const parsed = parseDurationToSeconds(formatted);
        expect(parsed).toBe(seconds);
      });
    });

    it('should handle edge cases gracefully', () => {
      // Test various edge cases together
      expect(formatDuration(0)).toBe('0s');
      expect(parseDurationToSeconds('0s')).toBe(0);
      
      expect(formatRelativeTime(new Date())).toBe('in a moment');
      
      expect(formatPreciseDuration(0.001)).toBe('1ms');
      expect(parseDurationToSeconds('1ms')).toBe(0.001);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid Date objects in formatRelativeTime', () => {
      const invalidDate = new Date('invalid');
      
      // Should not throw, but may return unexpected results
      expect(() => formatRelativeTime(invalidDate)).not.toThrow();
    });

    it('should handle very large numbers', () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      
      expect(() => formatDuration(largeNumber)).not.toThrow();
      expect(() => formatPreciseDuration(largeNumber)).not.toThrow();
    });

    it('should handle very small numbers', () => {
      const smallNumber = Number.MIN_VALUE;
      
      expect(() => formatDuration(smallNumber)).not.toThrow();
      expect(() => formatPreciseDuration(smallNumber)).not.toThrow();
    });

    it('should handle NaN and Infinity', () => {
      expect(formatDuration(NaN)).toBe('0s');
      expect(formatDuration(Infinity)).toBe('0s');
      expect(formatDuration(-Infinity)).toBe('0s');
      
      expect(formatPreciseDuration(NaN)).toBe('0s');
      expect(formatPreciseDuration(Infinity)).toBe('0s');
      expect(formatPreciseDuration(-Infinity)).toBe('0s');
    });
  });
}); 