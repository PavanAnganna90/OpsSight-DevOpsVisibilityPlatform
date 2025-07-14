"""
Alert Ingestion Service
Handles incoming alerts from various sources including Slack, webhooks, and external systems
"""

import asyncio
import json
import hmac
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Tuple
from enum import Enum
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from app.core.logger import logger
from app.core.cache import CacheService
from app.core.security_monitor import SecurityMonitor
from app.models.alert import Alert
from app.services.webhook_notification_service import WebhookNotificationService


class AlertSource(str, Enum):
    SLACK = "slack"
    WEBHOOK = "webhook"  
    GITHUB = "github"
    JENKINS = "jenkins"
    PROMETHEUS = "prometheus"
    GRAFANA = "grafana"
    DATADOG = "datadog"
    PAGERDUTY = "pagerduty"
    EMAIL = "email"
    MANUAL = "manual"


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertStatus(str, Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"


class AlertIngestionService:
    """Service for ingesting alerts from various external sources"""
    
    def __init__(self, db: Session, cache: CacheService, security_monitor: SecurityMonitor):
        self.db = db
        self.cache = cache
        self.security_monitor = security_monitor
        self.http_client = httpx.AsyncClient(timeout=30.0)
        self.webhook_service = WebhookNotificationService(db, cache, security_monitor)
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.http_client.aclose()
    
    # Main Alert Processing
    async def process_incoming_alert(
        self,
        source: AlertSource,
        payload: Dict[str, Any],
        headers: Optional[Dict[str, str]] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process an incoming alert from any source"""
        try:
            # Validate payload signature if applicable
            if headers and not await self._validate_payload_signature(source, payload, headers):
                raise ValueError("Invalid payload signature")
            
            # Parse alert based on source
            alert_data = await self._parse_alert_by_source(source, payload)
            
            # Enhance alert with metadata
            alert_data = await self._enhance_alert_data(alert_data, source, user_id)
            
            # Check for duplicates and rate limiting
            if await self._is_duplicate_alert(alert_data):
                return {"status": "duplicate", "message": "Alert already exists"}
            
            # Store alert in database
            alert = await self._store_alert(alert_data)
            
            # Process alert routing and notifications
            await self._route_alert_notifications(alert, user_id)
            
            # Log security event
            await self.security_monitor.log_security_event(
                event_type="alert_ingested",
                user_id=user_id or "system",
                details={
                    "alert_id": alert.id,
                    "source": source,
                    "severity": alert_data.get("severity")
                }
            )
            
            logger.info(f"Successfully processed alert from {source}: {alert.id}")
            
            return {
                "status": "processed",
                "alert_id": alert.id,
                "source": source,
                "severity": alert_data.get("severity")
            }
            
        except Exception as e:
            logger.error(f"Failed to process alert from {source}: {str(e)}")
            raise
    
    # Slack Integration
    async def process_slack_alert(
        self,
        payload: Dict[str, Any],
        headers: Dict[str, str]
    ) -> Dict[str, Any]:
        """Process incoming alert from Slack"""
        try:
            # Handle Slack event types
            event_type = payload.get("type")
            
            if event_type == "url_verification":
                # Slack URL verification challenge
                return {"challenge": payload.get("challenge")}
            
            elif event_type == "event_callback":
                # Process Slack event
                event = payload.get("event", {})
                return await self._process_slack_event(event)
            
            else:
                # Process as direct alert
                return await self.process_incoming_alert(
                    AlertSource.SLACK,
                    payload,
                    headers
                )
                
        except Exception as e:
            logger.error(f"Failed to process Slack alert: {str(e)}")
            raise
    
    async def _process_slack_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Process specific Slack event"""
        event_type = event.get("type")
        
        if event_type == "message":
            # Check if message contains alert keywords
            text = event.get("text", "").lower()
            alert_keywords = ["alert", "error", "critical", "failure", "down", "outage"]
            
            if any(keyword in text for keyword in alert_keywords):
                alert_data = {
                    "title": "Slack Alert",
                    "description": event.get("text"),
                    "severity": self._extract_severity_from_text(text),
                    "source": "slack",
                    "channel": event.get("channel"),
                    "user": event.get("user"),
                    "timestamp": datetime.fromtimestamp(float(event.get("ts", 0))).isoformat(),
                    "metadata": {
                        "slack_event": event,
                        "channel_id": event.get("channel"),
                        "user_id": event.get("user"),
                        "thread_ts": event.get("thread_ts")
                    }
                }
                
                return await self.process_incoming_alert(AlertSource.SLACK, alert_data)
        
        return {"status": "ignored", "reason": f"Event type {event_type} not processed"}
    
    # Generic Webhook Processing
    async def process_webhook_alert(
        self,
        webhook_id: str,
        payload: Dict[str, Any],
        headers: Dict[str, str]
    ) -> Dict[str, Any]:
        """Process incoming alert from generic webhook"""
        try:
            # Get webhook configuration
            webhook_config = await self._get_webhook_config(webhook_id)
            if not webhook_config:
                raise ValueError(f"Webhook configuration not found: {webhook_id}")
            
            # Transform payload based on webhook configuration
            alert_data = await self._transform_webhook_payload(payload, webhook_config)
            
            return await self.process_incoming_alert(
                AlertSource.WEBHOOK,
                alert_data,
                headers,
                webhook_config.get("user_id")
            )
            
        except Exception as e:
            logger.error(f"Failed to process webhook alert: {str(e)}")
            raise
    
    # Source-specific Parsers
    async def _parse_alert_by_source(
        self,
        source: AlertSource,
        payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Parse alert payload based on source"""
        
        if source == AlertSource.SLACK:
            return self._parse_slack_alert(payload)
        elif source == AlertSource.GITHUB:
            return self._parse_github_alert(payload)
        elif source == AlertSource.PROMETHEUS:
            return self._parse_prometheus_alert(payload)
        elif source == AlertSource.GRAFANA:
            return self._parse_grafana_alert(payload)
        elif source == AlertSource.PAGERDUTY:
            return self._parse_pagerduty_alert(payload)
        elif source == AlertSource.WEBHOOK:
            return self._parse_generic_webhook_alert(payload)
        else:
            # Generic parsing
            return self._parse_generic_alert(payload)
    
    def _parse_slack_alert(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Slack-specific alert format"""
        return {
            "title": payload.get("title", "Slack Alert"),
            "description": payload.get("description", payload.get("text", "")),
            "severity": payload.get("severity", "medium"),
            "source": "slack",
            "category": payload.get("category", "general"),
            "timestamp": payload.get("timestamp", datetime.utcnow().isoformat()),
            "metadata": {
                "channel": payload.get("channel"),
                "user": payload.get("user"),
                "original_payload": payload
            }
        }
    
    def _parse_github_alert(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Parse GitHub-specific alert format"""
        workflow_run = payload.get("workflow_run", {})
        repository = payload.get("repository", {})
        
        return {
            "title": f"GitHub Actions: {workflow_run.get('name', 'Workflow')} failed",
            "description": f"Workflow failed in {repository.get('full_name')}",
            "severity": "high" if workflow_run.get("conclusion") == "failure" else "medium",
            "source": "github",
            "category": "ci_cd",
            "timestamp": workflow_run.get("created_at", datetime.utcnow().isoformat()),
            "metadata": {
                "workflow_run_id": workflow_run.get("id"),
                "repository": repository.get("full_name"),
                "branch": workflow_run.get("head_branch"),
                "commit_sha": workflow_run.get("head_sha"),
                "html_url": workflow_run.get("html_url"),
                "original_payload": payload
            }
        }
    
    def _parse_prometheus_alert(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Prometheus alert format"""
        alerts = payload.get("alerts", [])
        if not alerts:
            raise ValueError("No alerts found in Prometheus payload")
        
        # Process first alert (can be enhanced to handle multiple)
        alert = alerts[0]
        labels = alert.get("labels", {})
        annotations = alert.get("annotations", {})
        
        return {
            "title": labels.get("alertname", "Prometheus Alert"),
            "description": annotations.get("description", annotations.get("summary", "")),
            "severity": self._map_prometheus_severity(labels.get("severity", "warning")),
            "source": "prometheus",
            "category": "monitoring",
            "timestamp": alert.get("startsAt", datetime.utcnow().isoformat()),
            "metadata": {
                "labels": labels,
                "annotations": annotations,
                "generator_url": alert.get("generatorURL"),
                "status": alert.get("status"),
                "original_payload": payload
            }
        }
    
    def _parse_grafana_alert(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Grafana alert format"""
        return {
            "title": payload.get("title", payload.get("ruleName", "Grafana Alert")),
            "description": payload.get("message", payload.get("evalMatches", [{}])[0].get("metric", "")),
            "severity": self._map_grafana_state_to_severity(payload.get("state", "alerting")),
            "source": "grafana",
            "category": "monitoring",
            "timestamp": payload.get("date", datetime.utcnow().isoformat()),
            "metadata": {
                "rule_id": payload.get("ruleId"),
                "rule_name": payload.get("ruleName"),
                "rule_url": payload.get("ruleUrl"),
                "state": payload.get("state"),
                "eval_matches": payload.get("evalMatches", []),
                "original_payload": payload
            }
        }
    
    def _parse_pagerduty_alert(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Parse PagerDuty webhook format"""
        messages = payload.get("messages", [])
        if not messages:
            raise ValueError("No messages found in PagerDuty payload")
        
        message = messages[0]
        incident = message.get("incident", {})
        
        return {
            "title": incident.get("title", "PagerDuty Alert"),
            "description": incident.get("description", ""),
            "severity": self._map_pagerduty_urgency_to_severity(incident.get("urgency", "low")),
            "source": "pagerduty",
            "category": "incident",
            "timestamp": message.get("created_on", datetime.utcnow().isoformat()),
            "metadata": {
                "incident_id": incident.get("id"),
                "incident_number": incident.get("incident_number"),
                "status": incident.get("status"),
                "urgency": incident.get("urgency"),
                "html_url": incident.get("html_url"),
                "service": incident.get("service", {}).get("name"),
                "original_payload": payload
            }
        }
    
    def _parse_generic_webhook_alert(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Parse generic webhook alert format"""
        return {
            "title": payload.get("title", payload.get("summary", "Webhook Alert")),
            "description": payload.get("description", payload.get("message", payload.get("details", ""))),
            "severity": payload.get("severity", payload.get("priority", "medium")),
            "source": payload.get("source", "webhook"),
            "category": payload.get("category", payload.get("type", "general")),
            "timestamp": payload.get("timestamp", payload.get("created_at", datetime.utcnow().isoformat())),
            "metadata": {
                "original_payload": payload
            }
        }
    
    def _parse_generic_alert(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Parse generic alert format as fallback"""
        return self._parse_generic_webhook_alert(payload)
    
    # Alert Enhancement and Storage
    async def _enhance_alert_data(
        self,
        alert_data: Dict[str, Any],
        source: AlertSource,
        user_id: Optional[str]
    ) -> Dict[str, Any]:
        """Enhance alert data with additional metadata"""
        
        # Normalize severity
        alert_data["severity"] = self._normalize_severity(alert_data.get("severity", "medium"))
        
        # Set default status
        alert_data["status"] = AlertStatus.ACTIVE
        
        # Add processing metadata
        alert_data["metadata"] = alert_data.get("metadata", {})
        alert_data["metadata"].update({
            "ingestion_timestamp": datetime.utcnow().isoformat(),
            "ingestion_source": source,
            "processed_by": user_id or "system",
            "fingerprint": self._generate_alert_fingerprint(alert_data)
        })
        
        # Infer additional fields
        if not alert_data.get("category"):
            alert_data["category"] = self._infer_category_from_content(alert_data)
        
        return alert_data
    
    async def _store_alert(self, alert_data: Dict[str, Any]) -> Alert:
        """Store alert in database"""
        try:
            alert = Alert(
                title=alert_data["title"],
                description=alert_data["description"],
                severity=alert_data["severity"],
                status=alert_data["status"],
                source=alert_data["source"],
                category=alert_data.get("category"),
                metadata=alert_data.get("metadata", {}),
                project_id=alert_data.get("project_id"),
                user_id=alert_data.get("user_id")
            )
            
            self.db.add(alert)
            self.db.commit()
            self.db.refresh(alert)
            
            # Cache for quick access
            await self.cache.set(f"alert:{alert.id}", alert_data, ttl=3600)
            
            return alert
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to store alert: {str(e)}")
            raise
    
    # Alert Routing and Notifications
    async def _route_alert_notifications(
        self,
        alert: Alert,
        user_id: Optional[str]
    ) -> None:
        """Route alert to appropriate notification channels"""
        try:
            # Prepare alert data for notifications
            alert_notification_data = {
                "type": "error" if alert.severity in ["high", "critical"] else "warning",
                "severity": alert.severity,
                "message": alert.title,
                "description": alert.description,
                "source": alert.source,
                "timestamp": alert.created_at.isoformat(),
                "metadata": alert.metadata
            }
            
            # Send to configured notification channels
            async with self.webhook_service:
                result = await self.webhook_service.send_alert_notification(
                    alert_notification_data,
                    user_id=user_id
                )
                
                logger.info(f"Alert notifications sent for {alert.id}: {result}")
                
        except Exception as e:
            logger.error(f"Failed to route alert notifications: {str(e)}")
    
    # Utility Methods
    def _generate_alert_fingerprint(self, alert_data: Dict[str, Any]) -> str:
        """Generate unique fingerprint for alert deduplication"""
        content = f"{alert_data.get('title', '')}{alert_data.get('source', '')}{alert_data.get('category', '')}"
        return hashlib.md5(content.encode()).hexdigest()
    
    async def _is_duplicate_alert(self, alert_data: Dict[str, Any]) -> bool:
        """Check if alert is a duplicate within time window"""
        fingerprint = alert_data["metadata"]["fingerprint"]
        
        # Check cache for recent duplicates
        recent_fingerprint = await self.cache.get(f"alert_fingerprint:{fingerprint}")
        if recent_fingerprint:
            return True
        
        # Store fingerprint with 5-minute TTL
        await self.cache.set(f"alert_fingerprint:{fingerprint}", True, ttl=300)
        return False
    
    async def _validate_payload_signature(
        self,
        source: AlertSource,
        payload: Dict[str, Any],
        headers: Dict[str, str]
    ) -> bool:
        """Validate webhook payload signature"""
        try:
            if source == AlertSource.GITHUB:
                return self._validate_github_signature(payload, headers)
            elif source == AlertSource.SLACK:
                return self._validate_slack_signature(payload, headers)
            # Add other source validations as needed
            return True  # Default to true for sources without signature validation
        except Exception as e:
            logger.error(f"Signature validation failed: {str(e)}")
            return False
    
    def _validate_github_signature(
        self,
        payload: Dict[str, Any],
        headers: Dict[str, str]
    ) -> bool:
        """Validate GitHub webhook signature"""
        signature = headers.get("x-hub-signature-256", "")
        if not signature:
            return False
        
        # Get webhook secret from configuration
        webhook_secret = "your-github-webhook-secret"  # Should be from config
        
        expected_signature = "sha256=" + hmac.new(
            webhook_secret.encode(),
            json.dumps(payload).encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)
    
    def _validate_slack_signature(
        self,
        payload: Dict[str, Any],
        headers: Dict[str, str]
    ) -> bool:
        """Validate Slack webhook signature"""
        # Slack signature validation implementation
        return True  # Simplified for demo
    
    # Mapping and Normalization Helpers
    def _normalize_severity(self, severity: str) -> str:
        """Normalize severity to standard values"""
        severity_lower = severity.lower()
        
        if severity_lower in ["critical", "fatal", "emergency"]:
            return AlertSeverity.CRITICAL
        elif severity_lower in ["high", "error", "major"]:
            return AlertSeverity.HIGH
        elif severity_lower in ["medium", "warning", "warn", "minor"]:
            return AlertSeverity.MEDIUM
        elif severity_lower in ["low", "info", "informational"]:
            return AlertSeverity.LOW
        else:
            return AlertSeverity.MEDIUM
    
    def _map_prometheus_severity(self, severity: str) -> str:
        """Map Prometheus severity to standard severity"""
        mapping = {
            "critical": AlertSeverity.CRITICAL,
            "warning": AlertSeverity.MEDIUM,
            "info": AlertSeverity.LOW
        }
        return mapping.get(severity.lower(), AlertSeverity.MEDIUM)
    
    def _map_grafana_state_to_severity(self, state: str) -> str:
        """Map Grafana alert state to severity"""
        mapping = {
            "alerting": AlertSeverity.HIGH,
            "ok": AlertSeverity.LOW,
            "no_data": AlertSeverity.MEDIUM,
            "paused": AlertSeverity.LOW,
            "pending": AlertSeverity.MEDIUM
        }
        return mapping.get(state.lower(), AlertSeverity.MEDIUM)
    
    def _map_pagerduty_urgency_to_severity(self, urgency: str) -> str:
        """Map PagerDuty urgency to severity"""
        mapping = {
            "high": AlertSeverity.CRITICAL,
            "low": AlertSeverity.MEDIUM
        }
        return mapping.get(urgency.lower(), AlertSeverity.MEDIUM)
    
    def _extract_severity_from_text(self, text: str) -> str:
        """Extract severity from text content"""
        text_lower = text.lower()
        
        if any(word in text_lower for word in ["critical", "fatal", "emergency", "down"]):
            return AlertSeverity.CRITICAL
        elif any(word in text_lower for word in ["error", "failure", "failed", "alert"]):
            return AlertSeverity.HIGH
        elif any(word in text_lower for word in ["warning", "warn", "issue"]):
            return AlertSeverity.MEDIUM
        else:
            return AlertSeverity.LOW
    
    def _infer_category_from_content(self, alert_data: Dict[str, Any]) -> str:
        """Infer alert category from content"""
        content = f"{alert_data.get('title', '')} {alert_data.get('description', '')}".lower()
        
        if any(word in content for word in ["ci", "build", "deploy", "pipeline"]):
            return "ci_cd"
        elif any(word in content for word in ["database", "db", "sql"]):
            return "database"
        elif any(word in content for word in ["network", "connection", "timeout"]):
            return "network"
        elif any(word in content for word in ["security", "auth", "permission"]):
            return "security"
        elif any(word in content for word in ["performance", "cpu", "memory", "disk"]):
            return "performance"
        else:
            return "general"
    
    async def _get_webhook_config(self, webhook_id: str) -> Optional[Dict[str, Any]]:
        """Get webhook configuration"""
        return await self.cache.get(f"webhook:{webhook_id}")
    
    async def _transform_webhook_payload(
        self,
        payload: Dict[str, Any],
        webhook_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Transform webhook payload based on configuration"""
        # Apply transformations based on webhook configuration
        transformations = webhook_config.get("transformations", {})
        
        transformed_payload = payload.copy()
        
        # Apply field mappings
        field_mappings = transformations.get("field_mappings", {})
        for source_field, target_field in field_mappings.items():
            if source_field in payload:
                transformed_payload[target_field] = payload[source_field]
        
        return transformed_payload