"""
Tests for Git Webhook Service

Comprehensive test suite for webhook processing, signature verification, and cache invalidation.
"""

import pytest
import json
import hmac
import hashlib
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.git_webhook_service import (
    GitWebhookService,
    WebhookEventType,
    WebhookAction,
    WebhookPayload,
    GitProvider,
)


@pytest.fixture
def webhook_service():
    """GitWebhookService instance for testing."""
    service = GitWebhookService()
    service.cache = AsyncMock()
    return service


@pytest.fixture
def github_push_payload():
    """Sample GitHub push webhook payload."""
    return {
        "ref": "refs/heads/main",
        "before": "abc123",
        "after": "def456",
        "repository": {"name": "test-repo", "owner": {"login": "test-owner"}},
        "sender": {"login": "test-user"},
        "commits": [
            {
                "id": "def456",
                "message": "Test commit",
                "author": {
                    "name": "Test User",
                    "email": "test@example.com",
                    "username": "test-user",
                },
                "added": ["file1.py"],
                "modified": ["file2.py"],
                "removed": [],
            }
        ],
    }


@pytest.fixture
def github_pr_payload():
    """Sample GitHub pull request webhook payload."""
    return {
        "action": "opened",
        "number": 1,
        "pull_request": {
            "id": 123,
            "number": 1,
            "title": "Test PR",
            "state": "open",
            "user": {"login": "test-user"},
            "base": {"ref": "main"},
            "head": {"ref": "feature-branch"},
        },
        "repository": {"name": "test-repo", "owner": {"login": "test-owner"}},
        "sender": {"login": "test-user"},
    }


@pytest.fixture
def gitlab_push_payload():
    """Sample GitLab push webhook payload."""
    return {
        "object_kind": "push",
        "ref": "refs/heads/main",
        "before": "abc123",
        "after": "def456",
        "project": {"name": "test-repo", "path_with_namespace": "test-owner/test-repo"},
        "user": {"username": "test-user"},
        "commits": [
            {
                "id": "def456",
                "message": "Test commit",
                "author": {"name": "Test User", "email": "test@example.com"},
            }
        ],
    }


@pytest.fixture
def gitlab_mr_payload():
    """Sample GitLab merge request webhook payload."""
    return {
        "object_kind": "merge_request",
        "object_attributes": {
            "id": 123,
            "iid": 1,
            "title": "Test MR",
            "state": "opened",
            "action": "open",
            "source_branch": "feature-branch",
            "target_branch": "main",
        },
        "project": {"name": "test-repo", "path_with_namespace": "test-owner/test-repo"},
        "user": {"username": "test-user"},
    }


class TestGitWebhookService:
    """Test cases for GitWebhookService."""

    def test_verify_github_signature_valid(self, webhook_service):
        """Test valid GitHub signature verification."""
        payload = b'{"test": "data"}'
        secret = "test-secret"

        # Generate valid signature
        signature = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()

        github_signature = f"sha256={signature}"

        result = webhook_service.verify_github_signature(
            payload, github_signature, secret
        )

        assert result is True

    def test_verify_github_signature_invalid(self, webhook_service):
        """Test invalid GitHub signature verification."""
        payload = b'{"test": "data"}'
        secret = "test-secret"
        invalid_signature = "sha256=invalid"

        result = webhook_service.verify_github_signature(
            payload, invalid_signature, secret
        )

        assert result is False

    def test_verify_github_signature_wrong_format(self, webhook_service):
        """Test GitHub signature with wrong format."""
        payload = b'{"test": "data"}'
        secret = "test-secret"
        wrong_format = "invalid-format"

        result = webhook_service.verify_github_signature(payload, wrong_format, secret)

        assert result is False

    def test_verify_gitlab_signature_valid(self, webhook_service):
        """Test valid GitLab signature verification."""
        payload = b'{"test": "data"}'
        secret = "test-secret"

        result = webhook_service.verify_gitlab_signature(payload, secret, secret)

        assert result is True

    def test_verify_gitlab_signature_invalid(self, webhook_service):
        """Test invalid GitLab signature verification."""
        payload = b'{"test": "data"}'
        secret = "test-secret"
        wrong_secret = "wrong-secret"

        result = webhook_service.verify_gitlab_signature(payload, wrong_secret, secret)

        assert result is False

    def test_parse_github_webhook_push(self, webhook_service, github_push_payload):
        """Test parsing GitHub push webhook."""
        headers = {"x-github-event": "push", "x-github-delivery": "test-123"}

        webhook_data = webhook_service.parse_github_webhook(
            headers, github_push_payload
        )

        assert webhook_data.provider == GitProvider.GITHUB
        assert webhook_data.event_type == WebhookEventType.PUSH
        assert webhook_data.repository == "test-owner/test-repo"
        assert webhook_data.sender == "test-user"
        assert webhook_data.ref == "refs/heads/main"
        assert len(webhook_data.commits) == 1

    def test_parse_github_webhook_pr(self, webhook_service, github_pr_payload):
        """Test parsing GitHub pull request webhook."""
        headers = {"x-github-event": "pull_request", "x-github-delivery": "test-123"}

        webhook_data = webhook_service.parse_github_webhook(headers, github_pr_payload)

        assert webhook_data.provider == GitProvider.GITHUB
        assert webhook_data.event_type == WebhookEventType.PULL_REQUEST
        assert webhook_data.action == WebhookAction.OPENED
        assert webhook_data.repository == "test-owner/test-repo"
        assert webhook_data.pull_request is not None

    def test_parse_gitlab_webhook_push(self, webhook_service, gitlab_push_payload):
        """Test parsing GitLab push webhook."""
        headers = {"x-gitlab-event": "Push Hook"}

        webhook_data = webhook_service.parse_gitlab_webhook(
            headers, gitlab_push_payload
        )

        assert webhook_data.provider == GitProvider.GITLAB
        assert webhook_data.event_type == WebhookEventType.PUSH
        assert webhook_data.repository == "test-owner/test-repo"
        assert webhook_data.sender == "test-user"
        assert len(webhook_data.commits) == 1

    def test_parse_gitlab_webhook_mr(self, webhook_service, gitlab_mr_payload):
        """Test parsing GitLab merge request webhook."""
        headers = {"x-gitlab-event": "Merge Request Hook"}

        webhook_data = webhook_service.parse_gitlab_webhook(headers, gitlab_mr_payload)

        assert webhook_data.provider == GitProvider.GITLAB
        assert webhook_data.event_type == WebhookEventType.MERGE_REQUEST
        assert webhook_data.action == WebhookAction.OPENED
        assert webhook_data.repository == "test-owner/test-repo"
        assert webhook_data.pull_request is not None

    @pytest.mark.asyncio
    async def test_process_webhook_github_success(
        self, webhook_service, github_push_payload
    ):
        """Test successful GitHub webhook processing."""
        headers = {"x-github-event": "push", "x-github-delivery": "test-123"}

        result = await webhook_service.process_webhook(
            GitProvider.GITHUB, headers, github_push_payload, verify_signature=False
        )

        assert result["status"] == "success"
        assert result["provider"] == "github"
        assert result["event_type"] == "push"
        assert result["repository"] == "test-owner/test-repo"

    @pytest.mark.asyncio
    async def test_process_webhook_gitlab_success(
        self, webhook_service, gitlab_push_payload
    ):
        """Test successful GitLab webhook processing."""
        headers = {"x-gitlab-event": "Push Hook"}

        result = await webhook_service.process_webhook(
            GitProvider.GITLAB, headers, gitlab_push_payload, verify_signature=False
        )

        assert result["status"] == "success"
        assert result["provider"] == "gitlab"
        assert result["event_type"] == "push"
        assert result["repository"] == "test-owner/test-repo"

    @pytest.mark.asyncio
    async def test_handle_ping_event(self, webhook_service):
        """Test ping event handling."""
        webhook_data = WebhookPayload(
            provider=GitProvider.GITHUB,
            event_type=WebhookEventType.PING,
            action=None,
            repository="test-owner/test-repo",
            sender="test-user",
            timestamp=datetime.now(timezone.utc),
            raw_payload={},
        )

        result = await webhook_service._handle_ping_event(webhook_data)

        assert result["action"] == "ping_acknowledged"
        assert "Webhook endpoint is active" in result["message"]

    @pytest.mark.asyncio
    async def test_handle_push_event(self, webhook_service):
        """Test push event handling and cache invalidation."""
        webhook_data = WebhookPayload(
            provider=GitProvider.GITHUB,
            event_type=WebhookEventType.PUSH,
            action=None,
            repository="test-owner/test-repo",
            sender="test-user",
            timestamp=datetime.now(timezone.utc),
            raw_payload={},
            commits=[{"author": {"username": "test-user"}}],
            ref="refs/heads/main",
        )

        result = await webhook_service._handle_push_event(webhook_data)

        assert result["action"] == "cache_invalidated"
        assert result["commits_count"] == 1
        assert "commits" in result["invalidated_keys"]
        assert "heatmap" in result["invalidated_keys"]
        assert "metrics" in result["invalidated_keys"]
        assert "contributors" in result["invalidated_keys"]

    @pytest.mark.asyncio
    async def test_handle_pull_request_event_opened(self, webhook_service):
        """Test pull request opened event handling."""
        webhook_data = WebhookPayload(
            provider=GitProvider.GITHUB,
            event_type=WebhookEventType.PULL_REQUEST,
            action=WebhookAction.OPENED,
            repository="test-owner/test-repo",
            sender="test-user",
            timestamp=datetime.now(timezone.utc),
            raw_payload={},
            pull_request={"number": 1},
        )

        result = await webhook_service._handle_pull_request_event(webhook_data)

        assert result["action"] == "cache_invalidated"
        assert result["pr_action"] == "opened"
        assert result["pr_number"] == 1
        assert "pull_requests" in result["invalidated_keys"]
        assert "heatmap" in result["invalidated_keys"]
        assert "metrics" in result["invalidated_keys"]

    @pytest.mark.asyncio
    async def test_handle_pull_request_event_merged(self, webhook_service):
        """Test pull request merged event handling."""
        webhook_data = WebhookPayload(
            provider=GitProvider.GITHUB,
            event_type=WebhookEventType.PULL_REQUEST,
            action=WebhookAction.MERGED,
            repository="test-owner/test-repo",
            sender="test-user",
            timestamp=datetime.now(timezone.utc),
            raw_payload={},
            pull_request={"number": 1},
        )

        result = await webhook_service._handle_pull_request_event(webhook_data)

        assert result["action"] == "cache_invalidated"
        assert result["pr_action"] == "merged"
        assert "commits" in result["invalidated_keys"]  # Merged PRs affect commits

    @pytest.mark.asyncio
    async def test_handle_repository_event_deleted(self, webhook_service):
        """Test repository deleted event handling."""
        webhook_data = WebhookPayload(
            provider=GitProvider.GITHUB,
            event_type=WebhookEventType.REPOSITORY,
            action=WebhookAction.DELETED,
            repository="test-owner/test-repo",
            sender="test-user",
            timestamp=datetime.now(timezone.utc),
            raw_payload={},
        )

        webhook_service.cache.invalidate_repository.return_value = 5

        result = await webhook_service._handle_repository_event(webhook_data)

        assert result["action"] == "repository_cache_cleared"
        assert result["repo_action"] == "deleted"
        assert result["invalidated_entries"] == 5

    @pytest.mark.asyncio
    async def test_get_webhook_stats(self, webhook_service):
        """Test webhook statistics retrieval."""
        webhook_service.cache.get_cache_stats.return_value = {
            "hits": 100,
            "misses": 20,
            "hit_rate_percent": 83.33,
        }

        stats = await webhook_service.get_webhook_stats()

        assert stats["webhook_service"] == "active"
        assert "github" in stats["supported_providers"]
        assert "gitlab" in stats["supported_providers"]
        assert stats["cache_stats"]["hits"] == 100

    def test_validate_webhook_config_github(self, webhook_service):
        """Test GitHub webhook configuration validation."""
        with patch("app.core.config.settings") as mock_settings:
            mock_settings.GITHUB_WEBHOOK_SECRET = "test-secret"

            config = webhook_service.validate_webhook_config(GitProvider.GITHUB)

            assert config["provider"] == "github"
            assert "push" in config["supported_events"]
            assert "pull_request" in config["supported_events"]
            assert config["signature_verification"] is True

    def test_validate_webhook_config_gitlab(self, webhook_service):
        """Test GitLab webhook configuration validation."""
        with patch("app.core.config.settings") as mock_settings:
            mock_settings.GITLAB_WEBHOOK_SECRET = "test-secret"

            config = webhook_service.validate_webhook_config(GitProvider.GITLAB)

            assert config["provider"] == "gitlab"
            assert "push" in config["supported_events"]
            assert "merge_request" in config["supported_events"]
            assert config["signature_verification"] is True

    @pytest.mark.asyncio
    async def test_process_webhook_unsupported_provider(self, webhook_service):
        """Test webhook processing with unsupported provider."""
        headers = {"x-test-event": "test"}
        payload = {"test": "data"}

        # Create a mock provider that doesn't exist
        class UnsupportedProvider:
            value = "unsupported"

        result = await webhook_service.process_webhook(
            UnsupportedProvider(), headers, payload, verify_signature=False
        )

        assert result["status"] == "error"
        assert "Unsupported provider" in result["error"]

    @pytest.mark.asyncio
    async def test_cache_error_handling(self, webhook_service):
        """Test webhook processing with cache errors."""
        webhook_service.cache.delete.side_effect = Exception("Cache error")

        webhook_data = WebhookPayload(
            provider=GitProvider.GITHUB,
            event_type=WebhookEventType.PUSH,
            action=None,
            repository="test-owner/test-repo",
            sender="test-user",
            timestamp=datetime.now(timezone.utc),
            raw_payload={},
            commits=[],
            ref="refs/heads/main",
        )

        # Should not raise exception, but handle gracefully
        result = await webhook_service._handle_push_event(webhook_data)

        assert result["action"] == "cache_invalidated"
        assert result["commits_count"] == 0


class TestWebhookPayload:
    """Test cases for WebhookPayload dataclass."""

    def test_webhook_payload_creation(self):
        """Test WebhookPayload creation."""
        payload = WebhookPayload(
            provider=GitProvider.GITHUB,
            event_type=WebhookEventType.PUSH,
            action=WebhookAction.CREATED,
            repository="test-owner/test-repo",
            sender="test-user",
            timestamp=datetime.now(timezone.utc),
            raw_payload={"test": "data"},
        )

        assert payload.provider == GitProvider.GITHUB
        assert payload.event_type == WebhookEventType.PUSH
        assert payload.action == WebhookAction.CREATED
        assert payload.repository == "test-owner/test-repo"
        assert payload.sender == "test-user"
        assert payload.raw_payload == {"test": "data"}

    def test_webhook_payload_optional_fields(self):
        """Test WebhookPayload with optional fields."""
        payload = WebhookPayload(
            provider=GitProvider.GITLAB,
            event_type=WebhookEventType.MERGE_REQUEST,
            action=None,
            repository="test-owner/test-repo",
            sender="test-user",
            timestamp=datetime.now(timezone.utc),
            raw_payload={},
            commits=[{"id": "abc123"}],
            pull_request={"number": 1},
            ref="refs/heads/feature",
            before="abc123",
            after="def456",
        )

        assert len(payload.commits) == 1
        assert payload.pull_request["number"] == 1
        assert payload.ref == "refs/heads/feature"
        assert payload.before == "abc123"
        assert payload.after == "def456"


class TestWebhookEnums:
    """Test cases for webhook enums."""

    def test_webhook_event_type_enum(self):
        """Test WebhookEventType enum values."""
        assert WebhookEventType.PUSH.value == "push"
        assert WebhookEventType.PULL_REQUEST.value == "pull_request"
        assert WebhookEventType.MERGE_REQUEST.value == "merge_request"
        assert WebhookEventType.PING.value == "ping"
        assert WebhookEventType.UNKNOWN.value == "unknown"

    def test_webhook_action_enum(self):
        """Test WebhookAction enum values."""
        assert WebhookAction.OPENED.value == "opened"
        assert WebhookAction.CLOSED.value == "closed"
        assert WebhookAction.MERGED.value == "merged"
        assert WebhookAction.CREATED.value == "created"
        assert WebhookAction.DELETED.value == "deleted"
