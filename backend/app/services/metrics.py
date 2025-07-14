"""
Metrics service implementation.
"""

import logging
from app.services.base import BaseService

logger = logging.getLogger(__name__)


class MetricsService(BaseService):
    """Metrics service with business logic."""

    def __init__(self, metrics_repository):
        super().__init__(metrics_repository)
        self.metrics_repo = metrics_repository

    async def get_metrics_by_name(self, name: str, **kwargs):
        """Get metrics by name."""
        try:
            self.logger.debug(f"Fetching metrics by name: {name}")
            return await self.metrics_repo.get_metrics_by_name(name, **kwargs)
        except Exception as e:
            self.logger.error(f"Error fetching metrics by name {name}: {str(e)}")
            raise
