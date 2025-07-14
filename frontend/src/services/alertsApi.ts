/**
 * Fetch current alerts for the Alerts panel.
 * @returns {Promise<any[]>} List of alerts
 */
export async function fetchAlerts() {
  const res = await fetch('/api/alerts');
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

/**
 * Acknowledge an alert by ID.
 * @param {number} id - Alert ID
 * @returns {Promise<any>} Success message
 */
export async function acknowledgeAlert(id: number) {
  const res = await fetch(`/api/alerts/${id}/acknowledge`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to acknowledge alert');
  return res.json();
}

/**
 * Resolve an alert by ID.
 * @param {number} id - Alert ID
 * @returns {Promise<any>} Success message
 */
export async function resolveAlert(id: number) {
  const res = await fetch(`/api/alerts/${id}/resolve`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to resolve alert');
  return res.json();
} 