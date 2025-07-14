"""
Repository layer for data access abstraction.
Implements the repository pattern for clean separation of data access logic.
"""

from .base import BaseRepository
from .user import UserRepository
from .metrics import MetricsRepository

__all__ = [
    "BaseRepository",
    "UserRepository",
    "MetricsRepository",
]
