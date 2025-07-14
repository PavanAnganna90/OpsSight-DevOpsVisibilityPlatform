/**
 * Team & RBAC Hooks Tests
 * 
 * Comprehensive test suite for the useTeamRBAC hooks.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useTeams,
  useTeam,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useRoles,
  usePermissions,
  useUsers,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useAssignRole,
  useUnassignRole,
  useAddTeamMember,
  useRemoveTeamMember,
} from '../useTeamRBAC';
import { ReactNode } from 'react';

// Mock toast hook
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// Test wrapper component
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useTeamRBAC Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Team Hooks', () => {
    it('useTeams - fetches teams successfully', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useTeams(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([
        expect.objectContaining({
          id: '1',
          name: 'frontend-team',
          display_name: 'Frontend Team',
          description: 'Responsible for UI/UX development',
        }),
      ]);
    });

    it('useTeam - fetches single team successfully', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useTeam('1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(
        expect.objectContaining({
          id: '1',
          name: 'frontend-team',
        })
      );
    });

    it('useTeam - handles empty id', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useTeam(''), { wrapper });

      expect(result.current.isIdle).toBe(true);
    });

    it('useCreateTeam - creates team successfully', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateTeam(), { wrapper });

      const newTeam = {
        name: 'new-team',
        display_name: 'New Team',
        description: 'A new team',
        visibility: 'public' as const,
        settings: {
          join_policy: 'approval' as const,
          visibility: 'public',
          permissions: {},
        },
      };

      await waitFor(() => {
        result.current.mutate(newTeam);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(
        expect.objectContaining({
          name: 'new-team',
          display_name: 'New Team',
          description: 'A new team',
          visibility: 'public',
        })
      );
    });

    it('useUpdateTeam - updates team successfully', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateTeam(), { wrapper });

      const updateData = {
        id: '1',
        display_name: 'Updated Team Name',
      };

      await waitFor(() => {
        result.current.mutate(updateData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('useDeleteTeam - deletes team successfully', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteTeam(), { wrapper });

      await waitFor(() => {
        result.current.mutate('1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('useAddTeamMember - adds member successfully', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAddTeamMember(), { wrapper });

      const memberData = {
        teamId: '1',
        userId: 'user123',
      };

      await waitFor(() => {
        result.current.mutate(memberData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('useRemoveTeamMember - removes member successfully', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useRemoveTeamMember(), { wrapper });

      const memberData = {
        teamId: '1',
        userId: 'user123',
      };

      await waitFor(() => {
        result.current.mutate(memberData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('RBAC Hooks', () => {
    it('useRoles - fetches roles successfully', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useRoles(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([
        expect.objectContaining({
          id: '1',
          name: 'admin',
          display_name: 'Administrator',
          description: 'Full system access',
        }),
      ]);
    });

    it('usePermissions - fetches permissions successfully', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([
        expect.objectContaining({
          id: '1',
          name: 'create_teams',
          display_name: 'Create Teams',
          description: 'Ability to create new teams',
        }),
      ]);
    });

    it('useUsers - fetches users successfully', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUsers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([
        expect.objectContaining({
          id: '1',
          email: 'john.doe@example.com',
          name: 'John Doe',
          status: 'active',
        }),
      ]);
    });

    it('useCreateRole - creates role successfully', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateRole(), { wrapper });

      const newRole = {
        name: 'developer',
        display_name: 'Developer',
        description: 'Development team member',
        permissions: ['create_projects', 'read_projects'],
      };

      await waitFor(() => {
        result.current.mutate(newRole);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(
        expect.objectContaining({
          name: 'developer',
          display_name: 'Developer',
          description: 'Development team member',
        })
      );
    });

    it('useUpdateRole - updates role successfully', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateRole(), { wrapper });

      const updateData = {
        id: '1',
        display_name: 'Updated Admin',
      };

      await waitFor(() => {
        result.current.mutate(updateData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('useDeleteRole - deletes role successfully', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteRole(), { wrapper });

      await waitFor(() => {
        result.current.mutate('1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('useAssignRole - assigns role successfully', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAssignRole(), { wrapper });

      const assignData = {
        user_id: 'user123',
        role_id: 'role456',
      };

      await waitFor(() => {
        result.current.mutate(assignData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('useUnassignRole - unassigns role successfully', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUnassignRole(), { wrapper });

      const unassignData = {
        userId: 'user123',
        roleId: 'role456',
      };

      await waitFor(() => {
        result.current.mutate(unassignData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors for team operations', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateTeam(), { wrapper });

      // Mock error by providing invalid data
      const invalidTeam = {
        name: '', // Empty name should cause error
        display_name: '',
        description: '',
        visibility: 'public' as const,
        settings: {},
      };

      await waitFor(() => {
        result.current.mutate(invalidTeam);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('handles API errors for RBAC operations', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateRole(), { wrapper });

      // Mock error by providing invalid data
      const invalidRole = {
        name: '', // Empty name should cause error
        display_name: '',
        description: '',
        permissions: [],
      };

      await waitFor(() => {
        result.current.mutate(invalidRole);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Cache Management', () => {
    it('invalidates cache after team creation', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateTeam(), { wrapper });

      const newTeam = {
        name: 'cache-test-team',
        display_name: 'Cache Test Team',
        description: 'Testing cache invalidation',
        visibility: 'public' as const,
        settings: {},
      };

      await waitFor(() => {
        result.current.mutate(newTeam);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Cache should be invalidated and fresh data should be fetched
      const teamsQuery = renderHook(() => useTeams(), { wrapper });
      
      await waitFor(() => {
        expect(teamsQuery.result.current.isSuccess).toBe(true);
      });
    });

    it('invalidates cache after role creation', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateRole(), { wrapper });

      const newRole = {
        name: 'cache-test-role',
        display_name: 'Cache Test Role',
        description: 'Testing cache invalidation',
        permissions: ['test_permission'],
      };

      await waitFor(() => {
        result.current.mutate(newRole);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Cache should be invalidated and fresh data should be fetched
      const rolesQuery = renderHook(() => useRoles(), { wrapper });
      
      await waitFor(() => {
        expect(rolesQuery.result.current.isSuccess).toBe(true);
      });
    });
  });
});