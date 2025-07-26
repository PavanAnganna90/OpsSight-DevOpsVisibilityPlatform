"""
Webhook configuration model for storing webhook integration settings.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    JSON,
    ForeignKey,
    Index
)
from sqlalchemy.orm import relationship

from app.db.database import Base


class WebhookConfig(Base):
    """Model for storing webhook configuration and settings."""
    
    __tablename__ = "webhook_configs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    
    # Webhook identification
    name = Column(String(255), nullable=False)
    source = Column(String(100), nullable=False, index=True)  # slack, prometheus, grafana, etc.
    url_path = Column(String(500), nullable=False)  # The webhook endpoint path
    
    # Authentication and security
    secret = Column(Text, nullable=True)  # Webhook secret for signature validation
    auth_token = Column(Text, nullable=True)  # Optional auth token
    
    # Configuration
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    settings = Column(JSON, nullable=True)  # Source-specific settings
    
    # Alert processing rules
    alert_rules = Column(JSON, nullable=True)  # Rules for parsing and creating alerts
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_received = Column(DateTime, nullable=True)  # Last time webhook was called
    
    # Relationships
    organization = relationship("Organization", back_populates="webhook_configs")
    
    # Indexes for efficient queries
    __table_args__ = (
        Index("idx_webhook_configs_org_source", "organization_id", "source"),
        Index("idx_webhook_configs_active", "is_active"),
        Index("idx_webhook_configs_last_received", "last_received"),
    )

    def __repr__(self):
        return f"<WebhookConfig(id={self.id}, name='{self.name}', source='{self.source}', active={self.is_active})>"

    def to_dict(self, include_secrets: bool = False) -> Dict[str, Any]:
        """Convert webhook config to dictionary representation."""
        data = {
            "id": self.id,
            "organization_id": self.organization_id,
            "name": self.name,
            "source": self.source,
            "url_path": self.url_path,
            "is_active": self.is_active,
            "settings": self.settings or {},
            "alert_rules": self.alert_rules or {},
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "last_received": self.last_received.isoformat() if self.last_received else None,
        }
        
        if include_secrets:
            data.update({
                "secret": self.secret,
                "auth_token": self.auth_token,
            })
        else:
            data.update({
                "has_secret": bool(self.secret),
                "has_auth_token": bool(self.auth_token),
            })
        
        return data

    def update_last_received(self) -> None:
        """Update the last received timestamp."""
        self.last_received = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def get_setting(self, key: str, default: Any = None) -> Any:
        """Get a specific setting value."""
        if not self.settings:
            return default
        return self.settings.get(key, default)

    def set_setting(self, key: str, value: Any) -> None:
        """Set a specific setting value."""
        if not self.settings:
            self.settings = {}
        self.settings[key] = value
        self.updated_at = datetime.utcnow()

    def get_alert_rule(self, rule_name: str, default: Any = None) -> Any:
        """Get a specific alert rule."""
        if not self.alert_rules:
            return default
        return self.alert_rules.get(rule_name, default)

    def set_alert_rule(self, rule_name: str, rule_value: Any) -> None:
        """Set a specific alert rule."""
        if not self.alert_rules:
            self.alert_rules = {}
        self.alert_rules[rule_name] = rule_value
        self.updated_at = datetime.utcnow()

    @property
    def webhook_url(self) -> str:
        """Get the full webhook URL."""
        from app.core.config import settings
        base_url = settings.BASE_URL.rstrip('/')
        return f"{base_url}/api/v1/webhooks/{self.url_path.lstrip('/')}"

    @property
    def is_healthy(self) -> bool:
        """Check if the webhook is healthy (recently received data)."""
        if not self.last_received:
            return True  # New webhook, consider healthy
        
        # Consider unhealthy if no data received in last 24 hours for active monitoring
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(hours=24)
        return self.last_received > cutoff

    def activate(self) -> None:
        """Activate the webhook configuration."""
        self.is_active = True
        self.updated_at = datetime.utcnow()

    def deactivate(self) -> None:
        """Deactivate the webhook configuration."""
        self.is_active = False
        self.updated_at = datetime.utcnow()


class WebhookEvent(Base):
    """Model for logging webhook events and requests."""
    
    __tablename__ = "webhook_events"

    id = Column(Integer, primary_key=True, index=True)
    webhook_config_id = Column(Integer, ForeignKey("webhook_configs.id"), nullable=False, index=True)
    
    # Event details
    event_id = Column(String(255), nullable=True, index=True)  # External event ID if available
    event_type = Column(String(100), nullable=True)
    
    # Request information
    method = Column(String(10), nullable=False)
    headers = Column(JSON, nullable=True)
    payload = Column(JSON, nullable=True)
    payload_size = Column(Integer, nullable=True)
    
    # Processing results
    processed = Column(Boolean, default=False, nullable=False, index=True)
    processing_status = Column(String(50), nullable=True)  # success, failed, skipped
    alert_created_id = Column(Integer, ForeignKey("alerts.id"), nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    received_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    processed_at = Column(DateTime, nullable=True)
    
    # Relationships
    webhook_config = relationship("WebhookConfig")
    alert_created = relationship("Alert")
    
    # Indexes
    __table_args__ = (
        Index("idx_webhook_events_config_received", "webhook_config_id", "received_at"),
        Index("idx_webhook_events_processed", "processed"),
        Index("idx_webhook_events_status", "processing_status"),
    )

    def __repr__(self):
        return f"<WebhookEvent(id={self.id}, config_id={self.webhook_config_id}, processed={self.processed})>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert webhook event to dictionary representation."""
        return {
            "id": self.id,
            "webhook_config_id": self.webhook_config_id,
            "event_id": self.event_id,
            "event_type": self.event_type,
            "method": self.method,
            "payload_size": self.payload_size,
            "processed": self.processed,
            "processing_status": self.processing_status,
            "alert_created_id": self.alert_created_id,
            "error_message": self.error_message,
            "received_at": self.received_at.isoformat(),
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
        }

    def mark_processed(self, status: str, alert_id: Optional[int] = None, error: Optional[str] = None) -> None:
        """Mark the event as processed."""
        self.processed = True
        self.processing_status = status
        self.alert_created_id = alert_id
        self.error_message = error
        self.processed_at = datetime.utcnow()

    def mark_failed(self, error_message: str) -> None:
        """Mark the event as failed."""
        self.mark_processed("failed", error=error_message)

    def mark_success(self, alert_id: Optional[int] = None) -> None:
        """Mark the event as successfully processed."""
        self.mark_processed("success", alert_id=alert_id)

    def mark_skipped(self, reason: str) -> None:
        """Mark the event as skipped."""
        self.mark_processed("skipped", error=reason)