/**
 * Team Context for managing the currently selected team across the dashboard.
 * Provides team selection, switching, and team-specific data filtering.
 */
'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Team, TeamMember } from '@/types/team';
import { teamApi } from '@/services/teamApi';

// Team context state interface
interface TeamState {
  currentTeam: Team | null;
  userTeams: Team[];
  userRole: string | null;
  isLoading: boolean;
  error: string | null;
  hasMultipleTeams: boolean;
}

// Team action types
type TeamAction =
  | { type: 'TEAMS_LOADING' }
  | { type: 'TEAMS_LOADED'; payload: { teams: Team[]; currentTeam?: Team } }
  | { type: 'TEAMS_ERROR'; payload: string }
  | { type: 'TEAM_SELECTED'; payload: { team: Team; role: string } }
  | { type: 'TEAM_CLEARED' };

// Team context interface
interface TeamContextType {
  state: TeamState;
  selectTeam: (teamId: number) => Promise<void>;
  refreshTeams: () => Promise<void>;
  clearTeam: () => void;
  isTeamMember: (teamId: number) => boolean;
  getUserRoleInTeam: (teamId: number) => string | null;
}

// Initial state
const initialState: TeamState = {
  currentTeam: null,
  userTeams: [],
  userRole: null,
  isLoading: false,
  error: null,
  hasMultipleTeams: false,
};

// Team reducer
function teamReducer(state: TeamState, action: TeamAction): TeamState {
  switch (action.type) {
    case 'TEAMS_LOADING':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'TEAMS_LOADED':
      return {
        ...state,
        isLoading: false,
        userTeams: action.payload.teams,
        currentTeam: action.payload.currentTeam || action.payload.teams[0] || null,
        hasMultipleTeams: action.payload.teams.length > 1,
        error: null,
      };
    case 'TEAMS_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };
    case 'TEAM_SELECTED':
      return {
        ...state,
        currentTeam: action.payload.team,
        userRole: action.payload.role,
      };
    case 'TEAM_CLEARED':
      return {
        ...state,
        currentTeam: null,
        userRole: null,
      };
    default:
      return state;
  }
}

// Create context
const TeamContext = createContext<TeamContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  SELECTED_TEAM_ID: 'opsight_selected_team_id',
} as const;

/**
 * Team Provider Component
 * 
 * Manages team selection state and provides team context to child components.
 * Handles team loading, selection persistence, and role management.
 * 
 * @param children - Child components that need access to team context
 */
export const TeamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(teamReducer, initialState);

  /**
   * Load user's teams from the API
   */
  const loadUserTeams = async (): Promise<void> => {
    try {
      dispatch({ type: 'TEAMS_LOADING' });
      
      // Get user's teams
      const response = await teamApi.getUserTeams();
      const teams = response || [];
      
      // Try to restore previously selected team
      const savedTeamId = localStorage.getItem(STORAGE_KEYS.SELECTED_TEAM_ID);
      let currentTeam: Team | undefined;
      
      if (savedTeamId) {
        currentTeam = teams.find(team => team.id === parseInt(savedTeamId));
      }
      
      // If no saved team or saved team not found, select first team
      if (!currentTeam && teams.length > 0) {
        currentTeam = teams[0];
      }
      
      dispatch({
        type: 'TEAMS_LOADED',
        payload: { teams, currentTeam },
      });
      
      // If we have a current team, get user's role
      if (currentTeam) {
        await setUserRoleForTeam(currentTeam.id);
      }
      
    } catch (error) {
      console.error('Failed to load user teams:', error);
      dispatch({
        type: 'TEAMS_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load teams',
      });
    }
  };

  /**
   * Get user's role in a specific team
   */
  const setUserRoleForTeam = async (teamId: number): Promise<void> => {
    try {
      const members = await teamApi.getTeamMembers(teamId);
      const currentUser = members.find((member: any) => member.user_id === state.currentTeam?.created_by_user_id);
      const userRole = currentUser?.role || 'VIEWER';
      
      if (state.currentTeam?.id === teamId) {
        dispatch({
          type: 'TEAM_SELECTED',
          payload: {
            team: state.currentTeam,
            role: userRole,
          },
        });
      }
    } catch (error) {
      console.error('Failed to get user role for team:', error);
    }
  };

  /**
   * Select a specific team
   */
  const selectTeam = async (teamId: number): Promise<void> => {
    const team = state.userTeams.find(t => t.id === teamId);
    if (!team) {
      throw new Error('Team not found in user teams');
    }

    try {
      // Get user's role in the selected team
      const members = await teamApi.getTeamMembers(teamId);
      const currentUser = members.find((member: any) => member.user_id === team.created_by_user_id);
      const userRole = currentUser?.role || 'VIEWER';
      
      dispatch({
        type: 'TEAM_SELECTED',
        payload: {
          team,
          role: userRole,
        },
      });

      // Persist selection
      localStorage.setItem(STORAGE_KEYS.SELECTED_TEAM_ID, teamId.toString());
      
    } catch (error) {
      console.error('Failed to select team:', error);
      throw error;
    }
  };

  /**
   * Refresh teams data
   */
  const refreshTeams = async (): Promise<void> => {
    await loadUserTeams();
  };

  /**
   * Clear current team selection
   */
  const clearTeam = (): void => {
    dispatch({ type: 'TEAM_CLEARED' });
    localStorage.removeItem(STORAGE_KEYS.SELECTED_TEAM_ID);
  };

  /**
   * Check if user is a member of a specific team
   */
  const isTeamMember = (teamId: number): boolean => {
    return state.userTeams.some(team => team.id === teamId);
  };

  /**
   * Get user's role in a specific team
   */
  const getUserRoleInTeam = (teamId: number): string | null => {
    if (state.currentTeam?.id === teamId) {
      return state.userRole;
    }
    // For other teams, we'd need to make an API call or cache roles
    return null;
  };

  /**
   * Load teams on component mount
   */
  useEffect(() => {
    loadUserTeams();
  }, []);

  const contextValue: TeamContextType = {
    state,
    selectTeam,
    refreshTeams,
    clearTeam,
    isTeamMember,
    getUserRoleInTeam,
  };

  return (
    <TeamContext.Provider value={contextValue}>
      {children}
    </TeamContext.Provider>
  );
};

/**
 * Hook to use team context
 * 
 * @returns Team context with state and actions
 * @throws Error if used outside TeamProvider
 */
export const useTeam = (): TeamContextType => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};

export default TeamProvider; 