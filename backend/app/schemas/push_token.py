"""
Pydantic schemas for push notification tokens.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator


class PushTokenBase(BaseModel):
    """Base schema for push token data."""
    platform: str = Field(..., description="Device platform (ios or android)")
    device_id: Optional[str] = Field(None, description="Unique device identifier")
    app_version: Optional[str] = Field(None, description="Application version")

    @validator("platform")
    def validate_platform(cls, v):
        if v not in ["ios", "android"]:
            raise ValueError("Platform must be 'ios' or 'android'")
        return v


class PushTokenCreate(PushTokenBase):
    """Schema for creating a new push token."""
    token: str = Field(..., description="Push notification token from the device")

    @validator("token")
    def validate_token(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError("Token cannot be empty")
        if len(v) > 4096:  # FCM tokens can be quite long
            raise ValueError("Token is too long")
        return v.strip()


class PushTokenUpdate(BaseModel):
    """Schema for updating push token data."""
    device_id: Optional[str] = None
    app_version: Optional[str] = None
    is_active: Optional[bool] = None


class PushTokenResponse(PushTokenBase):
    """Schema for push token API responses."""
    id: int
    user_id: int
    token: str = Field(..., description="Truncated token for security")
    is_active: bool
    last_used: Optional[datetime]
    success_count: int
    failure_count: int
    created_at: datetime
    updated_at: datetime

    @validator("token")
    def truncate_token(cls, v):
        """Truncate token for security in API responses."""
        if len(v) > 20:
            return f"{v[:10]}...{v[-10:]}"
        return v

    @property
    def success_rate(self) -> float:
        """Calculate success rate."""
        total = self.success_count + self.failure_count
        return self.success_count / total if total > 0 else 1.0

    @property
    def is_healthy(self) -> bool:
        """Check if token is healthy."""
        return self.is_active and self.failure_count < 5 and self.success_rate >= 0.5

    class Config:
        from_attributes = True


class PushTokenList(BaseModel):
    """Schema for list of push tokens."""
    tokens: List[PushTokenResponse]
    total: int


class TestNotificationRequest(BaseModel):
    """Schema for test notification requests."""
    title: Optional[str] = Field(None, description="Custom notification title")
    message: Optional[str] = Field(None, description="Custom notification message")
    test_id: Optional[str] = Field(None, description="Test identifier for tracking")


class TestNotificationResponse(BaseModel):
    """Schema for test notification responses."""
    success: bool
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)


class PushNotificationSend(BaseModel):
    """Schema for sending push notifications."""
    title: str = Field(..., min_length=1, max_length=100)
    body: str = Field(..., min_length=1, max_length=500)
    data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    sound: str = Field(default="default")
    badge: Optional[int] = Field(None, ge=0)
    category: Optional[str] = None
    priority: str = Field(default="normal")
    ttl: int = Field(default=86400, ge=1, le=604800)  # 1 second to 1 week
    collapse_key: Optional[str] = None

    @validator("priority")
    def validate_priority(cls, v):
        if v not in ["low", "normal", "high"]:
            raise ValueError("Priority must be 'low', 'normal', or 'high'")
        return v


class NotificationStats(BaseModel):
    """Schema for notification statistics."""
    total_sent: int = 0
    total_delivered: int = 0
    total_failed: int = 0
    delivery_rate: float = 0.0
    platforms: Dict[str, int] = Field(default_factory=dict)
    categories: Dict[str, int] = Field(default_factory=dict)
    last_24h_sent: int = 0
    last_7d_sent: int = 0


class BulkNotificationRequest(BaseModel):
    """Schema for sending notifications to multiple users."""
    user_ids: List[int] = Field(..., min_items=1, max_items=1000)
    notification: PushNotificationSend
    bypass_preferences: bool = Field(default=False)


class BulkNotificationResponse(BaseModel):
    """Schema for bulk notification responses."""
    total_users: int
    notifications_sent: int
    notifications_failed: int
    success_rate: float
    details: List[Dict[str, Any]] = Field(default_factory=list)


class NotificationPreferences(BaseModel):
    """Schema for user notification preferences."""
    push_enabled: bool = True
    email_enabled: bool = True
    quiet_hours_start: Optional[str] = Field(None, pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    quiet_hours_end: Optional[str] = Field(None, pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    timezone: str = Field(default="UTC")
    categories: Dict[str, bool] = Field(default_factory=lambda: {
        "alerts": True,
        "deployments": True,
        "team_updates": True,
        "security": True,
        "maintenance": False
    })


class NotificationHistory(BaseModel):
    """Schema for notification history."""
    id: str
    title: str
    body: str
    category: Optional[str]
    sent_at: datetime
    delivered_at: Optional[datetime]
    opened_at: Optional[datetime]
    status: str  # sent, delivered, opened, failed
    platform: str
    error_message: Optional[str] = None

    class Config:
        from_attributes = True