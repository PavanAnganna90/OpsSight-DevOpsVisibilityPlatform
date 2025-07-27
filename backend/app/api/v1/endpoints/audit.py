"""
Audit Log API endpoints for comprehensive security and activity tracking.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.db.database import get_async_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.audit_log import AuditEventType, AuditLogLevel
from app.services.audit_service import get_audit_service, AuditService

router = APIRouter()


# Pydantic models for API requests/responses
class AuditLogCreate(BaseModel):
    event_type: AuditEventType
    message: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    resource_name: Optional[str] = None
    organization_id: Optional[str] = None
    team_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    level: AuditLogLevel = AuditLogLevel.INFO
    compliance_tags: Optional[List[str]] = None


class AuditLogResponse(BaseModel):
    id: int
    event_type: str
    event_category: str
    level: str
    message: str
    user_id: Optional[int]
    user_email: Optional[str]
    user_name: Optional[str]
    session_id: Optional[str]
    sso_provider: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    request_id: Optional[str]
    resource_type: Optional[str]
    resource_id: Optional[str]
    resource_name: Optional[str]
    organization_id: Optional[str]
    team_id: Optional[str]
    metadata: Optional[Dict[str, Any]]
    tags: Optional[List[str]]
    success: bool
    error_code: Optional[str]
    error_message: Optional[str]
    duration_ms: Optional[int]
    timestamp: datetime
    compliance_tags: Optional[List[str]]
    retention_policy: Optional[str]

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    logs: List[AuditLogResponse]
    total: int
    page: int
    per_page: int
    pages: int


class AuditStatisticsResponse(BaseModel):
    total_events: int
    failed_events: int
    success_rate: float
    events_by_type: Dict[str, int]
    events_by_category: Dict[str, int]
    events_by_level: Dict[str, int]
    top_users: Dict[str, int]
    top_ips: Dict[str, int]
    date_range: Dict[str, str]


class RetentionPolicyCreate(BaseModel):
    policy_name: str
    description: str
    event_types: List[str]
    retention_days: int
    event_categories: Optional[List[str]] = None
    levels: Optional[List[str]] = None
    archive_after_days: Optional[int] = None
    compression_enabled: bool = True
    compliance_framework: Optional[str] = None
    immutable: bool = False
    encryption_required: bool = True


class AlertCreate(BaseModel):
    alert_name: str
    description: str
    severity: str
    notification_channels: List[str]
    event_types: Optional[List[str]] = None
    event_pattern: Optional[str] = None
    threshold_count: Optional[int] = None
    threshold_window_minutes: Optional[int] = None
    user_filter: Optional[Dict[str, Any]] = None
    ip_filter: Optional[Dict[str, Any]] = None
    resource_filter: Optional[Dict[str, Any]] = None
    notification_template: Optional[str] = None


@router.get("/logs", response_model=AuditLogListResponse)
async def get_audit_logs(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=1000, description="Items per page"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    event_types: Optional[str] = Query(None, description="Comma-separated event types"),
    event_categories: Optional[str] = Query(None, description="Comma-separated event categories"),
    levels: Optional[str] = Query(None, description="Comma-separated levels"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    user_email: Optional[str] = Query(None, description="Filter by user email"),
    ip_address: Optional[str] = Query(None, description="Filter by IP address"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    resource_id: Optional[str] = Query(None, description="Filter by resource ID"),
    organization_id: Optional[str] = Query(None, description="Filter by organization ID"),
    team_id: Optional[str] = Query(None, description="Filter by team ID"),
    success: Optional[bool] = Query(None, description="Filter by success status"),
    search_query: Optional[str] = Query(None, description="Search in messages and names"),
    sort_by: str = Query("timestamp", description="Sort field"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Sort order"),
    current_user: User = Depends(get_current_user)
):
    """Get audit logs with filtering and pagination."""
    
    async with get_audit_service() as audit_service:
        # Parse comma-separated filters
        event_types_list = event_types.split(",") if event_types else None
        event_categories_list = event_categories.split(",") if event_categories else None
        levels_list = levels.split(",") if levels else None
        
        # Calculate offset
        offset = (page - 1) * per_page
        
        logs, total = await audit_service.get_audit_logs(
            limit=per_page,
            offset=offset,
            start_date=start_date,
            end_date=end_date,
            event_types=event_types_list,
            event_categories=event_categories_list,
            levels=levels_list,
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            resource_type=resource_type,
            resource_id=resource_id,
            organization_id=organization_id,
            team_id=team_id,
            success=success,
            search_query=search_query,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        # Calculate pagination info
        pages = (total + per_page - 1) // per_page
        
        return AuditLogListResponse(
            logs=[AuditLogResponse.from_orm(log) for log in logs],
            total=total,
            page=page,
            per_page=per_page,
            pages=pages
        )


@router.get("/statistics", response_model=AuditStatisticsResponse)
async def get_audit_statistics(
    request: Request,
    start_date: Optional[datetime] = Query(None, description="Start date for statistics"),
    end_date: Optional[datetime] = Query(None, description="End date for statistics"),
    organization_id: Optional[str] = Query(None, description="Filter by organization ID"),
    current_user: User = Depends(get_current_user)
):
    """Get audit log statistics and analytics."""
    
    async with get_audit_service() as audit_service:
        stats = await audit_service.get_audit_statistics(
            start_date=start_date,
            end_date=end_date,
            organization_id=organization_id
        )
        
        return AuditStatisticsResponse(**stats)


@router.post("/logs")
async def create_audit_log(
    request: Request,
    audit_log_data: AuditLogCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a custom audit log entry."""
    
    # Get request information
    client_host = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    async with get_audit_service() as audit_service:
        audit_log = await audit_service.log_event(
            event_type=audit_log_data.event_type,
            message=audit_log_data.message,
            user_id=current_user.id,
            user_email=current_user.email,
            user_name=current_user.full_name,
            ip_address=client_host,
            user_agent=user_agent,
            resource_type=audit_log_data.resource_type,
            resource_id=audit_log_data.resource_id,
            resource_name=audit_log_data.resource_name,
            organization_id=audit_log_data.organization_id,
            team_id=audit_log_data.team_id,
            metadata=audit_log_data.metadata,
            tags=audit_log_data.tags,
            level=audit_log_data.level,
            compliance_tags=audit_log_data.compliance_tags
        )
        
        return {"id": audit_log.id, "message": "Audit log created successfully"}


@router.get("/event-types")
async def get_event_types(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Get all available audit event types."""
    
    event_types = [
        {
            "value": event_type.value,
            "name": event_type.name,
            "category": "authentication" if "LOGIN" in event_type.name or "LOGOUT" in event_type.name else
                       "authorization" if "PERMISSION" in event_type.name or "ROLE" in event_type.name else
                       "user_management" if "USER_" in event_type.name else
                       "team_management" if "TEAM_" in event_type.name else
                       "infrastructure" if any(x in event_type.name for x in ["CLUSTER_", "DEPLOYMENT_"]) else
                       "pipeline" if "PIPELINE_" in event_type.name else
                       "system" if any(x in event_type.name for x in ["SYSTEM_", "BACKUP_", "MAINTENANCE"]) else
                       "security" if any(x in event_type.name for x in ["SUSPICIOUS_", "SECURITY_", "RATE_LIMIT", "IP_BLOCKED"]) else
                       "data" if "DATA_" in event_type.name or "SENSITIVE_DATA" in event_type.name else
                       "other"
        }
        for event_type in AuditEventType
    ]
    
    return {"event_types": event_types}


@router.get("/levels")
async def get_log_levels(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Get all available audit log levels."""
    
    levels = [
        {
            "value": level.value,
            "name": level.name,
            "description": {
                "INFO": "Informational events for normal operations",
                "WARNING": "Warning events that may require attention",
                "ERROR": "Error events indicating failures",
                "CRITICAL": "Critical events requiring immediate action"
            }.get(level.name, "")
        }
        for level in AuditLogLevel
    ]
    
    return {"levels": levels}


@router.post("/retention-policies")
async def create_retention_policy(
    request: Request,
    policy_data: RetentionPolicyCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new audit log retention policy."""
    
    async with get_audit_service() as audit_service:
        policy = await audit_service.create_retention_policy(
            policy_name=policy_data.policy_name,
            description=policy_data.description,
            event_types=policy_data.event_types,
            retention_days=policy_data.retention_days,
            event_categories=policy_data.event_categories,
            levels=policy_data.levels,
            archive_after_days=policy_data.archive_after_days,
            compression_enabled=policy_data.compression_enabled,
            compliance_framework=policy_data.compliance_framework,
            immutable=policy_data.immutable,
            encryption_required=policy_data.encryption_required
        )
        
        return {"id": policy.id, "message": "Retention policy created successfully"}


@router.post("/alerts")
async def create_audit_alert(
    request: Request,
    alert_data: AlertCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new audit log alert."""
    
    async with get_audit_service() as audit_service:
        alert = await audit_service.create_alert(
            alert_name=alert_data.alert_name,
            description=alert_data.description,
            severity=alert_data.severity,
            notification_channels=alert_data.notification_channels,
            event_types=alert_data.event_types,
            event_pattern=alert_data.event_pattern,
            threshold_count=alert_data.threshold_count,
            threshold_window_minutes=alert_data.threshold_window_minutes,
            user_filter=alert_data.user_filter,
            ip_filter=alert_data.ip_filter,
            resource_filter=alert_data.resource_filter,
            notification_template=alert_data.notification_template
        )
        
        return {"id": alert.id, "message": "Audit alert created successfully"}


@router.get("/export")
async def export_audit_logs(
    request: Request,
    format: str = Query("csv", pattern="^(csv|json|xlsx|zip)$", description="Export format"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    event_types: Optional[str] = Query(None, description="Comma-separated event types"),
    event_categories: Optional[str] = Query(None, description="Comma-separated event categories"),
    levels: Optional[str] = Query(None, description="Comma-separated levels"),
    user_email: Optional[str] = Query(None, description="Filter by user email"),
    organization_id: Optional[str] = Query(None, description="Filter by organization ID"),
    team_id: Optional[str] = Query(None, description="Filter by team ID"),
    success: Optional[bool] = Query(None, description="Filter by success status"),
    max_records: int = Query(50000, ge=1, le=100000, description="Maximum records to export"),
    current_user: User = Depends(get_current_user)
):
    """Export audit logs in various formats."""
    
    from app.services.audit_export_service import get_audit_export_service
    
    async with get_audit_service() as audit_service:
        export_service = await get_audit_export_service(audit_service)
        
        # Parse comma-separated filters
        filters = {}
        if start_date:
            filters['start_date'] = start_date
        if end_date:
            filters['end_date'] = end_date
        if event_types:
            filters['event_types'] = event_types.split(",")
        if event_categories:
            filters['event_categories'] = event_categories.split(",")
        if levels:
            filters['levels'] = levels.split(",")
        if user_email:
            filters['user_email'] = user_email
        if organization_id:
            filters['organization_id'] = organization_id
        if team_id:
            filters['team_id'] = team_id
        if success is not None:
            filters['success'] = success
        
        return await export_service.export_logs(
            format=format,
            filters=filters,
            max_records=max_records
        )


@router.get("/compliance-report")
async def get_compliance_report(
    request: Request,
    framework: str = Query(..., description="Compliance framework (SOX, GDPR, HIPAA, etc.)"),
    start_date: datetime = Query(..., description="Report start date"),
    end_date: datetime = Query(..., description="Report end date"),
    organization_id: Optional[str] = Query(None, description="Filter by organization ID"),
    current_user: User = Depends(get_current_user)
):
    """Generate compliance report for specific framework."""
    
    from app.services.audit_export_service import get_audit_export_service
    
    async with get_audit_service() as audit_service:
        export_service = await get_audit_export_service(audit_service)
        
        report = await export_service.generate_compliance_report(
            framework=framework,
            start_date=start_date,
            end_date=end_date,
            organization_id=organization_id
        )
        
        return report