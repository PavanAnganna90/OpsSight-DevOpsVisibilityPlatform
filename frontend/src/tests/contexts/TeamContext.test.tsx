import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { TeamProvider, useTeam } from '../../contexts/TeamContext';
import { Team, TeamRole } from '../../types/team';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock the API calls
jest.mock('../../services/teamApi', () => ({
  teamApi: {
    getUserTeams: jest.fn(),
    getTeamMembers: jest.fn(),
  },
}));

import { teamApi } from '../../services/teamApi';
const mockGetUserTeams = teamApi.getUserTeams as jest.MockedFunction<typeof teamApi.getUserTeams>;
const mockGetTeamMembers = teamApi.getTeamMembers as jest.MockedFunction<typeof teamApi.getTeamMembers>;

const mockTeams: Team[] = [
  {
    id: 1,
    name: 'team-alpha',
    display_name: 'Team Alpha',
    description: 'Alpha development team',
    slug: 'team-alpha',
    settings: {
      allow_external_invites: true,
      require_admin_approval: false,
      default_member_role: 'member' as any,
      visibility: 'private',
      notifications: { email: true, slack: false, webhook: false },
    },
    permissions: {
      repository_access: true,
      deployment_access: true,
      monitoring_access: true,
      cost_view_access: true,
      settings_access: true,
    },
    is_active: true,
    member_count: 5,
    created_by_user_id: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2, 
    name: 'team-beta',
    display_name: 'Team Beta',
    description: 'Beta testing team',
    slug: 'team-beta',
    settings: {
      allow_external_invites: false,
      require_admin_approval: true,
      default_member_role: 'viewer' as any,
      visibility: 'private',
      notifications: { email: true, slack: true, webhook: false },
    },
    permissions: {
      repository_access: true,
      deployment_access: false,
      monitoring_access: true,
      cost_view_access: false,
      settings_access: false,
    },
    is_active: true,
    member_count: 3,
    created_by_user_id: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const wrapper = ({ children }: { children: ReactNode }) => (
  <TeamProvider>{children}</TeamProvider>
);

describe('TeamContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useTeam(), { wrapper });
      
      expect(result.current.state).toEqual({
        currentTeam: null,
        userTeams: [],
        userRole: null,
        isLoading: false,
        error: null,
        hasMultipleTeams: false,
      });
    });

    it('should load teams on mount', async () => {
      mockGetUserTeams.mockResolvedValueOnce(mockTeams);
      mockGetTeamMembers.mockResolvedValueOnce([
        { 
          user_id: 1, 
          role: TeamRole.ADMIN,
          team_id: 1,
          joined_at: new Date().toISOString(),
          invited_by_user_id: 1,
          is_active: true,
          user: { 
            id: 1, 
            github_username: 'user1', 
            email: 'user1@test.com',
            full_name: 'User 1',
            avatar_url: null
          }
        }
      ]);

      const { result } = renderHook(() => useTeam(), { wrapper });

      await act(async () => {
        // Wait for the effect to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(mockGetUserTeams).toHaveBeenCalledTimes(1);
      expect(result.current.state.userTeams).toEqual(mockTeams);
      expect(result.current.state.currentTeam).toEqual(mockTeams[0]);
      expect(result.current.state.hasMultipleTeams).toBe(true);
      expect(result.current.state.error).toBeNull();
    });
  });

  describe('Team Selection Persistence', () => {
    it('should restore saved team from localStorage', async () => {
      mockLocalStorage.getItem.mockReturnValue('2');
      mockGetUserTeams.mockResolvedValueOnce(mockTeams);
      mockGetTeamMembers.mockResolvedValueOnce([
        { 
          user_id: 2, 
          role: TeamRole.MEMBER,
          team_id: 2,
          joined_at: new Date().toISOString(),
          invited_by_user_id: 1,
          is_active: true,
          user: { 
            id: 2, 
            github_username: 'user2', 
            email: 'user2@test.com',
            full_name: 'User 2',
            avatar_url: null
          }
        }
      ]);

      const { result } = renderHook(() => useTeam(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.state.currentTeam).toEqual(mockTeams[1]);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('opsight_selected_team_id');
    });

    it('should fallback to first team if saved team not found', async () => {
      mockLocalStorage.getItem.mockReturnValue('999'); // Non-existent team
      mockGetUserTeams.mockResolvedValueOnce(mockTeams);
      mockGetTeamMembers.mockResolvedValueOnce([
        { user_id: 1, role: 'ADMIN' }
      ]);

      const { result } = renderHook(() => useTeam(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.state.currentTeam).toEqual(mockTeams[0]);
    });
  });

  describe('Team Selection', () => {
    it('should select teams correctly', async () => {
      mockGetUserTeams.mockResolvedValueOnce(mockTeams);
      mockGetTeamMembers
        .mockResolvedValueOnce([{ user_id: 1, role: 'ADMIN' }])
        .mockResolvedValueOnce([{ user_id: 2, role: 'MEMBER' }]);

      const { result } = renderHook(() => useTeam(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Select team beta
      await act(async () => {
        await result.current.selectTeam(2);
      });

      expect(result.current.state.currentTeam).toEqual(mockTeams[1]);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('opsight_selected_team_id', '2');
    });

    it('should not select non-existent team', async () => {
      mockGetUserTeams.mockResolvedValueOnce(mockTeams);
      mockGetTeamMembers.mockResolvedValueOnce([
        { user_id: 1, role: 'ADMIN' }
      ]);

      const { result } = renderHook(() => useTeam(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const originalTeam = result.current.state.currentTeam;

      // Try to select non-existent team
      await act(async () => {
        try {
          await result.current.selectTeam(999);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.state.currentTeam).toEqual(originalTeam);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors correctly', async () => {
      const errorMessage = 'Failed to fetch teams';
      mockGetUserTeams.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useTeam(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.state.userTeams).toEqual([]);
      expect(result.current.state.currentTeam).toBeNull();
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBe(errorMessage);
    });
  });

  describe('Team Utilities', () => {
    it('should check team membership correctly', async () => {
      mockGetUserTeams.mockResolvedValueOnce(mockTeams);
      mockGetTeamMembers.mockResolvedValueOnce([
        { user_id: 1, role: 'ADMIN' }
      ]);

      const { result } = renderHook(() => useTeam(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.isTeamMember(1)).toBe(true);
      expect(result.current.isTeamMember(2)).toBe(true);
      expect(result.current.isTeamMember(999)).toBe(false);
    });

    it('should clear team selection', async () => {
      mockGetUserTeams.mockResolvedValueOnce(mockTeams);
      mockGetTeamMembers.mockResolvedValueOnce([
        { user_id: 1, role: 'ADMIN' }
      ]);

      const { result } = renderHook(() => useTeam(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Clear team
      act(() => {
        result.current.clearTeam();
      });

      expect(result.current.state.currentTeam).toBeNull();
      expect(result.current.state.userRole).toBeNull();
    });
  });
}); 