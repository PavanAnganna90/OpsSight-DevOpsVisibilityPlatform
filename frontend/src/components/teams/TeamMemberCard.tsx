/**
 * Team Member Card Component
 * 
 * Display component for individual team members with activity and status
 */

import React from 'react';
import { 
  UserIcon, 
  EnvelopeIcon, 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  FolderIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

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

interface TeamMemberCardProps {
  member: TeamMember;
  onClick?: (member: TeamMember) => void;
  showDetails?: boolean;
  className?: string;
}

export function TeamMemberCard({ 
  member, 
  onClick, 
  showDetails = true,
  className = ''
}: TeamMemberCardProps) {
  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
      case 'owner':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'lead':
      case 'manager':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'senior':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'developer':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getActivityLevel = (contributions: number) => {
    if (contributions >= 20) return { level: 'high', color: 'text-green-400' };
    if (contributions >= 10) return { level: 'medium', color: 'text-yellow-400' };
    if (contributions >= 5) return { level: 'low', color: 'text-blue-400' };
    return { level: 'minimal', color: 'text-gray-400' };
  };

  const formatLastActivity = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    
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

  const activityLevel = getActivityLevel(member.contributions_this_week);

  return (
    <div
      className={`p-4 bg-gray-800 rounded-lg border border-gray-700 transition-all duration-200 hover:border-gray-600 hover:shadow-md ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={() => onClick?.(member)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="h-10 w-10 bg-gray-700 rounded-full flex items-center justify-center">
              <UserIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Member Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-medium text-white truncate">
                {member.user_name}
              </h3>
              <StatusIndicator 
                status={member.is_active ? 'success' : 'error'} 
                size="sm"
              />
            </div>
            
            <div className="flex items-center mt-1 text-xs text-gray-400">
              <EnvelopeIcon className="h-3 w-3 mr-1" />
              <span className="truncate">{member.user_email}</span>
            </div>

            {/* Role Badge */}
            <div className="mt-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(member.role)}`}>
                {member.role}
              </span>
            </div>
          </div>
        </div>

        {/* Activity Status */}
        <div className="flex-shrink-0 text-right">
          <div className={`flex items-center text-xs ${activityLevel.color}`}>
            <ChartBarIcon className="h-3 w-3 mr-1" />
            <span>{activityLevel.level}</span>
          </div>
        </div>
      </div>

      {/* Additional Details */}
      {showDetails && (
        <div className="mt-4 pt-3 border-t border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-xs">
            {/* Projects */}
            <div className="text-center">
              <div className="flex items-center justify-center text-gray-400 mb-1">
                <FolderIcon className="h-3 w-3 mr-1" />
                <span>Projects</span>
              </div>
              <div className="text-white font-medium">{member.projects_count}</div>
            </div>

            {/* Contributions */}
            <div className="text-center">
              <div className="flex items-center justify-center text-gray-400 mb-1">
                <ChartBarIcon className="h-3 w-3 mr-1" />
                <span>This Week</span>
              </div>
              <div className={`font-medium ${activityLevel.color}`}>
                {member.contributions_this_week}
              </div>
            </div>

            {/* Last Activity */}
            <div className="text-center">
              <div className="flex items-center justify-center text-gray-400 mb-1">
                <ClockIcon className="h-3 w-3 mr-1" />
                <span>Last Seen</span>
              </div>
              <div className="text-white font-medium text-xs">
                {formatLastActivity(member.last_activity)}
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
              View Profile
            </button>
            <button className="text-xs text-gray-400 hover:text-gray-300 transition-colors">
              Send Message
            </button>
          </div>
        </div>
      )}
    </div>
  );
}