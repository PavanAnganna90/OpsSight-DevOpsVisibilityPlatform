"""
Push token model for storing mobile device push notification tokens.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    Index,
    ForeignKey
)
from sqlalchemy.orm import relationship

from app.db.models import Base


class PushToken(Base):
    """Model for storing push notification tokens for mobile devices."""
    
    __tablename__ = "push_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(Text, nullable=False, unique=True, index=True)
    platform = Column(String(20), nullable=False)  # 'ios' or 'android'
    device_id = Column(String(255), nullable=True)
    app_version = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    # Usage tracking
    last_used = Column(DateTime, default=datetime.utcnow, nullable=True)
    success_count = Column(Integer, default=0, nullable=False)
    failure_count = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="push_tokens")

    # Indexes for efficient queries
    __table_args__ = (
        Index("idx_push_tokens_user_platform", "user_id", "platform"),
        Index("idx_push_tokens_active", "is_active"),
        Index("idx_push_tokens_last_used", "last_used"),
        Index("idx_push_tokens_failures", "failure_count"),
    )

    def __repr__(self):
        return f"<PushToken(id={self.id}, user_id={self.user_id}, platform={self.platform}, active={self.is_active})>"

    def to_dict(self) -> dict:
        """Convert push token to dictionary representation."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "platform": self.platform,
            "device_id": self.device_id,
            "app_version": self.app_version,
            "is_active": self.is_active,
            "last_used": self.last_used.isoformat() if self.last_used else None,
            "success_count": self.success_count,
            "failure_count": self.failure_count,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    @property
    def success_rate(self) -> float:
        """Calculate success rate for this token."""
        total_attempts = self.success_count + self.failure_count
        if total_attempts == 0:
            return 1.0
        return self.success_count / total_attempts

    @property
    def is_healthy(self) -> bool:
        """Check if the token is healthy (low failure rate)."""
        return self.is_active and self.failure_count < 5 and self.success_rate >= 0.5

    def mark_success(self) -> None:
        """Mark a successful notification delivery."""
        self.success_count += 1
        self.last_used = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def mark_failure(self) -> None:
        """Mark a failed notification delivery."""
        self.failure_count += 1
        self.updated_at = datetime.utcnow()
        
        # Deactivate token if too many failures
        if self.failure_count >= 5:
            self.is_active = False

    def deactivate(self) -> None:
        """Deactivate the push token."""
        self.is_active = False
        self.updated_at = datetime.utcnow()

    def reactivate(self) -> None:
        """Reactivate the push token and reset failure count."""
        self.is_active = True
        self.failure_count = 0
        self.updated_at = datetime.utcnow()