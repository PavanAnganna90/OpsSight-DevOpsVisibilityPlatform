/**
 * Team Project Card Component
 * 
 * Display component for team projects with status and progress
 */

import React from 'react';
import { 
  FolderIcon, 
  UserGroupIcon, 
  ClockIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlayCircleIcon,
  PauseCircleIcon,
} from '@heroicons/react/24/outline';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

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

interface TeamProjectCardProps {
  project: TeamProject;
  onClick?: (project: TeamProject) => void;
  showDetails?: boolean;
  className?: string;
}

export function TeamProjectCard({ 
  project, 
  onClick, 
  showDetails = true,
  className = ''
}: TeamProjectCardProps) {
  const getStatusInfo = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return {
          icon: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
          label: 'Completed',
          color: 'bg-green-500/20 text-green-400 border-green-500/30'
        };
      case 'in_progress':
      case 'active':
        return {
          icon: <PlayCircleIcon className="h-5 w-5 text-blue-500" />,
          label: 'In Progress',
          color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        };
      case 'paused':
        return {
          icon: <PauseCircleIcon className="h-5 w-5 text-yellow-500" />,
          label: 'Paused',
          color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        };
      case 'planned':
        return {
          icon: <ClockIcon className="h-5 w-5 text-gray-500" />,
          label: 'Planned',
          color: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
        };
      default:
        return {
          icon: <FolderIcon className="h-5 w-5 text-gray-500" />,
          label: status,
          color: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
        };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getActivityLevel = (activityCount: number) => {
    if (activityCount >= 10) return { level: 'high', color: 'text-green-400' };
    if (activityCount >= 5) return { level: 'medium', color: 'text-yellow-400' };
    if (activityCount >= 1) return { level: 'low', color: 'text-blue-400' };
    return { level: 'quiet', color: 'text-gray-400' };
  };

  const formatLastUpdated = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const statusInfo = getStatusInfo(project.status);
  const activityLevel = getActivityLevel(project.recent_activity_count);

  return (
    <div
      className={`p-4 bg-gray-800 rounded-lg border border-gray-700 transition-all duration-200 hover:border-gray-600 hover:shadow-md ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={() => onClick?.(project)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {/* Project Icon */}
          <div className="flex-shrink-0 mt-1">
            {statusInfo.icon}
          </div>

          {/* Project Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-medium text-white truncate">
                {project.name}
              </h3>
            </div>
            
            {project.description && (
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                {project.description}
              </p>
            )}

            {/* Status and Priority Badges */}
            <div className="flex items-center space-x-2 mt-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(project.priority)}`}>
                {project.priority}
              </span>
            </div>
          </div>
        </div>

        {/* Activity Indicator */}
        <div className="flex-shrink-0 text-right">
          <div className={`flex items-center text-xs ${activityLevel.color}`}>
            <ChartBarIcon className="h-3 w-3 mr-1" />
            <span>{activityLevel.level}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Progress</span>
          <span className="text-xs text-white font-medium">
            {project.completion_percentage.toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${getCompletionColor(project.completion_percentage)}`}
            style={{ width: `${project.completion_percentage}%` }}
          />
        </div>
      </div>

      {/* Additional Details */}
      {showDetails && (
        <div className="mt-4 pt-3 border-t border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-xs">
            {/* Team Members */}
            <div className="text-center">
              <div className="flex items-center justify-center text-gray-400 mb-1">
                <UserGroupIcon className="h-3 w-3 mr-1" />
                <span>Members</span>
              </div>
              <div className="text-white font-medium">{project.assigned_members}</div>
            </div>

            {/* Recent Activity */}
            <div className="text-center">
              <div className="flex items-center justify-center text-gray-400 mb-1">
                <ChartBarIcon className="h-3 w-3 mr-1" />
                <span>Activity</span>
              </div>
              <div className={`font-medium ${activityLevel.color}`}>
                {project.recent_activity_count}
              </div>
            </div>

            {/* Last Updated */}
            <div className="text-center">
              <div className="flex items-center justify-center text-gray-400 mb-1">
                <ClockIcon className="h-3 w-3 mr-1" />
                <span>Updated</span>
              </div>
              <div className="text-white font-medium text-xs">
                {formatLastUpdated(project.last_updated)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions (shown on hover) */}
      {onClick && (
        <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex justify-end space-x-2">
            <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              View Details
            </button>
            <button className="text-xs text-gray-400 hover:text-gray-300 transition-colors">
              Edit Project
            </button>
          </div>
        </div>
      )}

      {/* Alerts for issues */}
      {project.status === 'paused' && (
        <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
          <div className="flex items-center text-xs text-yellow-400">
            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
            <span>Project is currently paused</span>
          </div>
        </div>
      )}

      {project.completion_percentage < 20 && project.status === 'in_progress' && (
        <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-md">
          <div className="flex items-center text-xs text-blue-400">
            <ChartBarIcon className="h-3 w-3 mr-1" />
            <span>Project just started</span>
          </div>
        </div>
      )}
    </div>
  );
}