/**
 * Team management TypeScript types.
 * Corresponds to backend Team, UserTeam, and related models.
 */

/**
 * Team role within a team context
 */
export enum TeamRole {
  OWNER = 'owner',
  ADMIN = 'admin', 
  MEMBER = 'member',
  VIEWER = 'viewer'
}

/**
 * Team interface
 */
export interface Team {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  slug: string;
  settings: TeamSettings;
  permissions: TeamPermissions;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  member_count?: number;
  created_by_user_id?: number;
}

/**
 * Team settings configuration
 */
export interface TeamSettings {
  allow_external_invites: boolean;
  require_admin_approval: boolean;
  default_member_role: TeamRole;
  visibility: 'public' | 'private' | 'internal';
  notifications: {
    email: boolean;
    slack: boolean;
    webhook: boolean;
  };
}

/**
 * Team permissions configuration
 */
export interface TeamPermissions {
  repository_access: boolean;
  deployment_access: boolean;
  monitoring_access: boolean;
  cost_view_access: boolean;
  settings_access: boolean;
}

/**
 * Team member information
 */
export interface TeamMember {
  user_id: number;
  team_id: number;
  role: TeamRole;
  joined_at: string;
  invited_by_user_id: number | null;
  is_active: boolean;
  user: {
    id: number;
    github_username: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

/**
 * Team creation request
 */
export interface TeamCreate {
  name: string;
  display_name?: string;
  description?: string;
  settings?: Partial<TeamSettings>;
  permissions?: Partial<TeamPermissions>;
}

/**
 * Team update request
 */
export interface TeamUpdate {
  name?: string;
  display_name?: string;
  description?: string;
  settings?: Partial<TeamSettings>;
  permissions?: Partial<TeamPermissions>;
  is_active?: boolean;
}

/**
 * Team membership request
 */
export interface TeamMembershipRequest {
  user_id: number;
  role: TeamRole;
}

/**
 * Team member response after actions
 */
export interface TeamMemberResponse {
  user_id: number;
  team_id: number;
  role: TeamRole;
  joined_at: string;
  invited_by_user_id: number | null;
  is_active: boolean;
  message?: string;
}

/**
 * Team list response with pagination
 */
export interface TeamListResponse {
  teams: Team[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

/**
 * Team members list response
 */
export interface TeamMembersResponse {
  members: TeamMember[];
  total: number;
  team: {
    id: number;
    name: string;
    display_name: string;
  };
}

/**
 * Team filtering options
 */
export interface TeamFilter {
  search?: string;
  role?: TeamRole;
  is_active?: boolean;
  created_by?: number;
  member_of?: number; // Filter teams user is a member of
}

/**
 * Team sorting options
 */
export interface TeamSortOptions {
  field: 'name' | 'display_name' | 'created_at' | 'updated_at' | 'member_count';
  direction: 'asc' | 'desc';
}

/**
 * Team statistics
 */
export interface TeamStats {
  total_teams: number;
  active_teams: number;
  total_members: number;
  roles_distribution: {
    [key in TeamRole]: number;
  };
  recent_activity: {
    new_teams: number;
    new_members: number;
    period: string;
  };
}

/**
 * Team invitation
 */
export interface TeamInvitation {
  id: number;
  team_id: number;
  email: string;
  role: TeamRole;
  invited_by_user_id: number;
  token: string;
  expires_at: string;
  accepted: boolean;
  created_at: string;
  team: {
    name: string;
    display_name: string;
  };
  invited_by: {
    github_username: string;
    email: string;
  };
}

/**
 * Team invitation request
 */
export interface TeamInvitationRequest {
  email: string;
  role: TeamRole;
  message?: string;
}

/**
 * Team activity log entry
 */
export interface TeamActivity {
  id: number;
  team_id: number;
  user_id: number;
  action: 'created' | 'updated' | 'member_added' | 'member_removed' | 'role_changed' | 'settings_updated';
  details: {
    [key: string]: any;
  };
  timestamp: string;
  user: {
    github_username: string;
    avatar_url: string | null;
  };
} 