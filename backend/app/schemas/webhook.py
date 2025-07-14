"""
Pydantic schemas for webhook operations.
"""

from datetime import datetime
from typing import Dict, Any, Optional, List
from enum import Enum
from pydantic import BaseModel, Field, validator


class WebhookAlertPayload(BaseModel):
    """Schema for generic webhook alert payload."""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    severity: str = Field(default="medium")
    source: Optional[str] = None
    tags: Optional[Dict[str, Any]] = Field(default_factory=dict)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    external_id: Optional[str] = None
    url: Optional[str] = None
    resolved: bool = Field(default=False)

    @validator("severity")
    def validate_severity(cls, v):
        valid_severities = ["low", "medium", "high", "critical"]
        if v.lower() not in valid_severities:
            raise ValueError(f"Severity must be one of: {', '.join(valid_severities)}")
        return v.lower()


class SlackEventPayload(BaseModel):
    """Schema for Slack event payload."""
    type: str
    event: Optional[Dict[str, Any]] = None
    challenge: Optional[str] = None
    team_id: Optional[str] = None
    api_app_id: Optional[str] = None
    event_id: Optional[str] = None
    event_time: Optional[int] = None


class GenericWebhookPayload(BaseModel):
    """Schema for generic webhook payload."""
    data: Dict[str, Any]
    source: Optional[str] = None
    timestamp: Optional[datetime] = None
    event_type: Optional[str] = None


class WebhookResponse(BaseModel):
    """Schema for webhook response."""
    success: bool
    message: str
    alert_id: Optional[int] = None
    event_id: Optional[str] = None
    processing_time: Optional[float] = None


class WebhookConfigBase(BaseModel):
    """Base schema for webhook configuration."""
    name: str = Field(..., min_length=1, max_length=255)
    source: str = Field(..., min_length=1, max_length=100)
    url_path: str = Field(..., min_length=1, max_length=500)
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict)
    alert_rules: Optional[Dict[str, Any]] = Field(default_factory=dict)

    @validator("source")
    def validate_source(cls, v):
        valid_sources = ["slack", "prometheus", "grafana", "pagerduty", "generic"]
        if v.lower() not in valid_sources:
            raise ValueError(f"Source must be one of: {', '.join(valid_sources)}")
        return v.lower()

    @validator("url_path")
    def validate_url_path(cls, v):
        if not v.startswith('/'):
            raise ValueError("URL path must start with '/'")
        return v


class WebhookConfigCreate(WebhookConfigBase):
    """Schema for creating webhook configuration."""
    secret: Optional[str] = None
    auth_token: Optional[str] = None
    is_active: bool = Field(default=True)


class WebhookConfigUpdate(BaseModel):
    """Schema for updating webhook configuration."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    url_path: Optional[str] = Field(None, min_length=1, max_length=500)
    secret: Optional[str] = None
    auth_token: Optional[str] = None
    is_active: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None
    alert_rules: Optional[Dict[str, Any]] = None

    @validator("url_path")
    def validate_url_path(cls, v):
        if v is not None and not v.startswith('/'):
            raise ValueError("URL path must start with '/'")
        return v


class WebhookConfigResponse(WebhookConfigBase):
    """Schema for webhook configuration response."""
    id: int
    organization_id: int
    is_active: bool
    has_secret: bool
    has_auth_token: bool
    webhook_url: str
    created_at: datetime
    updated_at: datetime
    last_received: Optional[datetime] = None

    class Config:
        from_attributes = True


class WebhookConfigWithSecrets(WebhookConfigResponse):
    """Schema for webhook configuration with secrets (admin only)."""
    secret: Optional[str] = None
    auth_token: Optional[str] = None


class WebhookEventBase(BaseModel):
    """Base schema for webhook events."""
    event_id: Optional[str] = None
    event_type: Optional[str] = None
    method: str
    payload_size: Optional[int] = None
    processing_status: Optional[str] = None
    error_message: Optional[str] = None


class WebhookEventCreate(WebhookEventBase):
    """Schema for creating webhook event."""
    webhook_config_id: int
    headers: Optional[Dict[str, Any]] = None
    payload: Optional[Dict[str, Any]] = None


class WebhookEventResponse(WebhookEventBase):
    """Schema for webhook event response."""
    id: int
    webhook_config_id: int
    processed: bool
    alert_created_id: Optional[int] = None
    received_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WebhookStatistics(BaseModel):
    """Schema for webhook statistics."""
    total_webhooks: int = 0
    active_webhooks: int = 0
    total_events: int = 0
    events_last_24h: int = 0
    events_last_7d: int = 0
    successful_events: int = 0
    failed_events: int = 0
    success_rate: float = 0.0
    alerts_created: int = 0
    sources: Dict[str, int] = Field(default_factory=dict)
    recent_events: List[WebhookEventResponse] = Field(default_factory=list)


class WebhookTestRequest(BaseModel):
    """Schema for testing webhook configuration."""
    webhook_config_id: int
    test_payload: Dict[str, Any]
    validate_only: bool = Field(default=False)


class WebhookTestResponse(BaseModel):
    """Schema for webhook test response."""
    success: bool
    message: str
    validation_result: Optional[Dict[str, Any]] = None
    alert_created: Optional[bool] = None
    processing_time: Optional[float] = None
    errors: List[str] = Field(default_factory=list)


class SlackChannelConfig(BaseModel):
    """Schema for Slack channel configuration."""
    channel_id: str
    channel_name: str
    alert_keywords: List[str] = Field(default_factory=list)
    severity_mapping: Dict[str, str] = Field(default_factory=dict)
    ignore_bots: bool = Field(default=True)
    monitor_threads: bool = Field(default=False)


class PrometheusConfig(BaseModel):
    """Schema for Prometheus-specific configuration."""
    severity_label: str = Field(default="severity")
    instance_label: str = Field(default="instance")
    job_label: str = Field(default="job")
    ignore_resolved: bool = Field(default=False)
    alert_name_field: str = Field(default="alertname")


class GrafanaConfig(BaseModel):
    """Schema for Grafana-specific configuration."""
    dashboard_url_pattern: Optional[str] = None
    panel_url_pattern: Optional[str] = None
    severity_mapping: Dict[str, str] = Field(default_factory=dict)
    ignore_test_alerts: bool = Field(default=True)


class PagerDutyConfig(BaseModel):
    """Schema for PagerDuty-specific configuration."""
    service_mapping: Dict[str, str] = Field(default_factory=dict)
    urgency_mapping: Dict[str, str] = Field(default_factory=dict)
    ignore_acknowledged: bool = Field(default=False)
    sync_status: bool = Field(default=True)


class AlertRule(BaseModel):
    """Schema for alert processing rules."""
    field_mapping: Dict[str, str] = Field(default_factory=dict)
    severity_rules: List[Dict[str, Any]] = Field(default_factory=list)
    ignore_conditions: List[Dict[str, Any]] = Field(default_factory=list)
    tag_extraction: Dict[str, str] = Field(default_factory=dict)
    deduplication_fields: List[str] = Field(default_factory=list)


class WebhookBulkOperation(BaseModel):
    """Schema for bulk webhook operations."""
    webhook_ids: List[int] = Field(..., min_items=1, max_items=100)
    operation: str = Field(..., pattern="^(activate|deactivate|delete|test)$")
    test_payload: Optional[Dict[str, Any]] = None


# Enhanced schemas for external webhook and Slack integrations
class AlertType(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class HttpMethod(str, Enum):
    POST = "POST"
    PUT = "PUT"
    PATCH = "PATCH"


class AuthType(str, Enum):
    NONE = "none"
    BEARER = "bearer"
    BASIC = "basic"
    API_KEY = "api_key"


# External Webhook Endpoint Schemas
class ExternalRetryConfig(BaseModel):
    enabled: bool = True
    max_retries: int = 3
    retry_delay: int = 1000  # milliseconds


class ExternalAuthConfig(BaseModel):
    type: AuthType = AuthType.NONE
    token: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    api_key: Optional[str] = None
    api_key_header: Optional[str] = "X-API-Key"


class ExternalWebhookBase(BaseModel):
    name: str
    url: str
    method: HttpMethod = HttpMethod.POST
    headers: Optional[Dict[str, str]] = {}
    enabled: bool = True
    alert_types: List[str] = ["error", "warning"]
    threshold: str = "medium"
    retry_config: Optional[ExternalRetryConfig] = None
    auth_config: Optional[ExternalAuthConfig] = None


class ExternalWebhookCreate(ExternalWebhookBase):
    pass


class ExternalWebhookUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    method: Optional[HttpMethod] = None
    headers: Optional[Dict[str, str]] = None
    enabled: Optional[bool] = None
    alert_types: Optional[List[str]] = None
    threshold: Optional[str] = None
    retry_config: Optional[ExternalRetryConfig] = None
    auth_config: Optional[ExternalAuthConfig] = None


class ExternalWebhookResponse(ExternalWebhookBase):
    id: str
    user_id: str
    created_at: str
    updated_at: Optional[str] = None
    last_used_at: Optional[str] = None
    success_count: int = 0
    error_count: int = 0

    class Config:
        from_attributes = True


class ExternalWebhookTestResponse(BaseModel):
    success: bool
    duration: float
    response: Dict[str, Any]
    timestamp: str


# Slack Integration Schemas
class SlackChannel(BaseModel):
    id: str
    name: str
    is_private: bool = False
    member_count: int = 0
    purpose: Optional[str] = None


class SlackWorkspaceBase(BaseModel):
    team_name: str
    access_token: str


class SlackWorkspaceCreate(SlackWorkspaceBase):
    pass


class SlackWorkspaceResponse(BaseModel):
    id: str
    user_id: str
    team_id: str
    team_name: str
    bot_user_id: Optional[str] = None
    connected: bool = True
    connected_at: str
    channels: List[SlackChannel] = []

    class Config:
        from_attributes = True


class SlackConfigBase(BaseModel):
    workspace_id: str
    channel_id: str
    enabled: bool = True
    alert_types: List[str] = ["error", "warning"]
    threshold: str = "medium"
    mention_users: List[str] = []
    custom_message: Optional[str] = None


class SlackConfigCreate(SlackConfigBase):
    pass


class SlackConfigUpdate(BaseModel):
    channel_id: Optional[str] = None
    enabled: Optional[bool] = None
    alert_types: Optional[List[str]] = None
    threshold: Optional[str] = None
    mention_users: Optional[List[str]] = None
    custom_message: Optional[str] = None


class SlackConfigResponse(SlackConfigBase):
    id: str
    user_id: str
    created_at: str
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


# Alert Notification Schema
class AlertNotification(BaseModel):
    type: str
    severity: str
    message: str
    source: str = "opssight"
    timestamp: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None