"""
Alert management API endpoints.
Handles webhook receivers, alert lifecycle management, and notifications.
"""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    Header,
    status,
    Path,
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timedelta
import hashlib
import hmac
import json
import uuid
import logging
from fastapi.responses import JSONResponse

from app.core.auth import get_current_user
from app.core.dependencies import get_db, get_async_db
from app.models.user import User
from app.models.alert import Alert, AlertSeverity, AlertStatus, AlertChannel
from app.services.alert_service import AlertService
from app.services.alert_categorization_service import alert_categorization_service
from app.services.alert_lifecycle_service import (
    AlertLifecycleService,
    AlertLifecycleStage,
    AlertMetrics,
)
from app.services.slack_service import SlackService
from app.schemas.alert import (
    AlertCreate,
    AlertUpdate,
    Alert as AlertSchema,
    AlertStats,
    AlertSummary,
    SlackNotificationData,
    WebhookNotificationData,
    AlertNotificationCreate,
)
from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()


class WebhookAuth:
    """Webhook authentication utilities."""

    @staticmethod
    def verify_slack_signature(
        body: bytes, timestamp: str, signature: str, signing_secret: str
    ) -> bool:
        """
        Verify Slack request signature.

        Args:
            body: Request body
            timestamp: Request timestamp
            signature: Slack signature header
            signing_secret: Slack app signing secret

        Returns:
            bool: True if signature is valid
        """
        if abs(int(datetime.now().timestamp()) - int(timestamp)) > 300:
            return False

        sig_basestring = f"v0:{timestamp}:{body.decode('utf-8')}"
        computed_signature = f"v0={hmac.new(signing_secret.encode(), sig_basestring.encode(), hashlib.sha256).hexdigest()}"

        return hmac.compare_digest(computed_signature, signature)

    @staticmethod
    def verify_webhook_signature(
        body: bytes, signature: str, secret: str, algorithm: str = "sha256"
    ) -> bool:
        """
        Verify generic webhook signature.

        Args:
            body: Request body
            signature: Webhook signature
            secret: Webhook secret
            algorithm: Hash algorithm

        Returns:
            bool: True if signature is valid
        """
        if algorithm == "sha256":
            computed_signature = hmac.new(
                secret.encode(), body, hashlib.sha256
            ).hexdigest()
            expected_signature = f"sha256={computed_signature}"
        else:
            return False

        return hmac.compare_digest(expected_signature, signature)


@router.post("/webhook/generic")
async def receive_generic_webhook(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    x_signature: Optional[str] = Header(None, alias="X-Signature"),
    x_webhook_secret: Optional[str] = Header(None, alias="X-Webhook-Secret"),
    user_agent: Optional[str] = Header(None, alias="User-Agent"),
):
    """
    Generic webhook receiver for external alert systems.

    Accepts webhook payloads from various monitoring systems like:
    - Prometheus AlertManager
    - Grafana
    - PagerDuty
    - Custom monitoring systems

    Authentication can be done via:
    - X-Signature header with HMAC verification
    - X-Webhook-Secret header for simple secret verification
    """
    try:
        # Get request body
        body = await request.body()

        # Basic authentication check
        webhook_secret = getattr(settings, "WEBHOOK_SECRET", None)
        if webhook_secret and x_signature:
            if not WebhookAuth.verify_webhook_signature(
                body, x_signature, webhook_secret
            ):
                logger.warning(f"Invalid webhook signature from {request.client.host}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid webhook signature",
                )
        elif webhook_secret and x_webhook_secret:
            if not hmac.compare_digest(webhook_secret, x_webhook_secret):
                logger.warning(f"Invalid webhook secret from {request.client.host}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid webhook secret",
                )

        # Parse JSON payload
        try:
            payload = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            logger.error("Invalid JSON payload in webhook request")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload"
            )

        # Process the webhook payload
        processed_alerts = await process_webhook_payload(
            db, payload, user_agent or "Unknown"
        )

        logger.info(f"Processed {len(processed_alerts)} alerts from webhook")

        return {
            "status": "success",
            "message": f"Processed {len(processed_alerts)} alerts",
            "alerts_created": [alert.id for alert in processed_alerts],
            "timestamp": datetime.utcnow().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing webhook",
        )


@router.post("/webhook/slack")
async def receive_slack_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_slack_signature: Optional[str] = Header(None, alias="X-Slack-Signature"),
    x_slack_request_timestamp: Optional[str] = Header(
        None, alias="X-Slack-Request-Timestamp"
    ),
):
    """
    Slack webhook receiver for alert notifications and interactions.

    Handles:
    - Slack slash commands
    - Interactive button clicks
    - App mentions
    - Direct messages to the bot
    """
    try:
        body = await request.body()

        # Verify Slack signature
        slack_signing_secret = getattr(settings, "SLACK_SIGNING_SECRET", None)
        if slack_signing_secret and x_slack_signature and x_slack_request_timestamp:
            if not WebhookAuth.verify_slack_signature(
                body, x_slack_request_timestamp, x_slack_signature, slack_signing_secret
            ):
                logger.warning("Invalid Slack signature")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Slack signature",
                )

        # Parse form-encoded or JSON payload
        content_type = request.headers.get("content-type", "")
        if "application/x-www-form-urlencoded" in content_type:
            from urllib.parse import parse_qs

            form_data = parse_qs(body.decode("utf-8"))
            payload = {k: v[0] if len(v) == 1 else v for k, v in form_data.items()}
        else:
            payload = json.loads(body.decode("utf-8"))

        # Handle URL verification for Slack app setup
        if payload.get("type") == "url_verification":
            return {"challenge": payload.get("challenge")}

        # Process Slack events
        response_data = await process_slack_event(db, payload)

        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing Slack webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing Slack webhook",
        )


async def process_webhook_payload(
    db: Session, payload: Dict[str, Any], source: str
) -> List[Alert]:
    """
    Process webhook payload and create alerts with intelligent categorization and notifications.

    Args:
        db: Database session
        payload: Webhook payload
        source: Source system name

    Returns:
        List of created alerts
    """
    created_alerts = []

    # Handle different payload formats
    if "alerts" in payload:
        # Prometheus AlertManager format
        alerts_data = payload["alerts"]
    elif "alert" in payload:
        # Single alert format
        alerts_data = [payload["alert"]]
    elif isinstance(payload, list):
        # Array of alerts
        alerts_data = payload
    else:
        # Single alert object
        alerts_data = [payload]

    for alert_data in alerts_data:
        try:
            # Extract alert information with categorization
            alert_info = extract_alert_info(alert_data, source)

            # Skip if alert was suppressed
            if alert_info is None:
                continue

            # Check for duplicate alerts
            existing_alert = (
                db.query(Alert)
                .filter(
                    Alert.alert_id == alert_info["alert_id"], Alert.source == source
                )
                .first()
            )

            if existing_alert:
                # Update existing alert with enhanced data
                existing_alert.message = alert_info["message"]
                existing_alert.severity = alert_info["severity"]
                existing_alert.category = alert_info["category"]
                existing_alert.triggered_at = datetime.utcnow()
                existing_alert.context_data = json.dumps(alert_info.get("context", {}))
                existing_alert.labels = json.dumps(alert_info.get("labels", {}))
                existing_alert.annotations = json.dumps(
                    alert_info.get("annotations", {})
                )

                # Reactivate if previously resolved
                if existing_alert.status == AlertStatus.RESOLVED:
                    existing_alert.status = AlertStatus.ACTIVE
                    existing_alert.resolved_at = None
                    existing_alert.resolved_by_user_id = None
                    existing_alert.resolution_comment = None

                db.commit()
                db.refresh(existing_alert)
                created_alerts.append(existing_alert)
                logger.info(f"Updated existing alert: {existing_alert.alert_id}")

                # Send notification for reactivated alerts
                if existing_alert.status == AlertStatus.ACTIVE:
                    await send_alert_notification(existing_alert, is_update=True)

            else:
                # Create new alert with enhanced categorization data
                alert = Alert(
                    alert_id=alert_info["alert_id"],
                    title=alert_info["title"],
                    message=alert_info["message"],
                    severity=alert_info["severity"],
                    status=AlertStatus.ACTIVE,
                    source=source,
                    category=alert_info.get("category"),
                    context_data=json.dumps(alert_info.get("context", {})),
                    labels=json.dumps(alert_info.get("labels", {})),
                    annotations=json.dumps(alert_info.get("annotations", {})),
                    triggered_at=datetime.utcnow(),
                )

                db.add(alert)
                db.commit()
                db.refresh(alert)
                created_alerts.append(alert)
                logger.info(
                    f"Created new alert: {alert.alert_id} with category: {alert.category}, severity: {alert.severity}"
                )

                # Send notification for new alerts
                await send_alert_notification(alert, is_update=False)

        except Exception as e:
            logger.error(f"Error processing alert data: {e}")
            continue

    return created_alerts


async def send_alert_notification(alert: Alert, is_update: bool = False):
    """
    Send notifications for an alert based on categorization rules.

    Args:
        alert: Alert object
        is_update: Whether this is an update to existing alert
    """
    try:
        # Use the new notification integration service for enhanced notifications
        from app.services.notification_integration_service import (
            create_notification_integration_service,
        )
        from app.core.dependencies import SessionLocal

        # Create a new database session for the notification service
        notification_db = SessionLocal()
        try:
            integration_service = create_notification_integration_service(
                notification_db
            )

            # Send notifications via the new integration service
            if alert.status == AlertStatus.RESOLVED:
                await integration_service.handle_alert_resolved(
                    alert, alert.resolved_by_user_id
                )
            else:
                await integration_service.handle_alert_triggered(alert)

        finally:
            notification_db.close()

        # Also keep the legacy notification system for backward compatibility
        # Get notification routing rules
        notification_rules = (
            alert_categorization_service.determine_notification_routing(alert)
        )

        if not notification_rules:
            logger.info(f"No legacy notification rules apply to alert {alert.alert_id}")
            return

        # Check notification priority
        priority = alert_categorization_service.get_notification_priority(alert)

        # Skip if suppressed
        if priority == alert_categorization_service.NotificationPriority.SUPPRESSED:
            logger.info(f"Notification suppressed for alert {alert.alert_id}")
            return

        # Send Slack notifications via legacy system
        if any("slack" in rule.channels for rule in notification_rules):
            try:
                # Import here to avoid circular imports
                from app.services.slack_service import slack_service

                # Create Slack notification data
                slack_data = (
                    alert_categorization_service.create_slack_notification_data(
                        alert, notification_rules
                    )
                )

                # Send notification
                result = await slack_service.send_alert_notification(alert, slack_data)

                if result.get("success"):
                    logger.info(
                        f"Legacy Slack notification sent for alert {alert.alert_id}"
                    )
                else:
                    logger.error(
                        f"Failed to send legacy Slack notification: {result.get('error')}"
                    )

            except Exception as e:
                logger.error(
                    f"Error sending legacy Slack notification for alert {alert.alert_id}: {e}"
                )

        # Log notification activity
        notification_type = "updated" if is_update else "new"
        logger.info(
            f"Processed {notification_type} alert notification: {alert.alert_id} "
            f"(severity: {alert.severity}, category: {alert.category}, priority: {priority})"
        )

    except Exception as e:
        logger.error(f"Error sending notifications for alert {alert.alert_id}: {e}")


def extract_alert_info(alert_data: Dict[str, Any], source: str) -> Dict[str, Any]:
    """
    Extract standardized alert information from various payload formats.
    Uses the alert categorization service for intelligent classification.

    Args:
        alert_data: Raw alert data
        source: Source system

    Returns:
        Standardized alert information with enhanced categorization
    """
    # Check if alert should be suppressed
    should_suppress, suppression_reason = (
        alert_categorization_service.should_suppress_alert(alert_data, source)
    )

    if should_suppress:
        logger.info(f"Alert suppressed: {suppression_reason}")
        return None

    # Generate unique alert ID if not present
    alert_id = alert_data.get("alertname") or alert_data.get("id") or str(uuid.uuid4())

    # Extract title
    title = (
        alert_data.get("alertname")
        or alert_data.get("title")
        or alert_data.get("summary")
        or "Alert from " + source
    )

    # Extract message
    message = (
        alert_data.get("description")
        or alert_data.get("message")
        or alert_data.get("summary")
        or str(alert_data)
    )

    # Use categorization service for intelligent processing
    categorization_result = alert_categorization_service.categorize_alert(
        alert_data, source
    )

    return {
        "alert_id": f"{source}:{alert_id}",
        "title": title[:255],  # Truncate to fit database field
        "message": message,
        "severity": categorization_result["enhanced_severity"],
        "category": categorization_result["category"],
        "context": alert_data,
        "labels": alert_data.get("labels", {}),
        "annotations": alert_data.get("annotations", {}),
        "tags": categorization_result["tags"],
        "metadata": categorization_result["metadata"],
        "priority_boost": categorization_result["priority_boost"],
    }


async def process_slack_event(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process Slack event payload.

    Args:
        db: Database session
        payload: Slack event payload

    Returns:
        Response for Slack
    """
    event_type = payload.get("type")

    if event_type == "event_callback":
        event = payload.get("event", {})
        event_subtype = event.get("type")

        if event_subtype == "app_mention":
            # Handle app mentions
            return await handle_slack_mention(db, event)
        elif event_subtype == "message":
            # Handle direct messages
            return await handle_slack_message(db, event)

    elif event_type == "interactive":
        # Handle interactive components (buttons, dropdowns)
        return await handle_slack_interaction(db, payload)

    return {"status": "ok"}


async def handle_slack_mention(db: Session, event: Dict[str, Any]) -> Dict[str, Any]:
    """Handle Slack app mentions."""
    # Extract mention context and create alert if needed
    text = event.get("text", "")
    user = event.get("user")
    channel = event.get("channel")

    # Simple alert creation from mention
    if "alert" in text.lower():
        alert = Alert(
            alert_id=f"slack:{event.get('ts', uuid.uuid4())}",
            title="Alert from Slack mention",
            message=text,
            severity=AlertSeverity.MEDIUM,
            status=AlertStatus.ACTIVE,
            source="slack",
            category="user_reported",
            context_data=json.dumps(
                {"user": user, "channel": channel, "timestamp": event.get("ts")}
            ),
        )

        db.add(alert)
        db.commit()
        logger.info(f"Created alert from Slack mention: {alert.alert_id}")

    return {"status": "ok"}


async def handle_slack_message(db: Session, event: Dict[str, Any]) -> Dict[str, Any]:
    """Handle Slack direct messages."""
    # Process direct messages to the bot
    return {"status": "ok"}


async def handle_slack_interaction(
    db: Session, payload: Dict[str, Any]
) -> Dict[str, Any]:
    """Handle Slack interactive components."""
    # Process button clicks, dropdown selections, etc.
    return {"status": "ok"}


# Standard CRUD endpoints


@router.get("/", response_model=List[AlertSchema])
async def get_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    project_id: Optional[int] = None,
    status: Optional[AlertStatus] = None,
    severity: Optional[AlertSeverity] = None,
    source: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
):
    """
    Get alerts with optional filtering.

    Args:
        project_id: Filter by project ID
        status: Filter by alert status
        severity: Filter by alert severity
        source: Filter by alert source
        skip: Number of records to skip
        limit: Maximum number of records to return
    """
    if project_id:
        alerts = await AlertService.get_alerts_by_project(
            db, project_id, current_user.id, skip, limit, status, severity, source
        )
    else:
        # Get alerts across all accessible projects
        alerts = await AlertService.get_active_alerts(
            db, None, current_user.id, [severity] if severity else None
        )

    return alerts


@router.get("/{alert_id}", response_model=AlertSchema)
async def get_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific alert by ID."""
    alert = await AlertService.get_alert_by_id(db, alert_id, current_user.id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found"
        )
    return alert


@router.post("/", response_model=AlertSchema)
async def create_alert(
    alert_data: AlertCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new alert manually."""
    alert = await AlertService.create_alert(db, alert_data, current_user.id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create alert"
        )
    return alert


@router.put("/{alert_id}", response_model=AlertSchema)
async def update_alert(
    alert_id: int,
    alert_data: AlertUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing alert."""
    alert = await AlertService.update_alert(db, alert_id, alert_data, current_user.id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found"
        )
    return alert


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Acknowledge an alert."""
    alert = AlertService.acknowledge_alert(db, alert_id, current_user.id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found"
        )
    return {"status": "acknowledged", "alert_id": alert_id}


@router.post("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    resolution_note: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resolve an alert."""
    alert = await AlertService.resolve_alert(
        db, alert_id, current_user.id, resolution_note
    )
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found"
        )

    # Send notification for resolved alert
    try:
        await send_alert_notification(alert, is_update=True)
    except Exception as e:
        logger.error(
            f"Failed to send resolution notification for alert {alert_id}: {e}"
        )

    return {"status": "resolved", "alert_id": alert_id}


@router.get("/stats/summary", response_model=AlertSummary)
async def get_alert_summary(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get alert statistics summary."""
    summary = await AlertService.get_alert_summary(db, project_id, current_user.id)
    return summary


# Alert Lifecycle Management Endpoints


@router.post("/{alert_id}/lifecycle/acknowledge")
async def acknowledge_alert_with_lifecycle(
    alert_id: int,
    comment: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Acknowledge an alert with full lifecycle tracking.

    This endpoint provides enhanced acknowledgment with:
    - Lifecycle stage tracking
    - Audit trail logging
    - Automatic escalation rule checking
    - Slack notifications
    """
    try:
        # Initialize lifecycle service
        slack_service = SlackService() if hasattr(settings, "SLACK_BOT_TOKEN") else None
        lifecycle_service = AlertLifecycleService(slack_service)

        # Acknowledge with lifecycle tracking
        success = await lifecycle_service.acknowledge_alert_with_lifecycle(
            db, alert_id, current_user.id, comment
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found or access denied",
            )

        return {
            "status": "acknowledged",
            "alert_id": alert_id,
            "lifecycle_stage": "acknowledged",
            "acknowledged_by": current_user.id,
            "comment": comment,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error acknowledging alert {alert_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to acknowledge alert",
        )


@router.post("/{alert_id}/lifecycle/resolve")
async def resolve_alert_with_lifecycle(
    alert_id: int,
    resolution_comment: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Resolve an alert with full lifecycle tracking.

    This endpoint provides enhanced resolution with:
    - Lifecycle stage tracking
    - Resolution audit trail
    - Automatic metrics calculation
    - Slack notifications
    """
    try:
        # Initialize lifecycle service
        slack_service = SlackService() if hasattr(settings, "SLACK_BOT_TOKEN") else None
        lifecycle_service = AlertLifecycleService(slack_service)

        # Resolve with lifecycle tracking
        success = await lifecycle_service.resolve_alert_with_lifecycle(
            db, alert_id, current_user.id, resolution_comment
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found or access denied",
            )

        return {
            "status": "resolved",
            "alert_id": alert_id,
            "lifecycle_stage": "resolved",
            "resolved_by": current_user.id,
            "resolution_comment": resolution_comment,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error resolving alert {alert_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resolve alert",
        )


@router.post("/{alert_id}/lifecycle/suppress")
async def suppress_alert_with_lifecycle(
    alert_id: int,
    duration_minutes: int = 60,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Suppress an alert with lifecycle tracking.

    Args:
        alert_id: Alert ID to suppress
        duration_minutes: Suppression duration in minutes (default: 60)
        reason: Reason for suppression
    """
    try:
        # Initialize lifecycle service
        slack_service = SlackService() if hasattr(settings, "SLACK_BOT_TOKEN") else None
        lifecycle_service = AlertLifecycleService(slack_service)

        # Suppress with lifecycle tracking
        success = await lifecycle_service.suppress_alert_with_lifecycle(
            db, alert_id, current_user.id, duration_minutes, reason
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found or access denied",
            )

        return {
            "status": "suppressed",
            "alert_id": alert_id,
            "lifecycle_stage": "suppressed",
            "suppressed_by": current_user.id,
            "duration_minutes": duration_minutes,
            "reason": reason,
            "suppressed_until": (
                datetime.utcnow() + timedelta(minutes=duration_minutes)
            ).isoformat(),
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error suppressing alert {alert_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to suppress alert",
        )


@router.get("/lifecycle/metrics")
async def get_alert_lifecycle_metrics(
    project_id: Optional[int] = None,
    days_back: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get comprehensive alert lifecycle metrics.

    Args:
        project_id: Optional project filter
        days_back: Days to look back for metrics (default: 30)

    Returns:
        Comprehensive alert metrics including:
        - Alert counts by status
        - Average acknowledgment and resolution times
        - Escalation statistics
        - Top alert sources
        - Severity distribution
    """
    try:
        # Initialize lifecycle service
        lifecycle_service = AlertLifecycleService()

        # Get metrics
        metrics = await lifecycle_service.get_alert_metrics(db, project_id, days_back)

        # Convert timedelta objects to readable format
        metrics_dict = {
            "total_alerts": metrics.total_alerts,
            "active_alerts": metrics.active_alerts,
            "acknowledged_alerts": metrics.acknowledged_alerts,
            "resolved_alerts": metrics.resolved_alerts,
            "suppressed_alerts": metrics.suppressed_alerts,
            "avg_acknowledgment_time": (
                str(metrics.avg_acknowledgment_time)
                if metrics.avg_acknowledgment_time
                else None
            ),
            "avg_resolution_time": (
                str(metrics.avg_resolution_time)
                if metrics.avg_resolution_time
                else None
            ),
            "escalation_count": metrics.escalation_count,
            "top_sources": metrics.top_sources,
            "severity_distribution": metrics.severity_distribution,
            "period_days": days_back,
            "project_id": project_id,
            "generated_at": datetime.utcnow().isoformat(),
        }

        return metrics_dict

    except Exception as e:
        logger.error(f"Error getting alert metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get alert metrics",
        )


@router.post("/lifecycle/check-escalations")
async def check_alerts_for_escalation(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """
    Manually trigger escalation check for all active alerts.

    This endpoint allows administrators to manually check all active alerts
    against escalation rules and trigger escalations where appropriate.

    Returns:
        List of alert IDs that were escalated
    """
    try:
        # Initialize lifecycle service
        slack_service = SlackService() if hasattr(settings, "SLACK_BOT_TOKEN") else None
        lifecycle_service = AlertLifecycleService(slack_service)

        # Check for escalations
        escalated_alerts = await lifecycle_service.check_alerts_for_escalation(db)

        return {
            "status": "completed",
            "escalated_alerts": escalated_alerts,
            "escalation_count": len(escalated_alerts),
            "checked_by": current_user.id,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error checking alerts for escalation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check alerts for escalation",
        )


@router.post("/lifecycle/auto-resolve-stale")
async def auto_resolve_stale_alerts(
    hours_threshold: int = 24,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Auto-resolve alerts that have been stale for too long.

    Args:
        hours_threshold: Hours before considering alert stale (default: 24)

    Returns:
        List of alert IDs that were auto-resolved
    """
    try:
        # Initialize lifecycle service
        slack_service = SlackService() if hasattr(settings, "SLACK_BOT_TOKEN") else None
        lifecycle_service = AlertLifecycleService(slack_service)

        # Auto-resolve stale alerts
        resolved_alerts = await lifecycle_service.auto_resolve_stale_alerts(
            db, hours_threshold
        )

        return {
            "status": "completed",
            "resolved_alerts": resolved_alerts,
            "resolution_count": len(resolved_alerts),
            "hours_threshold": hours_threshold,
            "triggered_by": current_user.id,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error auto-resolving stale alerts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to auto-resolve stale alerts",
        )


@router.get("/api/alerts")
async def get_alerts():
    """
    Get current alerts for the Alerts panel.
    Returns: list of {id, type, message, severity, status, timestamp}
    """
    return [
        {
            "id": 1,
            "type": "incident",
            "message": "Pod restart in k8s-cluster-1",
            "severity": "critical",
            "status": "open",
            "timestamp": datetime.utcnow().isoformat(),
        },
        {
            "id": 2,
            "type": "alert",
            "message": "High memory usage detected",
            "severity": "warning",
            "status": "open",
            "timestamp": datetime.utcnow().isoformat(),
        },
        {
            "id": 3,
            "type": "deploy",
            "message": "API deployed to production",
            "severity": "info",
            "status": "acknowledged",
            "timestamp": datetime.utcnow().isoformat(),
        },
    ]


@router.post("/api/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: int = Path(...)):
    """
    Acknowledge an alert by ID.
    Returns: success message
    """
    return JSONResponse({"message": f"Alert {alert_id} acknowledged"}, status_code=200)


@router.post("/api/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: int = Path(...)):
    """
    Resolve an alert by ID.
    Returns: success message
    """
    return JSONResponse({"message": f"Alert {alert_id} resolved"}, status_code=200)
