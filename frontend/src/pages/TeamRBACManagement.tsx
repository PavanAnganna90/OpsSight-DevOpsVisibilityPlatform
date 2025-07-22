/**
 * Team & RBAC Management Page
 * 
 * Comprehensive page integrating team management and RBAC functionality.
 * Provides unified access to team operations and role-based access control.
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import { TeamManagementDashboard } from '@/components/teams/TeamManagementDashboard';
import { RBACManagement } from '@/components/rbac/RBACManagement';
import { usePerformanceMonitoring } from '@/hooks/useMonitoring';

interface TeamRBACStats {
  totalTeams: number;
  totalUsers: number;
  totalRoles: number;
  totalPermissions: number;
  activeTeams: number;
  activeUsers: number;
  systemRoles: number;
  customRoles: number;
  pendingInvitations: number;
  recentActivity: Array<{
    id: string;
    type: 'team_created' | 'user_added' | 'role_assigned' | 'permission_granted';
    message: string;
    timestamp: string;
    actor: string;
  }>;
}

const TeamRBACManagement: React.FC = () => {
  const { trackUserInteraction } = usePerformanceMonitoring('TeamRBACManagement');
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<TeamRBACStats>({
    totalTeams: 0,
    totalUsers: 0,
    totalRoles: 0,
    totalPermissions: 0,
    activeTeams: 0,
    activeUsers: 0,
    systemRoles: 0,
    customRoles: 0,
    pendingInvitations: 0,
    recentActivity: []
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    trackUserInteraction('tab_change', { tab });
  };

  // Mock data loading - replace with actual API calls
  React.useEffect(() => {
    const loadStats = async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats({
        totalTeams: 42,
        totalUsers: 158,
        totalRoles: 12,
        totalPermissions: 68,
        activeTeams: 38,
        activeUsers: 142,
        systemRoles: 8,
        customRoles: 4,
        pendingInvitations: 7,
        recentActivity: [
          {
            id: '1',
            type: 'team_created',
            message: 'Created "Frontend Team" with 5 members',
            timestamp: '2024-01-15T10:30:00Z',
            actor: 'John Doe'
          },
          {
            id: '2',
            type: 'user_added',
            message: 'Added Sarah Wilson to "Backend Team"',
            timestamp: '2024-01-15T09:15:00Z',
            actor: 'Mike Johnson'
          },
          {
            id: '3',
            type: 'role_assigned',
            message: 'Assigned "Team Lead" role to Alice Smith',
            timestamp: '2024-01-15T08:45:00Z',
            actor: 'Admin'
          },
          {
            id: '4',
            type: 'permission_granted',
            message: 'Granted "deploy_production" permission to DevOps team',
            timestamp: '2024-01-14T16:20:00Z',
            actor: 'Security Team'
          }
        ]
      });
    };

    loadStats();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Team & Access Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage teams, users, roles, and permissions across your organization
          </p>
        </div>
        
        <div className="flex gap-2">
          <PermissionGuard permission="create_teams">
            <Button variant="outline" className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Create Team
            </Button>
          </PermissionGuard>
          
          <PermissionGuard permission="manage_roles">
            <Button className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Manage Roles
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="rbac">RBAC</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTeams}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {stats.activeTeams} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {stats.activeUsers} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRoles}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {stats.customRoles} custom
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Permissions</CardTitle>
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPermissions}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {stats.pendingInvitations} pending invites
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      activity.type === 'team_created' ? 'bg-blue-500' :
                      activity.type === 'user_added' ? 'bg-green-500' :
                      activity.type === 'role_assigned' ? 'bg-purple-500' :
                      'bg-orange-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {activity.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.actor} • {new Date(activity.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams">
          <TeamManagementDashboard />
        </TabsContent>

        {/* RBAC Tab */}
        <TabsContent value="rbac">
          <RBACManagement />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                      activity.type === 'team_created' ? 'bg-blue-500' :
                      activity.type === 'user_added' ? 'bg-green-500' :
                      activity.type === 'role_assigned' ? 'bg-purple-500' :
                      'bg-orange-500'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {activity.message}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(activity.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        by {activity.actor}
                      </p>
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

export default TeamRBACManagement;