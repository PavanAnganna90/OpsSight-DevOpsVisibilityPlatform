/**
 * Team API Service
 * 
 * Service for connecting to team management backend endpoints.
 * Provides methods for team CRUD operations, member management, and team settings.
 */

import {
  Team,
  TeamCreate,
  TeamUpdate,
  TeamMember,
  TeamMembershipRequest,
  TeamMemberResponse,
  TeamListResponse,
  TeamMembersResponse,
  TeamFilter,
  TeamSortOptions,
  TeamStats,
  TeamInvitation,
  TeamInvitationRequest,
  TeamActivity
} from '../types/team';

class TeamApiService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? '/api/v1/teams' 
      : 'http://localhost:8000/api/v1/teams';
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAuthToken();
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (response.status === 403) {
        throw new Error('Access denied. You do not have permission to perform this action.');
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Team API request failed: ${url}`, error);
      throw error;
    }
  }

  /**
   * Get teams with filtering, sorting, and pagination
   */
  async getTeams(
    filter?: TeamFilter,
    sort?: TeamSortOptions,
    page: number = 1,
    perPage: number = 20
  ): Promise<TeamListResponse> {
    const queryParams = new URLSearchParams();
    
    // Pagination
    queryParams.append('page', page.toString());
    queryParams.append('per_page', perPage.toString());
    
    // Sorting
    if (sort) {
      queryParams.append('sort_by', sort.field);
      queryParams.append('sort_order', sort.direction);
    }
    
    // Filtering
    if (filter) {
      if (filter.search) {
        queryParams.append('search', filter.search);
      }
      
      if (filter.role) {
        queryParams.append('role', filter.role);
      }
      
      if (filter.is_active !== undefined) {
        queryParams.append('is_active', filter.is_active.toString());
      }
      
      if (filter.created_by) {
        queryParams.append('created_by', filter.created_by.toString());
      }
      
      if (filter.member_of) {
        queryParams.append('member_of', filter.member_of.toString());
      }
    }

    return this.request<TeamListResponse>(`?${queryParams}`);
  }

  /**
   * Get a specific team by ID
   */
  async getTeam(teamId: number): Promise<Team> {
    return this.request<Team>(`/${teamId}`);
  }

  /**
   * Create a new team
   */
  async createTeam(teamData: TeamCreate): Promise<Team> {
    return this.request<Team>('', {
      method: 'POST',
      body: JSON.stringify(teamData),
    });
  }

  /**
   * Update an existing team
   */
  async updateTeam(teamId: number, teamData: TeamUpdate): Promise<Team> {
    return this.request<Team>(`/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(teamData),
    });
  }

  /**
   * Delete a team
   */
  async deleteTeam(teamId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/${teamId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return this.request<TeamMember[]>(`/${teamId}/members`);
  }

  /**
   * Add a member to a team
   */
  async addTeamMember(
    teamId: number,
    memberData: TeamMembershipRequest
  ): Promise<TeamMemberResponse> {
    return this.request<TeamMemberResponse>(`/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
  }

  /**
   * Update a team member's role
   */
  async updateTeamMemberRole(
    teamId: number,
    userId: number,
    role: string
  ): Promise<TeamMemberResponse> {
    return this.request<TeamMemberResponse>(`/${teamId}/members/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  /**
   * Remove a member from a team
   */
  async removeTeamMember(teamId: number, userId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/${teamId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Send team invitation
   */
  async inviteToTeam(
    teamId: number,
    invitationData: TeamInvitationRequest
  ): Promise<TeamInvitation> {
    return this.request<TeamInvitation>(`/${teamId}/invite`, {
      method: 'POST',
      body: JSON.stringify(invitationData),
    });
  }

  /**
   * Get team invitations
   */
  async getTeamInvitations(teamId: number): Promise<TeamInvitation[]> {
    return this.request<TeamInvitation[]>(`/${teamId}/invitations`);
  }

  /**
   * Cancel team invitation
   */
  async cancelInvitation(teamId: number, invitationId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/${teamId}/invitations/${invitationId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Accept team invitation
   */
  async acceptInvitation(token: string): Promise<TeamMemberResponse> {
    return this.request<TeamMemberResponse>(`/invitations/accept`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  /**
   * Get team statistics
   */
  async getTeamStats(): Promise<TeamStats> {
    return this.request<TeamStats>('/stats');
  }

  /**
   * Get team activity log
   */
  async getTeamActivity(
    teamId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<TeamActivity[]> {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    return this.request<TeamActivity[]>(`/${teamId}/activity?${queryParams}`);
  }

  /**
   * Check if user can perform action on team
   */
  async checkTeamPermission(
    teamId: number,
    action: 'view' | 'edit' | 'delete' | 'manage_members' | 'invite'
  ): Promise<{ allowed: boolean; reason?: string }> {
    return this.request<{ allowed: boolean; reason?: string }>(
      `/${teamId}/permissions/${action}`
    );
  }

  /**
   * Get current user's teams
   */
  async getUserTeams(): Promise<Team[]> {
    return this.request<Team[]>('/user/teams');
  }

  /**
   * Leave a team (remove self)
   */
  async leaveTeam(teamId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/${teamId}/leave`, {
      method: 'POST',
    });
  }

  /**
   * Transfer team ownership
   */
  async transferOwnership(
    teamId: number,
    newOwnerId: number
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/${teamId}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ new_owner_id: newOwnerId }),
    });
  }

  /**
   * Bulk add members to team
   */
  async bulkAddMembers(
    teamId: number,
    members: TeamMembershipRequest[]
  ): Promise<{
    successful: number;
    failed: number;
    results: TeamMemberResponse[];
  }> {
    return this.request<{
      successful: number;
      failed: number;
      results: TeamMemberResponse[];
    }>(`/${teamId}/members/bulk`, {
      method: 'POST',
      body: JSON.stringify({ members }),
    });
  }

  /**
   * Search for users to invite
   */
  async searchUsers(query: string, excludeTeamId?: number): Promise<{
    users: {
      id: number;
      github_username: string;
      email: string;
      full_name: string | null;
      avatar_url: string | null;
    }[];
  }> {
    const queryParams = new URLSearchParams({ q: query });
    if (excludeTeamId) {
      queryParams.append('exclude_team', excludeTeamId.toString());
    }

    return this.request<{
      users: {
        id: number;
        github_username: string;
        email: string;
        full_name: string | null;
        avatar_url: string | null;
      }[];
    }>(`/search/users?${queryParams}`);
  }

  /**
   * Get team health check
   */
  async getTeamHealth(): Promise<{
    total_teams: number;
    active_teams: number;
    teams_without_owners: number;
    teams_with_single_member: number;
    average_team_size: number;
    recommendations: string[];
  }> {
    return this.request<{
      total_teams: number;
      active_teams: number;
      teams_without_owners: number;
      teams_with_single_member: number;
      average_team_size: number;
      recommendations: string[];
    }>('/health');
  }
}

// Export singleton instance
export const teamApi = new TeamApiService();
export default teamApi; 