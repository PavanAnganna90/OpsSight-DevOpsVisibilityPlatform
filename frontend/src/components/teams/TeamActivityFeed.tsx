/**
 * Team Activity Feed Component
 * 
 * Real-time activity feed for team operations and member actions
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface Activity {
  id: number;
  event_type: string;
  event_category: string;
  message: string;
  user_email: string;
  user_name: string;
  timestamp: string;
  success: boolean;
  resource_type: string;
  resource_name: string;
  metadata: Record<string, any>;
}

interface TeamActivityFeedProps {
  teamId: number;
  limit?: number;
  showFilters?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function TeamActivityFeed({
  teamId,
  limit = 20,
  showFilters = true,
  autoRefresh = true,
  refreshInterval = 30000
}: TeamActivityFeedProps) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    activity_types: '',
    search: '',
    success_only: false
  });
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  const { data: activitiesData, isLoading, error, refetch } = useQuery({
    queryKey: ['team-activity-feed', teamId, page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
      });

      if (filters.activity_types) {
        params.append('activity_types', filters.activity_types);
      }

      const response = await fetch(`/api/v1/teams/${teamId}/activity-feed?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch activity feed');
      return response.json();
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  const activities = activitiesData?.activities || [];

  const getActivityIcon = (eventType: string, success: boolean) => {
    if (!success) {
      return <XCircleIcon className="h-5 w-5 text-red-500" />;
    }

    switch (eventType) {
      case 'login_success':
      case 'sso_login_success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'user_created':
      case 'team_member_added':
        return <UserIcon className="h-5 w-5 text-blue-500" />;
      case 'project_created':
      case 'deployment_created':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'security_violation':
      case 'suspicious_activity':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getActivityColor = (eventType: string, success: boolean) => {
    if (!success) return 'border-red-500/20 bg-red-500/5';
    
    switch (eventType) {
      case 'login_success':
      case 'sso_login_success':
      case 'user_created':
      case 'project_created':
        return 'border-green-500/20 bg-green-500/5';
      case 'security_violation':
      case 'suspicious_activity':
        return 'border-yellow-500/20 bg-yellow-500/5';
      case 'permission_denied':
        return 'border-orange-500/20 bg-orange-500/5';
      default:
        return 'border-gray-700 bg-gray-800/50';
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      activity_types: '',
      search: '',
      success_only: false
    });
    setPage(1);
  };

  if (isLoading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-400 mb-4">Failed to load activity feed</p>
        <Button onClick={() => refetch()} variant="secondary" size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {showFilters && (
            <Button
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              variant="ghost"
              size="sm"
              leftIcon={<FunnelIcon className="h-4 w-4" />}
            >
              Filters
            </Button>
          )}
          <Button
            onClick={() => refetch()}
            variant="ghost"
            size="sm"
            leftIcon={<ArrowPathIcon className="h-4 w-4" />}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
        
        {activitiesData?.has_more && (
          <Button
            onClick={() => setPage(page + 1)}
            variant="secondary"
            size="sm"
            disabled={isLoading}
          >
            Load More
          </Button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && showFiltersPanel && (
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Activity Types
              </label>
              <Select
                value={filters.activity_types}
                onChange={(value) => handleFilterChange('activity_types', value)}
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'login_success,sso_login_success', label: 'Logins' },
                  { value: 'user_created,user_updated', label: 'User Management' },
                  { value: 'project_created,project_updated', label: 'Projects' },
                  { value: 'deployment_created,deployment_updated', label: 'Deployments' },
                  { value: 'security_violation,suspicious_activity', label: 'Security Events' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search
              </label>
              <TextField
                value={filters.search}
                onChange={(value) => handleFilterChange('search', value)}
                placeholder="Search activities..."
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={clearFilters}
                variant="secondary"
                size="sm"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Activity List */}
      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ClockIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No activities found</p>
            <p className="text-sm">Team activities will appear here as they happen</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${getActivityColor(activity.event_type, activity.success)}`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.event_type, activity.success)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-white">
                      {activity.message}
                    </p>
                    <StatusIndicator
                      status={activity.success ? 'success' : 'error'}
                      size="sm"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-400">
                    {activity.user_name && (
                      <span className="flex items-center">
                        <UserIcon className="h-3 w-3 mr-1" />
                        {activity.user_name}
                      </span>
                    )}
                    
                    {activity.resource_type && activity.resource_name && (
                      <span>
                        {activity.resource_type}: {activity.resource_name}
                      </span>
                    )}
                    
                    <span className="flex items-center">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>
                  
                  {/* Event Category Badge */}
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      activity.event_category === 'authentication' ? 'bg-blue-500/20 text-blue-400' :
                      activity.event_category === 'authorization' ? 'bg-purple-500/20 text-purple-400' :
                      activity.event_category === 'security' ? 'bg-red-500/20 text-red-400' :
                      activity.event_category === 'infrastructure' ? 'bg-green-500/20 text-green-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {activity.event_category.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Additional Details (expandable) */}
                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                        View Details
                      </summary>
                      <div className="mt-2 p-2 bg-gray-900/50 rounded text-xs text-gray-300">
                        <pre className="whitespace-pre-wrap font-mono">
                          {JSON.stringify(activity.metadata, null, 2)}
                        </pre>
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Loading More Indicator */}
      {isLoading && activities.length > 0 && (
        <div className="flex items-center justify-center py-4">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-gray-400 text-sm">Loading more activities...</span>
        </div>
      )}
    </div>
  );
}