/**
 * Fetch all infrastructure resources for the Infrastructure panel.
 * @returns {Promise<any[]>} List of resources
 */
export async function fetchInfrastructure() {
  const res = await fetch('/api/infrastructure');
  if (!res.ok) throw new Error('Failed to fetch infrastructure');
  return res.json();
}

/**
 * Restart an infrastructure resource by ID.
 * @param {number} id - Resource ID
 * @returns {Promise<any>} Success message
 */
export async function restartResource(id: number) {
  const res = await fetch(`/api/infrastructure/${id}/restart`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to restart resource');
  return res.json();
}

/**
 * Delete an infrastructure resource by ID.
 * @param {number} id - Resource ID
 * @returns {Promise<any>} Success message
 */
export async function deleteResource(id: number) {
  const res = await fetch(`/api/infrastructure/${id}/delete`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to delete resource');
  return res.json();
} 