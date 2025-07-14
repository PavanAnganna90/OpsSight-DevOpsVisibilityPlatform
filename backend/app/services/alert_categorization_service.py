"""
Alert categorization and notification rules engine.
Handles intelligent alert classification, priority assignment, and notification routing.
"""

import re
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass
from enum import Enum
import json

from sqlalchemy.orm import Session
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.project import Project
from app.schemas.alert import AlertCreate
from app.core.config import settings

logger = logging.getLogger(__name__)


class AlertCategory(str, Enum):
    """Enumeration for alert categories."""

    INFRASTRUCTURE = "infrastructure"
    PERFORMANCE = "performance"
    SECURITY = "security"
    AVAILABILITY = "availability"
    DEPLOYMENT = "deployment"
    MONITORING = "monitoring"
    NETWORK = "network"
    DATABASE = "database"
    APPLICATION = "application"
    GENERAL = "general"


class NotificationPriority(str, Enum):
    """Enumeration for notification priority levels."""

    IMMEDIATE = "immediate"  # Send immediately
    HIGH = "high"  # Send within 5 minutes
    NORMAL = "normal"  # Send within 15 minutes
    LOW = "low"  # Batch send hourly
    SUPPRESSED = "suppressed"  # Do not send


class EscalationLevel(str, Enum):
    """Enumeration for escalation levels."""

    LEVEL_1 = "level_1"  # First responders
    LEVEL_2 = "level_2"  # Team leads
    LEVEL_3 = "level_3"  # Management
    LEVEL_4 = "level_4"  # Senior leadership


@dataclass
class CategoryRule:
    """Data class for alert categorization rules."""

    name: str
    pattern: str  # Regex pattern to match
    category: AlertCategory
    priority_boost: int = 0  # Boost priority by this amount
    tags: List[str] = None
    conditions: Dict[str, Any] = None

    def __post_init__(self):
        if self.tags is None:
            self.tags = []
        if self.conditions is None:
            self.conditions = {}


@dataclass
class NotificationRule:
    """Data class for notification routing rules."""

    name: str
    severity_levels: List[AlertSeverity]
    categories: List[AlertCategory]
    channels: List[str]
    recipients: List[str]
    priority: NotificationPriority
    conditions: Dict[str, Any] = None
    escalation_time: Optional[int] = None  # Minutes before escalation
    escalation_level: Optional[EscalationLevel] = None

    def __post_init__(self):
        if self.conditions is None:
            self.conditions = {}


@dataclass
class SuppressionRule:
    """Data class for alert suppression rules."""

    name: str
    pattern: str  # Regex pattern to match
    active: bool = True
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    recurring_pattern: Optional[str] = None  # Cron pattern
    conditions: Dict[str, Any] = None

    def __post_init__(self):
        if self.conditions is None:
            self.conditions = {}


@dataclass
class SlackNotificationData:
    """Data class for Slack notification configuration."""

    include_actions: bool = True
    custom_message: Optional[str] = None
    thread_reply: bool = False
    mention_on_call: bool = False


class AlertCategorizationService:
    """
    Service for intelligent alert categorization and notification routing.
    """

    def __init__(self):
        """Initialize the categorization service with default rules."""
        self.category_rules = self._load_default_category_rules()
        self.notification_rules = self._load_default_notification_rules()
        self.suppression_rules = self._load_default_suppression_rules()

    def _load_default_category_rules(self) -> List[CategoryRule]:
        """Load default categorization rules."""
        return [
            # Infrastructure alerts
            CategoryRule(
                name="Kubernetes Cluster Issues",
                pattern=r"(node|pod|deployment|service).*(?:down|failed|unavailable|crash)",
                category=AlertCategory.INFRASTRUCTURE,
                priority_boost=2,
                tags=["kubernetes", "infrastructure"],
                conditions={"source": ["kubernetes", "k8s"]},
            ),
            CategoryRule(
                name="AWS Infrastructure",
                pattern=r"(ec2|rds|elb|s3|lambda).*(?:down|failed|error)",
                category=AlertCategory.INFRASTRUCTURE,
                priority_boost=1,
                tags=["aws", "cloud"],
                conditions={"source": ["aws", "cloudwatch"]},
            ),
            # Performance alerts
            CategoryRule(
                name="High CPU Usage",
                pattern=r"cpu.*(?:high|usage|utilization).*(?:above|exceed|over).*\d+%",
                category=AlertCategory.PERFORMANCE,
                tags=["cpu", "performance"],
                conditions={"severity": ["high", "critical"]},
            ),
            CategoryRule(
                name="Memory Issues",
                pattern=r"memory.*(?:high|usage|leak|oom|out of memory)",
                category=AlertCategory.PERFORMANCE,
                priority_boost=1,
                tags=["memory", "performance"],
            ),
            CategoryRule(
                name="Disk Space",
                pattern=r"disk.*(?:space|usage|full|storage).*(?:above|exceed|over).*\d+%",
                category=AlertCategory.PERFORMANCE,
                tags=["disk", "storage", "performance"],
            ),
            # Security alerts
            CategoryRule(
                name="Security Incidents",
                pattern=r"(?:security|unauthorized|breach|intrusion|malware|virus|attack)",
                category=AlertCategory.SECURITY,
                priority_boost=3,
                tags=["security", "incident"],
                conditions={"severity": ["high", "critical"]},
            ),
            CategoryRule(
                name="Authentication Issues",
                pattern=r"(?:login|auth|authentication).*(?:failed|failure|invalid|blocked)",
                category=AlertCategory.SECURITY,
                priority_boost=1,
                tags=["security", "authentication"],
            ),
            # Availability alerts
            CategoryRule(
                name="Service Down",
                pattern=r"(?:service|application|endpoint).*(?:down|unavailable|unreachable|timeout)",
                category=AlertCategory.AVAILABILITY,
                priority_boost=2,
                tags=["availability", "outage"],
            ),
            CategoryRule(
                name="Database Connectivity",
                pattern=r"database.*(?:connection|connectivity|down|timeout|unreachable)",
                category=AlertCategory.DATABASE,
                priority_boost=2,
                tags=["database", "connectivity"],
            ),
            # Deployment alerts
            CategoryRule(
                name="Deployment Failures",
                pattern=r"(?:deploy|deployment|release).*(?:failed|failure|error|rollback)",
                category=AlertCategory.DEPLOYMENT,
                priority_boost=1,
                tags=["deployment", "cicd"],
            ),
            # Network alerts
            CategoryRule(
                name="Network Issues",
                pattern=r"(?:network|dns|ssl|certificate|connectivity).*(?:error|failed|expired|invalid)",
                category=AlertCategory.NETWORK,
                tags=["network", "connectivity"],
            ),
            # Application alerts
            CategoryRule(
                name="Application Errors",
                pattern=r"(?:exception|error|crash|failure).*(?:application|app|service)",
                category=AlertCategory.APPLICATION,
                tags=["application", "error"],
            ),
        ]

    def _load_default_notification_rules(self) -> List[NotificationRule]:
        """Load default notification routing rules."""
        return [
            # Critical alerts - immediate notification
            NotificationRule(
                name="Critical Infrastructure",
                severity_levels=[AlertSeverity.CRITICAL],
                categories=[AlertCategory.INFRASTRUCTURE, AlertCategory.AVAILABILITY],
                channels=["slack", "email", "sms"],
                recipients=["on-call", "devops-team"],
                priority=NotificationPriority.IMMEDIATE,
                escalation_time=15,  # Escalate if not acknowledged in 15 minutes
                escalation_level=EscalationLevel.LEVEL_2,
            ),
            NotificationRule(
                name="Security Incidents",
                severity_levels=[AlertSeverity.CRITICAL, AlertSeverity.HIGH],
                categories=[AlertCategory.SECURITY],
                channels=["slack", "email", "sms"],
                recipients=["security-team", "on-call"],
                priority=NotificationPriority.IMMEDIATE,
                escalation_time=10,  # Fast escalation for security
                escalation_level=EscalationLevel.LEVEL_3,
            ),
            # High priority alerts
            NotificationRule(
                name="Performance Issues",
                severity_levels=[AlertSeverity.HIGH],
                categories=[AlertCategory.PERFORMANCE, AlertCategory.DATABASE],
                channels=["slack", "email"],
                recipients=["devops-team"],
                priority=NotificationPriority.HIGH,
                escalation_time=30,
            ),
            NotificationRule(
                name="Deployment Issues",
                severity_levels=[AlertSeverity.HIGH, AlertSeverity.MEDIUM],
                categories=[AlertCategory.DEPLOYMENT],
                channels=["slack"],
                recipients=["dev-team", "devops-team"],
                priority=NotificationPriority.HIGH,
            ),
            # Normal priority alerts
            NotificationRule(
                name="General Monitoring",
                severity_levels=[AlertSeverity.MEDIUM],
                categories=[AlertCategory.MONITORING, AlertCategory.APPLICATION],
                channels=["slack"],
                recipients=["dev-team"],
                priority=NotificationPriority.NORMAL,
            ),
            # Low priority alerts
            NotificationRule(
                name="Information Alerts",
                severity_levels=[AlertSeverity.LOW],
                categories=[AlertCategory.GENERAL],
                channels=["slack"],
                recipients=["dev-team"],
                priority=NotificationPriority.LOW,
            ),
        ]

    def _load_default_suppression_rules(self) -> List[SuppressionRule]:
        """Load default suppression rules."""
        return [
            SuppressionRule(
                name="Maintenance Window",
                pattern=r".*",  # Suppress all alerts during maintenance
                active=False,  # Disabled by default
                conditions={"source": ["maintenance"]},
            ),
            SuppressionRule(
                name="Test Environment",
                pattern=r".*test.*",
                active=True,
                conditions={"environment": ["test", "staging"]},
            ),
            SuppressionRule(
                name="Known Issues",
                pattern=r"(?:known issue|acknowledged problem|scheduled maintenance)",
                active=True,
            ),
        ]

    def categorize_alert(
        self, alert_data: Dict[str, Any], source: str
    ) -> Dict[str, Any]:
        """
        Categorize an incoming alert based on content analysis.

        Args:
            alert_data: Raw alert data
            source: Source system

        Returns:
            Enhanced alert data with categorization
        """
        # Extract basic information
        title = alert_data.get("alertname") or alert_data.get("title", "")
        message = alert_data.get("description") or alert_data.get("message", "")
        content = f"{title} {message}".lower()

        # Default values
        category = AlertCategory.GENERAL
        tags = set()
        priority_boost = 0

        # Apply categorization rules
        for rule in self.category_rules:
            if self._matches_rule(alert_data, source, content, rule):
                category = rule.category
                tags.update(rule.tags)
                priority_boost += rule.priority_boost
                logger.info(f"Applied categorization rule '{rule.name}' to alert")
                break

        # Enhanced severity calculation
        original_severity = self._extract_severity(alert_data)
        enhanced_severity = self._calculate_enhanced_severity(
            original_severity, category, priority_boost, alert_data
        )

        # Generate smart tags
        smart_tags = self._generate_smart_tags(alert_data, content, category)
        tags.update(smart_tags)

        return {
            "category": category.value,
            "enhanced_severity": enhanced_severity,
            "priority_boost": priority_boost,
            "tags": list(tags),
            "metadata": {
                "original_severity": original_severity.value,
                "categorization_source": "auto",
                "matched_rules": [
                    rule.name
                    for rule in self.category_rules
                    if self._matches_rule(alert_data, source, content, rule)
                ],
            },
        }

    def _matches_rule(
        self, alert_data: Dict[str, Any], source: str, content: str, rule: CategoryRule
    ) -> bool:
        """Check if an alert matches a categorization rule."""
        # Check pattern match
        if not re.search(rule.pattern, content, re.IGNORECASE):
            return False

        # Check additional conditions
        if rule.conditions:
            if "source" in rule.conditions:
                if source.lower() not in [s.lower() for s in rule.conditions["source"]]:
                    return False

            if "severity" in rule.conditions:
                alert_severity = alert_data.get("severity", "").lower()
                if alert_severity not in rule.conditions["severity"]:
                    return False

        return True

    def _extract_severity(self, alert_data: Dict[str, Any]) -> AlertSeverity:
        """Extract severity from alert data."""
        severity_mapping = {
            "critical": AlertSeverity.CRITICAL,
            "high": AlertSeverity.HIGH,
            "warning": AlertSeverity.MEDIUM,
            "medium": AlertSeverity.MEDIUM,
            "info": AlertSeverity.LOW,
            "low": AlertSeverity.LOW,
        }

        severity_str = (
            alert_data.get("severity", "").lower()
            or alert_data.get("priority", "").lower()
            or "medium"
        )

        return severity_mapping.get(severity_str, AlertSeverity.MEDIUM)

    def _calculate_enhanced_severity(
        self,
        original_severity: AlertSeverity,
        category: AlertCategory,
        priority_boost: int,
        alert_data: Dict[str, Any],
    ) -> AlertSeverity:
        """Calculate enhanced severity based on context."""
        # Convert severity to numeric for calculation
        severity_values = {
            AlertSeverity.LOW: 1,
            AlertSeverity.MEDIUM: 2,
            AlertSeverity.HIGH: 3,
            AlertSeverity.CRITICAL: 4,
        }

        numeric_severity = severity_values[original_severity]

        # Apply priority boost
        enhanced_value = min(numeric_severity + priority_boost, 4)

        # Category-specific adjustments
        if category == AlertCategory.SECURITY and enhanced_value < 3:
            enhanced_value = 3  # Security alerts are at least HIGH
        elif category == AlertCategory.INFRASTRUCTURE and enhanced_value < 2:
            enhanced_value = 2  # Infrastructure alerts are at least MEDIUM

        # Convert back to severity
        value_to_severity = {v: k for k, v in severity_values.items()}
        return value_to_severity[enhanced_value]

    def _generate_smart_tags(
        self, alert_data: Dict[str, Any], content: str, category: AlertCategory
    ) -> Set[str]:
        """Generate intelligent tags based on alert content."""
        tags = set()

        # Extract technology tags
        tech_patterns = {
            "kubernetes": r"(?:k8s|kubernetes|kubectl|pod|deployment|service|ingress)",
            "docker": r"(?:docker|container|containerized)",
            "aws": r"(?:aws|ec2|s3|rds|lambda|cloudwatch|elb|vpc)",
            "postgresql": r"(?:postgres|postgresql|psql)",
            "mysql": r"(?:mysql|mariadb)",
            "redis": r"(?:redis|cache)",
            "nginx": r"(?:nginx|web server)",
            "apache": r"(?:apache|httpd)",
            "jenkins": r"(?:jenkins|ci\/cd|pipeline)",
            "prometheus": r"(?:prometheus|grafana|metrics)",
        }

        for tag, pattern in tech_patterns.items():
            if re.search(pattern, content, re.IGNORECASE):
                tags.add(tag)

        # Extract environment tags
        env_patterns = {
            "production": r"(?:prod|production)",
            "staging": r"(?:staging|stage)",
            "development": r"(?:dev|development)",
            "test": r"(?:test|testing|qa)",
        }

        for tag, pattern in env_patterns.items():
            if re.search(pattern, content, re.IGNORECASE):
                tags.add(tag)

        # Add category-specific tags
        tags.add(category.value)

        # Extract service names (heuristic)
        service_match = re.search(
            r"(?:service|app|application)[:\s]+([a-zA-Z0-9-_]+)", content
        )
        if service_match:
            tags.add(f"service:{service_match.group(1)}")

        return tags

    def determine_notification_routing(self, alert: Alert) -> List[NotificationRule]:
        """
        Determine which notification rules apply to an alert.

        Args:
            alert: Alert object

        Returns:
            List of applicable notification rules
        """
        applicable_rules = []

        for rule in self.notification_rules:
            # Check severity match
            if alert.severity not in rule.severity_levels:
                continue

            # Check category match
            alert_category = (
                AlertCategory(alert.category)
                if alert.category
                else AlertCategory.GENERAL
            )
            if rule.categories and alert_category not in rule.categories:
                continue

            # Check additional conditions
            if self._matches_notification_conditions(alert, rule):
                applicable_rules.append(rule)

        return applicable_rules

    def _matches_notification_conditions(
        self, alert: Alert, rule: NotificationRule
    ) -> bool:
        """Check if alert matches notification rule conditions."""
        if not rule.conditions:
            return True

        # Check source conditions
        if "source" in rule.conditions:
            if alert.source not in rule.conditions["source"]:
                return False

        # Check time-based conditions
        if "time_window" in rule.conditions:
            current_hour = datetime.now().hour
            time_window = rule.conditions["time_window"]
            if current_hour < time_window.get(
                "start", 0
            ) or current_hour > time_window.get("end", 23):
                return False

        return True

    def should_suppress_alert(
        self, alert_data: Dict[str, Any], source: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if an alert should be suppressed.

        Args:
            alert_data: Raw alert data
            source: Source system

        Returns:
            Tuple of (should_suppress, reason)
        """
        content = (
            f"{alert_data.get('title', '')} {alert_data.get('message', '')}".lower()
        )

        for rule in self.suppression_rules:
            if not rule.active:
                continue

            # Check time window
            if rule.start_time and rule.end_time:
                current_time = datetime.now()
                if not (rule.start_time <= current_time <= rule.end_time):
                    continue

            # Check pattern match
            if re.search(rule.pattern, content, re.IGNORECASE):
                # Check additional conditions
                if self._matches_suppression_conditions(alert_data, source, rule):
                    return True, f"Suppressed by rule: {rule.name}"

        return False, None

    def _matches_suppression_conditions(
        self, alert_data: Dict[str, Any], source: str, rule: SuppressionRule
    ) -> bool:
        """Check if alert matches suppression rule conditions."""
        if not rule.conditions:
            return True

        if "source" in rule.conditions:
            if source.lower() not in [s.lower() for s in rule.conditions["source"]]:
                return False

        if "environment" in rule.conditions:
            env = alert_data.get("environment", "").lower()
            if env not in rule.conditions["environment"]:
                return False

        return True

    def get_notification_priority(self, alert: Alert) -> NotificationPriority:
        """
        Get notification priority for an alert.

        Args:
            alert: Alert object

        Returns:
            Notification priority level
        """
        # Get applicable notification rules
        rules = self.determine_notification_routing(alert)

        if not rules:
            return NotificationPriority.NORMAL

        # Return highest priority from applicable rules
        priority_order = {
            NotificationPriority.IMMEDIATE: 4,
            NotificationPriority.HIGH: 3,
            NotificationPriority.NORMAL: 2,
            NotificationPriority.LOW: 1,
            NotificationPriority.SUPPRESSED: 0,
        }

        highest_priority = max(rules, key=lambda r: priority_order[r.priority])
        return highest_priority.priority

    def create_slack_notification_data(
        self, alert: Alert, notification_rules: List[NotificationRule]
    ) -> SlackNotificationData:
        """
        Create Slack notification data based on alert and rules.

        Args:
            alert: Alert object
            notification_rules: Applicable notification rules

        Returns:
            Slack notification configuration
        """
        # Determine if actions should be included
        include_actions = alert.severity in [AlertSeverity.HIGH, AlertSeverity.CRITICAL]

        # Create custom message for high-priority alerts
        custom_message = None
        if alert.severity == AlertSeverity.CRITICAL:
            custom_message = f"🚨 CRITICAL ALERT: {alert.title}"
        elif alert.category == AlertCategory.SECURITY.value:
            custom_message = f"🔒 SECURITY ALERT: {alert.title}"

        return SlackNotificationData(
            include_actions=include_actions,
            custom_message=custom_message,
            thread_reply=False,
            mention_on_call=alert.severity == AlertSeverity.CRITICAL,
        )

    def add_category_rule(self, rule: CategoryRule) -> None:
        """Add a new categorization rule."""
        self.category_rules.append(rule)
        logger.info(f"Added categorization rule: {rule.name}")

    def add_notification_rule(self, rule: NotificationRule) -> None:
        """Add a new notification rule."""
        self.notification_rules.append(rule)
        logger.info(f"Added notification rule: {rule.name}")

    def add_suppression_rule(self, rule: SuppressionRule) -> None:
        """Add a new suppression rule."""
        self.suppression_rules.append(rule)
        logger.info(f"Added suppression rule: {rule.name}")


# Global service instance
alert_categorization_service = AlertCategorizationService()
