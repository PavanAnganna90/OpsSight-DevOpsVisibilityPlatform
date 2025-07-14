"""
Tests for Git Activity Cache Service

Comprehensive test suite for Redis-based Git activity caching functionality.
"""

import pytest
import asyncio
import json
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.git_activity_cache import (
    GitActivityCache,
    CacheLevel,
    CacheKeyType,
    CacheEntry,
)
from app.services.git_activity_service import (
    GitCommit,
    GitPullRequest,
    GitContributor,
    ActivityHeatmapData,
    GitActivityMetrics,
)


@pytest.fixture
def sample_git_commit():
    """Sample GitCommit for testing."""
    return GitCommit(
        sha="abc123",
        message="Test commit",
        author_login="test_user",
        author_name="Test User",
        author_email="test@example.com",
        authored_date=datetime.now(timezone.utc),
        committed_date=datetime.now(timezone.utc),
        additions=10,
        deletions=5,
        changed_files=2,
        url="https://github.com/owner/repo/commit/abc123",
        verified=True,
    )


@pytest.fixture
def sample_git_pull_request():
    """Sample GitPullRequest for testing."""
    return GitPullRequest(
        number=1,
        title="Test PR",
        state="open",
        author_login="test_user",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        merged_at=None,
        closed_at=None,
        base_branch="main",
        head_branch="feature",
        commits_count=3,
        additions=15,
        deletions=8,
        changed_files=4,
        url="https://github.com/owner/repo/pull/1",
        review_comments=2,
        reviews_count=1,
    )


@pytest.fixture
def sample_git_contributor():
    """Sample GitContributor for testing."""
    return GitContributor(
        login="test_user",
        name="Test User",
        email="test@example.com",
        avatar_url="https://github.com/test_user.png",
        contributions=50,
        commits_count=25,
        additions=500,
        deletions=200,
        first_contribution=datetime.now(timezone.utc) - timedelta(days=30),
        last_contribution=datetime.now(timezone.utc),
    )


@pytest.fixture
def sample_heatmap_data():
    """Sample ActivityHeatmapData for testing."""
    return ActivityHeatmapData(
        date="2023-01-01",
        activity_count=5,
        commit_count=3,
        pr_count=2,
        contributor_count=2,
        lines_added=50,
        lines_deleted=20,
        files_changed=8,
        activity_types=["commit", "pull_request"],
    )


@pytest.fixture
def mock_redis_client():
    """Mock Redis client for testing."""
    mock_client = AsyncMock()
    mock_client.ping.return_value = True
    mock_client.hgetall.return_value = {}
    mock_client.hset.return_value = True
    mock_client.expire.return_value = True
    mock_client.delete.return_value = 1
    mock_client.keys.return_value = []
    mock_client.pipeline.return_value = mock_client
    mock_client.execute.return_value = [True, True]
    mock_client.hincrby.return_value = 1
    mock_client.exists.return_value = True
    mock_client.ttl.return_value = 300
    mock_client.info.return_value = {
        "used_memory_human": "1.2M",
        "used_memory_peak_human": "2.1M",
        "connected_clients": 5,
    }
    return mock_client


@pytest.fixture
def cache_service(mock_redis_client):
    """GitActivityCache instance with mocked Redis client."""
    cache = GitActivityCache()
    cache.redis_client = mock_redis_client
    return cache


class TestGitActivityCache:
    """Test cases for GitActivityCache."""

    @pytest.mark.asyncio
    async def test_initialize_success(self, mock_redis_client):
        """Test successful cache initialization."""
        cache = GitActivityCache()

        with patch("redis.asyncio.from_url", return_value=mock_redis_client):
            await cache.initialize()

        assert cache.redis_client is not None
        mock_redis_client.ping.assert_called_once()

    @pytest.mark.asyncio
    async def test_initialize_failure(self):
        """Test cache initialization failure."""
        cache = GitActivityCache()

        mock_client = AsyncMock()
        mock_client.ping.side_effect = Exception("Connection failed")

        with patch("redis.asyncio.from_url", return_value=mock_client):
            with pytest.raises(Exception):
                await cache.initialize()

    def test_generate_cache_key(self, cache_service):
        """Test cache key generation."""
        key = cache_service._generate_cache_key(
            "owner/repo", CacheKeyType.COMMITS, provider="github", days=30
        )

        assert "git_activity" in key
        assert "owner:repo" in key
        assert "commits" in key

    def test_generate_cache_key_consistent(self, cache_service):
        """Test cache key generation consistency."""
        key1 = cache_service._generate_cache_key(
            "owner/repo", CacheKeyType.COMMITS, provider="github", days=30
        )
        key2 = cache_service._generate_cache_key(
            "owner/repo", CacheKeyType.COMMITS, provider="github", days=30
        )

        assert key1 == key2

    def test_serialize_data_commit(self, cache_service, sample_git_commit):
        """Test data serialization for GitCommit."""
        serialized = cache_service._serialize_data(sample_git_commit)

        assert isinstance(serialized, str)
        data = json.loads(serialized)
        assert data["sha"] == "abc123"
        assert data["message"] == "Test commit"

    def test_serialize_data_list(self, cache_service, sample_git_commit):
        """Test data serialization for list of objects."""
        commits = [sample_git_commit, sample_git_commit]
        serialized = cache_service._serialize_data(commits)

        assert isinstance(serialized, str)
        data = json.loads(serialized)
        assert len(data) == 2
        assert data[0]["sha"] == "abc123"

    def test_deserialize_data_commit(self, cache_service, sample_git_commit):
        """Test data deserialization for GitCommit."""
        serialized = cache_service._serialize_data(sample_git_commit)
        deserialized = cache_service._deserialize_data(serialized, GitCommit)

        assert isinstance(deserialized, GitCommit)
        assert deserialized.sha == "abc123"
        assert deserialized.message == "Test commit"

    def test_deserialize_data_list(self, cache_service, sample_git_commit):
        """Test data deserialization for list of objects."""
        commits = [sample_git_commit, sample_git_commit]
        serialized = cache_service._serialize_data(commits)
        deserialized = cache_service._deserialize_data(serialized, GitCommit)

        assert isinstance(deserialized, list)
        assert len(deserialized) == 2
        assert all(isinstance(c, GitCommit) for c in deserialized)

    @pytest.mark.asyncio
    async def test_set_cache_success(self, cache_service, sample_git_commit):
        """Test successful cache set operation."""
        success = await cache_service.set(
            "owner/repo",
            CacheKeyType.COMMITS,
            [sample_git_commit],
            CacheLevel.SHORT_TERM,
        )

        assert success is True
        assert cache_service.stats["sets"] == 1

    @pytest.mark.asyncio
    async def test_get_cache_hit(self, cache_service, sample_git_commit):
        """Test cache hit scenario."""
        # Setup mock return data
        serialized_data = cache_service._serialize_data([sample_git_commit])
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(seconds=300)

        cache_service.redis_client.hgetall.return_value = {
            "data": serialized_data,
            "created_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "cache_level": CacheLevel.SHORT_TERM.value,
            "key_type": CacheKeyType.COMMITS.value,
            "repository": "owner/repo",
            "access_count": "0",
            "size_bytes": "100",
        }

        result = await cache_service.get("owner/repo", CacheKeyType.COMMITS, GitCommit)

        assert result is not None
        assert len(result) == 1
        assert result[0].sha == "abc123"
        assert cache_service.stats["hits"] == 1

    @pytest.mark.asyncio
    async def test_get_cache_miss(self, cache_service):
        """Test cache miss scenario."""
        cache_service.redis_client.hgetall.return_value = {}

        result = await cache_service.get("owner/repo", CacheKeyType.COMMITS, GitCommit)

        assert result is None
        assert cache_service.stats["misses"] == 1

    @pytest.mark.asyncio
    async def test_get_cache_expired(self, cache_service, sample_git_commit):
        """Test cache expired scenario."""
        # Setup expired cache entry
        serialized_data = cache_service._serialize_data([sample_git_commit])
        now = datetime.now(timezone.utc)
        expires_at = now - timedelta(seconds=10)  # Expired

        cache_service.redis_client.hgetall.return_value = {
            "data": serialized_data,
            "created_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "cache_level": CacheLevel.SHORT_TERM.value,
            "key_type": CacheKeyType.COMMITS.value,
            "repository": "owner/repo",
            "access_count": "0",
            "size_bytes": "100",
        }

        result = await cache_service.get("owner/repo", CacheKeyType.COMMITS, GitCommit)

        assert result is None
        assert cache_service.stats["misses"] == 1
        assert cache_service.stats["evictions"] == 1

    @pytest.mark.asyncio
    async def test_delete_cache(self, cache_service):
        """Test cache deletion."""
        success = await cache_service.delete("owner/repo", CacheKeyType.COMMITS)

        assert success is True
        assert cache_service.stats["deletes"] == 1

    @pytest.mark.asyncio
    async def test_invalidate_repository(self, cache_service):
        """Test repository cache invalidation."""
        cache_service.redis_client.keys.return_value = [
            "git_activity:owner:repo:commits",
            "git_activity:owner:repo:prs",
        ]
        cache_service.redis_client.delete.return_value = 2

        deleted_count = await cache_service.invalidate_repository("owner/repo")

        assert deleted_count == 2
        assert cache_service.stats["deletes"] == 2

    @pytest.mark.asyncio
    async def test_warm_cache(
        self, cache_service, sample_git_commit, sample_git_pull_request
    ):
        """Test cache warming."""
        data_dict = {
            CacheKeyType.COMMITS: [sample_git_commit],
            CacheKeyType.PULL_REQUESTS: [sample_git_pull_request],
        }

        cached_count = await cache_service.warm_cache(
            "owner/repo", data_dict, CacheLevel.MEDIUM_TERM
        )

        assert cached_count == 2
        assert cache_service.stats["sets"] == 2

    @pytest.mark.asyncio
    async def test_get_cache_stats(self, cache_service):
        """Test cache statistics retrieval."""
        cache_service.stats = {
            "hits": 10,
            "misses": 5,
            "sets": 8,
            "deletes": 2,
            "evictions": 1,
            "errors": 0,
        }

        stats = await cache_service.get_cache_stats()

        assert stats["hits"] == 10
        assert stats["misses"] == 5
        assert stats["hit_rate_percent"] == 66.67
        assert stats["total_requests"] == 15
        assert "redis_memory_used" in stats

    @pytest.mark.asyncio
    async def test_cleanup_expired(self, cache_service):
        """Test expired cache cleanup."""
        cache_service.redis_client.keys.return_value = [
            "git_activity:test:key1",
            "git_activity:test:key2",
        ]
        cache_service.redis_client.exists.side_effect = [False, True]
        cache_service.redis_client.ttl.return_value = -1

        deleted_count = await cache_service.cleanup_expired()

        assert deleted_count == 2
        assert cache_service.stats["evictions"] == 2

    def test_cache_entry_is_expired(self):
        """Test CacheEntry expiry check."""
        now = datetime.now(timezone.utc)
        expired_entry = CacheEntry(
            data={},
            created_at=now - timedelta(hours=1),
            expires_at=now - timedelta(minutes=10),
            cache_level=CacheLevel.SHORT_TERM,
            key_type=CacheKeyType.COMMITS,
            repository="owner/repo",
        )

        assert expired_entry.is_expired() is True

    def test_cache_entry_not_expired(self):
        """Test CacheEntry not expired."""
        now = datetime.now(timezone.utc)
        valid_entry = CacheEntry(
            data={},
            created_at=now - timedelta(minutes=1),
            expires_at=now + timedelta(minutes=10),
            cache_level=CacheLevel.SHORT_TERM,
            key_type=CacheKeyType.COMMITS,
            repository="owner/repo",
        )

        assert valid_entry.is_expired() is False

    def test_cache_entry_near_expiry(self):
        """Test CacheEntry near expiry check."""
        now = datetime.now(timezone.utc)
        near_expiry_entry = CacheEntry(
            data={},
            created_at=now - timedelta(minutes=1),
            expires_at=now + timedelta(seconds=30),
            cache_level=CacheLevel.SHORT_TERM,
            key_type=CacheKeyType.COMMITS,
            repository="owner/repo",
        )

        assert near_expiry_entry.is_near_expiry(threshold_seconds=60) is True
        assert near_expiry_entry.is_near_expiry(threshold_seconds=10) is False

    @pytest.mark.asyncio
    async def test_cache_error_handling(self, cache_service):
        """Test cache error handling."""
        cache_service.redis_client.hgetall.side_effect = Exception("Redis error")

        result = await cache_service.get("owner/repo", CacheKeyType.COMMITS, GitCommit)

        assert result is None
        assert cache_service.stats["errors"] == 1

    @pytest.mark.asyncio
    async def test_close_connection(self, cache_service):
        """Test cache connection closure."""
        await cache_service.close()
        cache_service.redis_client.close.assert_called_once()


class TestCacheLevels:
    """Test cache level configurations."""

    def test_cache_level_ttl_mapping(self):
        """Test TTL mapping for different cache levels."""
        cache = GitActivityCache()

        assert cache.ttl_mapping[CacheLevel.REAL_TIME] == 30
        assert cache.ttl_mapping[CacheLevel.SHORT_TERM] == 300
        assert cache.ttl_mapping[CacheLevel.MEDIUM_TERM] == 1800
        assert cache.ttl_mapping[CacheLevel.LONG_TERM] == 7200
        assert cache.ttl_mapping[CacheLevel.PERSISTENT] == 86400

    def test_cache_key_types(self):
        """Test cache key type enumeration."""
        assert CacheKeyType.COMMITS.value == "commits"
        assert CacheKeyType.PULL_REQUESTS.value == "prs"
        assert CacheKeyType.CONTRIBUTORS.value == "contributors"
        assert CacheKeyType.HEATMAP.value == "heatmap"
        assert CacheKeyType.METRICS.value == "metrics"
        assert CacheKeyType.REPOSITORY_INFO.value == "repo_info"
        assert CacheKeyType.API_RESPONSE.value == "api_response"
