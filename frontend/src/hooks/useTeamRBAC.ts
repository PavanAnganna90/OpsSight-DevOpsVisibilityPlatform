/**
 * Team & RBAC React Query Hooks
 * 
 * Comprehensive hooks for managing team and RBAC operations with React Query.
 * Provides caching, synchronization, and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';

// API Types
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
  settings: TeamSettings;
}

interface TeamMember {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  permissions: string[];
  joined_at: string;
  last_active: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
}

interface TeamSettings {
  visibility: string;
  join_policy: 'open' | 'approval' | 'invitation';
  permissions: Record<string, boolean>;
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  permissions: Permission[];
  is_system: boolean;
  is_default: boolean;
  user_count: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  team_id?: string;
}

interface Permission {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  resource_type?: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  direct_permissions: Permission[];
  effective_permissions: Permission[];
  last_login: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
}

interface CreateTeamRequest {
  name: string;
  display_name: string;
  description: string;
  visibility: 'public' | 'private' | 'internal';
  settings: Partial<TeamSettings>;
}

interface UpdateTeamRequest {
  id: string;
  name?: string;
  display_name?: string;
  description?: string;
  visibility?: 'public' | 'private' | 'internal';
  settings?: Partial<TeamSettings>;
}

interface CreateRoleRequest {
  name: string;
  display_name: string;
  description: string;
  permissions: string[];
  team_id?: string;
}

interface UpdateRoleRequest {
  id: string;
  name?: string;
  display_name?: string;
  description?: string;
  permissions?: string[];
}

interface AssignRoleRequest {
  user_id: string;
  role_id: string;
  team_id?: string;
}

// Mock API functions - replace with actual API calls
const teamAPI = {
  getTeams: async (): Promise<Team[]> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
      {
        id: '1',
        name: 'frontend-team',
        display_name: 'Frontend Team',
        description: 'Responsible for UI/UX development',
        slug: 'frontend-team',
        is_active: true,
        visibility: 'public',
        member_count: 5,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
        owner: {
          id: '1',
          email: 'john.doe@example.com',
          name: 'John Doe',
          role: 'owner',
          permissions: ['manage_team', 'add_members'],
          joined_at: '2024-01-01T00:00:00Z',
          last_active: '2024-01-15T10:30:00Z',
          status: 'active'
        },
        members: [],
        settings: {
          visibility: 'public',
          join_policy: 'approval',
          permissions: {}
        }
      }
    ];
  },

  createTeam: async (data: CreateTeamRequest): Promise<Team> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      id: Math.random().toString(36).substr(2, 9),
      ...data,
      slug: data.name.toLowerCase().replace(/\s+/g, '-'),
      is_active: true,
      member_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner: {
        id: '1',
        email: 'current.user@example.com',
        name: 'Current User',
        role: 'owner',
        permissions: ['manage_team', 'add_members'],
        joined_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
        status: 'active'
      },
      members: [],
      settings: data.settings as TeamSettings
    };
  },

  updateTeam: async (data: UpdateTeamRequest): Promise<Team> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Mock updated team
    return {} as Team;
  },

  deleteTeam: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  },

  addTeamMember: async (teamId: string, userId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  },

  removeTeamMember: async (teamId: string, userId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};

const rbacAPI = {
  getRoles: async (): Promise<Role[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
      {
        id: '1',
        name: 'admin',
        display_name: 'Administrator',
        description: 'Full system access',
        permissions: [],
        is_system: true,
        is_default: false,
        user_count: 2,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ];
  },

  getPermissions: async (): Promise<Permission[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
      {
        id: '1',
        name: 'create_teams',
        display_name: 'Create Teams',
        description: 'Ability to create new teams',
        category: 'teams',
        is_system: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ];
  },

  getUsers: async (): Promise<User[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
      {
        id: '1',
        email: 'john.doe@example.com',
        name: 'John Doe',
        roles: [],
        direct_permissions: [],
        effective_permissions: [],
        last_login: '2024-01-15T10:30:00Z',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z'
      }
    ];
  },

  createRole: async (data: CreateRoleRequest): Promise<Role> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      id: Math.random().toString(36).substr(2, 9),
      ...data,
      permissions: [],
      is_system: false,
      is_default: false,
      user_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  },

  updateRole: async (data: UpdateRoleRequest): Promise<Role> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {} as Role;
  },

  deleteRole: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  },

  assignRole: async (data: AssignRoleRequest): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  },

  unassignRole: async (userId: string, roleId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};

// Query Keys
export const teamQueryKeys = {
  all: ['teams'] as const,
  lists: () => [...teamQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...teamQueryKeys.lists(), filters] as const,
  details: () => [...teamQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...teamQueryKeys.details(), id] as const,
  members: (id: string) => [...teamQueryKeys.detail(id), 'members'] as const,
};

export const rbacQueryKeys = {
  all: ['rbac'] as const,
  roles: () => [...rbacQueryKeys.all, 'roles'] as const,
  permissions: () => [...rbacQueryKeys.all, 'permissions'] as const,
  users: () => [...rbacQueryKeys.all, 'users'] as const,
  roleDetails: (id: string) => [...rbacQueryKeys.roles(), id] as const,
  userRoles: (userId: string) => [...rbacQueryKeys.users(), userId, 'roles'] as const,
};

// Team Hooks
export const useTeams = () => {
  return useQuery({
    queryKey: teamQueryKeys.lists(),
    queryFn: teamAPI.getTeams,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTeam = (id: string) => {
  return useQuery({
    queryKey: teamQueryKeys.detail(id),
    queryFn: () => teamAPI.getTeams().then(teams => teams.find(t => t.id === id)),
    enabled: !!id,
  });
};

export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: teamAPI.createTeam,
    onSuccess: (newTeam) => {
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.all });
      showToast('Team created successfully', 'success');
    },
    onError: (error) => {
      showToast('Failed to create team', 'error');
      console.error('Create team error:', error);
    },
  });
};

export const useUpdateTeam = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: teamAPI.updateTeam,
    onSuccess: (updatedTeam) => {
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.detail(updatedTeam.id) });
      showToast('Team updated successfully', 'success');
    },
    onError: (error) => {
      showToast('Failed to update team', 'error');
      console.error('Update team error:', error);
    },
  });
};

export const useDeleteTeam = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: teamAPI.deleteTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.all });
      showToast('Team deleted successfully', 'success');
    },
    onError: (error) => {
      showToast('Failed to delete team', 'error');
      console.error('Delete team error:', error);
    },
  });
};

// RBAC Hooks
export const useRoles = () => {
  return useQuery({
    queryKey: rbacQueryKeys.roles(),
    queryFn: rbacAPI.getRoles,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const usePermissions = () => {
  return useQuery({
    queryKey: rbacQueryKeys.permissions(),
    queryFn: rbacAPI.getPermissions,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: rbacQueryKeys.users(),
    queryFn: rbacAPI.getUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: rbacAPI.createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rbacQueryKeys.roles() });
      showToast('Role created successfully', 'success');
    },
    onError: (error) => {
      showToast('Failed to create role', 'error');
      console.error('Create role error:', error);
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: rbacAPI.updateRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rbacQueryKeys.roles() });
      showToast('Role updated successfully', 'success');
    },
    onError: (error) => {
      showToast('Failed to update role', 'error');
      console.error('Update role error:', error);
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: rbacAPI.deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rbacQueryKeys.roles() });
      showToast('Role deleted successfully', 'success');
    },
    onError: (error) => {
      showToast('Failed to delete role', 'error');
      console.error('Delete role error:', error);
    },
  });
};

export const useAssignRole = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: rbacAPI.assignRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rbacQueryKeys.users() });
      queryClient.invalidateQueries({ queryKey: rbacQueryKeys.roles() });
      showToast('Role assigned successfully', 'success');
    },
    onError: (error) => {
      showToast('Failed to assign role', 'error');
      console.error('Assign role error:', error);
    },
  });
};

export const useUnassignRole = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => 
      rbacAPI.unassignRole(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rbacQueryKeys.users() });
      queryClient.invalidateQueries({ queryKey: rbacQueryKeys.roles() });
      showToast('Role unassigned successfully', 'success');
    },
    onError: (error) => {
      showToast('Failed to unassign role', 'error');
      console.error('Unassign role error:', error);
    },
  });
};

// Team Member Management
export const useAddTeamMember = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) => 
      teamAPI.addTeamMember(teamId, userId),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.detail(teamId) });
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.members(teamId) });
      showToast('Member added successfully', 'success');
    },
    onError: (error) => {
      showToast('Failed to add member', 'error');
      console.error('Add member error:', error);
    },
  });
};

export const useRemoveTeamMember = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) => 
      teamAPI.removeTeamMember(teamId, userId),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.detail(teamId) });
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.members(teamId) });
      showToast('Member removed successfully', 'success');
    },
    onError: (error) => {
      showToast('Failed to remove member', 'error');
      console.error('Remove member error:', error);
    },
  });
};