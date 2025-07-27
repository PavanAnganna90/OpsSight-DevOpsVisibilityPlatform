"""
Comprehensive Audit Service for security and activity tracking.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.orm import selectinload
import json
import asyncio
from contextlib import asynccontextmanager

from app.models.audit_log import (
    AuditLog,
    AuditLogRetentionPolicy,
    AuditLogAlert,
    AuditLogArchive,
    AuditLogQuery,
    AuditEventType,
    AuditLogLevel
)
from app.models.user import User
from app.db.database import get_async_db
from app.core.config import settings


class AuditService:
    """Service for managing audit logs and security events."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def log_event(
        self,
        event_type: AuditEventType,
        message: str,
        user_id: Optional[int] = None,
        user_email: Optional[str] = None,
        user_name: Optional[str] = None,
        session_id: Optional[str] = None,
        sso_provider: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        resource_name: Optional[str] = None,
        organization_id: Optional[str] = None,
        team_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None,
        success: bool = True,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
        duration_ms: Optional[int] = None,
        level: AuditLogLevel = AuditLogLevel.INFO,
        compliance_tags: Optional[List[str]] = None,
        retention_policy: Optional[str] = None
    ) -> AuditLog:
        """Log a security or activity event."""
        
        # Determine event category
        event_category = self._get_event_category(event_type)
        
        # Create audit log entry
        audit_log = AuditLog(
            event_type=event_type,
            event_category=event_category,
            level=level,
            message=message,
            user_id=user_id,
            user_email=user_email,
            user_name=user_name,
            session_id=session_id,
            sso_provider=sso_provider,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            organization_id=organization_id,
            team_id=team_id,
            metadata=metadata,
            tags=tags,
            success=success,
            error_code=error_code,
            error_message=error_message,
            duration_ms=duration_ms,
            compliance_tags=compliance_tags,
            retention_policy=retention_policy,
            timestamp=datetime.utcnow()
        )
        
        self.session.add(audit_log)
        await self.session.commit()
        
        # Check for alerts asynchronously
        asyncio.create_task(self._check_alerts(audit_log))
        
        return audit_log
    
    def _get_event_category(self, event_type: AuditEventType) -> str:
        """Determine event category based on event type."""
        category_map = {
            # Authentication
            AuditEventType.LOGIN_SUCCESS: "authentication",
            AuditEventType.LOGIN_FAILED: "authentication",
            AuditEventType.LOGOUT: "authentication",
            AuditEventType.SSO_LOGIN_SUCCESS: "authentication",
            AuditEventType.SSO_LOGIN_FAILED: "authentication",
            AuditEventType.TOKEN_REFRESH: "authentication",
            AuditEventType.PASSWORD_CHANGE: "authentication",
            
            # Authorization
            AuditEventType.PERMISSION_GRANTED: "authorization",
            AuditEventType.PERMISSION_DENIED: "authorization",
            AuditEventType.ROLE_ASSIGNED: "authorization",
            AuditEventType.ROLE_REVOKED: "authorization",
            
            # User Management
            AuditEventType.USER_CREATED: "user_management",
            AuditEventType.USER_UPDATED: "user_management",
            AuditEventType.USER_DELETED: "user_management",
            AuditEventType.USER_ACTIVATED: "user_management",
            AuditEventType.USER_DEACTIVATED: "user_management",
            
            # Role Management
            AuditEventType.ROLE_CREATED: "role_management",
            AuditEventType.ROLE_UPDATED: "role_management",
            AuditEventType.ROLE_DELETED: "role_management",
            AuditEventType.PERMISSION_CREATED: "role_management",
            AuditEventType.PERMISSION_UPDATED: "role_management",
            AuditEventType.PERMISSION_DELETED: "role_management",
            
            # Team Management
            AuditEventType.TEAM_CREATED: "team_management",
            AuditEventType.TEAM_UPDATED: "team_management",
            AuditEventType.TEAM_DELETED: "team_management",
            AuditEventType.TEAM_MEMBER_ADDED: "team_management",
            AuditEventType.TEAM_MEMBER_REMOVED: "team_management",
            
            # Infrastructure
            AuditEventType.CLUSTER_CREATED: "infrastructure",
            AuditEventType.CLUSTER_UPDATED: "infrastructure",
            AuditEventType.CLUSTER_DELETED: "infrastructure",
            AuditEventType.DEPLOYMENT_CREATED: "infrastructure",
            AuditEventType.DEPLOYMENT_UPDATED: "infrastructure",
            AuditEventType.DEPLOYMENT_DELETED: "infrastructure",
            
            # Pipeline
            AuditEventType.PIPELINE_CREATED: "pipeline",
            AuditEventType.PIPELINE_UPDATED: "pipeline",
            AuditEventType.PIPELINE_DELETED: "pipeline",
            AuditEventType.PIPELINE_EXECUTED: "pipeline",
            AuditEventType.PIPELINE_FAILED: "pipeline",
            
            # System
            AuditEventType.SYSTEM_CONFIG_CHANGED: "system",
            AuditEventType.BACKUP_CREATED: "system",
            AuditEventType.BACKUP_RESTORED: "system",
            AuditEventType.SYSTEM_MAINTENANCE: "system",
            
            # Security
            AuditEventType.SUSPICIOUS_ACTIVITY: "security",
            AuditEventType.SECURITY_VIOLATION: "security",
            AuditEventType.RATE_LIMIT_EXCEEDED: "security",
            AuditEventType.IP_BLOCKED: "security",
            
            # Data
            AuditEventType.DATA_EXPORT: "data",
            AuditEventType.DATA_IMPORT: "data",
            AuditEventType.DATA_DELETED: "data",
            AuditEventType.SENSITIVE_DATA_ACCESS: "data",
        }
        
        return category_map.get(event_type, "other")
    
    async def get_audit_logs(
        self,
        limit: int = 100,
        offset: int = 0,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        event_types: Optional[List[str]] = None,
        event_categories: Optional[List[str]] = None,
        levels: Optional[List[str]] = None,
        user_id: Optional[int] = None,
        user_email: Optional[str] = None,
        ip_address: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        organization_id: Optional[str] = None,
        team_id: Optional[str] = None,
        success: Optional[bool] = None,
        search_query: Optional[str] = None,
        sort_by: str = "timestamp",
        sort_order: str = "desc"
    ) -> tuple[List[AuditLog], int]:
        """Get audit logs with filtering and pagination."""
        
        query = select(AuditLog)
        
        # Apply filters
        conditions = []
        
        if start_date:
            conditions.append(AuditLog.timestamp >= start_date)
        if end_date:
            conditions.append(AuditLog.timestamp <= end_date)
        if event_types:
            conditions.append(AuditLog.event_type.in_(event_types))
        if event_categories:
            conditions.append(AuditLog.event_category.in_(event_categories))
        if levels:
            conditions.append(AuditLog.level.in_(levels))
        if user_id:
            conditions.append(AuditLog.user_id == user_id)
        if user_email:
            conditions.append(AuditLog.user_email == user_email)
        if ip_address:
            conditions.append(AuditLog.ip_address == ip_address)
        if resource_type:
            conditions.append(AuditLog.resource_type == resource_type)
        if resource_id:
            conditions.append(AuditLog.resource_id == resource_id)
        if organization_id:
            conditions.append(AuditLog.organization_id == organization_id)
        if team_id:
            conditions.append(AuditLog.team_id == team_id)
        if success is not None:
            conditions.append(AuditLog.success == success)
        if search_query:
            conditions.append(
                or_(
                    AuditLog.message.ilike(f"%{search_query}%"),
                    AuditLog.user_name.ilike(f"%{search_query}%"),
                    AuditLog.user_email.ilike(f"%{search_query}%"),
                    AuditLog.resource_name.ilike(f"%{search_query}%")
                )
            )
        
        if conditions:
            query = query.where(and_(*conditions))
        
        # Apply sorting
        sort_column = getattr(AuditLog, sort_by, AuditLog.timestamp)
        if sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
        
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_count = await self.session.execute(count_query)
        total_count = total_count.scalar()
        
        # Apply pagination
        query = query.offset(offset).limit(limit)
        
        # Execute query
        result = await self.session.execute(query)
        logs = result.scalars().all()
        
        return logs, total_count
    
    async def get_audit_statistics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        organization_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get audit log statistics."""
        
        # Default to last 30 days
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        base_query = select(AuditLog).where(
            and_(
                AuditLog.timestamp >= start_date,
                AuditLog.timestamp <= end_date
            )
        )
        
        if organization_id:
            base_query = base_query.where(AuditLog.organization_id == organization_id)
        
        # Total events
        total_events = await self.session.execute(
            select(func.count()).select_from(base_query.subquery())
        )
        total_events = total_events.scalar()
        
        # Events by type
        events_by_type = await self.session.execute(
            select(AuditLog.event_type, func.count(AuditLog.id))
            .select_from(base_query.subquery())
            .group_by(AuditLog.event_type)
            .order_by(func.count(AuditLog.id).desc())
        )
        events_by_type = {row[0]: row[1] for row in events_by_type.fetchall()}
        
        # Events by category
        events_by_category = await self.session.execute(
            select(AuditLog.event_category, func.count(AuditLog.id))
            .select_from(base_query.subquery())
            .group_by(AuditLog.event_category)
            .order_by(func.count(AuditLog.id).desc())
        )
        events_by_category = {row[0]: row[1] for row in events_by_category.fetchall()}
        
        # Events by level
        events_by_level = await self.session.execute(
            select(AuditLog.level, func.count(AuditLog.id))
            .select_from(base_query.subquery())
            .group_by(AuditLog.level)
            .order_by(func.count(AuditLog.id).desc())
        )
        events_by_level = {row[0]: row[1] for row in events_by_level.fetchall()}
        
        # Failed events
        failed_events = await self.session.execute(
            select(func.count()).select_from(
                base_query.where(AuditLog.success == False).subquery()
            )
        )
        failed_events = failed_events.scalar()
        
        # Top users
        top_users = await self.session.execute(
            select(AuditLog.user_email, func.count(AuditLog.id))
            .select_from(base_query.subquery())
            .where(AuditLog.user_email.is_not(None))
            .group_by(AuditLog.user_email)
            .order_by(func.count(AuditLog.id).desc())
            .limit(10)
        )
        top_users = {row[0]: row[1] for row in top_users.fetchall()}
        
        # Top IP addresses
        top_ips = await self.session.execute(
            select(AuditLog.ip_address, func.count(AuditLog.id))
            .select_from(base_query.subquery())
            .where(AuditLog.ip_address.is_not(None))
            .group_by(AuditLog.ip_address)
            .order_by(func.count(AuditLog.id).desc())
            .limit(10)
        )
        top_ips = {row[0]: row[1] for row in top_ips.fetchall()}
        
        # Success rate
        success_rate = ((total_events - failed_events) / total_events * 100) if total_events > 0 else 0
        
        return {
            "total_events": total_events,
            "failed_events": failed_events,
            "success_rate": round(success_rate, 2),
            "events_by_type": events_by_type,
            "events_by_category": events_by_category,
            "events_by_level": events_by_level,
            "top_users": top_users,
            "top_ips": top_ips,
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            }
        }
    
    async def _check_alerts(self, audit_log: AuditLog):
        """Check if audit log triggers any alerts."""
        
        # Get active alerts
        alerts_query = select(AuditLogAlert).where(AuditLogAlert.is_active == True)
        result = await self.session.execute(alerts_query)
        alerts = result.scalars().all()
        
        for alert in alerts:
            if await self._should_trigger_alert(alert, audit_log):
                await self._trigger_alert(alert, audit_log)
    
    async def _should_trigger_alert(self, alert: AuditLogAlert, audit_log: AuditLog) -> bool:
        """Check if alert should be triggered for this log entry."""
        
        # Check event type filter
        if alert.event_types and audit_log.event_type not in alert.event_types:
            return False
        
        # Check user filter
        if alert.user_filter:
            user_filter = alert.user_filter
            if "user_ids" in user_filter and audit_log.user_id not in user_filter["user_ids"]:
                return False
            if "user_emails" in user_filter and audit_log.user_email not in user_filter["user_emails"]:
                return False
        
        # Check IP filter
        if alert.ip_filter:
            ip_filter = alert.ip_filter
            if "ip_addresses" in ip_filter and audit_log.ip_address not in ip_filter["ip_addresses"]:
                return False
        
        # Check resource filter
        if alert.resource_filter:
            resource_filter = alert.resource_filter
            if "resource_types" in resource_filter and audit_log.resource_type not in resource_filter["resource_types"]:
                return False
        
        # Check threshold (if specified)
        if alert.threshold_count and alert.threshold_window_minutes:
            # Count similar events in the time window
            window_start = datetime.utcnow() - timedelta(minutes=alert.threshold_window_minutes)
            
            count_query = select(func.count(AuditLog.id)).where(
                and_(
                    AuditLog.timestamp >= window_start,
                    AuditLog.event_type == audit_log.event_type
                )
            )
            
            if audit_log.user_id:
                count_query = count_query.where(AuditLog.user_id == audit_log.user_id)
            if audit_log.ip_address:
                count_query = count_query.where(AuditLog.ip_address == audit_log.ip_address)
            
            result = await self.session.execute(count_query)
            count = result.scalar()
            
            if count < alert.threshold_count:
                return False
        
        return True
    
    async def _trigger_alert(self, alert: AuditLogAlert, audit_log: AuditLog):
        """Trigger an alert notification."""
        
        # Update alert statistics
        alert.last_triggered = datetime.utcnow()
        alert.trigger_count += 1
        
        # Send notifications based on configured channels
        notification_channels = alert.notification_channels
        
        # This would integrate with actual notification services
        # For now, we'll log the alert
        print(f"ALERT TRIGGERED: {alert.alert_name}")
        print(f"Event: {audit_log.event_type} - {audit_log.message}")
        print(f"User: {audit_log.user_email}")
        print(f"IP: {audit_log.ip_address}")
        print(f"Time: {audit_log.timestamp}")
        
        await self.session.commit()
    
    async def create_retention_policy(
        self,
        policy_name: str,
        description: str,
        event_types: List[str],
        retention_days: int,
        event_categories: Optional[List[str]] = None,
        levels: Optional[List[str]] = None,
        archive_after_days: Optional[int] = None,
        compression_enabled: bool = True,
        compliance_framework: Optional[str] = None,
        immutable: bool = False,
        encryption_required: bool = True
    ) -> AuditLogRetentionPolicy:
        """Create a new retention policy."""
        
        policy = AuditLogRetentionPolicy(
            policy_name=policy_name,
            description=description,
            event_types=event_types,
            event_categories=event_categories,
            levels=levels,
            retention_days=retention_days,
            archive_after_days=archive_after_days,
            compression_enabled=compression_enabled,
            compliance_framework=compliance_framework,
            immutable=immutable,
            encryption_required=encryption_required
        )
        
        self.session.add(policy)
        await self.session.commit()
        
        return policy
    
    async def create_alert(
        self,
        alert_name: str,
        description: str,
        severity: str,
        notification_channels: List[str],
        event_types: Optional[List[str]] = None,
        event_pattern: Optional[str] = None,
        threshold_count: Optional[int] = None,
        threshold_window_minutes: Optional[int] = None,
        user_filter: Optional[Dict[str, Any]] = None,
        ip_filter: Optional[Dict[str, Any]] = None,
        resource_filter: Optional[Dict[str, Any]] = None,
        notification_template: Optional[str] = None
    ) -> AuditLogAlert:
        """Create a new audit log alert."""
        
        alert = AuditLogAlert(
            alert_name=alert_name,
            description=description,
            severity=severity,
            event_types=event_types,
            event_pattern=event_pattern,
            threshold_count=threshold_count,
            threshold_window_minutes=threshold_window_minutes,
            user_filter=user_filter,
            ip_filter=ip_filter,
            resource_filter=resource_filter,
            notification_channels=notification_channels,
            notification_template=notification_template
        )
        
        self.session.add(alert)
        await self.session.commit()
        
        return alert
    
    async def save_query(
        self,
        query_name: str,
        query_sql: str,
        created_by: int,
        description: Optional[str] = None,
        shared: bool = False,
        category: Optional[str] = None
    ) -> AuditLogQuery:
        """Save a query for reuse."""
        
        query = AuditLogQuery(
            query_name=query_name,
            description=description,
            query_sql=query_sql,
            created_by=created_by,
            shared=shared,
            category=category
        )
        
        self.session.add(query)
        await self.session.commit()
        
        return query


@asynccontextmanager
async def get_audit_service():
    """Context manager for audit service."""
    async with get_async_db() as session:
        yield AuditService(session)


# Convenience functions for common audit events
async def log_authentication_event(
    event_type: AuditEventType,
    user_email: str,
    user_name: str,
    ip_address: str,
    user_agent: str,
    success: bool,
    session_id: Optional[str] = None,
    sso_provider: Optional[str] = None,
    error_message: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
):
    """Log authentication events."""
    async with get_audit_service() as audit_service:
        await audit_service.log_event(
            event_type=event_type,
            message=f"User {user_email} authentication {'successful' if success else 'failed'}",
            user_email=user_email,
            user_name=user_name,
            session_id=session_id,
            sso_provider=sso_provider,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            error_message=error_message,
            metadata=metadata,
            level=AuditLogLevel.INFO if success else AuditLogLevel.WARNING
        )


async def log_permission_event(
    event_type: AuditEventType,
    user_id: int,
    user_email: str,
    resource_type: str,
    resource_id: str,
    resource_name: str,
    permission: str,
    success: bool,
    ip_address: Optional[str] = None,
    organization_id: Optional[str] = None,
    team_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
):
    """Log permission events."""
    async with get_audit_service() as audit_service:
        await audit_service.log_event(
            event_type=event_type,
            message=f"Permission {permission} {'granted' if success else 'denied'} for {resource_type} {resource_name}",
            user_id=user_id,
            user_email=user_email,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            organization_id=organization_id,
            team_id=team_id,
            ip_address=ip_address,
            success=success,
            metadata=metadata,
            level=AuditLogLevel.INFO if success else AuditLogLevel.WARNING
        )


async def log_security_event(
    event_type: AuditEventType,
    message: str,
    ip_address: str,
    user_agent: Optional[str] = None,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    severity: AuditLogLevel = AuditLogLevel.WARNING,
    metadata: Optional[Dict[str, Any]] = None
):
    """Log security events."""
    async with get_audit_service() as audit_service:
        await audit_service.log_event(
            event_type=event_type,
            message=message,
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            user_agent=user_agent,
            level=severity,
            metadata=metadata,
            success=False
        )