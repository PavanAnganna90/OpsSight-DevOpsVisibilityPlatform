"""
Team Collaboration Service for managing cross-team interactions and resource sharing.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload

from app.models.team_collaboration import (
    TeamCollaboration,
    SharedResource,
    CollaborationActivity,
    TeamCollaborationTemplate,
    CollaborationType,
    CollaborationStatus
)
from app.models.team import Team
from app.models.user import User
from app.services.audit_service import log_security_event
from app.models.audit_log import AuditEventType


class TeamCollaborationService:
    """Service for managing team collaborations and resource sharing."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create_collaboration_request(
        self,
        requesting_team_id: int,
        target_team_id: int,
        collaboration_type: CollaborationType,
        title: str,
        description: str,
        requested_by_user_id: int,
        metadata: Optional[Dict[str, Any]] = None,
        shared_resources: Optional[List[Dict[str, Any]]] = None,
        collaboration_goals: Optional[List[str]] = None,
        success_metrics: Optional[List[str]] = None,
        duration_days: Optional[int] = None
    ) -> TeamCollaboration:
        """Create a new collaboration request."""
        
        # Validate teams exist and are different
        if requesting_team_id == target_team_id:
            raise ValueError("Teams cannot collaborate with themselves")
        
        # Calculate end date if duration is provided
        end_date = None
        if duration_days:
            end_date = datetime.utcnow() + timedelta(days=duration_days)
        
        collaboration = TeamCollaboration(
            requesting_team_id=requesting_team_id,
            target_team_id=target_team_id,
            collaboration_type=collaboration_type,
            title=title,
            description=description,
            requested_by_user_id=requested_by_user_id,
            end_date=end_date,
            metadata=metadata,
            shared_resources=shared_resources,
            collaboration_goals=collaboration_goals,
            success_metrics=success_metrics
        )
        
        self.session.add(collaboration)
        await self.session.commit()
        await self.session.refresh(collaboration)
        
        # Log the collaboration request
        await self._log_collaboration_activity(
            collaboration.id,
            "collaboration_requested",
            "Collaboration request created",
            requested_by_user_id,
            requesting_team_id,
            {
                "target_team_id": target_team_id,
                "collaboration_type": collaboration_type.value,
                "title": title
            }
        )
        
        return collaboration
    
    async def approve_collaboration(
        self,
        collaboration_id: int,
        approved_by_user_id: int,
        start_date: Optional[datetime] = None
    ) -> TeamCollaboration:
        """Approve a collaboration request."""
        
        collaboration = await self.get_collaboration_by_id(collaboration_id)
        if not collaboration:
            raise ValueError("Collaboration not found")
        
        if collaboration.status != CollaborationStatus.PENDING:
            raise ValueError("Only pending collaborations can be approved")
        
        collaboration.status = CollaborationStatus.APPROVED
        collaboration.approved_by_user_id = approved_by_user_id
        collaboration.approved_at = datetime.utcnow()
        collaboration.start_date = start_date or datetime.utcnow()
        
        # If there are shared resources, create them
        if collaboration.shared_resources:
            for resource_data in collaboration.shared_resources:
                await self._create_shared_resource(collaboration_id, resource_data)
        
        await self.session.commit()
        
        # Log the approval
        await self._log_collaboration_activity(
            collaboration_id,
            "collaboration_approved",
            "Collaboration request approved",
            approved_by_user_id,
            collaboration.target_team_id,
            {"approved_by": approved_by_user_id}
        )
        
        return collaboration
    
    async def reject_collaboration(
        self,
        collaboration_id: int,
        rejected_by_user_id: int,
        reason: Optional[str] = None
    ) -> TeamCollaboration:
        """Reject a collaboration request."""
        
        collaboration = await self.get_collaboration_by_id(collaboration_id)
        if not collaboration:
            raise ValueError("Collaboration not found")
        
        if collaboration.status != CollaborationStatus.PENDING:
            raise ValueError("Only pending collaborations can be rejected")
        
        collaboration.status = CollaborationStatus.REJECTED
        collaboration.approved_by_user_id = rejected_by_user_id  # Store who rejected it
        collaboration.approved_at = datetime.utcnow()
        
        if reason:
            collaboration.metadata = collaboration.metadata or {}
            collaboration.metadata["rejection_reason"] = reason
        
        await self.session.commit()
        
        # Log the rejection
        await self._log_collaboration_activity(
            collaboration_id,
            "collaboration_rejected",
            f"Collaboration request rejected{': ' + reason if reason else ''}",
            rejected_by_user_id,
            collaboration.target_team_id,
            {"rejected_by": rejected_by_user_id, "reason": reason}
        )
        
        return collaboration
    
    async def get_collaboration_by_id(self, collaboration_id: int) -> Optional[TeamCollaboration]:
        """Get collaboration by ID with relationships loaded."""
        
        query = select(TeamCollaboration).options(
            selectinload(TeamCollaboration.requesting_team),
            selectinload(TeamCollaboration.target_team),
            selectinload(TeamCollaboration.requested_by),
            selectinload(TeamCollaboration.approved_by),
            selectinload(TeamCollaboration.shared_resources_list)
        ).where(TeamCollaboration.id == collaboration_id)
        
        result = await self.session.execute(query)
        return result.scalar_one_or_none()
    
    async def get_team_collaborations(
        self,
        team_id: int,
        status: Optional[CollaborationStatus] = None,
        collaboration_type: Optional[CollaborationType] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[TeamCollaboration]:
        """Get collaborations for a team (both requested and received)."""
        
        query = select(TeamCollaboration).options(
            selectinload(TeamCollaboration.requesting_team),
            selectinload(TeamCollaboration.target_team),
            selectinload(TeamCollaboration.requested_by),
            selectinload(TeamCollaboration.approved_by)
        ).where(
            or_(
                TeamCollaboration.requesting_team_id == team_id,
                TeamCollaboration.target_team_id == team_id
            )
        )
        
        if status:
            query = query.where(TeamCollaboration.status == status)
        
        if collaboration_type:
            query = query.where(TeamCollaboration.collaboration_type == collaboration_type)
        
        query = query.order_by(desc(TeamCollaboration.requested_at)).offset(offset).limit(limit)
        
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def share_resource(
        self,
        collaboration_id: int,
        resource_type: str,
        resource_id: str,
        resource_name: str,
        permissions: Dict[str, Any],
        access_level: str = "read",
        expires_at: Optional[datetime] = None
    ) -> SharedResource:
        """Share a resource as part of a collaboration."""
        
        collaboration = await self.get_collaboration_by_id(collaboration_id)
        if not collaboration:
            raise ValueError("Collaboration not found")
        
        if collaboration.status not in [CollaborationStatus.APPROVED, CollaborationStatus.ACTIVE]:
            raise ValueError("Can only share resources in approved or active collaborations")
        
        shared_resource = SharedResource(
            collaboration_id=collaboration_id,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            permissions=permissions,
            access_level=access_level,
            expires_at=expires_at
        )
        
        self.session.add(shared_resource)
        await self.session.commit()
        await self.session.refresh(shared_resource)
        
        # Log the resource sharing
        await self._log_collaboration_activity(
            collaboration_id,
            "resource_shared",
            f"Resource '{resource_name}' shared with {access_level} access",
            collaboration.requested_by_user_id,
            collaboration.requesting_team_id,
            {
                "resource_type": resource_type,
                "resource_id": resource_id,
                "access_level": access_level
            }
        )
        
        return shared_resource
    
    async def revoke_shared_resource(
        self,
        shared_resource_id: int,
        revoked_by_user_id: int,
        reason: Optional[str] = None
    ) -> SharedResource:
        """Revoke access to a shared resource."""
        
        query = select(SharedResource).where(SharedResource.id == shared_resource_id)
        result = await self.session.execute(query)
        shared_resource = result.scalar_one_or_none()
        
        if not shared_resource:
            raise ValueError("Shared resource not found")
        
        shared_resource.is_active = False
        shared_resource.revoked_at = datetime.utcnow()
        shared_resource.revoked_by_user_id = revoked_by_user_id
        
        await self.session.commit()
        
        # Log the revocation
        await self._log_collaboration_activity(
            shared_resource.collaboration_id,
            "resource_revoked",
            f"Access to '{shared_resource.resource_name}' revoked{': ' + reason if reason else ''}",
            revoked_by_user_id,
            None,  # Team ID will be determined from collaboration
            {
                "resource_type": shared_resource.resource_type,
                "resource_id": shared_resource.resource_id,
                "reason": reason
            }
        )
        
        return shared_resource
    
    async def track_resource_access(
        self,
        shared_resource_id: int,
        accessed_by_user_id: int
    ) -> None:
        """Track access to a shared resource."""
        
        query = select(SharedResource).where(SharedResource.id == shared_resource_id)
        result = await self.session.execute(query)
        shared_resource = result.scalar_one_or_none()
        
        if shared_resource and shared_resource.is_active:
            shared_resource.access_count += 1
            shared_resource.last_accessed_at = datetime.utcnow()
            shared_resource.last_accessed_by_user_id = accessed_by_user_id
            await self.session.commit()
    
    async def get_shared_resources_for_team(
        self,
        team_id: int,
        resource_type: Optional[str] = None,
        active_only: bool = True
    ) -> List[SharedResource]:
        """Get resources shared with a team."""
        
        # Get collaborations where the team is the target
        collab_query = select(TeamCollaboration.id).where(
            and_(
                TeamCollaboration.target_team_id == team_id,
                TeamCollaboration.status.in_([CollaborationStatus.APPROVED, CollaborationStatus.ACTIVE])
            )
        )
        collab_result = await self.session.execute(collab_query)
        collaboration_ids = [row[0] for row in collab_result.fetchall()]
        
        if not collaboration_ids:
            return []
        
        query = select(SharedResource).options(
            selectinload(SharedResource.collaboration)
        ).where(SharedResource.collaboration_id.in_(collaboration_ids))
        
        if resource_type:
            query = query.where(SharedResource.resource_type == resource_type)
        
        if active_only:
            query = query.where(SharedResource.is_active == True)
        
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def get_collaboration_activity(
        self,
        collaboration_id: int,
        limit: int = 50,
        offset: int = 0
    ) -> List[CollaborationActivity]:
        """Get activity feed for a collaboration."""
        
        query = select(CollaborationActivity).options(
            selectinload(CollaborationActivity.user),
            selectinload(CollaborationActivity.team)
        ).where(
            CollaborationActivity.collaboration_id == collaboration_id
        ).order_by(desc(CollaborationActivity.created_at)).offset(offset).limit(limit)
        
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def get_collaboration_analytics(
        self,
        team_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get collaboration analytics for a team."""
        
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        # Get collaboration counts by status
        base_query = select(TeamCollaboration).where(
            and_(
                or_(
                    TeamCollaboration.requesting_team_id == team_id,
                    TeamCollaboration.target_team_id == team_id
                ),
                TeamCollaboration.requested_at >= start_date,
                TeamCollaboration.requested_at <= end_date
            )
        )
        
        total_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.session.execute(total_query)
        total_collaborations = total_result.scalar() or 0
        
        # Count by status
        status_counts = {}
        for status in CollaborationStatus:
            status_query = select(func.count()).select_from(
                base_query.where(TeamCollaboration.status == status).subquery()
            )
            status_result = await self.session.execute(status_query)
            status_counts[status.value] = status_result.scalar() or 0
        
        # Count by type
        type_counts = {}
        for collab_type in CollaborationType:
            type_query = select(func.count()).select_from(
                base_query.where(TeamCollaboration.collaboration_type == collab_type).subquery()
            )
            type_result = await self.session.execute(type_query)
            type_counts[collab_type.value] = type_result.scalar() or 0
        
        # Get shared resources count
        shared_resources_query = select(func.count(SharedResource.id)).where(
            SharedResource.shared_at >= start_date
        )
        shared_resources_result = await self.session.execute(shared_resources_query)
        total_shared_resources = shared_resources_result.scalar() or 0
        
        return {
            "total_collaborations": total_collaborations,
            "status_breakdown": status_counts,
            "type_breakdown": type_counts,
            "total_shared_resources": total_shared_resources,
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        }
    
    async def _create_shared_resource(
        self,
        collaboration_id: int,
        resource_data: Dict[str, Any]
    ) -> SharedResource:
        """Create a shared resource from collaboration data."""
        
        shared_resource = SharedResource(
            collaboration_id=collaboration_id,
            resource_type=resource_data.get("resource_type"),
            resource_id=resource_data.get("resource_id"),
            resource_name=resource_data.get("resource_name"),
            permissions=resource_data.get("permissions", {}),
            access_level=resource_data.get("access_level", "read"),
            expires_at=resource_data.get("expires_at")
        )
        
        self.session.add(shared_resource)
        return shared_resource
    
    async def _log_collaboration_activity(
        self,
        collaboration_id: int,
        activity_type: str,
        title: str,
        user_id: int,
        team_id: Optional[int],
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log an activity in the collaboration."""
        
        activity = CollaborationActivity(
            collaboration_id=collaboration_id,
            activity_type=activity_type,
            title=title,
            user_id=user_id,
            team_id=team_id or 0,  # Use 0 as fallback if team_id is None
            metadata=metadata
        )
        
        self.session.add(activity)
        
        # Also log to audit system for security tracking
        await log_security_event(
            event_type=AuditEventType.TEAM_MEMBER_ADDED if "approved" in activity_type else AuditEventType.SENSITIVE_DATA_ACCESS,
            message=f"Team collaboration activity: {title}",
            user_id=user_id,
            metadata={
                "collaboration_id": collaboration_id,
                "activity_type": activity_type,
                **(metadata or {})
            }
        )


async def get_team_collaboration_service(session: AsyncSession) -> TeamCollaborationService:
    """Factory function to create team collaboration service."""
    return TeamCollaborationService(session)