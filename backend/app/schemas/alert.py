from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime

from ..models.alert import AlertSeverity, AlertStatus, AlertChannel


class AlertBase(BaseModel):
    """Base alert schema with common fields"""

    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    severity: AlertSeverity
    source: str = Field(..., min_length=1)  # monitoring system, service, etc.
    source_id: Optional[str] = None  # external alert ID
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    auto_resolve: bool = False
    suppress_notifications: bool = False


class AlertCreate(AlertBase):
    """Schema for creating a new alert"""

    project_id: int = Field(..., gt=0)


class AlertUpdate(BaseModel):
    """Schema for updating an alert"""

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    severity: Optional[AlertSeverity] = None
    status: Optional[AlertStatus] = None
    acknowledged_by_user_id: Optional[int] = None
    acknowledged_at: Optional[datetime] = None
    resolved_by_user_id: Optional[int] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    auto_resolve: Optional[bool] = None
    suppress_notifications: Optional[bool] = None


class AlertNotificationBase(BaseModel):
    """Base schema for alert notifications"""

    channel: AlertChannel
    recipient: str  # email, slack channel, webhook URL, etc.
    message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class AlertNotificationCreate(AlertNotificationBase):
    """Schema for creating an alert notification"""

    alert_id: int = Field(..., gt=0)


class AlertNotificationUpdate(BaseModel):
    """Schema for updating an alert notification"""

    status: str  # pending, sent, failed, delivered
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    error_message: Optional[str] = None
    response_data: Optional[Dict[str, Any]] = None


class AlertNotification(AlertNotificationBase):
    """Complete alert notification schema for responses"""

    id: int
    alert_id: int
    status: str = "pending"
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    error_message: Optional[str] = None
    response_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Alert(AlertBase):
    """Complete alert schema for responses"""

    id: int
    project_id: int
    status: AlertStatus

    # Acknowledgment
    acknowledged_by_user_id: Optional[int] = None
    acknowledged_at: Optional[datetime] = None

    # Resolution
    resolved_by_user_id: Optional[int] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None

    # Timing
    first_seen_at: datetime
    last_seen_at: datetime
    occurrence_count: int = 1

    # Timestamps
    created_at: datetime
    updated_at: datetime

    # Related data
    notifications: Optional[List[AlertNotification]] = None

    class Config:
        from_attributes = True


class AlertRule(BaseModel):
    """Schema for alert rule configuration"""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    condition: str = Field(..., min_length=1)  # query or condition expression
    severity: AlertSeverity
    enabled: bool = True
    evaluation_interval: int = Field(default=60, gt=0)  # seconds
    for_duration: int = Field(default=0, ge=0)  # seconds to wait before firing
    labels: Optional[Dict[str, str]] = None
    annotations: Optional[Dict[str, str]] = None
    notification_channels: List[AlertChannel] = []
    notification_recipients: List[str] = []


class AlertRuleCreate(AlertRule):
    """Schema for creating an alert rule"""

    project_id: int = Field(..., gt=0)


class AlertRuleUpdate(BaseModel):
    """Schema for updating an alert rule"""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    condition: Optional[str] = Field(None, min_length=1)
    severity: Optional[AlertSeverity] = None
    enabled: Optional[bool] = None
    evaluation_interval: Optional[int] = Field(None, gt=0)
    for_duration: Optional[int] = Field(None, ge=0)
    labels: Optional[Dict[str, str]] = None
    annotations: Optional[Dict[str, str]] = None
    notification_channels: Optional[List[AlertChannel]] = None
    notification_recipients: Optional[List[str]] = None


class AlertStats(BaseModel):
    """Alert statistics schema"""

    total_alerts: int = Field(..., ge=0)
    active_alerts: int = Field(..., ge=0)
    acknowledged_alerts: int = Field(..., ge=0)
    resolved_alerts: int = Field(..., ge=0)
    suppressed_alerts: int = Field(..., ge=0)
    alerts_by_severity: Dict[str, int] = {}
    alerts_by_source: Dict[str, int] = {}
    average_resolution_time: Optional[float] = None  # minutes
    most_frequent_alerts: List[Dict[str, Any]] = []


class AlertSummary(BaseModel):
    """Alert summary for dashboard"""

    critical_count: int = Field(..., ge=0)
    high_count: int = Field(..., ge=0)
    medium_count: int = Field(..., ge=0)
    low_count: int = Field(..., ge=0)
    info_count: int = Field(..., ge=0)
    unacknowledged_count: int = Field(..., ge=0)
    recent_alerts: List[Alert] = []
    trending_up: List[str] = []  # alert types increasing
    trending_down: List[str] = []  # alert types decreasing


class AlertEscalation(BaseModel):
    """Schema for alert escalation rules"""

    alert_id: int
    escalation_level: int = Field(..., ge=1)
    escalated_at: datetime
    escalated_to: List[str]  # user IDs or groups
    reason: str
    auto_escalated: bool = False


class AlertSuppression(BaseModel):
    """Schema for alert suppression rules"""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    condition: str = Field(..., min_length=1)  # matching condition
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    recurring: bool = False
    recurring_pattern: Optional[str] = None  # cron expression
    enabled: bool = True
    created_by_user_id: int


class SlackNotificationData(BaseModel):
    """Schema for Slack notification data"""

    channel: str
    username: Optional[str] = "OpsSight"
    icon_emoji: Optional[str] = ":warning:"
    attachments: List[Dict[str, Any]] = []
    blocks: List[Dict[str, Any]] = []


class EmailNotificationData(BaseModel):
    """Schema for email notification data"""

    to: List[str]
    cc: Optional[List[str]] = None
    bcc: Optional[List[str]] = None
    subject: str
    html_body: Optional[str] = None
    text_body: Optional[str] = None
    attachments: Optional[List[Dict[str, Any]]] = None


class WebhookNotificationData(BaseModel):
    """Schema for webhook notification data"""

    url: str
    method: str = "POST"
    headers: Optional[Dict[str, str]] = None
    payload: Dict[str, Any]
    timeout: int = Field(default=30, gt=0)
    retry_count: int = Field(default=3, ge=0)
