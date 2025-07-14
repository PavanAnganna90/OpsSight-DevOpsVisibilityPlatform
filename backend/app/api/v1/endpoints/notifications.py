"""
API endpoints for notification management.
Handles notification preferences, digest generation, and notification history.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import select

from app.core.auth import get_current_user
from app.core.dependencies import get_db, get_async_db
from app.models.user import User
from app.models.notification_preference import (
    NotificationPreference,
    NotificationChannel,
    NotificationFrequency,
    NotificationType,
)
from app.models.notification_log import NotificationLog, DeliveryStatus
from app.models.alert import Alert, AlertSeverity
from app.services.notification_service import NotificationService
from app.schemas.notification import (
    NotificationPreferenceCreate,
    NotificationPreferenceUpdate,
    NotificationPreferenceResponse,
    NotificationLogResponse,
    DigestRequest,
    DigestResponse,
    NotificationStatsResponse,
)

router = APIRouter()
notification_service = NotificationService()


@router.get("/preferences", response_model=List[NotificationPreferenceResponse])
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Get all notification preferences for the current user."""
    result = await db.execute(
        select(NotificationPreference).filter(
            NotificationPreference.user_id == current_user.id
        )
    )
    preferences = result.scalars().all()
    # Create default preferences if none exist
    if not preferences:
        await notification_service.create_user_default_preferences(db, current_user.id)
        result = await db.execute(
            select(NotificationPreference).filter(
                NotificationPreference.user_id == current_user.id
            )
        )
        preferences = result.scalars().all()
    return [NotificationPreferenceResponse.from_orm(pref) for pref in preferences]


@router.post("/preferences", response_model=NotificationPreferenceResponse)
async def create_notification_preference(
    preference_data: NotificationPreferenceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Create a new notification preference."""
    result = await db.execute(
        select(NotificationPreference).filter(
            and_(
                NotificationPreference.user_id == current_user.id,
                NotificationPreference.notification_type
                == preference_data.notification_type,
                NotificationPreference.channel == preference_data.channel,
                NotificationPreference.team_id == preference_data.team_id,
                NotificationPreference.project_id == preference_data.project_id,
            )
        )
    )
    existing = result.scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notification preference already exists for this configuration",
        )
    preference = NotificationPreference(
        user_id=current_user.id, **preference_data.dict()
    )
    db.add(preference)
    await db.commit()
    await db.refresh(preference)
    return NotificationPreferenceResponse.from_orm(preference)


@router.put(
    "/preferences/{preference_id}", response_model=NotificationPreferenceResponse
)
async def update_notification_preference(
    preference_id: int,
    preference_data: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Update an existing notification preference."""
    result = await db.execute(
        select(NotificationPreference).filter(
            and_(
                NotificationPreference.id == preference_id,
                NotificationPreference.user_id == current_user.id,
            )
        )
    )
    preference = result.scalars().first()
    if not preference:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification preference not found",
        )
    update_data = preference_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(preference, field, value)
    await db.commit()
    await db.refresh(preference)
    return NotificationPreferenceResponse.from_orm(preference)


@router.delete("/preferences/{preference_id}")
async def delete_notification_preference(
    preference_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Delete a notification preference."""
    result = await db.execute(
        select(NotificationPreference).filter(
            and_(
                NotificationPreference.id == preference_id,
                NotificationPreference.user_id == current_user.id,
            )
        )
    )
    preference = result.scalars().first()
    if not preference:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification preference not found",
        )
    await db.delete(preference)
    await db.commit()
    return {"message": "Notification preference deleted successfully"}


@router.post("/preferences/reset")
async def reset_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Reset user notification preferences to defaults."""
    await db.execute(
        NotificationPreference.__table__.delete().where(
            NotificationPreference.user_id == current_user.id
        )
    )
    await db.commit()
    await notification_service.create_user_default_preferences(db, current_user.id)
    result = await db.execute(
        select(NotificationPreference).filter(
            NotificationPreference.user_id == current_user.id
        )
    )
    preferences = result.scalars().all()
    return [NotificationPreferenceResponse.from_orm(pref) for pref in preferences]


@router.get("/history", response_model=List[NotificationLogResponse])
async def get_notification_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    channel: Optional[NotificationChannel] = Query(None),
    status: Optional[DeliveryStatus] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
):
    """Get notification history for the current user."""
    query = select(NotificationLog).filter(NotificationLog.user_id == current_user.id)
    if channel:
        query = query.filter(NotificationLog.channel == channel.value)
    if status:
        query = query.filter(NotificationLog.status == status)
    if start_date:
        query = query.filter(NotificationLog.created_at >= start_date)
    if end_date:
        query = query.filter(NotificationLog.created_at <= end_date)
    query = query.order_by(desc(NotificationLog.created_at)).offset(offset).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()
    return [NotificationLogResponse.from_orm(log) for log in logs]


@router.get("/stats", response_model=NotificationStatsResponse)
async def get_notification_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
):
    """Get notification statistics for the current user."""
    start_date = datetime.utcnow() - timedelta(days=days)

    # Get total notifications
    total_query = db.query(NotificationLog).filter(
        and_(
            NotificationLog.user_id == current_user.id,
            NotificationLog.created_at >= start_date,
        )
    )

    total_notifications = total_query.count()

    # Get stats by status
    sent_notifications = total_query.filter(
        NotificationLog.status.in_([DeliveryStatus.SENT, DeliveryStatus.DELIVERED])
    ).count()

    failed_notifications = total_query.filter(
        NotificationLog.status.in_(
            [DeliveryStatus.FAILED, DeliveryStatus.BOUNCED, DeliveryStatus.REJECTED]
        )
    ).count()

    pending_notifications = total_query.filter(
        NotificationLog.status == DeliveryStatus.PENDING
    ).count()

    # Get stats by channel
    channel_stats = {}
    for channel in NotificationChannel:
        count = total_query.filter(NotificationLog.channel == channel.value).count()
        if count > 0:
            channel_stats[channel.value] = count

    # Get stats by notification type
    type_stats = {}
    for notification_type in NotificationType:
        count = total_query.filter(
            NotificationLog.notification_type == notification_type.value
        ).count()
        if count > 0:
            type_stats[notification_type.value] = count

    return NotificationStatsResponse(
        total_notifications=total_notifications,
        sent_notifications=sent_notifications,
        failed_notifications=failed_notifications,
        pending_notifications=pending_notifications,
        channel_stats=channel_stats,
        type_stats=type_stats,
        period_days=days,
    )


@router.post("/digest/generate", response_model=DigestResponse)
async def generate_digest(
    digest_request: DigestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a notification digest for the current user."""
    # Calculate date range
    end_date = digest_request.end_date or datetime.utcnow()

    if digest_request.digest_type == "daily":
        start_date = end_date - timedelta(days=1)
    elif digest_request.digest_type == "weekly":
        start_date = end_date - timedelta(weeks=1)
    elif digest_request.digest_type == "monthly":
        start_date = end_date - timedelta(days=30)
    else:
        start_date = digest_request.start_date or (end_date - timedelta(days=1))

    # Get alerts for the time period
    alerts_query = db.query(Alert).filter(
        and_(Alert.triggered_at >= start_date, Alert.triggered_at <= end_date)
    )

    # Filter by team if specified
    if digest_request.team_id:
        # Add team filtering logic here when team-alert relationships are available
        pass

    alerts = alerts_query.order_by(desc(Alert.triggered_at)).all()

    # Group alerts by severity
    alert_stats = {
        "critical": len([a for a in alerts if a.severity == AlertSeverity.CRITICAL]),
        "high": len([a for a in alerts if a.severity == AlertSeverity.HIGH]),
        "medium": len([a for a in alerts if a.severity == AlertSeverity.MEDIUM]),
        "low": len([a for a in alerts if a.severity == AlertSeverity.LOW]),
    }

    # Get notification history for the period
    notifications = (
        db.query(NotificationLog)
        .filter(
            and_(
                NotificationLog.user_id == current_user.id,
                NotificationLog.created_at >= start_date,
                NotificationLog.created_at <= end_date,
            )
        )
        .order_by(desc(NotificationLog.created_at))
        .all()
    )

    # Prepare digest data
    digest_data = {
        "date_range": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
        "stats": {
            "critical_alerts": alert_stats["critical"],
            "high_alerts": alert_stats["high"],
            "medium_alerts": alert_stats["medium"],
            "low_alerts": alert_stats["low"],
            "total_alerts": len(alerts),
            "total_notifications": len(notifications),
            "successful_notifications": len(
                [n for n in notifications if n.is_delivered()]
            ),
            "failed_notifications": len([n for n in notifications if n.is_failed()]),
        },
        "alerts": [
            {
                "id": alert.id,
                "title": alert.title,
                "severity": alert.severity.value,
                "source": alert.source,
                "category": alert.category,
                "status": alert.status.value,
                "triggered_at": (
                    alert.triggered_at.isoformat() if alert.triggered_at else None
                ),
            }
            for alert in alerts[:10]  # Limit to top 10 for digest
        ],
        "notifications": [
            {
                "id": notif.id,
                "channel": notif.channel,
                "type": notif.notification_type,
                "status": notif.status.value,
                "created_at": notif.created_at.isoformat(),
            }
            for notif in notifications[:10]  # Limit to top 10 for digest
        ],
    }

    return DigestResponse(
        digest_type=digest_request.digest_type,
        start_date=start_date,
        end_date=end_date,
        user_id=current_user.id,
        data=digest_data,
        generated_at=datetime.utcnow(),
    )


@router.post("/digest/send", response_model=Dict[str, Any])
async def send_digest(
    digest_request: DigestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate and send a digest notification to the current user."""
    # Generate digest data
    digest_response = await generate_digest(digest_request, current_user, db)

    # Send digest notification
    results = await notification_service.send_digest_notification(
        user_id=current_user.id,
        digest_data=digest_response.data,
        digest_type=digest_request.digest_type,
    )

    return {
        "message": "Digest sent successfully",
        "digest_type": digest_request.digest_type,
        "delivery_results": results,
        "generated_at": digest_response.generated_at.isoformat(),
    }


@router.get("/channels", response_model=List[Dict[str, str]])
async def get_available_channels():
    """Get list of available notification channels."""
    return [
        {"value": channel.value, "label": channel.value.title()}
        for channel in NotificationChannel
    ]


@router.get("/types", response_model=List[Dict[str, str]])
async def get_notification_types():
    """Get list of available notification types."""
    return [
        {"value": ntype.value, "label": ntype.value.replace("_", " ").title()}
        for ntype in NotificationType
    ]


@router.get("/frequencies", response_model=List[Dict[str, str]])
async def get_notification_frequencies():
    """Get list of available notification frequencies."""
    return [
        {"value": freq.value, "label": freq.value.title()}
        for freq in NotificationFrequency
    ]


@router.post("/test/{channel}")
async def test_notification_channel(
    channel: NotificationChannel,
    current_user: User = Depends(get_current_user),
    message: Optional[str] = "This is a test notification from OpsSight",
):
    """Send a test notification to verify channel configuration."""
    # Import here to avoid circular imports
    from app.services.slack_notification_service import SlackNotificationService
    from app.services.email_service import EmailService

    if channel == NotificationChannel.EMAIL:
        email_service = EmailService()
        try:
            result = await email_service.send_notification(
                user=current_user,
                content={
                    "subject": "Test Email Notification",
                    "body": message,
                    "template_name": "generic",
                },
                log_entry=None,  # Skip logging for test
            )
            return {"status": "success", "channel": channel.value, "result": result}
        except Exception as e:
            return {"status": "error", "channel": channel.value, "error": str(e)}

    elif channel == NotificationChannel.SLACK:
        slack_service = SlackNotificationService()
        try:
            # Test user mapping first
            mapping_result = await slack_service.test_user_mapping(current_user)
            if not mapping_result["mapping_successful"]:
                return {
                    "status": "error",
                    "channel": channel.value,
                    "error": "Slack user mapping failed",
                    "details": mapping_result,
                }

            # Send test message
            result = await slack_service.send_notification(
                user=current_user,
                content={"subject": "Test Slack Notification", "body": message},
                log_entry=None,  # Skip logging for test
            )
            return {"status": "success", "channel": channel.value, "result": result}
        except Exception as e:
            return {"status": "error", "channel": channel.value, "error": str(e)}

    else:
        return {
            "status": "error",
            "channel": channel.value,
            "error": f"Channel {channel.value} not implemented for testing",
        }
