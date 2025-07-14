/**
 * Team Dashboard Page
 * 
 * Comprehensive team-specific dashboard with metrics, activity, and insights
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarIcon,
  ChartBarIcon,
  UserGroupIcon,
  FolderIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CpuChipIcon,
  ServerIcon,
  BellIcon,
  ActivityIcon,
} from '@heroicons/react/24/outline';

import { DashboardCard } from '@/components/layout/DashboardCard';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { TeamGuard } from '@/components/rbac/PermissionGuard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { TeamActivityFeed } from '@/components/teams/TeamActivityFeed';
import { TeamMetricsChart } from '@/components/teams/TeamMetricsChart';
import { TeamMemberCard } from '@/components/teams/TeamMemberCard';
import { TeamProjectCard } from '@/components/teams/TeamProjectCard';

interface TeamDashboardData {
  team_info: {
    id: number;
    name: string;
    description: string;
    created_at: string;
    status: string;
    total_members: number;
    total_projects: number;
  };
  members: TeamMember[];
  projects: TeamProject[];
  activity_metrics: ActivityMetrics;
  performance_metrics: PerformanceMetrics;
  resource_utilization: ResourceUtilization;
  collaboration_metrics: CollaborationMetrics;
  recent_alerts: Alert[];
  upcoming_deadlines: Deadline[];
}

interface TeamMember {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  role: string;
  is_active: boolean;
  last_activity: string | null;
  projects_count: number;
  contributions_this_week: number;
}

interface TeamProject {
  id: number;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  completion_percentage: number;
  last_updated: string;
  assigned_members: number;
  recent_activity_count: number;
}

interface ActivityMetrics {
  total_activities: number;
  activities_this_week: number;
  activities_this_month: number;
  activity_trend: number;
  top_activity_types: Record<string, number>;
  recent_activities: Activity[];
}

interface PerformanceMetrics {
  projects_completed: number;
  projects_in_progress: number;
  projects_planned: number;
  average_project_completion_time: number;
  team_velocity: number;
  success_rate: number;
  quality_score: number;
}

interface ResourceUtilization {
  total_clusters: number;
  active_clusters: number;
  total_cpu_cores: number;
  total_memory_gb: number;
  cpu_utilization: number;
  memory_utilization: number;
  storage_usage_gb: number;
  cost_this_month: number;
  cost_trend: number;
}

interface CollaborationMetrics {
  total_team_members: number;
  active_members_this_week: number;
  cross_team_collaborations: number;
  knowledge_sharing_sessions: number;
  peer_reviews_completed: number;
  mentoring_relationships: number;
}

interface Activity {
  id: number;
  event_type: string;
  message: string;
  user_email: string;
  timestamp: string;
  success: boolean;
}

interface Alert {
  id: number;
  type: string;
  severity: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

interface Deadline {
  id: number;
  type: string;
  title: string;
  due_date: string;
  priority: string;
  completion: number;
}

export default function TeamDashboard() {
  const router = useRouter();
  const { id: teamId } = router.query;
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedView, setSelectedView] = useState('overview');

  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['team-dashboard', teamId, selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/v1/teams/${teamId}/dashboard?period_days=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch team dashboard');
      return response.json();
    },
    enabled: !!teamId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <TeamGuard teamId={parseInt(teamId as string)}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </TeamGuard>
    );
  }

  if (error || !dashboardData) {
    return (
      <TeamGuard teamId={parseInt(teamId as string)}>
        <div className="min-h-screen bg-gray-900 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Dashboard Unavailable</h2>
              <p className="text-gray-400 mb-6">Unable to load team dashboard data.</p>
              <Button onClick={() => refetch()} variant="primary">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </TeamGuard>
    );
  }

  const { team_info, members, projects, activity_metrics, performance_metrics, resource_utilization, collaboration_metrics, recent_alerts, upcoming_deadlines } = dashboardData;

  return (
    <TeamGuard teamId={parseInt(teamId as string)}>
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div>
              <div className="flex items-center mb-2">
                <UserGroupIcon className="h-8 w-8 text-blue-500 mr-3" />
                <h1 className="text-3xl font-bold text-white">{team_info.name}</h1>
                <StatusIndicator 
                  status={team_info.status === 'active' ? 'success' : 'warning'} 
                  className="ml-3"
                />
              </div>
              <p className="text-gray-400">{team_info.description}</p>
              <div className="flex items-center mt-2 space-x-6 text-sm text-gray-500">
                <span>{team_info.total_members} members</span>
                <span>{team_info.total_projects} projects</span>
                <span>Created {new Date(team_info.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 mt-4 lg:mt-0">
              <Select
                value={selectedPeriod}
                onChange={setSelectedPeriod}
                options={[
                  { value: '7', label: 'Last 7 days' },
                  { value: '30', label: 'Last 30 days' },
                  { value: '90', label: 'Last 90 days' },
                ]}
              />
              <Select
                value={selectedView}
                onChange={setSelectedView}
                options={[
                  { value: 'overview', label: 'Overview' },
                  { value: 'detailed', label: 'Detailed' },
                  { value: 'analytics', label: 'Analytics' },
                ]}
              />
              <Button
                onClick={() => refetch()}
                variant="secondary"
                leftIcon={<ActivityIcon className="h-4 w-4" />}
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* Alerts & Deadlines */}
          {(recent_alerts.length > 0 || upcoming_deadlines.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Recent Alerts */}
              {recent_alerts.length > 0 && (
                <DashboardCard>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <BellIcon className="h-5 w-5 text-yellow-500 mr-2" />
                        <h3 className="text-lg font-semibold text-white">Recent Alerts</h3>
                      </div>
                      <span className="text-sm text-gray-400">{recent_alerts.length} active</span>
                    </div>
                    <div className="space-y-3">
                      {recent_alerts.slice(0, 3).map((alert) => (
                        <div key={alert.id} className="flex items-start space-x-3 p-3 bg-gray-800 rounded-lg">
                          <div className={`mt-1 h-2 w-2 rounded-full ${
                            alert.severity === 'critical' ? 'bg-red-500' :
                            alert.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">{alert.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(alert.timestamp).toLocaleString()}
                            </p>
                          </div>
                          {alert.resolved && (
                            <span className="text-xs text-green-400">Resolved</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </DashboardCard>
              )}

              {/* Upcoming Deadlines */}
              {upcoming_deadlines.length > 0 && (
                <DashboardCard>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <CalendarIcon className="h-5 w-5 text-purple-500 mr-2" />
                        <h3 className="text-lg font-semibold text-white">Upcoming Deadlines</h3>
                      </div>
                      <span className="text-sm text-gray-400">{upcoming_deadlines.length} pending</span>
                    </div>
                    <div className="space-y-3">
                      {upcoming_deadlines.slice(0, 3).map((deadline) => (
                        <div key={deadline.id} className="p-3 bg-gray-800 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-white">{deadline.title}</h4>
                            <span className={`text-xs px-2 py-1 rounded ${
                              deadline.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                              deadline.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {deadline.priority}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                              Due {new Date(deadline.due_date).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-gray-400">{deadline.completion}% complete</span>
                          </div>
                          <div className="mt-2 w-full bg-gray-700 rounded-full h-1">
                            <div 
                              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${deadline.completion}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </DashboardCard>
              )}
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Activity Metrics */}
            <DashboardCard>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ActivityIcon className="h-6 w-6 text-blue-500 mr-2" />
                    <h3 className="text-sm font-medium text-gray-400">Total Activities</h3>
                  </div>
                  {activity_metrics.activity_trend > 0 ? (
                    <TrendingUpIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDownIcon className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <p className="text-2xl font-bold text-white mt-2">
                  {activity_metrics.total_activities.toLocaleString()}
                </p>
                <p className={`text-sm mt-1 ${
                  activity_metrics.activity_trend > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {activity_metrics.activity_trend > 0 ? '+' : ''}
                  {activity_metrics.activity_trend.toFixed(1)}% vs previous period
                </p>
              </div>
            </DashboardCard>

            {/* Performance Score */}
            <DashboardCard>
              <div className="p-6">
                <div className="flex items-center">
                  <ChartBarIcon className="h-6 w-6 text-green-500 mr-2" />
                  <h3 className="text-sm font-medium text-gray-400">Quality Score</h3>
                </div>
                <p className="text-2xl font-bold text-white mt-2">
                  {performance_metrics.quality_score.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {performance_metrics.success_rate.toFixed(1)}% success rate
                </p>
              </div>
            </DashboardCard>

            {/* Resource Utilization */}
            <DashboardCard>
              <div className="p-6">
                <div className="flex items-center">
                  <CpuChipIcon className="h-6 w-6 text-purple-500 mr-2" />
                  <h3 className="text-sm font-medium text-gray-400">CPU Usage</h3>
                </div>
                <p className="text-2xl font-bold text-white mt-2">
                  {resource_utilization.cpu_utilization.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {resource_utilization.total_cpu_cores} cores available
                </p>
              </div>
            </DashboardCard>

            {/* Team Collaboration */}
            <DashboardCard>
              <div className="p-6">
                <div className="flex items-center">
                  <UserGroupIcon className="h-6 w-6 text-yellow-500 mr-2" />
                  <h3 className="text-sm font-medium text-gray-400">Active Members</h3>
                </div>
                <p className="text-2xl font-bold text-white mt-2">
                  {collaboration_metrics.active_members_this_week}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  of {collaboration_metrics.total_team_members} total members
                </p>
              </div>
            </DashboardCard>
          </div>

          {selectedView === 'overview' && (
            <>
              {/* Projects and Members Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Active Projects */}
                <DashboardCard>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <FolderIcon className="h-5 w-5 text-blue-500 mr-2" />
                        <h3 className="text-lg font-semibold text-white">Active Projects</h3>
                      </div>
                      <Button
                        onClick={() => router.push(`/teams/${teamId}/projects`)}
                        variant="ghost"
                        size="sm"
                      >
                        View All
                      </Button>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {projects.slice(0, 5).map((project) => (
                        <TeamProjectCard key={project.id} project={project} />
                      ))}
                    </div>
                  </div>
                </DashboardCard>

                {/* Team Members */}
                <DashboardCard>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <UserGroupIcon className="h-5 w-5 text-green-500 mr-2" />
                        <h3 className="text-lg font-semibold text-white">Team Members</h3>
                      </div>
                      <Button
                        onClick={() => router.push(`/teams/${teamId}/members`)}
                        variant="ghost"
                        size="sm"
                      >
                        Manage
                      </Button>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {members.slice(0, 6).map((member) => (
                        <TeamMemberCard key={member.id} member={member} />
                      ))}
                    </div>
                  </div>
                </DashboardCard>
              </div>

              {/* Activity Feed */}
              <DashboardCard>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <ClockIcon className="h-5 w-5 text-purple-500 mr-2" />
                      <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                    </div>
                    <Button
                      onClick={() => setSelectedView('detailed')}
                      variant="ghost"
                      size="sm"
                    >
                      View Details
                    </Button>
                  </div>
                  <TeamActivityFeed 
                    teamId={parseInt(teamId as string)} 
                    limit={10}
                    showFilters={false}
                  />
                </div>
              </DashboardCard>
            </>
          )}

          {selectedView === 'detailed' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Detailed Activity Feed */}
              <div className="lg:col-span-2">
                <DashboardCard>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Detailed Activity Feed</h3>
                    <TeamActivityFeed 
                      teamId={parseInt(teamId as string)} 
                      limit={50}
                      showFilters={true}
                    />
                  </div>
                </DashboardCard>
              </div>

              {/* Detailed Metrics */}
              <div className="space-y-6">
                {/* Performance Details */}
                <DashboardCard>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Performance Details</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Completed Projects</span>
                        <span className="text-white font-medium">{performance_metrics.projects_completed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">In Progress</span>
                        <span className="text-white font-medium">{performance_metrics.projects_in_progress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Planned</span>
                        <span className="text-white font-medium">{performance_metrics.projects_planned}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Avg. Completion Time</span>
                        <span className="text-white font-medium">{performance_metrics.average_project_completion_time.toFixed(1)} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Team Velocity</span>
                        <span className="text-white font-medium">{performance_metrics.team_velocity.toFixed(1)} projects/month</span>
                      </div>
                    </div>
                  </div>
                </DashboardCard>

                {/* Resource Details */}
                <DashboardCard>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Resource Utilization</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Active Clusters</span>
                        <span className="text-white font-medium">{resource_utilization.active_clusters}/{resource_utilization.total_clusters}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Memory Usage</span>
                        <span className="text-white font-medium">{resource_utilization.memory_utilization.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Storage</span>
                        <span className="text-white font-medium">{resource_utilization.storage_usage_gb.toFixed(1)} GB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Cost This Month</span>
                        <span className="text-white font-medium">${resource_utilization.cost_this_month.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </DashboardCard>
              </div>
            </div>
          )}

          {selectedView === 'analytics' && (
            <div className="space-y-6">
              {/* Metrics Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardCard>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Activity Trends</h3>
                    <TeamMetricsChart 
                      teamId={parseInt(teamId as string)} 
                      metricType="activity"
                      period={selectedPeriod + 'd'}
                    />
                  </div>
                </DashboardCard>

                <DashboardCard>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Performance Trends</h3>
                    <TeamMetricsChart 
                      teamId={parseInt(teamId as string)} 
                      metricType="performance"
                      period={selectedPeriod + 'd'}
                    />
                  </div>
                </DashboardCard>
              </div>

              {/* Activity Types Breakdown */}
              <DashboardCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Activity Types Breakdown</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {Object.entries(activity_metrics.top_activity_types).map(([type, count]) => (
                      <div key={type} className="text-center p-3 bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-400 capitalize">{type.replace('_', ' ')}</p>
                        <p className="text-xl font-bold text-white">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </DashboardCard>
            </div>
          )}
        </div>
      </div>
    </TeamGuard>
  );
}