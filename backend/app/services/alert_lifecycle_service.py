"""
Alert Lifecycle Management Service.

Manages the complete lifecycle of alerts from creation to resolution,
including escalation rules, automated transitions, lifecycle tracking,
and alert health monitoring.
"""

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_, desc, func, text
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor

from app.models.alert import Alert, AlertSeverity, AlertStatus, AlertChannel
from app.models.user import User
from app.models.project import Project
from app.services.alert_service import AlertService
from app.services.slack_service import SlackService
from app.services.alert_categorization_service import AlertCategorizationService

# Configure logging
logger = logging.getLogger(__name__)


class EscalationTrigger(str, Enum):
    """Escalation trigger types."""

    TIME_BASED = "time_based"
    STATUS_CHANGE = "status_change"
    SEVERITY_BASED = "severity_based"
    FAILED_ACKNOWLEDGMENT = "failed_acknowledgment"
    REPEATED_OCCURRENCE = "repeated_occurrence"


class AlertLifecycleStage(str, Enum):
    """Alert lifecycle stages."""

    RECEIVED = "received"
    CATEGORIZED = "categorized"
    ACKNOWLEDGED = "acknowledged"
    INVESTIGATING = "investigating"
    ESCALATED = "escalated"
    RESOLVED = "resolved"
    CLOSED = "closed"
    SUPPRESSED = "suppressed"


@dataclass
class EscalationRule:
    """Defines escalation rules for alerts."""

    trigger: EscalationTrigger
    condition: Dict[str, Any]  # Trigger-specific conditions
    action: Dict[str, Any]  # Actions to take
    priority: int  # Rule priority (lower = higher priority)
    enabled: bool = True


@dataclass
class LifecycleTransition:
    """Represents a lifecycle transition."""

    from_stage: AlertLifecycleStage
    to_stage: AlertLifecycleStage
    timestamp: datetime
    user_id: Optional[int] = None
    reason: Optional[str] = None
    automated: bool = False
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class AlertMetrics:
    """Alert metrics for lifecycle analysis."""

    total_alerts: int
    active_alerts: int
    acknowledged_alerts: int
    resolved_alerts: int
    suppressed_alerts: int
    avg_acknowledgment_time: Optional[timedelta]
    avg_resolution_time: Optional[timedelta]
    escalation_count: int
    top_sources: List[Tuple[str, int]]
    severity_distribution: Dict[str, int]


class AlertLifecycleService:
    """
    Service for managing alert lifecycle and escalation.

    Provides comprehensive lifecycle management including:
    - Escalation rule management
    - Automated alert transitions
    - Lifecycle tracking and metrics
    - Alert health monitoring
    """

    def __init__(self, slack_service: Optional[SlackService] = None):
        """Initialize the lifecycle service."""
        self.slack_service = slack_service
        self.categorization_service = AlertCategorizationService()
        self.executor = ThreadPoolExecutor(max_workers=4)

        # Default escalation rules
        self.default_escalation_rules = [
            EscalationRule(
                trigger=EscalationTrigger.TIME_BASED,
                condition={"severity": "critical", "unacknowledged_minutes": 5},
                action={
                    "escalate_to": "manager",
                    "notify_channels": ["slack", "email"],
                },
                priority=1,
            ),
            EscalationRule(
                trigger=EscalationTrigger.TIME_BASED,
                condition={"severity": "high", "unacknowledged_minutes": 15},
                action={"escalate_to": "team_lead", "notify_channels": ["slack"]},
                priority=2,
            ),
            EscalationRule(
                trigger=EscalationTrigger.REPEATED_OCCURRENCE,
                condition={"same_source_count": 5, "within_minutes": 30},
                action={"suppress_similar": True, "notify_channels": ["slack"]},
                priority=3,
            ),
            EscalationRule(
                trigger=EscalationTrigger.FAILED_ACKNOWLEDGMENT,
                condition={"unacknowledged_minutes": 60},
                action={"escalate_to": "oncall", "notify_channels": ["slack", "sms"]},
                priority=4,
            ),
        ]

    async def process_alert_lifecycle(
        self,
        db: Session,
        alert: Alert,
        stage: AlertLifecycleStage,
        user_id: Optional[int] = None,
        reason: Optional[str] = None,
    ) -> bool:
        """
        Process an alert through a lifecycle stage.

        Args:
            db: Database session
            alert: Alert to process
            stage: Target lifecycle stage
            user_id: User triggering the transition
            reason: Reason for transition

        Returns:
            bool: Success status
        """
        try:
            # Record the transition
            transition = LifecycleTransition(
                from_stage=self._get_current_stage(alert),
                to_stage=stage,
                timestamp=datetime.utcnow(),
                user_id=user_id,
                reason=reason,
                automated=user_id is None,
            )

            # Update alert based on stage
            success = await self._apply_stage_transition(db, alert, stage, transition)

            if success:
                # Log the transition
                await self._log_lifecycle_transition(db, alert, transition)

                # Check for escalation rules
                await self._check_escalation_rules(db, alert)

                # Update alert status and metadata
                self._update_alert_lifecycle_metadata(alert, transition)

                db.commit()
                logger.info(f"Alert {alert.id} transitioned to {stage.value}")

                return True
            else:
                db.rollback()
                return False

        except Exception as e:
            db.rollback()
            logger.error(f"Error processing alert {alert.id} lifecycle: {e}")
            return False

    async def acknowledge_alert_with_lifecycle(
        self, db: Session, alert_id: int, user_id: int, comment: Optional[str] = None
    ) -> bool:
        """
        Acknowledge alert with full lifecycle tracking.

        Args:
            db: Database session
            alert_id: Alert ID
            user_id: User acknowledging
            comment: Optional comment

        Returns:
            bool: Success status
        """
        try:
            alert = AlertService.get_alert_by_id(db, alert_id, user_id)
            if not alert:
                return False

            # Update alert status
            alert.acknowledge(user_id, comment)

            # Process lifecycle
            success = await self.process_alert_lifecycle(
                db, alert, AlertLifecycleStage.ACKNOWLEDGED, user_id, comment
            )

            if success and self.slack_service:
                # Send Slack notification
                await self._send_lifecycle_notification(alert, "acknowledged", user_id)

            return success

        except Exception as e:
            logger.error(f"Error acknowledging alert {alert_id}: {e}")
            return False

    async def resolve_alert_with_lifecycle(
        self,
        db: Session,
        alert_id: int,
        user_id: int,
        resolution_comment: Optional[str] = None,
    ) -> bool:
        """
        Resolve alert with full lifecycle tracking.

        Args:
            db: Database session
            alert_id: Alert ID
            user_id: User resolving
            resolution_comment: Resolution details

        Returns:
            bool: Success status
        """
        try:
            alert = AlertService.get_alert_by_id(db, alert_id, user_id)
            if not alert:
                return False

            # Update alert status
            alert.resolve(user_id, resolution_comment)

            # Process lifecycle
            success = await self.process_alert_lifecycle(
                db, alert, AlertLifecycleStage.RESOLVED, user_id, resolution_comment
            )

            if success and self.slack_service:
                # Send Slack notification
                await self._send_lifecycle_notification(alert, "resolved", user_id)

            return success

        except Exception as e:
            logger.error(f"Error resolving alert {alert_id}: {e}")
            return False

    async def escalate_alert(
        self,
        db: Session,
        alert: Alert,
        escalation_rule: EscalationRule,
        reason: Optional[str] = None,
    ) -> bool:
        """
        Escalate an alert based on escalation rules.

        Args:
            db: Database session
            alert: Alert to escalate
            escalation_rule: Rule triggering escalation
            reason: Escalation reason

        Returns:
            bool: Success status
        """
        try:
            # Process lifecycle to escalated stage
            success = await self.process_alert_lifecycle(
                db, alert, AlertLifecycleStage.ESCALATED, None, reason
            )

            if success:
                # Execute escalation actions
                await self._execute_escalation_actions(db, alert, escalation_rule)

                # Update alert severity if needed
                if escalation_rule.action.get("increase_severity"):
                    await self._increase_alert_severity(alert)

                logger.info(
                    f"Escalated alert {alert.id} using rule {escalation_rule.trigger.value}"
                )

            return success

        except Exception as e:
            logger.error(f"Error escalating alert {alert.id}: {e}")
            return False

    async def suppress_alert_with_lifecycle(
        self,
        db: Session,
        alert_id: int,
        user_id: int,
        duration_minutes: int = 60,
        reason: Optional[str] = None,
    ) -> bool:
        """
        Suppress alert with lifecycle tracking.

        Args:
            db: Database session
            alert_id: Alert ID
            user_id: User suppressing
            duration_minutes: Suppression duration
            reason: Suppression reason

        Returns:
            bool: Success status
        """
        try:
            alert = AlertService.get_alert_by_id(db, alert_id, user_id)
            if not alert:
                return False

            # Update alert status
            alert.suppress()

            # Set suppression metadata
            suppression_data = {
                "suppressed_by": user_id,
                "suppressed_until": (
                    datetime.utcnow() + timedelta(minutes=duration_minutes)
                ).isoformat(),
                "suppression_reason": reason,
            }

            context = alert.get_context_data() or {}
            context.update(suppression_data)
            alert.set_context_data(context)

            # Process lifecycle
            success = await self.process_alert_lifecycle(
                db, alert, AlertLifecycleStage.SUPPRESSED, user_id, reason
            )

            return success

        except Exception as e:
            logger.error(f"Error suppressing alert {alert_id}: {e}")
            return False

    async def get_alert_metrics(
        self, db: Session, project_id: Optional[int] = None, days_back: int = 30
    ) -> AlertMetrics:
        """
        Get comprehensive alert metrics.

        Args:
            db: Database session
            project_id: Optional project filter
            days_back: Days to look back for metrics

        Returns:
            AlertMetrics: Comprehensive metrics
        """
        try:
            start_date = datetime.utcnow() - timedelta(days=days_back)

            # Base query
            query = db.query(Alert).filter(Alert.created_at >= start_date)
            if project_id:
                query = query.filter(Alert.project_id == project_id)

            alerts = query.all()

            # Calculate metrics
            total_alerts = len(alerts)
            active_alerts = len([a for a in alerts if a.status == AlertStatus.ACTIVE])
            acknowledged_alerts = len(
                [a for a in alerts if a.status == AlertStatus.ACKNOWLEDGED]
            )
            resolved_alerts = len(
                [a for a in alerts if a.status == AlertStatus.RESOLVED]
            )
            suppressed_alerts = len(
                [a for a in alerts if a.status == AlertStatus.SUPPRESSED]
            )

            # Calculate average times
            ack_times = [
                (a.acknowledged_at - a.created_at)
                for a in alerts
                if a.acknowledged_at and a.created_at
            ]
            avg_ack_time = (
                sum(ack_times, timedelta()) / len(ack_times) if ack_times else None
            )

            resolution_times = [
                (a.resolved_at - a.created_at)
                for a in alerts
                if a.resolved_at and a.created_at
            ]
            avg_resolution_time = (
                sum(resolution_times, timedelta()) / len(resolution_times)
                if resolution_times
                else None
            )

            # Count escalations
            escalation_count = len(
                [
                    a
                    for a in alerts
                    if a.get_context_data() and a.get_context_data().get("escalated")
                ]
            )

            # Top sources
            source_counts = {}
            for alert in alerts:
                source_counts[alert.source] = source_counts.get(alert.source, 0) + 1
            top_sources = sorted(
                source_counts.items(), key=lambda x: x[1], reverse=True
            )[:5]

            # Severity distribution
            severity_dist = {}
            for alert in alerts:
                severity_dist[alert.severity.value] = (
                    severity_dist.get(alert.severity.value, 0) + 1
                )

            return AlertMetrics(
                total_alerts=total_alerts,
                active_alerts=active_alerts,
                acknowledged_alerts=acknowledged_alerts,
                resolved_alerts=resolved_alerts,
                suppressed_alerts=suppressed_alerts,
                avg_acknowledgment_time=avg_ack_time,
                avg_resolution_time=avg_resolution_time,
                escalation_count=escalation_count,
                top_sources=top_sources,
                severity_distribution=severity_dist,
            )

        except Exception as e:
            logger.error(f"Error calculating alert metrics: {e}")
            return AlertMetrics(
                total_alerts=0,
                active_alerts=0,
                acknowledged_alerts=0,
                resolved_alerts=0,
                suppressed_alerts=0,
                avg_acknowledgment_time=None,
                avg_resolution_time=None,
                escalation_count=0,
                top_sources=[],
                severity_distribution={},
            )

    async def check_alerts_for_escalation(self, db: Session) -> List[int]:
        """
        Check all active alerts for escalation conditions.

        Args:
            db: Database session

        Returns:
            List[int]: List of escalated alert IDs
        """
        escalated_alerts = []

        try:
            # Get all active alerts
            active_alerts = (
                db.query(Alert)
                .filter(
                    Alert.status.in_([AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED])
                )
                .all()
            )

            for alert in active_alerts:
                for rule in self.default_escalation_rules:
                    if await self._should_escalate(alert, rule):
                        success = await self.escalate_alert(db, alert, rule)
                        if success:
                            escalated_alerts.append(alert.id)
                            break  # Only apply first matching rule

        except Exception as e:
            logger.error(f"Error checking alerts for escalation: {e}")

        return escalated_alerts

    async def auto_resolve_stale_alerts(
        self, db: Session, hours_threshold: int = 24
    ) -> List[int]:
        """
        Auto-resolve alerts that have been stale for too long.

        Args:
            db: Database session
            hours_threshold: Hours before considering alert stale

        Returns:
            List[int]: List of auto-resolved alert IDs
        """
        resolved_alerts = []

        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours_threshold)

            # Find stale acknowledged alerts
            stale_alerts = (
                db.query(Alert)
                .filter(
                    and_(
                        Alert.status == AlertStatus.ACKNOWLEDGED,
                        Alert.acknowledged_at < cutoff_time,
                    )
                )
                .all()
            )

            for alert in stale_alerts:
                # Check if alert allows auto-resolution
                context = alert.get_context_data() or {}
                if context.get("auto_resolve", True):
                    success = await self.resolve_alert_with_lifecycle(
                        db, alert.id, None, "Auto-resolved due to staleness"
                    )
                    if success:
                        resolved_alerts.append(alert.id)

        except Exception as e:
            logger.error(f"Error auto-resolving stale alerts: {e}")

        return resolved_alerts

    # Private helper methods

    def _get_current_stage(self, alert: Alert) -> AlertLifecycleStage:
        """Get current lifecycle stage from alert status."""
        status_to_stage = {
            AlertStatus.ACTIVE: AlertLifecycleStage.RECEIVED,
            AlertStatus.ACKNOWLEDGED: AlertLifecycleStage.ACKNOWLEDGED,
            AlertStatus.RESOLVED: AlertLifecycleStage.RESOLVED,
            AlertStatus.SUPPRESSED: AlertLifecycleStage.SUPPRESSED,
        }

        # Check for escalated status in context
        context = alert.get_context_data() or {}
        if context.get("escalated"):
            return AlertLifecycleStage.ESCALATED

        return status_to_stage.get(alert.status, AlertLifecycleStage.RECEIVED)

    async def _apply_stage_transition(
        self,
        db: Session,
        alert: Alert,
        stage: AlertLifecycleStage,
        transition: LifecycleTransition,
    ) -> bool:
        """Apply the actual stage transition to the alert."""
        try:
            # Update alert status based on stage
            stage_to_status = {
                AlertLifecycleStage.RECEIVED: AlertStatus.ACTIVE,
                AlertLifecycleStage.ACKNOWLEDGED: AlertStatus.ACKNOWLEDGED,
                AlertLifecycleStage.RESOLVED: AlertStatus.RESOLVED,
                AlertLifecycleStage.SUPPRESSED: AlertStatus.SUPPRESSED,
                AlertLifecycleStage.ESCALATED: alert.status,  # Keep current status
            }

            if stage in stage_to_status:
                alert.status = stage_to_status[stage]

            # Update context with lifecycle information
            context = alert.get_context_data() or {}
            context["current_lifecycle_stage"] = stage.value
            context["last_transition"] = transition.timestamp.isoformat()

            if stage == AlertLifecycleStage.ESCALATED:
                context["escalated"] = True
                context["escalated_at"] = transition.timestamp.isoformat()

            alert.set_context_data(context)

            return True

        except Exception as e:
            logger.error(f"Error applying stage transition for alert {alert.id}: {e}")
            return False

    async def _log_lifecycle_transition(
        self, db: Session, alert: Alert, transition: LifecycleTransition
    ) -> None:
        """Log the lifecycle transition for audit purposes."""
        try:
            # Add transition to alert annotations
            annotations = alert.get_annotations() or {}
            transitions = annotations.get("lifecycle_transitions", [])

            transitions.append(
                {
                    "from_stage": transition.from_stage.value,
                    "to_stage": transition.to_stage.value,
                    "timestamp": transition.timestamp.isoformat(),
                    "user_id": transition.user_id,
                    "reason": transition.reason,
                    "automated": transition.automated,
                }
            )

            annotations["lifecycle_transitions"] = transitions
            alert.set_annotations(annotations)

        except Exception as e:
            logger.error(
                f"Error logging lifecycle transition for alert {alert.id}: {e}"
            )

    def _update_alert_lifecycle_metadata(
        self, alert: Alert, transition: LifecycleTransition
    ) -> None:
        """Update alert metadata with lifecycle information."""
        try:
            # Update labels with lifecycle stage
            labels = alert.get_labels() or {}
            labels["lifecycle_stage"] = transition.to_stage.value
            labels["last_updated"] = transition.timestamp.isoformat()

            if transition.user_id:
                labels["last_updated_by"] = str(transition.user_id)

            alert.set_labels(labels)

        except Exception as e:
            logger.error(f"Error updating lifecycle metadata for alert {alert.id}: {e}")

    async def _check_escalation_rules(self, db: Session, alert: Alert) -> None:
        """Check if alert meets any escalation rule conditions."""
        try:
            for rule in self.default_escalation_rules:
                if rule.enabled and await self._should_escalate(alert, rule):
                    await self.escalate_alert(db, alert, rule)
                    break  # Apply only first matching rule

        except Exception as e:
            logger.error(f"Error checking escalation rules for alert {alert.id}: {e}")

    async def _should_escalate(self, alert: Alert, rule: EscalationRule) -> bool:
        """Check if alert should be escalated based on rule."""
        try:
            condition = rule.condition

            if rule.trigger == EscalationTrigger.TIME_BASED:
                if (
                    "severity" in condition
                    and alert.severity.value != condition["severity"]
                ):
                    return False

                if "unacknowledged_minutes" in condition:
                    if alert.status != AlertStatus.ACTIVE:
                        return False

                    minutes_active = (
                        datetime.utcnow() - alert.created_at
                    ).total_seconds() / 60
                    return minutes_active >= condition["unacknowledged_minutes"]

            elif rule.trigger == EscalationTrigger.REPEATED_OCCURRENCE:
                # This would require more complex logic to check for similar alerts
                # For now, return False
                return False

            elif rule.trigger == EscalationTrigger.FAILED_ACKNOWLEDGMENT:
                if alert.status != AlertStatus.ACKNOWLEDGED:
                    return False

                if alert.acknowledged_at:
                    minutes_acked = (
                        datetime.utcnow() - alert.acknowledged_at
                    ).total_seconds() / 60
                    return minutes_acked >= condition.get("unacknowledged_minutes", 60)

            return False

        except Exception as e:
            logger.error(
                f"Error checking escalation condition for alert {alert.id}: {e}"
            )
            return False

    async def _execute_escalation_actions(
        self, db: Session, alert: Alert, rule: EscalationRule
    ) -> None:
        """Execute actions defined in escalation rule."""
        try:
            action = rule.action

            # Send notifications
            if "notify_channels" in action and self.slack_service:
                await self._send_escalation_notification(
                    alert, action["notify_channels"]
                )

            # Update alert context with escalation info
            context = alert.get_context_data() or {}
            context["escalation_rule"] = rule.trigger.value
            context["escalation_action"] = action
            context["escalated_at"] = datetime.utcnow().isoformat()
            alert.set_context_data(context)

        except Exception as e:
            logger.error(
                f"Error executing escalation actions for alert {alert.id}: {e}"
            )

    async def _increase_alert_severity(self, alert: Alert) -> None:
        """Increase alert severity by one level."""
        severity_order = [
            AlertSeverity.LOW,
            AlertSeverity.MEDIUM,
            AlertSeverity.HIGH,
            AlertSeverity.CRITICAL,
        ]
        current_index = severity_order.index(alert.severity)

        if current_index < len(severity_order) - 1:
            alert.severity = severity_order[current_index + 1]

    async def _send_lifecycle_notification(
        self, alert: Alert, action: str, user_id: Optional[int]
    ) -> None:
        """Send lifecycle notification via Slack."""
        if not self.slack_service:
            return

        try:
            message = f"Alert {alert.title} was {action}"
            if user_id:
                message += f" by user {user_id}"

            await self.slack_service.send_alert_update(alert, message)

        except Exception as e:
            logger.error(
                f"Error sending lifecycle notification for alert {alert.id}: {e}"
            )

    async def _send_escalation_notification(
        self, alert: Alert, channels: List[str]
    ) -> None:
        """Send escalation notification via specified channels."""
        if not self.slack_service:
            return

        try:
            if "slack" in channels:
                message = f"🚨 ESCALATED: Alert {alert.title} has been escalated due to lack of response"
                await self.slack_service.send_alert_escalation(alert, message)

        except Exception as e:
            logger.error(
                f"Error sending escalation notification for alert {alert.id}: {e}"
            )
