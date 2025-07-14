/**
 * Fetch all teams for the Teams panel.
 * @returns {Promise<any[]>} List of teams
 */
export async function fetchTeams() {
  const res = await fetch('/api/teams');
  if (!res.ok) throw new Error('Failed to fetch teams');
  return res.json();
}

/**
 * Invite a member to a team by ID.
 * @param {number} id - Team ID
 * @returns {Promise<any>} Success message
 */
export async function inviteToTeam(id: number) {
  const res = await fetch(`/api/teams/${id}/invite`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to invite to team');
  return res.json();
}

/**
 * Remove a member from a team by ID.
 * @param {number} id - Team ID
 * @returns {Promise<any>} Success message
 */
export async function removeTeamMember(id: number) {
  const res = await fetch(`/api/teams/${id}/remove_member`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to remove team member');
  return res.json();
} 