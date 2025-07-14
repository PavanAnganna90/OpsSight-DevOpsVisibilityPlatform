'use client';

/**
 * Teams Management Page
 * 
 * Main page for team management functionality.
 * Provides team listing, creation, editing, and member management.
 */

import React, { useState, useEffect } from 'react';
import { Team } from '@/types/team';
import { TeamList, TeamForm, TeamMembersList } from '@/components/teams';
import { Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamPermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import { withPermissions } from '@/components/rbac/withPermissions';
import { teamApi } from '@/services/teamApi';

type ViewMode = 'list' | 'create' | 'edit' | 'detail';

interface TeamsPageState {
  mode: ViewMode;
  selectedTeam: Team | null;
  teams: Team[];
  loading: boolean;
  error: string | null;
}

/**
 * Teams Management Page Component
 * 
 * Manages the overall state and flow of team management operations.
 * Handles navigation between different views and team operations.
 */
function TeamsPage() {
  const { state: authState } = useAuth(); // Get current user context
  const user = authState.user;
  const teamPerms = useTeamPermissions();
  const [state, setState] = useState<TeamsPageState>({
    mode: 'list',
    selectedTeam: null,
    teams: [],
    loading: false,
    error: null
  });

  /**
   * Handle team selection for detail view
   */
  const handleTeamSelect = (team: Team) => {
    setState(prev => ({
      ...prev,
      mode: 'detail',
      selectedTeam: team
    }));
  };

  /**
   * Handle team creation flow
   */
  const handleCreateTeam = () => {
    setState(prev => ({
      ...prev,
      mode: 'create',
      selectedTeam: null
    }));
  };

  /**
   * Handle team editing flow
   */
  const handleEditTeam = (team: Team) => {
    setState(prev => ({
      ...prev,
      mode: 'edit',
      selectedTeam: team
    }));
  };

  /**
   * Handle successful team form submission
   */
  const handleTeamSubmit = (team: Team) => {
    // Update teams list
    setState(prev => {
      const isEdit = prev.mode === 'edit';
      const updatedTeams = isEdit
        ? prev.teams.map(t => t.id === team.id ? team : t)
        : [...prev.teams, team];

      return {
        ...prev,
        mode: 'detail',
        selectedTeam: team,
        teams: updatedTeams
      };
    });
  };

  /**
   * Handle form cancellation
   */
  const handleFormCancel = () => {
    setState(prev => ({
      ...prev,
      mode: prev.selectedTeam ? 'detail' : 'list',
      selectedTeam: prev.selectedTeam
    }));
  };

  /**
   * Navigate back to list view
   */
  const handleBackToList = () => {
    setState(prev => ({
      ...prev,
      mode: 'list',
      selectedTeam: null
    }));
  };

  /**
   * Check if current user can manage the selected team
   */
  const canManageCurrentTeam = (): boolean => {
    if (!state.selectedTeam || !user) return false;
    
    // Check team management permissions
    return teamPerms.canUpdateTeams || teamPerms.canManageTeamMembers;
  };

  /**
   * Handle team member updates
   */
  const handleMemberAdded = () => {
    // Could refresh team data or update member count
    if (state.selectedTeam) {
      // Optionally refresh team details
      teamApi.getTeam(state.selectedTeam.id)
        .then(updatedTeam => {
          setState(prev => ({
            ...prev,
            selectedTeam: updatedTeam,
            teams: prev.teams.map(t => t.id === updatedTeam.id ? updatedTeam : t)
          }));
        })
        .catch(console.error);
    }
  };

  /**
   * Render current view based on mode
   */
  const renderCurrentView = () => {
    switch (state.mode) {
      case 'create':
        return (
          <TeamForm
            onSubmit={handleTeamSubmit}
            onCancel={handleFormCancel}
          />
        );

      case 'edit':
        return (
          <TeamForm
            team={state.selectedTeam}
            onSubmit={handleTeamSubmit}
            onCancel={handleFormCancel}
          />
        );

      case 'detail':
        if (!state.selectedTeam) {
          return (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No team selected</p>
              <Button onClick={handleBackToList} className="mt-4">
                Back to Teams
              </Button>
            </div>
          );
        }

        return (
          <div className="space-y-8">
            {/* Team Detail Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={handleBackToList}
                  className="flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Teams
                </Button>

                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {state.selectedTeam.display_name || state.selectedTeam.name}
                  </h1>
                  {state.selectedTeam.description && (
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {state.selectedTeam.description}
                    </p>
                  )}
                </div>
              </div>

              {canManageCurrentTeam() && (
                <Button
                  onClick={() => handleEditTeam(state.selectedTeam!)}
                  className="flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Team
                </Button>
              )}
            </div>

            {/* Team Members Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Team Members
                </h2>
              </div>
              <div className="p-6">
                <TeamMembersList
                  team={state.selectedTeam}
                  onMemberAdded={handleMemberAdded}
                  canManageMembers={canManageCurrentTeam()}
                />
              </div>
            </div>
          </div>
        );

      case 'list':
      default:
        return (
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Teams</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Manage your teams and team members
                </p>
              </div>
              <PermissionGuard permission="create_teams">
                <Button
                  onClick={handleCreateTeam}
                  className="flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Team
                </Button>
              </PermissionGuard>
            </div>

            {/* Teams List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <TeamList
                onTeamSelect={handleTeamSelect}
                onEditTeam={handleEditTeam}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderCurrentView()}
      </div>
    </div>
  );
}

// Export with team permission protection
export default withPermissions(TeamsPage, {
  permissions: ['view_teams'],
  redirectTo: '/unauthorized',
});