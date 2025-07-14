/**
 * Team List Component
 * 
 * Displays a list of teams with filtering, sorting, and management options.
 * Follows existing UI patterns and provides team overview functionality.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Team, 
  TeamFilter, 
  TeamSortOptions, 
  TeamListResponse,
  TeamRole 
} from '@/types/team';
import { teamApi } from '@/services/teamApi';
import { useTeamPermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import { Button } from '@/components/ui';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface TeamListProps {
  onTeamSelect?: (team: Team) => void;
  onCreateTeam?: () => void;
  onEditTeam?: (team: Team) => void;
  showActions?: boolean;
  compact?: boolean;
}

/**
 * Team List Component
 * 
 * @param onTeamSelect - Callback when a team is selected
 * @param onCreateTeam - Callback when create team is clicked
 * @param onEditTeam - Callback when edit team is clicked
 * @param showActions - Whether to show action buttons
 * @param compact - Whether to use compact display
 */
export const TeamList: React.FC<TeamListProps> = ({
  onTeamSelect,
  onCreateTeam,
  onEditTeam,
  showActions = true,
  compact = false
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TeamFilter>({});
  const [sort, setSort] = useState<TeamSortOptions>({
    field: 'name',
    direction: 'asc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  const teamPerms = useTeamPermissions();
  
  // Early return if user can't view teams
  if (!teamPerms.canViewTeams) {
    return null;
  }

  /**
   * Fetch teams from API
   */
  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response: TeamListResponse = await teamApi.getTeams(
        filter,
        sort,
        currentPage,
        20 // items per page
      );

      setTeams(response.teams);
      setTotalPages(response.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams');
      console.error('Failed to fetch teams:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, sort, currentPage]);

  /**
   * Handle search input change
   */
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setSearchQuery(query);
    
    // Debounce search
    setTimeout(() => {
      setFilter(prev => ({
        ...prev,
        search: query || undefined
      }));
      setCurrentPage(1);
    }, 300);
  };

  /**
   * Format team member count
   */
  const formatMemberCount = (count: number = 0): string => {
    return count === 1 ? '1 member' : `${count} members`;
  };

  // Initial load and refetch on dependencies
  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  if (loading && teams.length === 0) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-8 w-full" />
        <LoadingSkeleton className="h-24 w-full" />
        <LoadingSkeleton className="h-24 w-full" />
        <LoadingSkeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 dark:text-red-400 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Error loading teams
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <Button onClick={fetchTeams} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Teams
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage team access and collaboration
          </p>
        </div>
        
        {showActions && onCreateTeam && (
          <PermissionGuard permission="create_teams">
            <Button 
              onClick={onCreateTeam} 
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Team
            </Button>
          </PermissionGuard>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search teams..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Teams Grid */}
      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {teams.map((team) => (
          <div
            key={team.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700
                     hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onTeamSelect?.(team)}
          >
            <div className="p-6">
              {/* Team Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {team.display_name || team.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    @{team.slug}
                  </p>
                </div>
                
                <StatusIndicator 
                  status={team.is_active ? 'success' : 'warning'}
                  size="sm"
                />
              </div>

              {/* Team Description */}
              {team.description && (
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                  {team.description}
                </p>
              )}

              {/* Team Stats */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {formatMemberCount(team.member_count)}
                </span>
                
                <div className="flex items-center gap-2">
                  {team.settings.visibility && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${team.settings.visibility === 'public' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : team.settings.visibility === 'private'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}
                    >
                      {team.settings.visibility}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {showActions && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <PermissionGuard permission="update_teams">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onEditTeam?.(team);
                      }}
                      className="flex-1"
                    >
                      Manage
                    </Button>
                  </PermissionGuard>
                  <Button
                    size="sm"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      onTeamSelect?.(team);
                    }}
                    className="flex-1"
                  >
                    View
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {teams.length === 0 && !loading && (
        <div className="text-center py-12">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No teams found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery ? 'Try adjusting your search criteria.' : 'Get started by creating your first team.'}
          </p>
          {onCreateTeam && !searchQuery && (
            <PermissionGuard permission="create_teams">
              <Button onClick={onCreateTeam}>
                Create Your First Team
              </Button>
            </PermissionGuard>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          >
            Previous
          </Button>
          
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}; 