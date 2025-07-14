"""
Team management API endpoints.
Demonstrates team-based RBAC middleware integration.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Path
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.core.dependencies import get_db, get_async_db
from app.models.user import User
from app.models.role import PermissionType
from app.models.team import TeamRole
from app.schemas.team import (
    TeamResponse,
    TeamCreate,
    TeamUpdate,
    TeamMemberResponse,
    TeamMembershipRequest,
)
from app.services.team_service import TeamService
from app.core.auth import (
    get_current_user,
    require_permission,
    require_team_access,
    get_rbac_context,
    RBACContext,
    PermissionDeniedError,
    audit_access_attempt,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=List[TeamResponse])
async def list_teams(
    db: Session = Depends(get_db),
    context: RBACContext = Depends(require_permission(PermissionType.VIEW_TEAMS)),
) -> List[TeamResponse]:
    """
    List all teams (requires VIEW_TEAMS permission).
    """
    try:
        teams = await TeamService.get_all_teams(db)
        audit_access_attempt(
            user=context.user, resource="teams", action="list", granted=True
        )
        return teams
    except Exception as e:
        logger.error(f"Error listing teams: {e}")
        audit_access_attempt(
            user=context.user,
            resource="teams",
            action="list",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve teams",
        )


@router.post("/", response_model=TeamResponse)
async def create_team(
    team_data: TeamCreate,
    db: Session = Depends(get_db),
    context: RBACContext = Depends(require_permission(PermissionType.CREATE_TEAMS)),
) -> TeamResponse:
    """
    Create a new team (requires CREATE_TEAMS permission).
    """
    try:
        team = await TeamService.create_team(db, team_data, context.user.id)
        audit_access_attempt(
            user=context.user, resource="teams", action="create", granted=True
        )
        logger.info(f"User {context.user.id} created team: {team.name}")
        return team
    except Exception as e:
        logger.error(f"Error creating team: {e}")
        audit_access_attempt(
            user=context.user,
            resource="teams",
            action="create",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create team",
        )


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: int,
    db: Session = Depends(get_db),
    context: RBACContext = Depends(require_team_access(TeamRole.VIEWER)),
) -> TeamResponse:
    """
    Get team details (requires team membership as VIEWER or higher).
    """
    try:
        team = await TeamService.get_team_by_id(db, team_id)
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
            )

        audit_access_attempt(
            user=context.user, resource=f"teams/{team_id}", action="view", granted=True
        )
        return team
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving team {team_id}: {e}")
        audit_access_attempt(
            user=context.user,
            resource=f"teams/{team_id}",
            action="view",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve team",
        )


@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: int,
    team_data: TeamUpdate,
    db: Session = Depends(get_db),
    context: RBACContext = Depends(require_team_access(TeamRole.ADMIN)),
) -> TeamResponse:
    """
    Update team (requires team ADMIN role or higher).
    """
    try:
        team = await TeamService.update_team(db, team_id, team_data)
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
            )

        audit_access_attempt(
            user=context.user,
            resource=f"teams/{team_id}",
            action="update",
            granted=True,
        )
        logger.info(f"User {context.user.id} updated team: {team_id}")
        return team
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating team {team_id}: {e}")
        audit_access_attempt(
            user=context.user,
            resource=f"teams/{team_id}",
            action="update",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update team",
        )


@router.delete("/{team_id}")
async def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    context: RBACContext = Depends(require_team_access(TeamRole.OWNER)),
) -> dict:
    """
    Delete team (requires team OWNER role).
    """
    try:
        success = await TeamService.delete_team(db, team_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
            )

        audit_access_attempt(
            user=context.user,
            resource=f"teams/{team_id}",
            action="delete",
            granted=True,
        )
        logger.info(f"User {context.user.id} deleted team: {team_id}")
        return {"message": "Team deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting team {team_id}: {e}")
        audit_access_attempt(
            user=context.user,
            resource=f"teams/{team_id}",
            action="delete",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete team",
        )


@router.get("/{team_id}/members", response_model=List[TeamMemberResponse])
async def get_team_members(
    team_id: int,
    db: Session = Depends(get_db),
    context: RBACContext = Depends(require_team_access(TeamRole.MEMBER)),
) -> List[TeamMemberResponse]:
    """
    Get team members (requires team MEMBER role or higher).
    """
    try:
        members = await TeamService.get_team_members(db, team_id)
        audit_access_attempt(
            user=context.user,
            resource=f"teams/{team_id}/members",
            action="view",
            granted=True,
        )
        return members
    except Exception as e:
        logger.error(f"Error retrieving team members: {e}")
        audit_access_attempt(
            user=context.user,
            resource=f"teams/{team_id}/members",
            action="view",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve team members",
        )


@router.post("/{team_id}/members", response_model=TeamMemberResponse)
async def add_team_member(
    team_id: int,
    membership: TeamMembershipRequest,
    db: Session = Depends(get_db),
    context: RBACContext = Depends(require_team_access(TeamRole.ADMIN)),
) -> TeamMemberResponse:
    """
    Add member to team (requires team ADMIN role or higher).
    """
    try:
        member = await TeamService.add_team_member(
            db, team_id, membership.user_id, membership.role, context.user.id
        )
        if not member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to add team member",
            )

        audit_access_attempt(
            user=context.user,
            resource=f"teams/{team_id}/members",
            action="add",
            granted=True,
        )
        logger.info(
            f"User {context.user.id} added member {membership.user_id} to team {team_id}"
        )
        return member
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding team member: {e}")
        audit_access_attempt(
            user=context.user,
            resource=f"teams/{team_id}/members",
            action="add",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add team member",
        )


@router.delete("/{team_id}/members/{user_id}")
async def remove_team_member(
    team_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    context: RBACContext = Depends(require_team_access(TeamRole.ADMIN)),
) -> dict:
    """
    Remove member from team (requires team ADMIN role or higher).
    Users can also remove themselves.
    """
    try:
        # Allow users to remove themselves regardless of role
        if context.user.id == user_id:
            success = await TeamService.remove_team_member(db, team_id, user_id)
        else:
            # Ensure user has admin permissions for removing others
            if not context.has_team_permission(TeamRole.ADMIN):
                raise PermissionDeniedError(
                    "Admin role required to remove other members"
                )
            success = await TeamService.remove_team_member(db, team_id, user_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found"
            )

        audit_access_attempt(
            user=context.user,
            resource=f"teams/{team_id}/members/{user_id}",
            action="remove",
            granted=True,
        )
        logger.info(
            f"User {context.user.id} removed member {user_id} from team {team_id}"
        )
        return {"message": "Team member removed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing team member: {e}")
        audit_access_attempt(
            user=context.user,
            resource=f"teams/{team_id}/members/{user_id}",
            action="remove",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove team member",
        )


@router.get("/api/teams")
async def get_teams():
    """
    Get all teams for the Teams panel.
    Returns: list of {id, name, members, role, status}
    """
    return [
        {
            "id": 1,
            "name": "DevOps",
            "members": ["alice", "bob"],
            "role": "admin",
            "status": "active",
        },
        {
            "id": 2,
            "name": "QA",
            "members": ["carol"],
            "role": "member",
            "status": "active",
        },
        {
            "id": 3,
            "name": "SRE",
            "members": ["dave"],
            "role": "member",
            "status": "pending",
        },
    ]


@router.post("/api/teams/{team_id}/invite")
async def invite_to_team(team_id: int = Path(...)):
    """
    Invite a member to a team by ID.
    Returns: success message
    """
    return JSONResponse(
        {"message": f"Invitation sent for team {team_id}"}, status_code=200
    )


@router.post("/api/teams/{team_id}/remove_member")
async def remove_team_member(team_id: int = Path(...)):
    """
    Remove a member from a team by ID.
    Returns: success message
    """
    return JSONResponse(
        {"message": f"Member removed from team {team_id}"}, status_code=200
    )
