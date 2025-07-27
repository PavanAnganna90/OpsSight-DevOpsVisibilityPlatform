"""
API endpoints for webhook integrations.
Handles incoming alerts from various sources like Slack, monitoring tools, etc.
"""

import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, HTTPException, status, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.database import get_async_db
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.webhook_config import WebhookConfig
from app.models.user import User
from app.services.alert_processing_service import alert_processor
from app.services.webhook_validation_service import webhook_validator
from app.schemas.webhook import (
    WebhookAlertPayload,
    SlackEventPayload,
    GenericWebhookPayload,
    WebhookResponse
)
from app.utils.security import verify_webhook_signature

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/alerts", response_model=WebhookResponse)
async def receive_generic_alert_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db)
) -> WebhookResponse:
    """
    Generic webhook endpoint for receiving alerts from external systems.
    Supports various alert formats and automatically parses them.
    """
    try:
        # Get request body and headers
        body = await request.body()
        headers = dict(request.headers)
        
        # Parse JSON payload
        try:
            payload = json.loads(body.decode('utf-8'))
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON payload"
            )
        
        # Validate webhook signature if configured
        webhook_source = headers.get('x-webhook-source', 'generic')
        signature = headers.get('x-signature') or headers.get('x-hub-signature-256')
        
        if signature:
            webhook_config = await get_webhook_config(db, webhook_source)
            if webhook_config and not verify_webhook_signature(body, signature, webhook_config.secret):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid webhook signature"
                )
        
        # Process alert in background
        background_tasks.add_task(
            process_webhook_alert,
            db_session=db,
            payload=payload,
            headers=headers,
            source=webhook_source
        )
        
        return WebhookResponse(
            success=True,
            message="Alert webhook received and queued for processing",
            alert_id=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process webhook alert: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process webhook"
        )


@router.post("/slack/events", response_model=Dict[str, Any])
async def receive_slack_event(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db)
) -> Dict[str, Any]:
    """
    Slack Events API endpoint for receiving Slack events and alerts.
    Handles URL verification and processes relevant events.
    """
    try:
        body = await request.body()
        payload = json.loads(body.decode('utf-8'))
        
        # Handle Slack URL verification challenge
        if payload.get('type') == 'url_verification':
            return {"challenge": payload.get('challenge')}
        
        # Verify Slack signature
        slack_signature = request.headers.get('x-slack-signature')
        slack_timestamp = request.headers.get('x-slack-request-timestamp')
        
        if slack_signature and slack_timestamp:
            slack_config = await get_webhook_config(db, 'slack')
            if slack_config:
                if not verify_slack_signature(body, slack_signature, slack_timestamp, slack_config.secret):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid Slack signature"
                    )
        
        # Process Slack event in background
        background_tasks.add_task(
            process_slack_event,
            db_session=db,
            payload=payload
        )
        
        return {"ok": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process Slack event: {str(e)}")
        return {"ok": False, "error": str(e)}


@router.post("/prometheus", response_model=WebhookResponse)
async def receive_prometheus_alert(
    payload: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db)
) -> WebhookResponse:
    """
    Prometheus Alertmanager webhook endpoint.
    Processes Prometheus alerts and creates corresponding alert records.
    """
    try:
        # Process Prometheus alerts in background
        background_tasks.add_task(
            process_prometheus_alerts,
            db_session=db,
            payload=payload
        )
        
        return WebhookResponse(
            success=True,
            message="Prometheus alerts received and queued for processing",
            alert_id=None
        )
        
    except Exception as e:
        logger.error(f"Failed to process Prometheus alerts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process Prometheus alerts"
        )


@router.post("/grafana", response_model=WebhookResponse)
async def receive_grafana_alert(
    payload: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db)
) -> WebhookResponse:
    """
    Grafana webhook endpoint for receiving Grafana alerts.
    """
    try:
        background_tasks.add_task(
            process_grafana_alerts,
            db_session=db,
            payload=payload
        )
        
        return WebhookResponse(
            success=True,
            message="Grafana alerts received and queued for processing",
            alert_id=None
        )
        
    except Exception as e:
        logger.error(f"Failed to process Grafana alerts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process Grafana alerts"
        )


@router.post("/pagerduty", response_model=WebhookResponse)
async def receive_pagerduty_webhook(
    payload: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db)
) -> WebhookResponse:
    """
    PagerDuty webhook endpoint for receiving incident updates.
    """
    try:
        background_tasks.add_task(
            process_pagerduty_webhook,
            db_session=db,
            payload=payload
        )
        
        return WebhookResponse(
            success=True,
            message="PagerDuty webhook received and queued for processing",
            alert_id=None
        )
        
    except Exception as e:
        logger.error(f"Failed to process PagerDuty webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process PagerDuty webhook"
        )


# Background task functions

async def process_webhook_alert(
    db_session: AsyncSession,
    payload: Dict[str, Any],
    headers: Dict[str, str],
    source: str
) -> None:
    """Process a generic webhook alert payload."""
    try:
        # Parse the alert from the payload
        alert_data = await alert_processor.parse_generic_alert(payload, source)
        
        if alert_data:
            # Create alert in database
            alert = await alert_processor.create_alert_from_webhook(
                db_session, alert_data, source
            )
            
            if alert:
                logger.info(f"Created alert {alert.id} from {source} webhook")
                
                # Send notifications for critical alerts
                if alert.severity in [AlertSeverity.CRITICAL, AlertSeverity.HIGH]:
                    await alert_processor.send_alert_notifications(db_session, alert)
        
    except Exception as e:
        logger.error(f"Failed to process webhook alert from {source}: {str(e)}")


async def process_slack_event(
    db_session: AsyncSession,
    payload: Dict[str, Any]
) -> None:
    """Process a Slack event payload."""
    try:
        event = payload.get('event', {})
        event_type = event.get('type')
        
        # Process different Slack event types
        if event_type == 'message':
            await process_slack_message(db_session, event)
        elif event_type == 'app_mention':
            await process_slack_mention(db_session, event)
        
    except Exception as e:
        logger.error(f"Failed to process Slack event: {str(e)}")


async def process_slack_message(
    db_session: AsyncSession,
    message: Dict[str, Any]
) -> None:
    """Process a Slack message for potential alerts."""
    try:
        text = message.get('text', '')
        channel = message.get('channel')
        user = message.get('user')
        timestamp = message.get('ts')
        
        # Look for alert keywords or patterns
        alert_keywords = ['ALERT', 'ERROR', 'CRITICAL', 'DOWN', 'FAILED', 'INCIDENT']
        
        if any(keyword in text.upper() for keyword in alert_keywords):
            # Parse alert information from message
            alert_data = await alert_processor.parse_slack_message(message)
            
            if alert_data:
                alert = await alert_processor.create_alert_from_webhook(
                    db_session, alert_data, 'slack'
                )
                
                if alert:
                    logger.info(f"Created alert {alert.id} from Slack message")
        
    except Exception as e:
        logger.error(f"Failed to process Slack message: {str(e)}")


async def process_slack_mention(
    db_session: AsyncSession,
    mention: Dict[str, Any]
) -> None:
    """Process a Slack app mention."""
    try:
        # Handle bot mentions for interactive commands
        text = mention.get('text', '')
        
        if 'status' in text.lower():
            # User is asking for system status
            await alert_processor.send_status_update_to_slack(mention)
        elif 'alerts' in text.lower():
            # User is asking for current alerts
            await alert_processor.send_alerts_summary_to_slack(db_session, mention)
        
    except Exception as e:
        logger.error(f"Failed to process Slack mention: {str(e)}")


async def process_prometheus_alerts(
    db_session: AsyncSession,
    payload: Dict[str, Any]
) -> None:
    """Process Prometheus Alertmanager webhook payload."""
    try:
        alerts = payload.get('alerts', [])
        
        for alert_data in alerts:
            alert = await alert_processor.parse_prometheus_alert(alert_data)
            
            if alert:
                created_alert = await alert_processor.create_alert_from_webhook(
                    db_session, alert, 'prometheus'
                )
                
                if created_alert:
                    logger.info(f"Created alert {created_alert.id} from Prometheus")
        
    except Exception as e:
        logger.error(f"Failed to process Prometheus alerts: {str(e)}")


async def process_grafana_alerts(
    db_session: AsyncSession,
    payload: Dict[str, Any]
) -> None:
    """Process Grafana webhook payload."""
    try:
        alert = await alert_processor.parse_grafana_alert(payload)
        
        if alert:
            created_alert = await alert_processor.create_alert_from_webhook(
                db_session, alert, 'grafana'
            )
            
            if created_alert:
                logger.info(f"Created alert {created_alert.id} from Grafana")
        
    except Exception as e:
        logger.error(f"Failed to process Grafana alerts: {str(e)}")


async def process_pagerduty_webhook(
    db_session: AsyncSession,
    payload: Dict[str, Any]
) -> None:
    """Process PagerDuty webhook payload."""
    try:
        messages = payload.get('messages', [])
        
        for message in messages:
            alert = await alert_processor.parse_pagerduty_message(message)
            
            if alert:
                created_alert = await alert_processor.create_alert_from_webhook(
                    db_session, alert, 'pagerduty'
                )
                
                if created_alert:
                    logger.info(f"Created alert {created_alert.id} from PagerDuty")
        
    except Exception as e:
        logger.error(f"Failed to process PagerDuty webhook: {str(e)}")


# Helper functions

async def get_webhook_config(db: AsyncSession, source: str) -> Optional[WebhookConfig]:
    """Get webhook configuration for a specific source."""
    try:
        result = await db.execute(
            select(WebhookConfig).filter(
                WebhookConfig.source == source,
                WebhookConfig.is_active == True
            )
        )
        return result.scalars().first()
    except Exception as e:
        logger.error(f"Failed to get webhook config for {source}: {str(e)}")
        return None


def verify_slack_signature(
    body: bytes,
    signature: str,
    timestamp: str,
    signing_secret: str
) -> bool:
    """Verify Slack webhook signature."""
    import hmac
    import hashlib
    
    try:
        # Check timestamp to prevent replay attacks
        current_time = int(datetime.utcnow().timestamp())
        request_time = int(timestamp)
        
        if abs(current_time - request_time) > 300:  # 5 minutes
            return False
        
        # Compute signature
        sig_basestring = f"v0:{timestamp}:{body.decode('utf-8')}"
        computed_signature = 'v0=' + hmac.new(
            signing_secret.encode(),
            sig_basestring.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(computed_signature, signature)
        
    except Exception as e:
        logger.error(f"Failed to verify Slack signature: {str(e)}")
        return False