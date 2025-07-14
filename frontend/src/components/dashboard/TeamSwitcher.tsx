/**
 * Team Switcher Component
 * 
 * Dropdown component for switching between user's teams in the dashboard header.
 * Shows current team, available teams, and team management options.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTeam } from '@/contexts/TeamContext';
import { Team, TeamRole } from '@/types/team';
import { Button } from '@/components/ui';

interface TeamSwitcherProps {
  /** Optional className for custom styling */
  className?: string;
  /** Show team management option for admins */
  showManagement?: boolean;
  /** Callback when team management is clicked */
  onManageTeams?: () => void;
}

/**
 * TeamSwitcher Component
 * 
 * Provides a dropdown interface for users to:
 * - View their current team
 * - Switch between available teams
 * - Access team management (for admins)
 * - Create new teams (if permitted)
 * 
 * Features:
 * - Keyboard navigation support
 * - Role-based permissions display
 * - Loading states and error handling
 * - Responsive design
 * 
 * @param className - Optional CSS classes for styling
 * @param showManagement - Whether to show team management option
 * @param onManageTeams - Callback for team management action
 */
export const TeamSwitcher: React.FC<TeamSwitcherProps> = ({
  className = '',
  showManagement = true,
  onManageTeams,
}) => {
  const { state, selectTeam } = useTeam();
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /**
   * Handle clicking outside dropdown to close it
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  /**
   * Handle team selection
   */
  const handleTeamSelect = async (teamId: number) => {
    if (teamId === state.currentTeam?.id || isChanging) {
      setIsOpen(false);
      return;
    }

    setIsChanging(true);
    try {
      await selectTeam(teamId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch team:', error);
    } finally {
      setIsChanging(false);
    }
  };

  /**
   * Get role display text
   */
  const getRoleDisplay = (role: string | null): string => {
    if (!role) return '';
    const roleMap: Record<string, string> = {
      OWNER: 'Owner',
      ADMIN: 'Admin',
      MEMBER: 'Member',
      VIEWER: 'Viewer',
    };
    return roleMap[role] || role;
  };

  /**
   * Get team initial for avatar
   */
  const getTeamInitial = (team: Team): string => {
    return team.display_name?.[0]?.toUpperCase() || team.name[0]?.toUpperCase() || 'T';
  };

  // Don't render if no teams or loading
  if (state.isLoading || !state.currentTeam) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="hidden sm:block">
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Team Switcher Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={isChanging}
        className="flex items-center space-x-3 p-2 rounded-lg text-left w-full
                 hover:bg-gray-100 dark:hover:bg-gray-700 
                 focus:outline-none focus:ring-2 focus:ring-blue-500 
                 disabled:opacity-50 disabled:cursor-not-allowed
                 transition-colors duration-200"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Current team: ${state.currentTeam.display_name || state.currentTeam.name}`}
      >
        {/* Team Avatar */}
        <div className="flex-shrink-0">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {getTeamInitial(state.currentTeam)}
            </span>
          </div>
        </div>

        {/* Team Info */}
        <div className="flex-1 min-w-0 hidden sm:block">
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {state.currentTeam.display_name || state.currentTeam.name}
          </div>
          {state.userRole && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {getRoleDisplay(state.userRole)}
            </div>
          )}
        </div>

        {/* Dropdown Arrow */}
        <div className="flex-shrink-0">
          {isChanging ? (
            <svg className="h-4 w-4 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg 
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 
                     rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 
                     py-2 z-50 max-h-96 overflow-y-auto">
          
          {/* Current Team Section */}
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Current Team
            </div>
          </div>

          {/* Teams List */}
          <div className="py-1">
            {state.userTeams.map((team) => (
              <button
                key={team.id}
                onClick={() => handleTeamSelect(team.id)}
                disabled={isChanging}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left
                         hover:bg-gray-50 dark:hover:bg-gray-700 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors duration-150
                         ${team.id === state.currentTeam?.id 
                           ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                           : 'text-gray-700 dark:text-gray-300'
                         }`}
              >
                {/* Team Avatar */}
                <div className="flex-shrink-0">
                  <div className={`h-6 w-6 rounded flex items-center justify-center
                                 ${team.id === state.currentTeam?.id 
                                   ? 'bg-blue-600' 
                                   : 'bg-gray-600'
                                 }`}>
                    <span className="text-white font-medium text-xs">
                      {getTeamInitial(team)}
                    </span>
                  </div>
                </div>

                {/* Team Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {team.display_name || team.name}
                  </div>
                  <div className="text-xs opacity-75 flex items-center space-x-2">
                    <span>{team.member_count || 0} members</span>
                    {team.settings.visibility && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{team.settings.visibility}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Current Team Indicator */}
                {team.id === state.currentTeam?.id && (
                  <div className="flex-shrink-0">
                    <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Actions Section */}
          {showManagement && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              <div className="py-1">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onManageTeams?.();
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-2 text-left text-sm
                           text-gray-700 dark:text-gray-300 
                           hover:bg-gray-50 dark:hover:bg-gray-700 
                           transition-colors duration-150"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Manage Teams</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamSwitcher; 