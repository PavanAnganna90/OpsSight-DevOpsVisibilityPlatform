from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime

from ..models.team import TeamRole


class TeamBase(BaseModel):
    """Base team schema with common fields"""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_active: bool = True
    settings: Optional[Dict[str, Any]] = None


class TeamCreate(TeamBase):
    """Schema for creating a new team"""

    pass


class TeamUpdate(BaseModel):
    """Schema for updating an existing team"""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None


class TeamMemberBase(BaseModel):
    """Base schema for team membership"""

    role: TeamRole
    joined_at: Optional[datetime] = None


class TeamMemberCreate(TeamMemberBase):
    """Schema for adding a team member"""

    user_id: int = Field(..., gt=0)
    team_id: int = Field(..., gt=0)


class TeamMemberUpdate(BaseModel):
    """Schema for updating team membership"""

    role: Optional[TeamRole] = None


class TeamMember(TeamMemberBase):
    """Complete team member schema for responses"""

    user_id: int
    team_id: int
    joined_at: datetime

    # User details (populated from relationship)
    user_email: Optional[str] = None
    user_full_name: Optional[str] = None
    user_github_username: Optional[str] = None
    user_avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class Team(TeamBase):
    """Complete team schema for responses"""

    id: int
    created_at: datetime
    updated_at: datetime

    # Statistics
    member_count: int = 0
    admin_count: int = 0

    # Related data
    members: Optional[List[TeamMember]] = None

    class Config:
        from_attributes = True


class TeamWithMembers(Team):
    """Team schema with detailed member information"""

    members: List[TeamMember]


class TeamStats(BaseModel):
    """Team statistics schema"""

    total_members: int = Field(..., ge=0)
    admins: int = Field(..., ge=0)
    members: int = Field(..., ge=0)
    viewers: int = Field(..., ge=0)
    recent_activity: List[Dict[str, Any]] = []
    projects_count: int = Field(..., ge=0)
    active_projects: int = Field(..., ge=0)


class TeamWithStats(Team):
    """Team with computed statistics"""

    stats: TeamStats


class TeamInvitation(BaseModel):
    """Schema for team invitations"""

    id: int
    team_id: int
    invited_email: str
    invited_by_user_id: int
    role: TeamRole
    token: str
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    accepted_by_user_id: Optional[int] = None
    created_at: datetime

    # Team details
    team_name: Optional[str] = None
    invited_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class TeamInvitationCreate(BaseModel):
    """Schema for creating team invitations"""

    team_id: int = Field(..., gt=0)
    invited_email: str = Field(..., pattern=r"^[^@]+@[^@]+\.[^@]+$")
    role: TeamRole = TeamRole.MEMBER
    expires_in_hours: int = Field(
        default=168, gt=0, le=720
    )  # Default 7 days, max 30 days


class TeamInvitationUpdate(BaseModel):
    """Schema for updating team invitations"""

    role: Optional[TeamRole] = None
    expires_at: Optional[datetime] = None


class TeamPermissions(BaseModel):
    """Schema for team permissions"""

    can_create_projects: bool = False
    can_manage_infrastructure: bool = False
    can_manage_pipelines: bool = False
    can_manage_automation: bool = False
    can_view_alerts: bool = True
    can_manage_alerts: bool = False
    can_manage_team: bool = False
    can_invite_members: bool = False
    can_remove_members: bool = False


class TeamSettings(BaseModel):
    """Schema for team settings"""

    default_permissions: TeamPermissions
    notification_preferences: Dict[str, Any] = {}
    integration_settings: Dict[str, Any] = {}
    custom_fields: Dict[str, Any] = {}


class TeamActivity(BaseModel):
    """Schema for team activity tracking"""

    id: int
    team_id: int
    user_id: int
    action: str  # joined, left, role_changed, project_created, etc.
    description: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    # User details
    user_name: Optional[str] = None
    user_email: Optional[str] = None

    class Config:
        from_attributes = True


class TeamProjectAccess(BaseModel):
    """Schema for team project access"""

    team_id: int
    project_id: int
    access_level: str  # read, write, admin
    granted_at: datetime
    granted_by_user_id: int

    # Project details
    project_name: Optional[str] = None
    project_description: Optional[str] = None

    class Config:
        from_attributes = True


# Aliases for endpoint compatibility
TeamResponse = Team
TeamMemberResponse = TeamMember
TeamStatsResponse = TeamStats
TeamInvitationResponse = TeamInvitation
TeamMembershipRequest = TeamMemberCreate
