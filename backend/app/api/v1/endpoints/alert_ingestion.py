"""
Alert Ingestion API Endpoints
Handles incoming alerts from various sources including Slack, webhooks, and external systems
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_current_user_optional
from app.core.logger import logger
from app.core.cache import CacheService
from app.core.security_monitor import SecurityMonitor
from app.models.user import User
from app.services.alert_ingestion_service import AlertIngestionService, AlertSource


router = APIRouter()


# Pydantic Models
class WebhookAlertRequest(BaseModel):
    title: str = Field(..., description="Alert title")
    description: Optional[str] = Field(None, description="Alert description")
    severity: str = Field("medium", description="Alert severity (low, medium, high, critical)")
    source: str = Field("webhook", description="Alert source")
    category: Optional[str] = Field(None, description="Alert category")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")
    timestamp: Optional[str] = Field(None, description="Alert timestamp (ISO format)")


class SlackEventRequest(BaseModel):
    type: str
    challenge: Optional[str] = None
    event: Optional[Dict[str, Any]] = None
    team_id: Optional[str] = None


class AlertIngestionResponse(BaseModel):
    status: str
    message: Optional[str] = None
    alert_id: Optional[str] = None
    source: Optional[str] = None
    notifications_sent: Optional[int] = None


# Generic Webhook Endpoints
@router.post("/webhook/{webhook_id}", response_model=AlertIngestionResponse)
async def receive_webhook_alert(
    webhook_id: str,
    payload: Dict[str, Any],
    request: Request,
    db: Session = Depends(get_db),
    cache: CacheService = Depends(lambda: CacheService()),
    security_monitor: SecurityMonitor = Depends(lambda: SecurityMonitor())
):
    """Receive alert from generic webhook"""
    try:
        headers = dict(request.headers)
        
        async with AlertIngestionService(db, cache, security_monitor) as ingestion_service:
            result = await ingestion_service.process_webhook_alert(
                webhook_id=webhook_id,
                payload=payload,
                headers=headers
            )
            
            return AlertIngestionResponse(**result)
            
    except ValueError as e:
        logger.warning(f"Invalid webhook request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to process webhook alert: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process webhook alert"
        )


@router.post("/webhook", response_model=AlertIngestionResponse)
async def receive_generic_webhook_alert(
    alert_data: WebhookAlertRequest,
    request: Request,
    db: Session = Depends(get_db),
    cache: CacheService = Depends(lambda: CacheService()),
    security_monitor: SecurityMonitor = Depends(lambda: SecurityMonitor()),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Receive alert from generic webhook with validated payload"""
    try:
        headers = dict(request.headers)
        payload = alert_data.dict()
        
        async with AlertIngestionService(db, cache, security_monitor) as ingestion_service:
            result = await ingestion_service.process_incoming_alert(
                source=AlertSource.WEBHOOK,
                payload=payload,
                headers=headers,
                user_id=current_user.id if current_user else None
            )
            
            return AlertIngestionResponse(**result)
            
    except Exception as e:
        logger.error(f"Failed to process generic webhook alert: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process alert"
        )


# Slack Integration Endpoints
@router.post("/slack/events", response_model=Dict[str, Any])
async def receive_slack_event(
    payload: SlackEventRequest,
    request: Request,
    x_slack_signature: Optional[str] = Header(None),
    x_slack_request_timestamp: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    cache: CacheService = Depends(lambda: CacheService()),
    security_monitor: SecurityMonitor = Depends(lambda: SecurityMonitor())
):
    """Receive events from Slack (Event Subscriptions API)"""
    try:
        headers = {
            "x-slack-signature": x_slack_signature,
            "x-slack-request-timestamp": x_slack_request_timestamp
        }
        
        async with AlertIngestionService(db, cache, security_monitor) as ingestion_service:
            result = await ingestion_service.process_slack_alert(
                payload=payload.dict(),
                headers=headers
            )
            
            return result
            
    except Exception as e:
        logger.error(f"Failed to process Slack event: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process Slack event"
        )


@router.post("/slack/interactive", response_model=Dict[str, Any])
async def receive_slack_interactive(
    payload: Dict[str, Any],
    request: Request,
    db: Session = Depends(get_db),
    cache: CacheService = Depends(lambda: CacheService()),
    security_monitor: SecurityMonitor = Depends(lambda: SecurityMonitor())
):
    """Receive interactive events from Slack (buttons, menus, etc.)"""
    try:
        headers = dict(request.headers)
        
        # Process interactive payload
        async with AlertIngestionService(db, cache, security_monitor) as ingestion_service:
            # Handle interactive components (buttons, select menus, etc.)
            action_type = payload.get("type")
            
            if action_type == "block_actions":
                actions = payload.get("actions", [])
                for action in actions:
                    if action.get("action_id") == "create_alert":
                        # Create alert from Slack interaction
                        alert_data = {
                            "title": "Slack Interactive Alert",
                            "description": f"Alert created from Slack interaction by {payload.get('user', {}).get('name', 'Unknown')}",
                            "severity": "medium",
                            "source": "slack_interactive",
                            "metadata": {
                                "slack_payload": payload,
                                "trigger_user": payload.get("user", {}).get("id"),
                                "channel": payload.get("channel", {}).get("id")
                            }
                        }
                        
                        result = await ingestion_service.process_incoming_alert(
                            source=AlertSource.SLACK,
                            payload=alert_data,
                            headers=headers
                        )
                        
                        return {
                            "response_type": "ephemeral",
                            "text": f"Alert created successfully: {result.get('alert_id')}"
                        }
            
            return {"response_type": "ephemeral", "text": "Action processed"}
            
    except Exception as e:
        logger.error(f"Failed to process Slack interactive event: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process interactive event"
        )


# GitHub Integration Endpoints
@router.post("/github/webhook", response_model=AlertIngestionResponse)
async def receive_github_webhook(
    payload: Dict[str, Any],
    request: Request,
    x_github_event: Optional[str] = Header(None),
    x_hub_signature_256: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    cache: CacheService = Depends(lambda: CacheService()),
    security_monitor: SecurityMonitor = Depends(lambda: SecurityMonitor())
):
    """Receive webhook from GitHub Actions"""
    try:
        headers = {
            "x-github-event": x_github_event,
            "x-hub-signature-256": x_hub_signature_256
        }
        
        # Only process workflow run events
        if x_github_event != "workflow_run":
            return AlertIngestionResponse(
                status="ignored",
                message=f"Event type {x_github_event} not processed"
            )
        
        async with AlertIngestionService(db, cache, security_monitor) as ingestion_service:
            result = await ingestion_service.process_incoming_alert(
                source=AlertSource.GITHUB,
                payload=payload,
                headers=headers
            )
            
            return AlertIngestionResponse(**result)
            
    except Exception as e:
        logger.error(f"Failed to process GitHub webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process GitHub webhook"
        )


# Prometheus Integration Endpoints
@router.post("/prometheus/webhook", response_model=AlertIngestionResponse)
async def receive_prometheus_webhook(
    payload: Dict[str, Any],
    request: Request,
    db: Session = Depends(get_db),
    cache: CacheService = Depends(lambda: CacheService()),
    security_monitor: SecurityMonitor = Depends(lambda: SecurityMonitor())
):
    """Receive webhook from Prometheus Alertmanager"""
    try:
        headers = dict(request.headers)
        
        async with AlertIngestionService(db, cache, security_monitor) as ingestion_service:
            result = await ingestion_service.process_incoming_alert(
                source=AlertSource.PROMETHEUS,
                payload=payload,
                headers=headers
            )
            
            return AlertIngestionResponse(**result)
            
    except Exception as e:
        logger.error(f"Failed to process Prometheus webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process Prometheus webhook"
        )


# Grafana Integration Endpoints
@router.post("/grafana/webhook", response_model=AlertIngestionResponse)
async def receive_grafana_webhook(
    payload: Dict[str, Any],
    request: Request,
    db: Session = Depends(get_db),
    cache: CacheService = Depends(lambda: CacheService()),
    security_monitor: SecurityMonitor = Depends(lambda: SecurityMonitor())
):
    """Receive webhook from Grafana"""
    try:
        headers = dict(request.headers)
        
        async with AlertIngestionService(db, cache, security_monitor) as ingestion_service:
            result = await ingestion_service.process_incoming_alert(
                source=AlertSource.GRAFANA,
                payload=payload,
                headers=headers
            )
            
            return AlertIngestionResponse(**result)
            
    except Exception as e:
        logger.error(f"Failed to process Grafana webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process Grafana webhook"
        )


# PagerDuty Integration Endpoints
@router.post("/pagerduty/webhook", response_model=AlertIngestionResponse)
async def receive_pagerduty_webhook(
    payload: Dict[str, Any],
    request: Request,
    db: Session = Depends(get_db),
    cache: CacheService = Depends(lambda: CacheService()),
    security_monitor: SecurityMonitor = Depends(lambda: SecurityMonitor())
):
    """Receive webhook from PagerDuty"""
    try:
        headers = dict(request.headers)
        
        async with AlertIngestionService(db, cache, security_monitor) as ingestion_service:
            result = await ingestion_service.process_incoming_alert(
                source=AlertSource.PAGERDUTY,
                payload=payload,
                headers=headers
            )
            
            return AlertIngestionResponse(**result)
            
    except Exception as e:
        logger.error(f"Failed to process PagerDuty webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process PagerDuty webhook"
        )


# Alert Management Endpoints
@router.get("/sources", response_model=List[str])
async def get_supported_alert_sources():
    """Get list of supported alert sources"""
    return [source.value for source in AlertSource]


@router.get("/health", response_model=Dict[str, str])
async def get_ingestion_health(
    db: Session = Depends(get_db),
    cache: CacheService = Depends(lambda: CacheService())
):
    """Health check for alert ingestion service"""
    try:
        # Test database connection
        db.execute("SELECT 1")
        
        # Test cache connection
        await cache.set("health_check", "ok", ttl=10)
        health_check = await cache.get("health_check")
        
        if health_check != "ok":
            raise Exception("Cache health check failed")
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "connected",
            "cache": "connected"
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unhealthy"
        )


@router.get("/stats", response_model=Dict[str, Any])
async def get_ingestion_stats(
    db: Session = Depends(get_db),
    cache: CacheService = Depends(lambda: CacheService()),
    current_user: User = Depends(get_current_user_optional)
):
    """Get alert ingestion statistics"""
    try:
        # Get cached stats or calculate from database
        stats = await cache.get("ingestion_stats")
        
        if not stats:
            # Calculate stats from database
            from app.models.alert import Alert
            from sqlalchemy import func, and_
            
            # Get alerts from last 24 hours
            since = datetime.utcnow() - timedelta(days=1)
            
            query = db.query(Alert).filter(Alert.created_at >= since)
            
            total_alerts = query.count()
            
            # Group by source
            source_stats = db.query(
                Alert.source,
                func.count(Alert.id).label('count')
            ).filter(Alert.created_at >= since).group_by(Alert.source).all()
            
            # Group by severity
            severity_stats = db.query(
                Alert.severity,
                func.count(Alert.id).label('count')
            ).filter(Alert.created_at >= since).group_by(Alert.severity).all()
            
            stats = {
                "total_alerts_24h": total_alerts,
                "by_source": {stat.source: stat.count for stat in source_stats},
                "by_severity": {stat.severity: stat.count for stat in severity_stats},
                "last_updated": datetime.utcnow().isoformat()
            }
            
            # Cache for 5 minutes
            await cache.set("ingestion_stats", stats, ttl=300)
        
        return stats
        
    except Exception as e:
        logger.error(f"Failed to get ingestion stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get statistics"
        )