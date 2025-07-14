/**
 * Track a user or system event for analytics.
 * @param {string} event - The event name (e.g., 'refresh', 'error').
 * @param {Record<string, any>} [data] - Additional event data.
 */
export function trackEvent(event: string, data?: Record<string, any>): void {
  // Log to console for dev
  // eslint-disable-next-line no-console
  console.log('[Analytics]', event, data);
  // Optionally send to backend
  // fetch('/api/analytics', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ event, ...data }),
  // });
}

export {}; 