"""
Pydantic schemas for notification-related API endpoints.
Defines request and response models for notification preferences, history, and digests.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, time

from pydantic import BaseModel, Field, validator
from app.models.notification_preference import (
    NotificationChannel,
    NotificationFrequency,
    NotificationType,
)
from app.models.notification_log import DeliveryStatus


class NotificationPreferenceBase(BaseModel):
    """Base schema for notification preferences."""

    notification_type: NotificationType = Field(..., description="Type of notification")
    channel: NotificationChannel = Field(..., description="Notification channel")
    frequency: NotificationFrequency = Field(..., description="Notification frequency")
    enabled: bool = Field(True, description="Whether this preference is enabled")
    team_id: Optional[int] = Field(None, description="Team-specific preference")
    project_id: Optional[int] = Field(None, description="Project-specific preference")
    min_severity: Optional[str] = Field(
        None, description="Minimum alert severity for notifications"
    )
    quiet_hours_start: Optional[time] = Field(None, description="Start of quiet hours")
    quiet_hours_end: Optional[time] = Field(None, description="End of quiet hours")
    timezone: Optional[str] = Field("UTC", description="User timezone for quiet hours")


class NotificationPreferenceCreate(NotificationPreferenceBase):
    """Schema for creating a new notification preference."""

    @validator("timezone")
    def validate_timezone(cls, v):
        """Validate timezone string."""
        if v is not None:
            import pytz

            try:
                pytz.timezone(v)
            except pytz.UnknownTimeZoneError:
                raise ValueError(f"Invalid timezone: {v}")
        return v


class NotificationPreferenceUpdate(BaseModel):
    """Schema for updating a notification preference."""

    frequency: Optional[NotificationFrequency] = None
    enabled: Optional[bool] = None
    min_severity: Optional[str] = None
    quiet_hours_start: Optional[time] = None
    quiet_hours_end: Optional[time] = None
    timezone: Optional[str] = None

    @validator("timezone")
    def validate_timezone(cls, v):
        """Validate timezone string."""
        if v is not None:
            import pytz

            try:
                pytz.timezone(v)
            except pytz.UnknownTimeZoneError:
                raise ValueError(f"Invalid timezone: {v}")
        return v


class NotificationPreferenceResponse(NotificationPreferenceBase):
    """Schema for notification preference API responses."""

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationLogBase(BaseModel):
    """Base schema for notification logs."""

    notification_id: str
    digest_id: Optional[str] = None
    channel: str
    recipient_address: str
    notification_type: str
    subject: Optional[str] = None
    content: str
    template_name: Optional[str] = None
    source_type: Optional[str] = None
    source_id: Optional[int] = None
    team_id: Optional[int] = None
    project_id: Optional[int] = None
    status: DeliveryStatus
    delivery_attempts: int
    error_message: Optional[str] = None
    provider_message_id: Optional[str] = None
    priority: Optional[str] = None
    deduplication_key: Optional[str] = None


class NotificationLogResponse(NotificationLogBase):
    """Schema for notification log API responses."""

    id: int
    user_id: int
    last_delivery_attempt: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class NotificationStatsResponse(BaseModel):
    """Schema for notification statistics response."""

    total_notifications: int = Field(..., description="Total notifications in period")
    sent_notifications: int = Field(..., description="Successfully sent notifications")
    failed_notifications: int = Field(..., description="Failed notifications")
    pending_notifications: int = Field(..., description="Pending notifications")
    channel_stats: Dict[str, int] = Field(..., description="Notifications by channel")
    type_stats: Dict[str, int] = Field(..., description="Notifications by type")
    period_days: int = Field(..., description="Period in days for statistics")


class DigestRequest(BaseModel):
    """Schema for digest generation requests."""

    digest_type: str = Field(
        ..., description="Type of digest: daily, weekly, monthly, custom"
    )
    start_date: Optional[datetime] = Field(
        None, description="Start date for custom digest"
    )
    end_date: Optional[datetime] = Field(None, description="End date for digest")
    team_id: Optional[int] = Field(None, description="Filter digest by team")
    include_low_severity: bool = Field(True, description="Include low severity alerts")

    @validator("digest_type")
    def validate_digest_type(cls, v):
        """Validate digest type."""
        valid_types = ["daily", "weekly", "monthly", "custom"]
        if v not in valid_types:
            raise ValueError(f"Invalid digest type. Must be one of: {valid_types}")
        return v

    @validator("start_date")
    def validate_start_date(cls, v, values):
        """Validate start date for custom digests."""
        if values.get("digest_type") == "custom" and v is None:
            raise ValueError("start_date is required for custom digest type")
        return v


class DigestResponse(BaseModel):
    """Schema for digest generation responses."""

    digest_type: str
    start_date: datetime
    end_date: datetime
    user_id: int
    data: Dict[str, Any]
    generated_at: datetime


class NotificationPreferenceMatrix(BaseModel):
    """Schema for notification preference matrix view."""

    notification_types: List[str]
    channels: List[str]
    preferences: Dict[str, Dict[str, bool]]  # type -> channel -> enabled


class BulkNotificationPreferenceUpdate(BaseModel):
    """Schema for bulk updating notification preferences."""

    updates: List[Dict[str, Any]] = Field(..., description="List of preference updates")
    apply_to_team: Optional[int] = Field(None, description="Apply to specific team")
    apply_to_project: Optional[int] = Field(
        None, description="Apply to specific project"
    )


class NotificationChannelTest(BaseModel):
    """Schema for testing notification channels."""

    channel: NotificationChannel
    test_message: Optional[str] = Field(
        "Test notification from OpsSight", description="Custom test message"
    )


class NotificationChannelTestResult(BaseModel):
    """Schema for notification channel test results."""

    channel: str
    status: str  # success, error
    message: Optional[str] = None
    error: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class QuietHoursSettings(BaseModel):
    """Schema for quiet hours settings."""

    enabled: bool = Field(False, description="Enable quiet hours")
    start_time: Optional[time] = Field(None, description="Quiet hours start time")
    end_time: Optional[time] = Field(None, description="Quiet hours end time")
    timezone: str = Field("UTC", description="Timezone for quiet hours")

    @validator("timezone")
    def validate_timezone(cls, v):
        """Validate timezone string."""
        import pytz

        try:
            pytz.timezone(v)
        except pytz.UnknownTimeZoneError:
            raise ValueError(f"Invalid timezone: {v}")
        return v

    @validator("start_time", "end_time")
    def validate_times(cls, v, values):
        """Validate quiet hours times."""
        if values.get("enabled") and v is None:
            raise ValueError(
                "Start and end times are required when quiet hours are enabled"
            )
        return v


class NotificationDigestPreview(BaseModel):
    """Schema for digest preview without sending."""

    digest_type: str
    date_range: str
    total_alerts: int
    critical_alerts: int
    high_alerts: int
    recent_alerts: List[Dict[str, Any]]
    pipeline_activity: List[Dict[str, Any]]
    estimated_length: str  # short, medium, long


class UserNotificationSettings(BaseModel):
    """Schema for comprehensive user notification settings."""

    preferences: List[NotificationPreferenceResponse]
    quiet_hours: QuietHoursSettings
    digest_subscriptions: List[str]
    last_notification: Optional[datetime] = None
    notification_count_today: int = 0


class NotificationTemplate(BaseModel):
    """Schema for notification templates."""

    name: str
    description: str
    channel: NotificationChannel
    subject_template: str
    body_template: str
    variables: List[str]


class NotificationRule(BaseModel):
    """Schema for notification rules and conditions."""

    id: Optional[int] = None
    name: str
    description: str
    conditions: Dict[str, Any]  # JSON conditions
    notification_type: NotificationType
    channel: NotificationChannel
    enabled: bool = True
    priority: int = 0  # Higher number = higher priority


class EscalationRule(BaseModel):
    """Schema for notification escalation rules."""

    id: Optional[int] = None
    name: str
    trigger_conditions: Dict[str, Any]
    escalation_steps: List[Dict[str, Any]]
    timeout_minutes: int = 30
    enabled: bool = True


class NotificationAnalytics(BaseModel):
    """Schema for notification analytics and insights."""

    period_start: datetime
    period_end: datetime
    total_sent: int
    delivery_rate: float
    channel_performance: Dict[str, Dict[str, Any]]
    user_engagement: Dict[str, Any]
    top_notification_types: List[Dict[str, Any]]
    peak_hours: List[int]  # Hours of day with most notifications
