"""
Team Dashboard API endpoints for team-specific metrics and views.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from pydantic import BaseModel, Field

from app.db.database import get_async_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.team import Team, TeamMember
from app.models.project import Project
from app.models.audit_log import AuditLog
from app.services.team_service import get_team_service
from app.core.auth.rbac import require_permission

router = APIRouter()


# Pydantic models for team dashboard responses
class TeamMemberSummary(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    role: str
    is_active: bool
    last_activity: Optional[datetime]
    projects_count: int
    contributions_this_week: int

    class Config:
        from_attributes = True


class TeamProjectSummary(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: str
    priority: str
    completion_percentage: float
    last_updated: datetime
    assigned_members: int
    recent_activity_count: int

    class Config:
        from_attributes = True


class TeamActivityMetrics(BaseModel):
    total_activities: int
    activities_this_week: int
    activities_this_month: int
    activity_trend: float  # percentage change from previous period
    top_activity_types: Dict[str, int]
    recent_activities: List[Dict[str, Any]]


class TeamPerformanceMetrics(BaseModel):
    projects_completed: int
    projects_in_progress: int
    projects_planned: int
    average_project_completion_time: float  # in days
    team_velocity: float  # projects per month
    success_rate: float  # percentage of successful deployments/builds
    quality_score: float  # based on various quality metrics


class TeamResourceUtilization(BaseModel):
    total_clusters: int
    active_clusters: int
    total_cpu_cores: float
    total_memory_gb: float
    cpu_utilization: float
    memory_utilization: float
    storage_usage_gb: float
    cost_this_month: float
    cost_trend: float


class TeamCollaborationMetrics(BaseModel):
    total_team_members: int
    active_members_this_week: int
    cross_team_collaborations: int
    knowledge_sharing_sessions: int
    peer_reviews_completed: int
    mentoring_relationships: int


class TeamDashboardResponse(BaseModel):
    team_info: Dict[str, Any]
    members: List[TeamMemberSummary]
    projects: List[TeamProjectSummary]
    activity_metrics: TeamActivityMetrics
    performance_metrics: TeamPerformanceMetrics
    resource_utilization: TeamResourceUtilization
    collaboration_metrics: TeamCollaborationMetrics
    recent_alerts: List[Dict[str, Any]]
    upcoming_deadlines: List[Dict[str, Any]]


@router.get("/teams/{team_id}/dashboard", response_model=TeamDashboardResponse)
@require_permission("teams:read")
async def get_team_dashboard(
    team_id: int,
    request: Request,
    period_days: int = Query(30, ge=1, le=365, description="Period for metrics in days"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_db)
):
    """Get comprehensive team dashboard data."""
    
    # Verify user has access to this team
    team_query = select(Team).where(Team.id == team_id)
    team_result = await session.execute(team_query)
    team = team_result.scalar_one_or_none()
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if user is member of team or has admin access
    member_query = select(TeamMember).where(
        and_(TeamMember.team_id == team_id, TeamMember.user_id == current_user.id)
    )
    member_result = await session.execute(member_query)
    is_member = member_result.scalar_one_or_none() is not None
    
    if not is_member and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied to team dashboard")
    
    # Calculate date ranges
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=period_days)
    previous_start_date = start_date - timedelta(days=period_days)
    
    # Get team information
    team_info = {
        "id": team.id,
        "name": team.name,
        "description": team.description,
        "created_at": team.created_at,
        "status": getattr(team, 'status', 'active'),
        "total_members": 0,  # Will be filled below
        "total_projects": 0  # Will be filled below
    }
    
    # Get team members with activity data
    members_query = select(
        TeamMember,
        User,
        func.count(AuditLog.id).label('activity_count')
    ).select_from(
        TeamMember.__table__.join(User.__table__)
        .outerjoin(
            AuditLog.__table__,
            and_(
                AuditLog.user_id == User.id,
                AuditLog.team_id == str(team_id),
                AuditLog.timestamp >= start_date
            )
        )
    ).where(
        TeamMember.team_id == team_id
    ).group_by(TeamMember.id, User.id)
    
    members_result = await session.execute(members_query)
    members_data = members_result.all()
    
    members = []
    for member_data in members_data:
        team_member, user, activity_count = member_data
        
        # Get project count for user
        projects_query = select(func.count(Project.id)).where(
            Project.team_id == team_id
        )
        projects_result = await session.execute(projects_query)
        projects_count = projects_result.scalar() or 0
        
        members.append(TeamMemberSummary(
            id=team_member.id,
            user_id=user.id,
            user_name=user.full_name or f"{user.first_name} {user.last_name}",
            user_email=user.email,
            role=team_member.role or 'member',
            is_active=getattr(team_member, 'is_active', True),
            last_activity=getattr(user, 'last_login', None),
            projects_count=projects_count,
            contributions_this_week=activity_count or 0
        ))
    
    team_info["total_members"] = len(members)
    
    # Get team projects
    projects_query = select(Project).where(Project.team_id == team_id)
    projects_result = await session.execute(projects_query)
    projects_data = projects_result.scalars().all()
    
    projects = []
    for project in projects_data:
        # Calculate completion percentage (simplified)
        completion_percentage = 75.0  # This would be calculated based on actual project metrics
        
        # Get recent activity count
        activity_query = select(func.count(AuditLog.id)).where(
            and_(
                AuditLog.resource_type == 'project',
                AuditLog.resource_id == str(project.id),
                AuditLog.timestamp >= start_date
            )
        )
        activity_result = await session.execute(activity_query)
        recent_activity_count = activity_result.scalar() or 0
        
        projects.append(TeamProjectSummary(
            id=project.id,
            name=project.name,
            description=project.description,
            status=getattr(project, 'status', 'active'),
            priority=getattr(project, 'priority', 'medium'),
            completion_percentage=completion_percentage,
            last_updated=project.updated_at or project.created_at,
            assigned_members=len([m for m in members]),  # Simplified
            recent_activity_count=recent_activity_count
        ))
    
    team_info["total_projects"] = len(projects)
    
    # Get activity metrics
    activity_metrics = await _get_team_activity_metrics(session, team_id, start_date, end_date, previous_start_date)
    
    # Get performance metrics
    performance_metrics = await _get_team_performance_metrics(session, team_id, start_date, end_date)
    
    # Get resource utilization
    resource_utilization = await _get_team_resource_utilization(session, team_id)
    
    # Get collaboration metrics
    collaboration_metrics = await _get_team_collaboration_metrics(session, team_id, start_date, end_date)
    
    # Get recent alerts
    recent_alerts = await _get_team_recent_alerts(session, team_id)
    
    # Get upcoming deadlines
    upcoming_deadlines = await _get_team_upcoming_deadlines(session, team_id)
    
    return TeamDashboardResponse(
        team_info=team_info,
        members=members,
        projects=projects,
        activity_metrics=activity_metrics,
        performance_metrics=performance_metrics,
        resource_utilization=resource_utilization,
        collaboration_metrics=collaboration_metrics,
        recent_alerts=recent_alerts,
        upcoming_deadlines=upcoming_deadlines
    )


async def _get_team_activity_metrics(
    session: AsyncSession,
    team_id: int,
    start_date: datetime,
    end_date: datetime,
    previous_start_date: datetime
) -> TeamActivityMetrics:
    """Get team activity metrics."""
    
    # Total activities in period
    total_query = select(func.count(AuditLog.id)).where(
        and_(
            AuditLog.team_id == str(team_id),
            AuditLog.timestamp >= start_date,
            AuditLog.timestamp <= end_date
        )
    )
    total_result = await session.execute(total_query)
    total_activities = total_result.scalar() or 0
    
    # Activities this week
    week_ago = end_date - timedelta(days=7)
    week_query = select(func.count(AuditLog.id)).where(
        and_(
            AuditLog.team_id == str(team_id),
            AuditLog.timestamp >= week_ago,
            AuditLog.timestamp <= end_date
        )
    )
    week_result = await session.execute(week_query)
    activities_this_week = week_result.scalar() or 0
    
    # Activities this month
    month_ago = end_date - timedelta(days=30)
    month_query = select(func.count(AuditLog.id)).where(
        and_(
            AuditLog.team_id == str(team_id),
            AuditLog.timestamp >= month_ago,
            AuditLog.timestamp <= end_date
        )
    )
    month_result = await session.execute(month_query)
    activities_this_month = month_result.scalar() or 0
    
    # Previous period activities for trend calculation
    previous_query = select(func.count(AuditLog.id)).where(
        and_(
            AuditLog.team_id == str(team_id),
            AuditLog.timestamp >= previous_start_date,
            AuditLog.timestamp < start_date
        )
    )
    previous_result = await session.execute(previous_query)
    previous_activities = previous_result.scalar() or 0
    
    # Calculate trend
    if previous_activities > 0:
        activity_trend = ((total_activities - previous_activities) / previous_activities) * 100
    else:
        activity_trend = 100.0 if total_activities > 0 else 0.0
    
    # Top activity types
    types_query = select(
        AuditLog.event_type,
        func.count(AuditLog.id).label('count')
    ).where(
        and_(
            AuditLog.team_id == str(team_id),
            AuditLog.timestamp >= start_date,
            AuditLog.timestamp <= end_date
        )
    ).group_by(AuditLog.event_type).order_by(desc('count')).limit(5)
    
    types_result = await session.execute(types_query)
    top_activity_types = {row[0]: row[1] for row in types_result.fetchall()}
    
    # Recent activities
    recent_query = select(AuditLog).where(
        AuditLog.team_id == str(team_id)
    ).order_by(desc(AuditLog.timestamp)).limit(10)
    
    recent_result = await session.execute(recent_query)
    recent_logs = recent_result.scalars().all()
    
    recent_activities = [
        {
            "id": log.id,
            "event_type": log.event_type,
            "message": log.message,
            "user_email": log.user_email,
            "timestamp": log.timestamp,
            "success": log.success
        }
        for log in recent_logs
    ]
    
    return TeamActivityMetrics(
        total_activities=total_activities,
        activities_this_week=activities_this_week,
        activities_this_month=activities_this_month,
        activity_trend=round(activity_trend, 2),
        top_activity_types=top_activity_types,
        recent_activities=recent_activities
    )


async def _get_team_performance_metrics(
    session: AsyncSession,
    team_id: int,
    start_date: datetime,
    end_date: datetime
) -> TeamPerformanceMetrics:
    """Get team performance metrics."""
    
    # Get project counts by status
    projects_query = select(Project).where(Project.team_id == team_id)
    projects_result = await session.execute(projects_query)
    projects = projects_result.scalars().all()
    
    projects_completed = len([p for p in projects if getattr(p, 'status', 'active') == 'completed'])
    projects_in_progress = len([p for p in projects if getattr(p, 'status', 'active') == 'in_progress'])
    projects_planned = len([p for p in projects if getattr(p, 'status', 'active') == 'planned'])
    
    # Calculate averages (simplified for demo)
    average_project_completion_time = 45.5  # days
    team_velocity = 2.3  # projects per month
    success_rate = 87.5  # percentage
    quality_score = 92.1  # score
    
    return TeamPerformanceMetrics(
        projects_completed=projects_completed,
        projects_in_progress=projects_in_progress,
        projects_planned=projects_planned,
        average_project_completion_time=average_project_completion_time,
        team_velocity=team_velocity,
        success_rate=success_rate,
        quality_score=quality_score
    )


async def _get_team_resource_utilization(
    session: AsyncSession,
    team_id: int
) -> TeamResourceUtilization:
    """Get team resource utilization metrics."""
    
    # This would integrate with actual infrastructure monitoring
    # For now, return demo data
    return TeamResourceUtilization(
        total_clusters=5,
        active_clusters=4,
        total_cpu_cores=48.0,
        total_memory_gb=192.0,
        cpu_utilization=68.5,
        memory_utilization=72.3,
        storage_usage_gb=850.2,
        cost_this_month=1250.75,
        cost_trend=5.2
    )


async def _get_team_collaboration_metrics(
    session: AsyncSession,
    team_id: int,
    start_date: datetime,
    end_date: datetime
) -> TeamCollaborationMetrics:
    """Get team collaboration metrics."""
    
    # Get team member count
    members_query = select(func.count(TeamMember.id)).where(TeamMember.team_id == team_id)
    members_result = await session.execute(members_query)
    total_team_members = members_result.scalar() or 0
    
    # Active members this week (simplified)
    week_ago = end_date - timedelta(days=7)
    active_query = select(func.count(func.distinct(AuditLog.user_id))).where(
        and_(
            AuditLog.team_id == str(team_id),
            AuditLog.timestamp >= week_ago
        )
    )
    active_result = await session.execute(active_query)
    active_members_this_week = active_result.scalar() or 0
    
    # Demo data for other metrics
    return TeamCollaborationMetrics(
        total_team_members=total_team_members,
        active_members_this_week=active_members_this_week,
        cross_team_collaborations=8,
        knowledge_sharing_sessions=3,
        peer_reviews_completed=15,
        mentoring_relationships=4
    )


async def _get_team_recent_alerts(
    session: AsyncSession,
    team_id: int
) -> List[Dict[str, Any]]:
    """Get recent alerts for the team."""
    
    # This would integrate with actual alerting system
    return [
        {
            "id": 1,
            "type": "performance",
            "severity": "warning",
            "message": "CPU utilization above 80% for production cluster",
            "timestamp": datetime.utcnow() - timedelta(hours=2),
            "resolved": False
        },
        {
            "id": 2,
            "type": "security",
            "severity": "info",
            "message": "New team member access granted",
            "timestamp": datetime.utcnow() - timedelta(hours=6),
            "resolved": True
        }
    ]


async def _get_team_upcoming_deadlines(
    session: AsyncSession,
    team_id: int
) -> List[Dict[str, Any]]:
    """Get upcoming deadlines for the team."""
    
    # This would integrate with project management system
    return [
        {
            "id": 1,
            "type": "project",
            "title": "Q4 Infrastructure Migration",
            "due_date": datetime.utcnow() + timedelta(days=14),
            "priority": "high",
            "completion": 75
        },
        {
            "id": 2,
            "type": "compliance",
            "title": "Security Audit Review",
            "due_date": datetime.utcnow() + timedelta(days=7),
            "priority": "critical",
            "completion": 45
        }
    ]


@router.get("/teams/{team_id}/activity-feed")
@require_permission("teams:read")
async def get_team_activity_feed(
    team_id: int,
    request: Request,
    limit: int = Query(50, ge=1, le=200, description="Number of activities to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    activity_types: Optional[str] = Query(None, description="Comma-separated activity types"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_db)
):
    """Get real-time activity feed for the team."""
    
    # Verify team access
    member_query = select(TeamMember).where(
        and_(TeamMember.team_id == team_id, TeamMember.user_id == current_user.id)
    )
    member_result = await session.execute(member_query)
    is_member = member_result.scalar_one_or_none() is not None
    
    if not is_member and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied to team activity feed")
    
    # Build query
    query = select(AuditLog).where(AuditLog.team_id == str(team_id))
    
    # Filter by activity types if provided
    if activity_types:
        types_list = activity_types.split(",")
        query = query.where(AuditLog.event_type.in_(types_list))
    
    # Apply ordering and pagination
    query = query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(limit)
    
    result = await session.execute(query)
    activities = result.scalars().all()
    
    # Format activities
    formatted_activities = [
        {
            "id": activity.id,
            "event_type": activity.event_type,
            "event_category": activity.event_category,
            "message": activity.message,
            "user_email": activity.user_email,
            "user_name": activity.user_name,
            "timestamp": activity.timestamp,
            "success": activity.success,
            "resource_type": activity.resource_type,
            "resource_name": activity.resource_name,
            "metadata": activity.metadata
        }
        for activity in activities
    ]
    
    return {
        "activities": formatted_activities,
        "total": len(formatted_activities),
        "has_more": len(formatted_activities) == limit
    }


@router.get("/teams/{team_id}/metrics/trends")
@require_permission("teams:read")
async def get_team_metrics_trends(
    team_id: int,
    request: Request,
    metric_type: str = Query(..., description="Type of metric (activity, performance, resources)"),
    period: str = Query("7d", pattern="^(1d|7d|30d|90d)$", description="Time period"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_db)
):
    """Get team metrics trends over time."""
    
    # Verify team access
    member_query = select(TeamMember).where(
        and_(TeamMember.team_id == team_id, TeamMember.user_id == current_user.id)
    )
    member_result = await session.execute(member_query)
    is_member = member_result.scalar_one_or_none() is not None
    
    if not is_member and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied to team metrics")
    
    # Parse period
    period_days = {"1d": 1, "7d": 7, "30d": 30, "90d": 90}[period]
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=period_days)
    
    # Generate trend data based on metric type
    if metric_type == "activity":
        trends = await _generate_activity_trends(session, team_id, start_date, end_date, period_days)
    elif metric_type == "performance":
        trends = await _generate_performance_trends(session, team_id, start_date, end_date, period_days)
    elif metric_type == "resources":
        trends = await _generate_resource_trends(session, team_id, start_date, end_date, period_days)
    else:
        raise HTTPException(status_code=400, detail="Invalid metric type")
    
    return {
        "metric_type": metric_type,
        "period": period,
        "start_date": start_date,
        "end_date": end_date,
        "trends": trends
    }


async def _generate_activity_trends(
    session: AsyncSession,
    team_id: int,
    start_date: datetime,
    end_date: datetime,
    period_days: int
) -> List[Dict[str, Any]]:
    """Generate activity trend data."""
    
    trends = []
    current_date = start_date
    
    while current_date < end_date:
        next_date = current_date + timedelta(days=1)
        
        # Get activity count for this day
        daily_query = select(func.count(AuditLog.id)).where(
            and_(
                AuditLog.team_id == str(team_id),
                AuditLog.timestamp >= current_date,
                AuditLog.timestamp < next_date
            )
        )
        daily_result = await session.execute(daily_query)
        daily_count = daily_result.scalar() or 0
        
        trends.append({
            "date": current_date.isoformat(),
            "value": daily_count,
            "label": f"{daily_count} activities"
        })
        
        current_date = next_date
    
    return trends


async def _generate_performance_trends(
    session: AsyncSession,
    team_id: int,
    start_date: datetime,
    end_date: datetime,
    period_days: int
) -> List[Dict[str, Any]]:
    """Generate performance trend data."""
    
    # This would calculate actual performance metrics over time
    # For demo, generate sample data
    trends = []
    current_date = start_date
    
    while current_date < end_date:
        # Sample performance score calculation
        performance_score = 85 + (hash(str(current_date)) % 20) - 10
        
        trends.append({
            "date": current_date.isoformat(),
            "value": performance_score,
            "label": f"{performance_score}% performance"
        })
        
        current_date += timedelta(days=1)
    
    return trends


async def _generate_resource_trends(
    session: AsyncSession,
    team_id: int,
    start_date: datetime,
    end_date: datetime,
    period_days: int
) -> List[Dict[str, Any]]:
    """Generate resource utilization trend data."""
    
    # This would integrate with infrastructure monitoring
    # For demo, generate sample data
    trends = []
    current_date = start_date
    
    while current_date < end_date:
        # Sample resource utilization
        cpu_util = 65 + (hash(str(current_date)) % 30) - 15
        
        trends.append({
            "date": current_date.isoformat(),
            "value": cpu_util,
            "label": f"{cpu_util}% CPU utilization"
        })
        
        current_date += timedelta(days=1)
    
    return trends