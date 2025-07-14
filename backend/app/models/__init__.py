"""
Models package initialization.
Exports all database models for easy importing.
"""

from .organization import Organization
from .user import User
from .role import Role, Permission, SystemRole, PermissionType, role_permissions
from .user_role import UserRole
from .team import Team, TeamRole, team_memberships
from .user_team import UserTeam
from .project import Project
from .pipeline import Pipeline, PipelineStatus, PipelineType
from .cluster import Cluster, ClusterStatus
from .automation_run import AutomationRun, AutomationStatus, AutomationType
from .infrastructure_change import (
    InfrastructureChange,
    ChangeStatus,
    ChangeType,
    ResourceType,
)
from .alert import Alert, AlertSeverity, AlertStatus, AlertChannel
from .notification_preference import (
    NotificationPreference,
    NotificationChannel,
    NotificationFrequency,
    NotificationType,
)
from .notification_log import NotificationLog, DeliveryStatus
from .aws_cost import (
    AwsAccount,
    AwsCostData,
    AwsCostAnomaly,
    AwsCostSummary,
    AwsCostForecast,
    AwsCostBudget,
    CostGranularity,
    AnomalyType,
)
from .metrics import Metric, MetricSummary, MetricThreshold, MetricType, MetricSource
from .logs import LogEntry, Event, LogLevel, LogSource, EventType
from .audit import AuditLogLegacy as AuditLog, AuditConfiguration, AuditOperation, AuditSeverity

__all__ = [
    # Core models
    "Organization",
    "User",
    "Role",
    "Permission",
    "Team",
    "UserTeam",
    "Project",
    "Pipeline",
    "Cluster",
    "AutomationRun",
    "InfrastructureChange",
    "Alert",
    # Notification models
    "NotificationPreference",
    "NotificationLog",
    # AWS Cost models
    "AwsAccount",
    "AwsCostData",
    "AwsCostAnomaly",
    "AwsCostSummary",
    "AwsCostForecast",
    "AwsCostBudget",
    # Time-series models
    "Metric",
    "MetricSummary",
    "MetricThreshold",
    "LogEntry",
    "Event",
    # Audit models
    "AuditLog",
    "AuditConfiguration",
    # Enums
    "SystemRole",
    "PermissionType",
    "TeamRole",
    "PipelineStatus",
    "PipelineType",
    "ClusterStatus",
    "AutomationStatus",
    "AutomationType",
    "ChangeStatus",
    "ChangeType",
    "ResourceType",
    "AlertSeverity",
    "AlertStatus",
    "AlertChannel",
    "NotificationChannel",
    "NotificationFrequency",
    "NotificationType",
    "DeliveryStatus",
    "CostGranularity",
    "AnomalyType",
    "MetricType",
    "MetricSource",
    "LogLevel",
    "LogSource",
    "EventType",
    "AuditOperation",
    "AuditSeverity",
    # Association tables
    "team_memberships",
    "role_permissions",
]
