"""
Git Webhook Service

Handles real-time webhook notifications from GitHub and GitLab.
Processes webhook payloads and updates cached Git activity data.
"""

import logging
import hmac
import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass
from enum import Enum

from fastapi import HTTPException, status
import httpx

from app.services.git_activity_service import (
    GitCommit,
    GitPullRequest,
    GitContributor,
    GitProvider,
)
from app.services.git_activity_cache import (
    GitActivityCache,
    CacheKeyType,
    CacheLevel,
    git_activity_cache,
)
from app.core.config import settings

logger = logging.getLogger(__name__)


class WebhookEventType(Enum):
    """Types of webhook events."""

    PUSH = "push"
    PULL_REQUEST = "pull_request"
    MERGE_REQUEST = "merge_request"
    ISSUES = "issues"
    REPOSITORY = "repository"
    PING = "ping"
    UNKNOWN = "unknown"


class WebhookAction(Enum):
    """Webhook action types."""

    OPENED = "opened"
    CLOSED = "closed"
    MERGED = "merged"
    SYNCHRONIZED = "synchronized"
    CREATED = "created"
    DELETED = "deleted"
    UPDATED = "updated"


@dataclass
class WebhookPayload:
    """Processed webhook payload data."""

    provider: GitProvider
    event_type: WebhookEventType
    action: Optional[WebhookAction]
    repository: str
    sender: str
    timestamp: datetime
    raw_payload: Dict[str, Any]

    # Event-specific data
    commits: List[Dict[str, Any]] = None
    pull_request: Optional[Dict[str, Any]] = None
    ref: Optional[str] = None
    before: Optional[str] = None
    after: Optional[str] = None


class GitWebhookService:
    """
    Service for handling Git provider webhooks.

    Features:
    - GitHub and GitLab webhook signature verification
    - Event type detection and payload parsing
    - Cache invalidation based on webhook events
    - Real-time data updates
    - Webhook event logging and monitoring
    """

    def __init__(self):
        """Initialize Git webhook service."""
        self.cache = git_activity_cache
        self.supported_events = {
            GitProvider.GITHUB: {
                "push",
                "pull_request",
                "issues",
                "repository",
                "ping",
            },
            GitProvider.GITLAB: {
                "push",
                "merge_request",
                "issues",
                "repository",
                "ping",
            },
        }

    def verify_github_signature(
        self, payload: bytes, signature: str, secret: str
    ) -> bool:
        """
        Verify GitHub webhook signature.

        Args:
            payload (bytes): Raw webhook payload
            signature (str): GitHub signature header
            secret (str): Webhook secret

        Returns:
            bool: True if signature is valid
        """
        if not signature.startswith("sha256="):
            return False

        expected_signature = hmac.new(
            secret.encode(), payload, hashlib.sha256
        ).hexdigest()

        received_signature = signature[7:]  # Remove "sha256=" prefix

        return hmac.compare_digest(expected_signature, received_signature)

    def verify_gitlab_signature(
        self, payload: bytes, signature: str, secret: str
    ) -> bool:
        """
        Verify GitLab webhook signature.

        Args:
            payload (bytes): Raw webhook payload
            signature (str): GitLab token header
            secret (str): Webhook secret token

        Returns:
            bool: True if signature is valid
        """
        return hmac.compare_digest(signature, secret)

    def parse_github_webhook(
        self, headers: Dict[str, str], payload: Dict[str, Any]
    ) -> WebhookPayload:
        """
        Parse GitHub webhook payload.

        Args:
            headers (Dict[str, str]): Request headers
            payload (Dict[str, Any]): Webhook payload

        Returns:
            WebhookPayload: Parsed webhook data
        """
        event_type = headers.get("x-github-event", "unknown")
        action = payload.get("action")

        # Map GitHub events to our enum
        event_mapping = {
            "push": WebhookEventType.PUSH,
            "pull_request": WebhookEventType.PULL_REQUEST,
            "issues": WebhookEventType.ISSUES,
            "repository": WebhookEventType.REPOSITORY,
            "ping": WebhookEventType.PING,
        }

        mapped_event = event_mapping.get(event_type, WebhookEventType.UNKNOWN)

        # Extract repository info
        repo_info = payload.get("repository", {})
        repository = (
            f"{repo_info.get('owner', {}).get('login', '')}/{repo_info.get('name', '')}"
        )

        # Extract sender info
        sender = payload.get("sender", {}).get("login", "unknown")

        # Parse action
        mapped_action = None
        if action:
            try:
                mapped_action = WebhookAction(action)
            except ValueError:
                logger.warning(f"Unknown GitHub action: {action}")

        return WebhookPayload(
            provider=GitProvider.GITHUB,
            event_type=mapped_event,
            action=mapped_action,
            repository=repository,
            sender=sender,
            timestamp=datetime.now(timezone.utc),
            raw_payload=payload,
            commits=payload.get("commits", []),
            pull_request=payload.get("pull_request"),
            ref=payload.get("ref"),
            before=payload.get("before"),
            after=payload.get("after"),
        )

    def parse_gitlab_webhook(
        self, headers: Dict[str, str], payload: Dict[str, Any]
    ) -> WebhookPayload:
        """
        Parse GitLab webhook payload.

        Args:
            headers (Dict[str, str]): Request headers
            payload (Dict[str, Any]): Webhook payload

        Returns:
            WebhookPayload: Parsed webhook data
        """
        event_type = headers.get("x-gitlab-event", "unknown")
        object_kind = payload.get("object_kind", event_type)

        # Map GitLab events to our enum
        event_mapping = {
            "push": WebhookEventType.PUSH,
            "Push Hook": WebhookEventType.PUSH,
            "merge_request": WebhookEventType.MERGE_REQUEST,
            "Merge Request Hook": WebhookEventType.MERGE_REQUEST,
            "issues": WebhookEventType.ISSUES,
            "Issue Hook": WebhookEventType.ISSUES,
            "repository": WebhookEventType.REPOSITORY,
            "ping": WebhookEventType.PING,
        }

        mapped_event = event_mapping.get(object_kind, WebhookEventType.UNKNOWN)

        # Extract repository info
        repo_info = payload.get("project", payload.get("repository", {}))
        repository = repo_info.get("path_with_namespace", "")

        # Extract sender info
        sender = payload.get("user", {}).get("username", "unknown")

        # Parse action for merge requests
        mapped_action = None
        if mapped_event == WebhookEventType.MERGE_REQUEST:
            mr_action = payload.get("object_attributes", {}).get("action")
            if mr_action:
                action_mapping = {
                    "open": WebhookAction.OPENED,
                    "close": WebhookAction.CLOSED,
                    "merge": WebhookAction.MERGED,
                    "update": WebhookAction.UPDATED,
                }
                mapped_action = action_mapping.get(mr_action)

        return WebhookPayload(
            provider=GitProvider.GITLAB,
            event_type=mapped_event,
            action=mapped_action,
            repository=repository,
            sender=sender,
            timestamp=datetime.now(timezone.utc),
            raw_payload=payload,
            commits=payload.get("commits", []),
            pull_request=(
                payload.get("object_attributes")
                if mapped_event == WebhookEventType.MERGE_REQUEST
                else None
            ),
            ref=payload.get("ref"),
            before=payload.get("before"),
            after=payload.get("after"),
        )

    async def process_webhook(
        self,
        provider: GitProvider,
        headers: Dict[str, str],
        payload: Dict[str, Any],
        verify_signature: bool = True,
    ) -> Dict[str, Any]:
        """
        Process incoming webhook.

        Args:
            provider (GitProvider): Git provider
            headers (Dict[str, str]): Request headers
            payload (Dict[str, Any]): Webhook payload
            verify_signature (bool): Whether to verify signature

        Returns:
            Dict[str, Any]: Processing result
        """
        try:
            # Parse webhook payload
            if provider == GitProvider.GITHUB:
                webhook_data = self.parse_github_webhook(headers, payload)
            elif provider == GitProvider.GITLAB:
                webhook_data = self.parse_gitlab_webhook(headers, payload)
            else:
                raise ValueError(f"Unsupported provider: {provider}")

            logger.info(
                f"Processing {provider.value} webhook: {webhook_data.event_type.value} "
                f"for {webhook_data.repository} by {webhook_data.sender}"
            )

            # Process based on event type
            result = await self._handle_webhook_event(webhook_data)

            return {
                "status": "success",
                "provider": provider.value,
                "event_type": webhook_data.event_type.value,
                "repository": webhook_data.repository,
                "processed_at": webhook_data.timestamp.isoformat(),
                **result,
            }

        except Exception as e:
            logger.error(f"Webhook processing failed: {e}")
            return {
                "status": "error",
                "error": str(e),
                "provider": provider.value if provider else "unknown",
            }

    async def _handle_webhook_event(
        self, webhook_data: WebhookPayload
    ) -> Dict[str, Any]:
        """
        Handle specific webhook event types.

        Args:
            webhook_data (WebhookPayload): Parsed webhook data

        Returns:
            Dict[str, Any]: Event handling result
        """
        if webhook_data.event_type == WebhookEventType.PING:
            return await self._handle_ping_event(webhook_data)
        elif webhook_data.event_type == WebhookEventType.PUSH:
            return await self._handle_push_event(webhook_data)
        elif webhook_data.event_type in [
            WebhookEventType.PULL_REQUEST,
            WebhookEventType.MERGE_REQUEST,
        ]:
            return await self._handle_pull_request_event(webhook_data)
        elif webhook_data.event_type == WebhookEventType.REPOSITORY:
            return await self._handle_repository_event(webhook_data)
        else:
            logger.info(f"Ignoring unsupported event: {webhook_data.event_type.value}")
            return {"action": "ignored", "reason": "unsupported_event"}

    async def _handle_ping_event(self, webhook_data: WebhookPayload) -> Dict[str, Any]:
        """Handle ping/test webhook events."""
        logger.info(
            f"Ping received from {webhook_data.provider.value} for {webhook_data.repository}"
        )
        return {"action": "ping_acknowledged", "message": "Webhook endpoint is active"}

    async def _handle_push_event(self, webhook_data: WebhookPayload) -> Dict[str, Any]:
        """
        Handle push events - invalidate commits cache.

        Args:
            webhook_data (WebhookPayload): Push event data

        Returns:
            Dict[str, Any]: Processing result
        """
        repository = webhook_data.repository
        commits = webhook_data.commits or []

        logger.info(f"Push event: {len(commits)} commits to {repository}")

        # Invalidate relevant cache entries
        invalidated_keys = []

        try:
            # Invalidate commits cache
            await self.cache.delete(repository, CacheKeyType.COMMITS)
            invalidated_keys.append("commits")

            # Invalidate heatmap cache (depends on commits)
            await self.cache.delete(repository, CacheKeyType.HEATMAP)
            invalidated_keys.append("heatmap")

            # Invalidate metrics cache (depends on commits)
            await self.cache.delete(repository, CacheKeyType.METRICS)
            invalidated_keys.append("metrics")

            # If it's a new contributor, invalidate contributors cache
            commit_authors = {
                commit.get("author", {}).get("username") for commit in commits
            }
            if commit_authors:
                await self.cache.delete(repository, CacheKeyType.CONTRIBUTORS)
                invalidated_keys.append("contributors")

        except Exception as e:
            logger.error(f"Failed to invalidate cache for push event: {e}")

        return {
            "action": "cache_invalidated",
            "commits_count": len(commits),
            "invalidated_keys": invalidated_keys,
            "ref": webhook_data.ref,
        }

    async def _handle_pull_request_event(
        self, webhook_data: WebhookPayload
    ) -> Dict[str, Any]:
        """
        Handle pull request/merge request events.

        Args:
            webhook_data (WebhookPayload): PR/MR event data

        Returns:
            Dict[str, Any]: Processing result
        """
        repository = webhook_data.repository
        action = webhook_data.action
        pr_data = webhook_data.pull_request or {}

        logger.info(
            f"PR/MR event: {action.value if action else 'unknown'} for {repository}"
        )

        # Invalidate relevant cache entries
        invalidated_keys = []

        try:
            # Always invalidate PR cache
            await self.cache.delete(repository, CacheKeyType.PULL_REQUESTS)
            invalidated_keys.append("pull_requests")

            # Invalidate heatmap and metrics (depend on PRs)
            await self.cache.delete(repository, CacheKeyType.HEATMAP)
            await self.cache.delete(repository, CacheKeyType.METRICS)
            invalidated_keys.extend(["heatmap", "metrics"])

            # If PR is merged, also invalidate commits cache
            if action == WebhookAction.MERGED:
                await self.cache.delete(repository, CacheKeyType.COMMITS)
                invalidated_keys.append("commits")

        except Exception as e:
            logger.error(f"Failed to invalidate cache for PR event: {e}")

        return {
            "action": "cache_invalidated",
            "pr_action": action.value if action else "unknown",
            "pr_number": pr_data.get("number", pr_data.get("iid")),
            "invalidated_keys": invalidated_keys,
        }

    async def _handle_repository_event(
        self, webhook_data: WebhookPayload
    ) -> Dict[str, Any]:
        """
        Handle repository events (created, deleted, etc.).

        Args:
            webhook_data (WebhookPayload): Repository event data

        Returns:
            Dict[str, Any]: Processing result
        """
        repository = webhook_data.repository
        action = webhook_data.action

        logger.info(
            f"Repository event: {action.value if action else 'unknown'} for {repository}"
        )

        # For repository deletion or major changes, invalidate all cache
        if action in [WebhookAction.DELETED, WebhookAction.UPDATED]:
            try:
                deleted_count = await self.cache.invalidate_repository(repository)
                return {
                    "action": "repository_cache_cleared",
                    "repo_action": action.value if action else "unknown",
                    "invalidated_entries": deleted_count,
                }
            except Exception as e:
                logger.error(f"Failed to clear repository cache: {e}")

        return {
            "action": "repository_event_processed",
            "repo_action": action.value if action else "unknown",
        }

    async def get_webhook_stats(self) -> Dict[str, Any]:
        """Get webhook processing statistics."""
        # This would typically be stored in a database or cache
        # For now, return basic cache stats
        try:
            cache_stats = await self.cache.get_cache_stats()
            return {
                "webhook_service": "active",
                "supported_providers": [p.value for p in GitProvider],
                "cache_stats": cache_stats,
            }
        except Exception as e:
            logger.error(f"Failed to get webhook stats: {e}")
            return {
                "webhook_service": "active",
                "supported_providers": [p.value for p in GitProvider],
                "error": str(e),
            }

    def validate_webhook_config(self, provider: GitProvider) -> Dict[str, Any]:
        """
        Validate webhook configuration for a provider.

        Args:
            provider (GitProvider): Git provider to validate

        Returns:
            Dict[str, Any]: Validation result
        """
        config_status = {
            "provider": provider.value,
            "supported_events": list(self.supported_events.get(provider, [])),
            "cache_available": False,
            "signature_verification": False,
        }

        # Check cache availability
        try:
            if self.cache.redis_client:
                config_status["cache_available"] = True
        except Exception:
            pass

        # Check signature verification setup
        if provider == GitProvider.GITHUB:
            github_secret = getattr(settings, "GITHUB_WEBHOOK_SECRET", None)
            config_status["signature_verification"] = bool(github_secret)
        elif provider == GitProvider.GITLAB:
            gitlab_secret = getattr(settings, "GITLAB_WEBHOOK_SECRET", None)
            config_status["signature_verification"] = bool(gitlab_secret)

        return config_status


# Create service instance
git_webhook_service = GitWebhookService()
