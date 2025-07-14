"""
Audit log schemas for API requests and responses.
"""

from datetime import datetime
from typing import Dict, Any, Optional, List, Union
from pydantic import BaseModel, Field, validator
from enum import Enum

from app.models.audit_log import AuditLogLevel, AuditEventType


class AuditLogFilter(BaseModel):
    """Filter parameters for audit log queries."""
    
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    event_types: Optional[List[str]] = None
    event_categories: Optional[List[str]] = None
    levels: Optional[List[str]] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    organization_id: Optional[str] = None
    team_id: Optional[str] = None
    success: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search: Optional[str] = None
    sort_by: Optional[str] = Field(default="timestamp", description="Field to sort by")
    sort_order: Optional[str] = Field(default="desc", description="Sort order (asc/desc)")
    
    @validator('sort_order')
    def validate_sort_order(cls, v):
        if v not in ['asc', 'desc']:
            raise ValueError('Sort order must be "asc" or "desc"')
        return v


class AuditLogCreate(BaseModel):
    """Schema for creating audit log entries."""
    
    event_type: str
    message: str
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    session_id: Optional[str] = None
    sso_provider: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    resource_name: Optional[str] = None
    organization_id: Optional[str] = None
    team_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    success: bool = True
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    duration_ms: Optional[int] = None
    level: str = AuditLogLevel.INFO
    compliance_tags: Optional[List[str]] = None
    retention_policy: Optional[str] = None


class AuditLogResponse(BaseModel):
    """Schema for audit log responses."""
    
    id: int
    event_type: str
    event_category: str
    level: str
    message: str
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    session_id: Optional[str] = None
    sso_provider: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    resource_name: Optional[str] = None
    organization_id: Optional[str] = None
    team_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    success: bool
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    duration_ms: Optional[int] = None
    compliance_tags: Optional[List[str]] = None
    retention_policy: Optional[str] = None
    timestamp: datetime
    
    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    """Schema for paginated audit log responses."""
    
    items: List[AuditLogResponse]
    total: int
    page: int = 1
    page_size: int = 50
    pages: int
    has_next: bool = False
    has_prev: bool = False
    
    @validator('has_next', always=True)
    def set_has_next(cls, v, values):
        if 'page' in values and 'pages' in values:
            return values['page'] < values['pages']
        return False
    
    @validator('has_prev', always=True)
    def set_has_prev(cls, v, values):
        if 'page' in values:
            return values['page'] > 1
        return False


class AuditLogStats(BaseModel):
    """Schema for audit log statistics."""
    
    total_events: int
    failed_events: int
    success_rate: float
    events_by_type: Dict[str, int]
    events_by_category: Dict[str, int]
    events_by_level: Dict[str, int]
    top_users: Dict[str, int]
    top_ips: Dict[str, int]
    date_range: Dict[str, str]
    unique_users: int = 0
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class AuditLogExport(BaseModel):
    """Schema for audit log export responses."""
    
    format: str
    data: str
    record_count: int
    generated_at: datetime
    filename: Optional[str] = None
    
    @validator('filename', always=True)
    def set_filename(cls, v, values):
        if not v and 'format' in values and 'generated_at' in values:
            timestamp = values['generated_at'].strftime('%Y%m%d_%H%M%S')
            return f"audit_logs_{timestamp}.{values['format']}"
        return v


class AuditLogExportRequest(BaseModel):
    """Schema for audit log export requests."""
    
    format: str = Field(default="csv", description="Export format (csv, json, xlsx)")
    include_metadata: bool = Field(default=False, description="Include metadata in export")
    filters: Optional[AuditLogFilter] = None
    
    @validator('format')
    def validate_format(cls, v):
        if v not in ['csv', 'json', 'xlsx']:
            raise ValueError('Format must be one of: csv, json, xlsx')
        return v


class AuditLogQuery(BaseModel):
    """Schema for saved audit log queries."""
    
    query_name: str
    description: Optional[str] = None
    query_sql: str
    shared: bool = False
    category: Optional[str] = None


class AuditLogQueryResponse(BaseModel):
    """Schema for audit log query responses."""
    
    id: int
    query_name: str
    description: Optional[str] = None
    query_sql: str
    created_by: int
    shared: bool
    category: Optional[str] = None
    execution_count: int
    last_executed: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AuditLogAlert(BaseModel):
    """Schema for audit log alerts."""
    
    alert_name: str
    description: Optional[str] = None
    severity: str = Field(default="medium", description="Alert severity (low, medium, high, critical)")
    event_types: Optional[List[str]] = None
    event_pattern: Optional[str] = None
    threshold_count: Optional[int] = None
    threshold_window_minutes: Optional[int] = None
    user_filter: Optional[Dict[str, Any]] = None
    ip_filter: Optional[Dict[str, Any]] = None
    resource_filter: Optional[Dict[str, Any]] = None
    notification_channels: List[str] = Field(description="Notification channels (email, slack, webhook)")
    notification_template: Optional[str] = None
    
    @validator('severity')
    def validate_severity(cls, v):
        if v not in ['low', 'medium', 'high', 'critical']:
            raise ValueError('Severity must be one of: low, medium, high, critical')
        return v
    
    @validator('notification_channels')
    def validate_notification_channels(cls, v):
        valid_channels = ['email', 'slack', 'webhook', 'teams', 'pagerduty']
        for channel in v:
            if channel not in valid_channels:
                raise ValueError(f'Invalid notification channel: {channel}')
        return v


class AuditLogAlertResponse(BaseModel):
    """Schema for audit log alert responses."""
    
    id: int
    alert_name: str
    description: Optional[str] = None
    severity: str
    event_types: Optional[List[str]] = None
    event_pattern: Optional[str] = None
    threshold_count: Optional[int] = None
    threshold_window_minutes: Optional[int] = None
    user_filter: Optional[Dict[str, Any]] = None
    ip_filter: Optional[Dict[str, Any]] = None
    resource_filter: Optional[Dict[str, Any]] = None
    notification_channels: List[str]
    notification_template: Optional[str] = None
    is_active: bool
    last_triggered: Optional[datetime] = None
    trigger_count: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AuditLogRetentionPolicy(BaseModel):
    """Schema for audit log retention policies."""
    
    policy_name: str
    description: Optional[str] = None
    event_types: List[str]
    event_categories: Optional[List[str]] = None
    levels: Optional[List[str]] = None
    retention_days: int = Field(default=2555, description="Retention period in days (default: 7 years)")
    archive_after_days: Optional[int] = None
    compression_enabled: bool = True
    compliance_framework: Optional[str] = None
    immutable: bool = False
    encryption_required: bool = True
    
    @validator('retention_days')
    def validate_retention_days(cls, v):
        if v < 1:
            raise ValueError('Retention days must be at least 1')
        return v
    
    @validator('archive_after_days')
    def validate_archive_after_days(cls, v, values):
        if v is not None and 'retention_days' in values:
            if v >= values['retention_days']:
                raise ValueError('Archive after days must be less than retention days')
        return v


class AuditLogRetentionPolicyResponse(BaseModel):
    """Schema for audit log retention policy responses."""
    
    id: int
    policy_name: str
    description: Optional[str] = None
    event_types: List[str]
    event_categories: Optional[List[str]] = None
    levels: Optional[List[str]] = None
    retention_days: int
    archive_after_days: Optional[int] = None
    compression_enabled: bool
    compliance_framework: Optional[str] = None
    immutable: bool
    encryption_required: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AuditLogArchive(BaseModel):
    """Schema for audit log archive information."""
    
    archive_name: str
    archive_path: str
    compression_type: str = "gzip"
    start_date: datetime
    end_date: datetime
    record_count: int
    file_size_bytes: int
    event_types: Optional[List[str]] = None
    checksum: str
    encryption_key_id: Optional[str] = None


class AuditLogArchiveResponse(BaseModel):
    """Schema for audit log archive responses."""
    
    id: int
    archive_name: str
    archive_path: str
    compression_type: str
    start_date: datetime
    end_date: datetime
    record_count: int
    file_size_bytes: int
    event_types: Optional[List[str]] = None
    checksum: str
    encryption_key_id: Optional[str] = None
    created_at: datetime
    archived_by: Optional[int] = None
    
    class Config:
        from_attributes = True


class AuditLogEventTypeInfo(BaseModel):
    """Schema for audit log event type information."""
    
    event_type: str
    category: str
    description: str
    severity: str
    sample_message: str


class AuditLogEventTypesResponse(BaseModel):
    """Schema for audit log event types response."""
    
    event_types: List[AuditLogEventTypeInfo]
    categories: List[str]
    levels: List[str]


class AuditLogDashboardData(BaseModel):
    """Schema for audit log dashboard data."""
    
    recent_events: List[AuditLogResponse]
    stats: AuditLogStats
    alerts: List[AuditLogAlertResponse]
    top_events: List[Dict[str, Any]]
    security_events: List[AuditLogResponse]
    failed_events: List[AuditLogResponse]


class AuditLogSearchRequest(BaseModel):
    """Schema for audit log search requests."""
    
    query: str
    filters: Optional[AuditLogFilter] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=1000)
    highlight: bool = Field(default=True, description="Highlight search terms in results")


class AuditLogSearchResponse(BaseModel):
    """Schema for audit log search responses."""
    
    results: List[AuditLogResponse]
    total: int
    page: int
    page_size: int
    pages: int
    query: str
    search_time_ms: int
    suggestions: Optional[List[str]] = None


class AuditLogBulkAction(BaseModel):
    """Schema for bulk actions on audit logs."""
    
    action: str = Field(description="Action to perform (archive, delete, export)")
    filters: AuditLogFilter
    confirm: bool = Field(default=False, description="Confirmation for destructive actions")
    
    @validator('action')
    def validate_action(cls, v):
        if v not in ['archive', 'delete', 'export']:
            raise ValueError('Action must be one of: archive, delete, export')
        return v


class AuditLogBulkActionResponse(BaseModel):
    """Schema for bulk action responses."""
    
    action: str
    affected_count: int
    success: bool
    message: str
    task_id: Optional[str] = None  # For async operations
    errors: Optional[List[str]] = None