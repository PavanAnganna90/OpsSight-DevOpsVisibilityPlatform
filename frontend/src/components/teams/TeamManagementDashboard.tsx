/**
 * Team Management Dashboard Component
 * 
 * Comprehensive team management dashboard with RBAC integration.
 * Provides team overview, member management, role assignments, and permissions.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { usePerformanceMonitoring } from '@/hooks/useMonitoring';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import { RoleBadge } from '@/components/rbac/RoleBadge';
import { TeamList } from './TeamList';
import { TeamMembersList } from './TeamMembersList';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  permissions: string[];
  joinedAt: string;
  lastActive: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
}

interface Team {
  id: string;
  name: string;
  display_name: string;
  description: string;
  slug: string;
  is_active: boolean;
  visibility: 'public' | 'private' | 'internal';
  member_count: number;
  created_at: string;
  updated_at: string;
  owner: TeamMember;
  members: TeamMember[];
  settings: {
    visibility: string;
    join_policy: 'open' | 'approval' | 'invitation';
    permissions: Record<string, boolean>;
  };
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  created_at: string;
  team_id?: string;
}

interface Permission {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  is_system: boolean;
}

interface TeamStats {
  totalTeams: number;
  activeTeams: number;
  totalMembers: number;
  pendingInvitations: number;
  byVisibility: {
    public: number;
    private: number;
    internal: number;
  };
  byRole: Record<string, number>;
  recentActivity: Array<{
    id: string;
    type: 'member_added' | 'member_removed' | 'role_changed' | 'team_created' | 'team_updated';
    message: string;
    timestamp: string;
    user: string;
    team: string;
  }>;
}

const TeamManagementDashboard: React.FC = () => {
  const { trackUserInteraction } = usePerformanceMonitoring('TeamManagementDashboard');
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      
      try {
        // Mock data - replace with actual API calls
        const mockTeams: Team[] = [
          {
            id: 'team_1',
            name: 'frontend-team',
            display_name: 'Frontend Team',
            description: 'Responsible for UI/UX and frontend development',
            slug: 'frontend-team',
            is_active: true,
            visibility: 'public',
            member_count: 8,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-15T10:30:00Z',
            owner: {
              id: 'user_1',
              email: 'alice@company.com',
              name: 'Alice Johnson',
              role: 'Team Lead',
              permissions: ['team:manage', 'project:write', 'deploy:staging'],
              joinedAt: '2023-01-01T00:00:00Z',
              lastActive: '2023-01-16T09:30:00Z',
              status: 'active'
            },
            members: [
              {
                id: 'user_2',
                email: 'bob@company.com',
                name: 'Bob Smith',
                role: 'Senior Developer',
                permissions: ['project:write', 'deploy:staging'],
                joinedAt: '2023-01-05T00:00:00Z',
                lastActive: '2023-01-16T08:45:00Z',
                status: 'active'
              },
              {
                id: 'user_3',
                email: 'charlie@company.com',
                name: 'Charlie Brown',
                role: 'Developer',
                permissions: ['project:write'],
                joinedAt: '2023-01-10T00:00:00Z',
                lastActive: '2023-01-15T17:20:00Z',
                status: 'active'
              }
            ],
            settings: {
              visibility: 'public',
              join_policy: 'approval',
              permissions: {
                'can_invite_members': true,
                'can_remove_members': true,
                'can_manage_roles': true
              }
            }
          },
          {
            id: 'team_2',
            name: 'backend-team',
            display_name: 'Backend Team',
            description: 'API development and server-side logic',
            slug: 'backend-team',
            is_active: true,
            visibility: 'internal',
            member_count: 6,
            created_at: '2023-01-02T00:00:00Z',
            updated_at: '2023-01-14T15:20:00Z',
            owner: {
              id: 'user_4',
              email: 'dave@company.com',
              name: 'Dave Wilson',
              role: 'Team Lead',
              permissions: ['team:manage', 'project:admin', 'deploy:production'],
              joinedAt: '2023-01-02T00:00:00Z',
              lastActive: '2023-01-16T10:15:00Z',
              status: 'active'
            },
            members: [
              {
                id: 'user_5',
                email: 'eve@company.com',
                name: 'Eve Davis',
                role: 'Senior Developer',
                permissions: ['project:write', 'deploy:staging'],
                joinedAt: '2023-01-03T00:00:00Z',
                lastActive: '2023-01-16T09:00:00Z',
                status: 'active'
              }
            ],
            settings: {
              visibility: 'internal',
              join_policy: 'invitation',
              permissions: {
                'can_invite_members': true,
                'can_remove_members': false,
                'can_manage_roles': false
              }
            }
          },
          {
            id: 'team_3',
            name: 'devops-team',
            display_name: 'DevOps Team',
            description: 'Infrastructure, deployment, and monitoring',
            slug: 'devops-team',
            is_active: true,
            visibility: 'private',
            member_count: 4,
            created_at: '2023-01-03T00:00:00Z',
            updated_at: '2023-01-16T08:30:00Z',
            owner: {
              id: 'user_6',
              email: 'frank@company.com',
              name: 'Frank Miller',
              role: 'DevOps Lead',
              permissions: ['team:manage', 'project:admin', 'deploy:production', 'infra:manage'],
              joinedAt: '2023-01-03T00:00:00Z',
              lastActive: '2023-01-16T10:45:00Z',
              status: 'active'
            },
            members: [
              {
                id: 'user_7',
                email: 'grace@company.com',
                name: 'Grace Chen',
                role: 'DevOps Engineer',
                permissions: ['project:write', 'deploy:staging', 'infra:read'],
                joinedAt: '2023-01-04T00:00:00Z',
                lastActive: '2023-01-16T09:20:00Z',
                status: 'active'
              }
            ],
            settings: {
              visibility: 'private',
              join_policy: 'invitation',
              permissions: {
                'can_invite_members': false,
                'can_remove_members': false,
                'can_manage_roles': false
              }
            }
          }
        ];

        const mockRoles: Role[] = [
          {
            id: 'role_1',
            name: 'team_lead',
            display_name: 'Team Lead',
            description: 'Full team management permissions',
            permissions: ['team:manage', 'project:admin', 'deploy:staging', 'member:invite'],
            is_system: true,
            created_at: '2023-01-01T00:00:00Z'
          },
          {
            id: 'role_2',
            name: 'senior_developer',
            display_name: 'Senior Developer',
            description: 'Development and staging deployment permissions',
            permissions: ['project:write', 'deploy:staging', 'code:review'],
            is_system: true,
            created_at: '2023-01-01T00:00:00Z'
          },
          {
            id: 'role_3',
            name: 'developer',
            display_name: 'Developer',
            description: 'Basic development permissions',
            permissions: ['project:write', 'code:read'],
            is_system: true,
            created_at: '2023-01-01T00:00:00Z'
          },
          {
            id: 'role_4',
            name: 'viewer',
            display_name: 'Viewer',
            description: 'Read-only access',
            permissions: ['project:read'],
            is_system: true,
            created_at: '2023-01-01T00:00:00Z'
          }
        ];

        const mockPermissions: Permission[] = [
          {
            id: 'perm_1',
            name: 'team:manage',
            display_name: 'Manage Team',
            description: 'Create, update, and delete teams',
            category: 'team',
            is_system: true
          },
          {
            id: 'perm_2',
            name: 'project:admin',
            display_name: 'Project Admin',
            description: 'Full project administration',
            category: 'project',
            is_system: true
          },
          {
            id: 'perm_3',
            name: 'project:write',
            display_name: 'Project Write',
            description: 'Create and modify projects',
            category: 'project',
            is_system: true
          },
          {
            id: 'perm_4',
            name: 'project:read',
            display_name: 'Project Read',
            description: 'View project information',
            category: 'project',
            is_system: true
          },
          {
            id: 'perm_5',
            name: 'deploy:production',
            display_name: 'Deploy Production',
            description: 'Deploy to production environment',
            category: 'deployment',
            is_system: true
          },
          {
            id: 'perm_6',
            name: 'deploy:staging',
            display_name: 'Deploy Staging',
            description: 'Deploy to staging environment',
            category: 'deployment',
            is_system: true
          },
          {
            id: 'perm_7',
            name: 'member:invite',
            display_name: 'Invite Members',
            description: 'Invite new team members',
            category: 'member',
            is_system: true
          },
          {
            id: 'perm_8',
            name: 'code:review',
            display_name: 'Code Review',
            description: 'Review and approve code changes',
            category: 'code',
            is_system: true
          },
          {
            id: 'perm_9',
            name: 'infra:manage',
            display_name: 'Manage Infrastructure',
            description: 'Manage infrastructure resources',
            category: 'infrastructure',
            is_system: true
          }
        ];

        const mockStats: TeamStats = {
          totalTeams: mockTeams.length,
          activeTeams: mockTeams.filter(t => t.is_active).length,
          totalMembers: mockTeams.reduce((sum, team) => sum + team.member_count, 0),
          pendingInvitations: 3,
          byVisibility: {
            public: mockTeams.filter(t => t.visibility === 'public').length,
            private: mockTeams.filter(t => t.visibility === 'private').length,
            internal: mockTeams.filter(t => t.visibility === 'internal').length
          },
          byRole: {
            'Team Lead': 3,
            'Senior Developer': 2,
            'Developer': 1,
            'DevOps Engineer': 1
          },
          recentActivity: [
            {
              id: 'activity_1',
              type: 'member_added',
              message: 'Charlie Brown joined Frontend Team',
              timestamp: '2023-01-16T10:30:00Z',
              user: 'Alice Johnson',
              team: 'Frontend Team'
            },
            {
              id: 'activity_2',
              type: 'role_changed',
              message: 'Eve Davis promoted to Senior Developer',
              timestamp: '2023-01-16T09:15:00Z',
              user: 'Dave Wilson',
              team: 'Backend Team'
            },
            {
              id: 'activity_3',
              type: 'team_updated',
              message: 'DevOps Team settings updated',
              timestamp: '2023-01-16T08:30:00Z',
              user: 'Frank Miller',
              team: 'DevOps Team'
            }
          ]
        };

        setTeams(mockTeams);
        setRoles(mockRoles);
        setPermissions(mockPermissions);
        setStats(mockStats);
        
        trackUserInteraction('view_team_management_dashboard');
        
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        showToast('Failed to load dashboard data', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [trackUserInteraction, showToast]);

  // Handle team member role change
  const handleRoleChange = async (teamId: string, memberId: string, newRole: string) => {
    try {
      // Update member role
      setTeams(prev => prev.map(team => 
        team.id === teamId 
          ? {
              ...team,
              members: team.members.map(member =>
                member.id === memberId 
                  ? { ...member, role: newRole }
                  : member
              )
            }
          : team
      ));
      
      showToast('Member role updated successfully', 'success');
      
      trackUserInteraction('change_member_role', {
        teamId,
        memberId,
        newRole
      });
      
    } catch (error) {
      console.error('Failed to update member role:', error);
      showToast('Failed to update member role', 'error');
    }
  };

  // Handle team member removal
  const handleRemoveMember = async (teamId: string, memberId: string) => {
    try {
      setTeams(prev => prev.map(team => 
        team.id === teamId 
          ? {
              ...team,
              members: team.members.filter(member => member.id !== memberId),
              member_count: team.member_count - 1
            }
          : team
      ));
      
      showToast('Member removed successfully', 'success');
      
      trackUserInteraction('remove_member', {
        teamId,
        memberId
      });
      
    } catch (error) {
      console.error('Failed to remove member:', error);
      showToast('Failed to remove member', 'error');
    }
  };

  // Handle team settings update
  const handleTeamSettingsUpdate = async (teamId: string, settings: any) => {
    try {
      setTeams(prev => prev.map(team => 
        team.id === teamId 
          ? { ...team, settings: { ...team.settings, ...settings } }
          : team
      ));
      
      showToast('Team settings updated successfully', 'success');
      
      trackUserInteraction('update_team_settings', {
        teamId,
        settings
      });
      
    } catch (error) {
      console.error('Failed to update team settings:', error);
      showToast('Failed to update team settings', 'error');
    }
  };

  // Get permission category color
  const getPermissionCategoryColor = (category: string) => {
    switch (category) {
      case 'team': return 'bg-blue-100 text-blue-800';
      case 'project': return 'bg-green-100 text-green-800';
      case 'deployment': return 'bg-red-100 text-red-800';
      case 'member': return 'bg-purple-100 text-purple-800';
      case 'code': return 'bg-yellow-100 text-yellow-800';
      case 'infrastructure': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get activity type icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'member_added':
        return (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        );
      case 'member_removed':
        return (
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        );
      case 'role_changed':
        return (
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'team_created':
        return (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'team_updated':
        return (
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Team Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage teams, members, roles, and permissions
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <PermissionGuard permission="team:manage">
            <Button
              onClick={() => setShowTeamModal(true)}
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Team
            </Button>
          </PermissionGuard>
          
          <PermissionGuard permission="role:manage">
            <Button
              onClick={() => setShowRoleModal(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Manage Roles
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Teams</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalTeams}
                  </p>
                </div>
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Members</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.totalMembers}
                  </p>
                </div>
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Teams</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.activeTeams}
                  </p>
                </div>
                <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending Invites</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.pendingInvitations}
                  </p>
                </div>
                <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="h-4 w-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Team Visibility Distribution */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>Team Visibility Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h3 className="font-semibold text-green-900 dark:text-green-100">Public</h3>
                    <p className="text-2xl font-bold text-green-600">{stats.byVisibility.public}</p>
                    <p className="text-sm text-green-700 dark:text-green-300">Open to all</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">Internal</h3>
                    <p className="text-2xl font-bold text-blue-600">{stats.byVisibility.internal}</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Company members only</p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <h3 className="font-semibold text-red-900 dark:text-red-100">Private</h3>
                    <p className="text-2xl font-bold text-red-600">{stats.byVisibility.private}</p>
                    <p className="text-sm text-red-700 dark:text-red-300">Invitation only</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-shrink-0">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {activity.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(activity.timestamp).toLocaleString()} • {activity.user}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {activity.team}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams">
          <TeamList 
            onTeamSelect={setSelectedTeam}
            onCreateTeam={() => setShowTeamModal(true)}
            onEditTeam={setSelectedTeam}
            showActions={true}
          />
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teams.flatMap(team => 
                  [team.owner, ...team.members].map(member => (
                    <div key={`${team.id}-${member.id}`} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {member.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{team.display_name}</Badge>
                        <RoleBadge role={member.role} />
                        <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                          {member.status}
                        </Badge>
                        <PermissionGuard permission="member:manage">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedMember(member);
                              setShowMemberModal(true);
                            }}
                          >
                            Manage
                          </Button>
                        </PermissionGuard>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {role.display_name}
                        </h3>
                        <RoleBadge role={role.name} />
                        {role.is_system && (
                          <Badge variant="outline" className="text-xs">System</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {role.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.map((permission) => (
                          <Badge key={permission} variant="secondary" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PermissionGuard permission="role:manage">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRole(role);
                            setShowRoleModal(true);
                          }}
                        >
                          Edit
                        </Button>
                      </PermissionGuard>
                      {!role.is_system && (
                        <PermissionGuard permission="role:manage">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Handle role deletion
                            }}
                          >
                            Delete
                          </Button>
                        </PermissionGuard>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(
                  permissions.reduce((acc, permission) => {
                    if (!acc[permission.category]) {
                      acc[permission.category] = [];
                    }
                    acc[permission.category].push(permission);
                    return acc;
                  }, {} as Record<string, Permission[]>)
                ).map(([category, categoryPermissions]) => (
                  <div key={category} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3 capitalize">
                      {category} Permissions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categoryPermissions.map((permission) => (
                        <div key={permission.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                              {permission.display_name}
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {permission.description}
                            </p>
                          </div>
                          <Badge className={`text-xs ${getPermissionCategoryColor(permission.category)}`}>
                            {permission.name}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export { TeamManagementDashboard };
export default TeamManagementDashboard;