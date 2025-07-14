/**
 * Team Members List Component
 * 
 * Displays team members with role management, invitation, and member actions.
 * Supports adding/removing members and changing roles with proper permissions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TeamMember, TeamRole, Team } from '@/types/team';
import { teamApi } from '@/services/teamApi';
import { Button } from '@/components/ui';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface TeamMembersListProps {
  team: Team;
  currentUserId?: number;
  onMemberAdded?: (member: TeamMember) => void;
  onMemberRemoved?: (userId: number) => void;
  onMemberRoleChanged?: (member: TeamMember) => void;
  canManageMembers?: boolean;
}

/**
 * Team Members List Component
 * 
 * @param team - Team object to display members for
 * @param currentUserId - Current user's ID for special handling
 * @param onMemberAdded - Callback when a member is added
 * @param onMemberRemoved - Callback when a member is removed
 * @param onMemberRoleChanged - Callback when member role changes
 * @param canManageMembers - Whether current user can manage members
 */
export const TeamMembersList: React.FC<TeamMembersListProps> = ({
  team,
  currentUserId,
  onMemberAdded,
  onMemberRemoved,
  onMemberRoleChanged,
  canManageMembers = false
}) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<{[key: number]: boolean}>({});
  const [showInviteModal, setShowInviteModal] = useState(false);

  /**
   * Fetch team members
   */
  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const teamMembers = await teamApi.getTeamMembers(team.id);
      setMembers(teamMembers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team members');
      console.error('Failed to fetch team members:', err);
    } finally {
      setLoading(false);
    }
  }, [team.id]);

  /**
   * Handle role change for a member
   */
  const handleRoleChange = async (member: TeamMember, newRole: TeamRole) => {
    if (!canManageMembers || newRole === member.role) return;

    try {
      setActionLoading(prev => ({ ...prev, [member.user_id]: true }));
      
      const updatedMember = await teamApi.updateTeamMemberRole(
        team.id,
        member.user_id,
        newRole
      );

      // Update local state
      setMembers(prev => prev.map(m => 
        m.user_id === member.user_id 
          ? { ...m, role: newRole }
          : m
      ));

      onMemberRoleChanged?.({ 
        ...member, 
        role: newRole,
        joined_at: updatedMember.joined_at 
      } as TeamMember);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update member role';
      console.error('Failed to update member role:', err);
      alert(message); // Simple error display - could be improved with toast notifications
    } finally {
      setActionLoading(prev => ({ ...prev, [member.user_id]: false }));
    }
  };

  /**
   * Handle member removal
   */
  const handleRemoveMember = async (member: TeamMember) => {
    if (!canManageMembers) return;

    const isCurrentUser = member.user_id === currentUserId;
    const confirmMessage = isCurrentUser 
      ? 'Are you sure you want to leave this team?' 
      : `Are you sure you want to remove ${member.user.github_username} from this team?`;

    if (!confirm(confirmMessage)) return;

    try {
      setActionLoading(prev => ({ ...prev, [member.user_id]: true }));
      
      await teamApi.removeTeamMember(team.id, member.user_id);

      // Update local state
      setMembers(prev => prev.filter(m => m.user_id !== member.user_id));
      onMemberRemoved?.(member.user_id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove member';
      console.error('Failed to remove member:', err);
      alert(message);
    } finally {
      setActionLoading(prev => ({ ...prev, [member.user_id]: false }));
    }
  };

  /**
   * Get role badge styling
   */
  const getRoleBadgeStyle = (role: TeamRole): string => {
    switch (role) {
      case TeamRole.OWNER:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case TeamRole.ADMIN:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case TeamRole.MEMBER:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case TeamRole.VIEWER:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  /**
   * Format join date
   */
  const formatJoinDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  /**
   * Check if current user can modify this member
   */
  const canModifyMember = (member: TeamMember): boolean => {
    if (!canManageMembers) return false;
    
    // Owners can modify anyone except other owners
    // Admins can modify members and viewers
    // Members/Viewers cannot modify anyone
    const currentUserMember = members.find(m => m.user_id === currentUserId);
    if (!currentUserMember) return false;

    if (currentUserMember.role === TeamRole.OWNER) {
      return member.role !== TeamRole.OWNER;
    }
    
    if (currentUserMember.role === TeamRole.ADMIN) {
      return [TeamRole.MEMBER, TeamRole.VIEWER].includes(member.role);
    }

    return false;
  };

  // Initial load
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <LoadingSkeleton className="h-6 w-32" />
          <LoadingSkeleton className="h-8 w-20" />
        </div>
        <LoadingSkeleton className="h-16 w-full" />
        <LoadingSkeleton className="h-16 w-full" />
        <LoadingSkeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 dark:text-red-400 mb-4">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Error loading team members
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <Button onClick={fetchMembers} variant="outline" size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Team Members ({members.length})
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage team members and their roles
          </p>
        </div>
        
        {canManageMembers && (
          <Button 
            onClick={() => setShowInviteModal(true)}
            size="sm"
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Invite Member
          </Button>
        )}
      </div>

      {/* Members List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {members.map((member) => (
            <div key={member.user_id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center justify-between">
                {/* Member Info */}
                <div className="flex items-center space-x-3 flex-1">
                  <Avatar 
                    src={member.user.avatar_url}
                    alt={member.user.github_username}
                    size="md"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {member.user.full_name || member.user.github_username}
                      </p>
                      {member.user_id === currentUserId && (
                        <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        @{member.user.github_username}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Joined {formatJoinDate(member.joined_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Role and Actions */}
                <div className="flex items-center gap-3">
                  {/* Role Badge/Selector */}
                  {canModifyMember(member) ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member, e.target.value as TeamRole)}
                      disabled={actionLoading[member.user_id]}
                      className="text-xs font-medium px-2 py-1 rounded-full border border-gray-300 dark:border-gray-600
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={TeamRole.VIEWER}>Viewer</option>
                      <option value={TeamRole.MEMBER}>Member</option>
                      <option value={TeamRole.ADMIN}>Admin</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeStyle(member.role)}`}>
                      {member.role}
                    </span>
                  )}

                  {/* Remove Button */}
                  {(canModifyMember(member) || member.user_id === currentUserId) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveMember(member)}
                      disabled={actionLoading[member.user_id]}
                      className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                    >
                      {actionLoading[member.user_id] ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : member.user_id === currentUserId ? (
                        'Leave'
                      ) : (
                        'Remove'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {members.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No team members
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Start by inviting members to this team.
          </p>
          {canManageMembers && (
            <Button onClick={() => setShowInviteModal(true)}>
              Invite First Member
            </Button>
          )}
        </div>
      )}

      {/* TODO: Add InviteModal component */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Invite Team Member</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Invite modal implementation needed here.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowInviteModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowInviteModal(false)}>
                Send Invite
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 