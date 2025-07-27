"""
Team Collaboration API endpoints for cross-team interactions and resource sharing.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.db.database import get_async_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.team_collaboration import CollaborationType, CollaborationStatus
from app.services.team_collaboration_service import get_team_collaboration_service

router = APIRouter()


# Pydantic models for API requests/responses
class CollaborationRequestCreate(BaseModel):
    target_team_id: int
    collaboration_type: CollaborationType
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    shared_resources: Optional[List[Dict[str, Any]]] = None
    collaboration_goals: Optional[List[str]] = None
    success_metrics: Optional[List[str]] = None
    duration_days: Optional[int] = Field(None, ge=1, le=365)
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        schema_extra = {
            "example": {
                "target_team_id": 2,
                "collaboration_type": "project_collaboration",
                "title": "Q4 Infrastructure Migration Collaboration",
                "description": "Collaborate on migrating infrastructure to new cloud provider",
                "shared_resources": [
                    {
                        "resource_type": "project",
                        "resource_id": "proj_123",
                        "resource_name": "Migration Project",
                        "permissions": {"read": True, "write": True},
                        "access_level": "write"
                    }
                ],
                "collaboration_goals": [
                    "Complete infrastructure migration by Q4",
                    "Knowledge transfer on new technologies",
                    "Joint deployment procedures"
                ],
                "duration_days": 90
            }
        }


class CollaborationApprovalRequest(BaseModel):
    approved: bool
    reason: Optional[str] = None
    start_date: Optional[datetime] = None


class SharedResourceCreate(BaseModel):
    resource_type: str = Field(..., min_length=1, max_length=50)
    resource_id: str = Field(..., min_length=1, max_length=100)
    resource_name: str = Field(..., min_length=1, max_length=200)
    permissions: Dict[str, Any] = Field(default_factory=dict)
    access_level: str = Field(default="read", pattern="^(read|write|admin)$")
    expires_at: Optional[datetime] = None


class CollaborationResponse(BaseModel):
    id: int
    requesting_team_id: int
    target_team_id: int
    collaboration_type: str
    title: str
    description: Optional[str]
    status: str
    requested_at: datetime
    approved_at: Optional[datetime]
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    requesting_team: Dict[str, Any]
    target_team: Dict[str, Any]
    requested_by: Dict[str, Any]
    approved_by: Optional[Dict[str, Any]]
    shared_resources_count: int
    metadata: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True


class SharedResourceResponse(BaseModel):
    id: int
    collaboration_id: int
    resource_type: str
    resource_id: str
    resource_name: str
    permissions: Dict[str, Any]
    access_level: str
    shared_at: datetime
    expires_at: Optional[datetime]
    is_active: bool
    access_count: int
    last_accessed_at: Optional[datetime]

    class Config:
        from_attributes = True


class CollaborationActivityResponse(BaseModel):
    id: int
    activity_type: str
    title: str
    description: Optional[str]
    user: Dict[str, Any]
    team: Dict[str, Any]
    created_at: datetime
    metadata: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True


@router.post("/requests", response_model=CollaborationResponse)
async def create_collaboration_request(
    request: Request,
    collaboration_data: CollaborationRequestCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_db)
):
    """Create a new collaboration request."""
    
    # Get current user's team (simplified - in reality, you'd get this from context)
    requesting_team_id = getattr(current_user, 'current_team_id', 1)  # Default fallback
    
    service = await get_team_collaboration_service(session)
    
    try:
        collaboration = await service.create_collaboration_request(
            requesting_team_id=requesting_team_id,
            target_team_id=collaboration_data.target_team_id,
            collaboration_type=collaboration_data.collaboration_type,
            title=collaboration_data.title,
            description=collaboration_data.description,
            requested_by_user_id=current_user.id,
            metadata=collaboration_data.metadata,
            shared_resources=collaboration_data.shared_resources,
            collaboration_goals=collaboration_data.collaboration_goals,
            success_metrics=collaboration_data.success_metrics,
            duration_days=collaboration_data.duration_days
        )
        
        return CollaborationResponse(
            id=collaboration.id,
            requesting_team_id=collaboration.requesting_team_id,
            target_team_id=collaboration.target_team_id,
            collaboration_type=collaboration.collaboration_type.value,
            title=collaboration.title,
            description=collaboration.description,
            status=collaboration.status.value,
            requested_at=collaboration.requested_at,
            approved_at=collaboration.approved_at,
            start_date=collaboration.start_date,
            end_date=collaboration.end_date,
            requesting_team={
                "id": collaboration.requesting_team.id,
                "name": collaboration.requesting_team.name
            },
            target_team={
                "id": collaboration.target_team.id,
                "name": collaboration.target_team.name
            },
            requested_by={
                "id": collaboration.requested_by.id,
                "name": collaboration.requested_by.full_name,
                "email": collaboration.requested_by.email
            },
            approved_by=None,
            shared_resources_count=len(collaboration.shared_resources_list) if collaboration.shared_resources_list else 0,
            metadata=collaboration.metadata
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create collaboration request")


@router.get("/teams/{team_id}/collaborations", response_model=List[CollaborationResponse])
async def get_team_collaborations(
    team_id: int,
    request: Request,
    status: Optional[CollaborationStatus] = Query(None, description="Filter by status"),
    collaboration_type: Optional[CollaborationType] = Query(None, description="Filter by type"),
    limit: int = Query(50, ge=1, le=200, description="Limit results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_db)
):
    """Get collaborations for a team."""
    
    service = await get_team_collaboration_service(session)
    
    try:
        collaborations = await service.get_team_collaborations(
            team_id=team_id,
            status=status,
            collaboration_type=collaboration_type,
            limit=limit,
            offset=offset
        )
        
        return [
            CollaborationResponse(
                id=collab.id,
                requesting_team_id=collab.requesting_team_id,
                target_team_id=collab.target_team_id,
                collaboration_type=collab.collaboration_type.value,
                title=collab.title,
                description=collab.description,
                status=collab.status.value,
                requested_at=collab.requested_at,
                approved_at=collab.approved_at,
                start_date=collab.start_date,
                end_date=collab.end_date,
                requesting_team={
                    "id": collab.requesting_team.id,
                    "name": collab.requesting_team.name
                },
                target_team={
                    "id": collab.target_team.id,
                    "name": collab.target_team.name
                },
                requested_by={
                    "id": collab.requested_by.id,
                    "name": collab.requested_by.full_name,
                    "email": collab.requested_by.email
                },
                approved_by={
                    "id": collab.approved_by.id,
                    "name": collab.approved_by.full_name,
                    "email": collab.approved_by.email
                } if collab.approved_by else None,
                shared_resources_count=len(collab.shared_resources_list) if collab.shared_resources_list else 0,
                metadata=collab.metadata
            )
            for collab in collaborations
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch collaborations")


@router.post("/requests/{collaboration_id}/approve")
async def approve_collaboration(
    collaboration_id: int,
    request: Request,
    approval_data: CollaborationApprovalRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_db)
):
    """Approve or reject a collaboration request."""
    
    service = await get_team_collaboration_service(session)
    
    try:
        if approval_data.approved:
            collaboration = await service.approve_collaboration(
                collaboration_id=collaboration_id,
                approved_by_user_id=current_user.id,
                start_date=approval_data.start_date
            )
            message = "Collaboration approved successfully"
        else:
            collaboration = await service.reject_collaboration(
                collaboration_id=collaboration_id,
                rejected_by_user_id=current_user.id,
                reason=approval_data.reason
            )
            message = "Collaboration rejected"
        
        return {
            "message": message,
            "collaboration_id": collaboration.id,
            "status": collaboration.status.value
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to process collaboration approval")


@router.post("/collaborations/{collaboration_id}/share-resource", response_model=SharedResourceResponse)
async def share_resource(
    collaboration_id: int,
    request: Request,
    resource_data: SharedResourceCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_db)
):
    """Share a resource as part of a collaboration."""
    
    service = await get_team_collaboration_service(session)
    
    try:
        shared_resource = await service.share_resource(
            collaboration_id=collaboration_id,
            resource_type=resource_data.resource_type,
            resource_id=resource_data.resource_id,
            resource_name=resource_data.resource_name,
            permissions=resource_data.permissions,
            access_level=resource_data.access_level,
            expires_at=resource_data.expires_at
        )
        
        return SharedResourceResponse(
            id=shared_resource.id,
            collaboration_id=shared_resource.collaboration_id,
            resource_type=shared_resource.resource_type,
            resource_id=shared_resource.resource_id,
            resource_name=shared_resource.resource_name,
            permissions=shared_resource.permissions,
            access_level=shared_resource.access_level,
            shared_at=shared_resource.shared_at,
            expires_at=shared_resource.expires_at,
            is_active=shared_resource.is_active,
            access_count=shared_resource.access_count,
            last_accessed_at=shared_resource.last_accessed_at
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to share resource")


@router.get("/teams/{team_id}/shared-resources", response_model=List[SharedResourceResponse])
async def get_shared_resources(
    team_id: int,
    request: Request,
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    active_only: bool = Query(True, description="Only return active resources"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_db)
):
    """Get resources shared with a team."""
    
    service = await get_team_collaboration_service(session)
    
    try:
        shared_resources = await service.get_shared_resources_for_team(
            team_id=team_id,
            resource_type=resource_type,
            active_only=active_only
        )
        
        return [
            SharedResourceResponse(
                id=resource.id,
                collaboration_id=resource.collaboration_id,
                resource_type=resource.resource_type,
                resource_id=resource.resource_id,
                resource_name=resource.resource_name,
                permissions=resource.permissions,
                access_level=resource.access_level,
                shared_at=resource.shared_at,
                expires_at=resource.expires_at,
                is_active=resource.is_active,
                access_count=resource.access_count,
                last_accessed_at=resource.last_accessed_at
            )
            for resource in shared_resources
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch shared resources")


@router.delete("/shared-resources/{resource_id}/revoke")
async def revoke_shared_resource(
    resource_id: int,
    request: Request,
    reason: Optional[str] = Query(None, description="Reason for revocation"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_db)
):
    """Revoke access to a shared resource."""
    
    service = await get_team_collaboration_service(session)
    
    try:
        shared_resource = await service.revoke_shared_resource(
            shared_resource_id=resource_id,
            revoked_by_user_id=current_user.id,
            reason=reason
        )
        
        return {
            "message": "Resource access revoked successfully",
            "resource_id": shared_resource.id,
            "revoked_at": shared_resource.revoked_at
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to revoke resource access")


@router.get("/collaborations/{collaboration_id}/activity", response_model=List[CollaborationActivityResponse])
async def get_collaboration_activity(
    collaboration_id: int,
    request: Request,
    limit: int = Query(50, ge=1, le=200, description="Limit results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_db)
):
    """Get activity feed for a collaboration."""
    
    service = await get_team_collaboration_service(session)
    
    try:
        activities = await service.get_collaboration_activity(
            collaboration_id=collaboration_id,
            limit=limit,
            offset=offset
        )
        
        return [
            CollaborationActivityResponse(
                id=activity.id,
                activity_type=activity.activity_type,
                title=activity.title,
                description=activity.description,
                user={
                    "id": activity.user.id,
                    "name": activity.user.full_name,
                    "email": activity.user.email
                },
                team={
                    "id": activity.team.id,
                    "name": activity.team.name
                },
                created_at=activity.created_at,
                metadata=activity.metadata
            )
            for activity in activities
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch collaboration activity")


@router.get("/teams/{team_id}/analytics")
async def get_collaboration_analytics(
    team_id: int,
    request: Request,
    start_date: Optional[datetime] = Query(None, description="Start date for analytics"),
    end_date: Optional[datetime] = Query(None, description="End date for analytics"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_db)
):
    """Get collaboration analytics for a team."""
    
    service = await get_team_collaboration_service(session)
    
    try:
        analytics = await service.get_collaboration_analytics(
            team_id=team_id,
            start_date=start_date,
            end_date=end_date
        )
        
        return analytics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch collaboration analytics")


@router.post("/shared-resources/{resource_id}/access")
async def track_resource_access(
    resource_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_db)
):
    """Track access to a shared resource."""
    
    service = await get_team_collaboration_service(session)
    
    try:
        await service.track_resource_access(
            shared_resource_id=resource_id,
            accessed_by_user_id=current_user.id
        )
        
        return {"message": "Resource access tracked"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to track resource access")