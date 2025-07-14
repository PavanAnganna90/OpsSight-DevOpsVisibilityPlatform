import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTeams, inviteToTeam, removeTeamMember } from '../../services/teamsApi';
import { useSettings } from '../../contexts/SettingsContext';
import { trackEvent } from '../../utils/analytics';
import { logAuditEvent } from '../../services/auditLogApi';
import EmptyState from '../ui/EmptyState';

export default function TeamsPanel() {
  const { panelVisibility } = useSettings();
  const queryClient = useQueryClient();
  const { data: teams, isLoading, error, refetch } = useQuery({ queryKey: ['teams'], queryFn: fetchTeams });

  const inviteMutation = useMutation({
    mutationFn: inviteToTeam,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] })
  });
  const removeMutation = useMutation({
    mutationFn: removeTeamMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] })
  });

  if (!panelVisibility.teams) return null;

  const handleInvite = async (id: number) => {
    trackEvent('invite_team_member', { teamId: id });
    await logAuditEvent('invite_team_member', 'admin', { teamId: id });
    inviteMutation.mutate(id);
  };
  const handleRemove = async (id: number) => {
    trackEvent('remove_team_member', { teamId: id });
    await logAuditEvent('remove_team_member', 'admin', { teamId: id });
    removeMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <section className="bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-lg p-6 flex flex-col gap-6 min-h-[320px] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-2" aria-label="Loading teams" />
        <span className="text-gray-500">Loading teams...</span>
      </section>
    );
  }
  if (error) {
    trackEvent('error', { panel: 'Teams', error: String(error) });
    return (
      <section className="bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-lg p-6 flex flex-col gap-6 min-h-[320px] items-center justify-center">
        <EmptyState
          illustration="mascot"
          title="Error Loading Teams"
          description="We couldn't load teams. Please try again."
          action={{ label: 'Retry', onClick: refetch }}
        />
      </section>
    );
  }
  if (!teams?.length) {
    return (
      <section className="bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-lg p-6 flex flex-col gap-6 min-h-[320px] items-center justify-center">
        <EmptyState
          illustration="mascot"
          title="No Teams"
          description="No teams found."
          action={{ label: 'Refresh', onClick: refetch }}
        />
      </section>
    );
  }
  return (
    <section className="bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-lg p-6 flex flex-col gap-6 relative overflow-hidden min-h-[320px]">
      <div className="font-medium mb-2">Teams</div>
      <ul className="space-y-3">
        {teams.map((team: any) => (
          <li key={team.id} className="flex flex-col md:flex-row md:items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex-1">
              <div className="font-semibold text-blue-600">{team.name}</div>
              <div className="text-gray-800 dark:text-gray-100">Members: {team.members.join(', ')}</div>
              <div className="text-xs text-gray-400">Role: {team.role} | Status: {team.status}</div>
            </div>
            <div className="flex gap-2 mt-2 md:mt-0">
              <button
                onClick={() => handleInvite(team.id)}
                className="px-3 py-1 rounded bg-green-600 text-white font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
                aria-label={`Invite to team ${team.id}`}
              >
                Invite
              </button>
              <button
                onClick={() => handleRemove(team.id)}
                className="px-3 py-1 rounded bg-red-600 text-white font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
                aria-label={`Remove from team ${team.id}`}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
} 