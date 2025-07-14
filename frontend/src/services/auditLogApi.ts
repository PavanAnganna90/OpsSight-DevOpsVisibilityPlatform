/**
 * Log a critical user or system action for audit/compliance purposes.
 * @param {string} action - The action performed (e.g., 'deploy', 'rollback').
 * @param {string} user - The user performing the action.
 * @param {object} [details] - Additional details about the action.
 */
export async function logAuditEvent(action: string, user: string, details?: object) {
  try {
    await fetch('/api/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, user, details }),
    });
  } catch (e) {
    // Fail silently for now
  }
} 