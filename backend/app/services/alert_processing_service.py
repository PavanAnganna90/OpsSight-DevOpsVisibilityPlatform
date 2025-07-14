"""
Alert processing service for parsing and creating alerts from various webhook sources.
"""

import re
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_

from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.webhook_config import WebhookConfig, WebhookEvent
from app.models.user import User
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


@dataclass
class ParsedAlert:
    """Data structure for parsed alert information."""
    title: str
    description: str
    severity: AlertSeverity
    source: str
    tags: Dict[str, Any] = None
    metadata: Dict[str, Any] = None
    external_id: str = None
    url: str = None
    resolved: bool = False


class AlertProcessor:
    """Service for processing alerts from various webhook sources."""

    def __init__(self):
        """Initialize alert processor."""
        self.notification_service = NotificationService()

    async def parse_generic_alert(self, payload: Dict[str, Any], source: str) -> Optional[ParsedAlert]:
        """Parse a generic alert payload."""
        try:
            # Try to extract common alert fields
            title = self._extract_title(payload)
            description = self._extract_description(payload)
            severity = self._extract_severity(payload)
            
            if not title:
                logger.warning(f"No title found in {source} payload")
                return None

            return ParsedAlert(
                title=title,
                description=description or "No description provided",
                severity=severity,
                source=source,
                tags=self._extract_tags(payload),
                metadata=payload,
                external_id=self._extract_external_id(payload),
                url=self._extract_url(payload),
                resolved=self._is_resolved(payload)
            )

        except Exception as e:
            logger.error(f"Failed to parse generic alert from {source}: {str(e)}")
            return None

    async def parse_slack_message(self, message: Dict[str, Any]) -> Optional[ParsedAlert]:
        """Parse a Slack message for alert information."""
        try:
            text = message.get('text', '')
            channel = message.get('channel')
            user = message.get('user')
            timestamp = message.get('ts')
            
            # Extract alert information from message text
            title = self._extract_slack_alert_title(text)
            severity = self._extract_slack_severity(text)
            
            if not title:
                return None

            return ParsedAlert(
                title=title,
                description=text[:500],  # Truncate long messages
                severity=severity,
                source="slack",
                tags={
                    "channel": channel,
                    "user": user,
                    "slack_ts": timestamp
                },
                metadata=message,
                external_id=f"slack_{channel}_{timestamp}",
                resolved=self._is_slack_resolution(text)
            )

        except Exception as e:
            logger.error(f"Failed to parse Slack message: {str(e)}")
            return None

    async def parse_prometheus_alert(self, alert_data: Dict[str, Any]) -> Optional[ParsedAlert]:
        """Parse a Prometheus alert."""
        try:
            labels = alert_data.get('labels', {})
            annotations = alert_data.get('annotations', {})
            status = alert_data.get('status', 'firing')
            
            title = annotations.get('summary') or labels.get('alertname', 'Unknown Alert')
            description = annotations.get('description', '')
            severity = self._map_prometheus_severity(labels.get('severity', 'warning'))
            
            return ParsedAlert(
                title=title,
                description=description,
                severity=severity,
                source="prometheus",
                tags=labels,
                metadata=alert_data,
                external_id=alert_data.get('fingerprint'),
                url=annotations.get('runbook_url'),
                resolved=status == 'resolved'
            )

        except Exception as e:
            logger.error(f"Failed to parse Prometheus alert: {str(e)}")
            return None

    async def parse_grafana_alert(self, payload: Dict[str, Any]) -> Optional[ParsedAlert]:
        """Parse a Grafana alert."""
        try:
            title = payload.get('title', 'Grafana Alert')
            message = payload.get('message', '')
            state = payload.get('state', 'alerting')
            rule_url = payload.get('ruleUrl', '')
            
            # Map Grafana state to severity
            severity_map = {
                'alerting': AlertSeverity.HIGH,
                'ok': AlertSeverity.LOW,
                'no_data': AlertSeverity.MEDIUM,
                'paused': AlertSeverity.LOW,
                'pending': AlertSeverity.MEDIUM
            }
            
            severity = severity_map.get(state, AlertSeverity.MEDIUM)
            
            return ParsedAlert(
                title=title,
                description=message,
                severity=severity,
                source="grafana",
                tags={
                    "state": state,
                    "rule_id": payload.get('ruleId'),
                    "rule_name": payload.get('ruleName')
                },
                metadata=payload,
                external_id=str(payload.get('ruleId')),
                url=rule_url,
                resolved=state == 'ok'
            )

        except Exception as e:
            logger.error(f"Failed to parse Grafana alert: {str(e)}")
            return None

    async def parse_pagerduty_message(self, message: Dict[str, Any]) -> Optional[ParsedAlert]:
        """Parse a PagerDuty webhook message."""
        try:
            incident = message.get('incident', {})
            event = message.get('event', {})
            
            title = incident.get('title', 'PagerDuty Incident')
            description = incident.get('description', '')
            status = incident.get('status', 'triggered')
            urgency = incident.get('urgency', 'high')
            
            # Map PagerDuty urgency to severity
            severity_map = {
                'low': AlertSeverity.LOW,
                'high': AlertSeverity.HIGH
            }
            
            severity = severity_map.get(urgency, AlertSeverity.MEDIUM)
            
            return ParsedAlert(
                title=title,
                description=description,
                severity=severity,
                source="pagerduty",
                tags={
                    "incident_number": incident.get('incident_number'),
                    "urgency": urgency,
                    "status": status,
                    "service": incident.get('service', {}).get('name')
                },
                metadata=message,
                external_id=incident.get('id'),
                url=incident.get('html_url'),
                resolved=status == 'resolved'
            )

        except Exception as e:
            logger.error(f"Failed to parse PagerDuty message: {str(e)}")
            return None

    async def create_alert_from_webhook(
        self,
        db: AsyncSession,
        alert_data: ParsedAlert,
        source: str
    ) -> Optional[Alert]:
        """Create an alert record from parsed webhook data."""
        try:
            # Check for duplicate alerts
            existing_alert = None
            if alert_data.external_id:
                existing_alert = (
                    await db.execute(
                        select(Alert).filter(
                            and_(
                                Alert.external_id == alert_data.external_id,
                                Alert.source == source
                            )
                        )
                    )
                ).scalars().first()

            if existing_alert:
                # Update existing alert if resolved
                if alert_data.resolved and existing_alert.status != AlertStatus.RESOLVED:
                    existing_alert.status = AlertStatus.RESOLVED
                    existing_alert.resolved_at = datetime.utcnow()
                    await db.commit()
                    logger.info(f"Resolved existing alert {existing_alert.id}")
                return existing_alert

            # Skip creating new alert if it's already resolved
            if alert_data.resolved:
                logger.info(f"Skipping resolved alert from {source}")
                return None

            # Create new alert
            alert = Alert(
                title=alert_data.title,
                description=alert_data.description,
                severity=alert_data.severity,
                status=AlertStatus.ACTIVE,
                source=source,
                external_id=alert_data.external_id,
                url=alert_data.url,
                tags=alert_data.tags or {},
                metadata=alert_data.metadata or {},
                created_at=datetime.utcnow()
            )

            db.add(alert)
            await db.commit()
            await db.refresh(alert)

            logger.info(f"Created new alert {alert.id} from {source}")
            return alert

        except Exception as e:
            logger.error(f"Failed to create alert from {source}: {str(e)}")
            await db.rollback()
            return None

    async def send_alert_notifications(self, db: AsyncSession, alert: Alert) -> None:
        """Send notifications for a new alert."""
        try:
            # Get users to notify (this could be based on team, escalation rules, etc.)
            # For now, notify all active users - in production this would be more targeted
            users = (
                await db.execute(
                    select(User).filter(User.is_active == True)
                )
            ).scalars().all()

            # Send notifications
            for user in users:
                await self.notification_service.send_alert_notification(
                    db=db,
                    alert=alert,
                    user_ids=[user.id]
                )

        except Exception as e:
            logger.error(f"Failed to send alert notifications: {str(e)}")

    # Helper methods for parsing

    def _extract_title(self, payload: Dict[str, Any]) -> Optional[str]:
        """Extract title from generic payload."""
        # Try common title fields
        for field in ['title', 'summary', 'name', 'alertname', 'subject']:
            if field in payload and payload[field]:
                return str(payload[field])[:255]  # Truncate
        
        # Try nested fields
        if 'alert' in payload:
            return self._extract_title(payload['alert'])
        
        return None

    def _extract_description(self, payload: Dict[str, Any]) -> Optional[str]:
        """Extract description from generic payload."""
        for field in ['description', 'message', 'details', 'body', 'text']:
            if field in payload and payload[field]:
                return str(payload[field])[:1000]  # Truncate
        
        if 'alert' in payload:
            return self._extract_description(payload['alert'])
        
        return None

    def _extract_severity(self, payload: Dict[str, Any]) -> AlertSeverity:
        """Extract severity from generic payload."""
        severity_indicators = payload.get('severity') or payload.get('priority') or payload.get('level')
        
        if isinstance(severity_indicators, str):
            severity_lower = severity_indicators.lower()
            if any(word in severity_lower for word in ['critical', 'fatal', 'emergency']):
                return AlertSeverity.CRITICAL
            elif any(word in severity_lower for word in ['high', 'error', 'major']):
                return AlertSeverity.HIGH
            elif any(word in severity_lower for word in ['medium', 'warn', 'warning', 'minor']):
                return AlertSeverity.MEDIUM
            elif any(word in severity_lower for word in ['low', 'info', 'information']):
                return AlertSeverity.LOW
        
        return AlertSeverity.MEDIUM

    def _extract_tags(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Extract tags from generic payload."""
        tags = {}
        
        # Look for common tag fields
        for field in ['tags', 'labels', 'metadata']:
            if field in payload and isinstance(payload[field], dict):
                tags.update(payload[field])
        
        return tags

    def _extract_external_id(self, payload: Dict[str, Any]) -> Optional[str]:
        """Extract external ID from generic payload."""
        for field in ['id', 'external_id', 'fingerprint', 'incident_id', 'alert_id']:
            if field in payload and payload[field]:
                return str(payload[field])
        
        return None

    def _extract_url(self, payload: Dict[str, Any]) -> Optional[str]:
        """Extract URL from generic payload."""
        for field in ['url', 'link', 'runbook_url', 'dashboard_url', 'html_url']:
            if field in payload and payload[field]:
                return str(payload[field])
        
        return None

    def _is_resolved(self, payload: Dict[str, Any]) -> bool:
        """Check if the alert is resolved from generic payload."""
        status = payload.get('status', '').lower()
        state = payload.get('state', '').lower()
        
        return any(word in f"{status} {state}" for word in ['resolved', 'ok', 'closed', 'cleared'])

    def _extract_slack_alert_title(self, text: str) -> Optional[str]:
        """Extract alert title from Slack message text."""
        # Look for patterns like "ALERT: Title" or "ERROR: Title"
        patterns = [
            r'(?:ALERT|ERROR|CRITICAL|WARNING|INFO):\s*(.+?)(?:\n|$)',
            r'🚨\s*(.+?)(?:\n|$)',
            r'❌\s*(.+?)(?:\n|$)',
            r'⚠️\s*(.+?)(?:\n|$)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()[:255]
        
        # If no pattern matches, use first line if it looks like an alert
        first_line = text.split('\n')[0].strip()
        if any(keyword in first_line.upper() for keyword in ['ALERT', 'ERROR', 'CRITICAL', 'DOWN', 'FAILED']):
            return first_line[:255]
        
        return None

    def _extract_slack_severity(self, text: str) -> AlertSeverity:
        """Extract severity from Slack message text."""
        text_upper = text.upper()
        
        if any(word in text_upper for word in ['CRITICAL', 'FATAL', 'EMERGENCY', '🚨']):
            return AlertSeverity.CRITICAL
        elif any(word in text_upper for word in ['ERROR', 'HIGH', 'MAJOR', '❌']):
            return AlertSeverity.HIGH
        elif any(word in text_upper for word in ['WARNING', 'WARN', 'MEDIUM', '⚠️']):
            return AlertSeverity.MEDIUM
        else:
            return AlertSeverity.LOW

    def _is_slack_resolution(self, text: str) -> bool:
        """Check if Slack message indicates resolution."""
        text_upper = text.upper()
        return any(word in text_upper for word in ['RESOLVED', 'FIXED', 'CLEARED', 'OK', '✅', '✔️'])

    def _map_prometheus_severity(self, severity: str) -> AlertSeverity:
        """Map Prometheus severity to AlertSeverity."""
        severity_map = {
            'critical': AlertSeverity.CRITICAL,
            'warning': AlertSeverity.MEDIUM,
            'info': AlertSeverity.LOW,
            'none': AlertSeverity.LOW
        }
        return severity_map.get(severity.lower(), AlertSeverity.MEDIUM)

    async def send_status_update_to_slack(self, mention: Dict[str, Any]) -> None:
        """Send system status update to Slack."""
        # This would integrate with Slack API to send responses
        # Implementation depends on Slack bot setup
        logger.info("Status update requested via Slack mention")

    async def send_alerts_summary_to_slack(self, db: AsyncSession, mention: Dict[str, Any]) -> None:
        """Send alerts summary to Slack."""
        # This would integrate with Slack API to send alert summaries
        # Implementation depends on Slack bot setup
        logger.info("Alerts summary requested via Slack mention")


# Global service instance
alert_processor = AlertProcessor()