"""
Git Activity Cache Service

Comprehensive caching service for Git activity data using Redis.
Provides intelligent cache invalidation, multiple cache levels, and performance optimization.
"""

import json
import logging
import hashlib
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Union, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

import redis.asyncio as redis
from fastapi import HTTPException, status

from app.core.config import settings
from app.services.git_activity_service import (
    GitActivityMetrics,
    ActivityHeatmapData,
    GitCommit,
    GitPullRequest,
    GitContributor,
    GitProvider,
)

logger = logging.getLogger(__name__)


class CacheLevel(Enum):
    """Cache levels with different TTL values."""

    REAL_TIME = "real_time"  # 30 seconds
    SHORT_TERM = "short_term"  # 5 minutes
    MEDIUM_TERM = "medium_term"  # 30 minutes
    LONG_TERM = "long_term"  # 2 hours
    PERSISTENT = "persistent"  # 24 hours


class CacheKeyType(Enum):
    """Types of cache keys for different data."""

    COMMITS = "commits"
    PULL_REQUESTS = "prs"
    CONTRIBUTORS = "contributors"
    HEATMAP = "heatmap"
    METRICS = "metrics"
    REPOSITORY_INFO = "repo_info"
    API_RESPONSE = "api_response"


@dataclass
class CacheEntry:
    """Cache entry with metadata."""

    data: Any
    created_at: datetime
    expires_at: datetime
    cache_level: CacheLevel
    key_type: CacheKeyType
    repository: str
    access_count: int = 0
    size_bytes: int = 0

    def is_expired(self) -> bool:
        """Check if cache entry has expired."""
        return datetime.now(timezone.utc) > self.expires_at

    def is_near_expiry(self, threshold_seconds: int = 300) -> bool:
        """Check if cache entry is near expiry (within threshold)."""
        time_to_expiry = self.expires_at - datetime.now(timezone.utc)
        return time_to_expiry.total_seconds() <= threshold_seconds


class GitActivityCache:
    """
    Redis-based cache service for Git activity data.

    Features:
    - Multi-level caching with different TTL values
    - Intelligent cache invalidation strategies
    - Repository-specific cache namespacing
    - Cache warming and background refresh
    - Performance metrics and monitoring
    - Compression for large data sets
    """

    def __init__(self):
        """Initialize Git activity cache service."""
        self.redis_client: Optional[redis.Redis] = None
        self.cache_prefix = "git_activity"
        self.stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "deletes": 0,
            "evictions": 0,
            "errors": 0,
        }

        # TTL mapping for cache levels (in seconds)
        self.ttl_mapping = {
            CacheLevel.REAL_TIME: 30,
            CacheLevel.SHORT_TERM: 300,  # 5 minutes
            CacheLevel.MEDIUM_TERM: 1800,  # 30 minutes
            CacheLevel.LONG_TERM: 7200,  # 2 hours
            CacheLevel.PERSISTENT: 86400,  # 24 hours
        }

    async def initialize(self) -> None:
        """Initialize Redis connection."""
        try:
            redis_url = getattr(settings, "REDIS_URL", "redis://localhost:6379")
            self.redis_client = redis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_keepalive=True,
                socket_keepalive_options={},
                health_check_interval=30,
            )

            # Test connection
            await self.redis_client.ping()
            logger.info("Git Activity Cache initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Git Activity Cache: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cache service unavailable",
            )

    def _generate_cache_key(
        self, repository: str, key_type: CacheKeyType, **kwargs
    ) -> str:
        """
        Generate cache key with repository and type namespace.

        Args:
            repository (str): Repository identifier (owner/repo)
            key_type (CacheKeyType): Type of cached data
            **kwargs: Additional parameters for key generation

        Returns:
            str: Generated cache key
        """
        # Create base key
        base_parts = [self.cache_prefix, repository.replace("/", ":"), key_type.value]

        # Add additional parameters
        if kwargs:
            # Sort kwargs for consistent key generation
            sorted_params = sorted(kwargs.items())
            param_string = "&".join(f"{k}={v}" for k, v in sorted_params)
            param_hash = hashlib.md5(param_string.encode()).hexdigest()[:8]
            base_parts.append(param_hash)

        return ":".join(base_parts)

    def _serialize_data(self, data: Any) -> str:
        """Serialize data for Redis storage."""
        if hasattr(data, "__dict__"):
            # Handle dataclass objects
            return json.dumps(asdict(data), default=str, ensure_ascii=False)
        elif isinstance(data, list) and data and hasattr(data[0], "__dict__"):
            # Handle list of dataclass objects
            return json.dumps(
                [asdict(item) for item in data], default=str, ensure_ascii=False
            )
        else:
            # Handle regular data
            return json.dumps(data, default=str, ensure_ascii=False)

    def _deserialize_data(self, data_str: str, data_type: type = None) -> Any:
        """Deserialize data from Redis storage."""
        try:
            data = json.loads(data_str)

            # Convert back to dataclass if type is provided
            if data_type and hasattr(data_type, "__annotations__"):
                if isinstance(data, list):
                    return [data_type(**item) for item in data]
                else:
                    return data_type(**data)

            return data
        except Exception as e:
            logger.error(f"Failed to deserialize cache data: {e}")
            return None

    async def get(
        self, repository: str, key_type: CacheKeyType, data_type: type = None, **kwargs
    ) -> Optional[Any]:
        """
        Get data from cache.

        Args:
            repository (str): Repository identifier
            key_type (CacheKeyType): Type of data
            data_type (type): Expected data type for deserialization
            **kwargs: Additional key parameters

        Returns:
            Optional[Any]: Cached data or None if not found/expired
        """
        if not self.redis_client:
            await self.initialize()

        cache_key = self._generate_cache_key(repository, key_type, **kwargs)

        try:
            # Get cache entry metadata and data
            entry_data = await self.redis_client.hgetall(cache_key)

            if not entry_data:
                self.stats["misses"] += 1
                return None

            # Parse cache entry
            entry = CacheEntry(
                data=None,  # Will be set below
                created_at=datetime.fromisoformat(entry_data["created_at"]),
                expires_at=datetime.fromisoformat(entry_data["expires_at"]),
                cache_level=CacheLevel(entry_data["cache_level"]),
                key_type=CacheKeyType(entry_data["key_type"]),
                repository=entry_data["repository"],
                access_count=int(entry_data.get("access_count", 0)),
                size_bytes=int(entry_data.get("size_bytes", 0)),
            )

            # Check if expired
            if entry.is_expired():
                await self.delete(repository, key_type, **kwargs)
                self.stats["misses"] += 1
                self.stats["evictions"] += 1
                return None

            # Deserialize data
            data = self._deserialize_data(entry_data["data"], data_type)
            if data is None:
                self.stats["misses"] += 1
                return None

            # Update access count
            await self.redis_client.hincrby(cache_key, "access_count", 1)

            self.stats["hits"] += 1
            logger.debug(f"Cache hit for {cache_key}")
            return data

        except Exception as e:
            logger.error(f"Cache get error for {cache_key}: {e}")
            self.stats["errors"] += 1
            return None

    async def set(
        self,
        repository: str,
        key_type: CacheKeyType,
        data: Any,
        cache_level: CacheLevel = CacheLevel.SHORT_TERM,
        **kwargs,
    ) -> bool:
        """
        Set data in cache.

        Args:
            repository (str): Repository identifier
            key_type (CacheKeyType): Type of data
            data (Any): Data to cache
            cache_level (CacheLevel): Cache level with TTL
            **kwargs: Additional key parameters

        Returns:
            bool: Success status
        """
        if not self.redis_client:
            await self.initialize()

        cache_key = self._generate_cache_key(repository, key_type, **kwargs)

        try:
            # Serialize data
            serialized_data = self._serialize_data(data)
            size_bytes = len(serialized_data.encode("utf-8"))

            # Create cache entry
            now = datetime.now(timezone.utc)
            ttl = self.ttl_mapping[cache_level]
            expires_at = now + timedelta(seconds=ttl)

            entry_data = {
                "data": serialized_data,
                "created_at": now.isoformat(),
                "expires_at": expires_at.isoformat(),
                "cache_level": cache_level.value,
                "key_type": key_type.value,
                "repository": repository,
                "access_count": 0,
                "size_bytes": size_bytes,
            }

            # Store in Redis with TTL
            pipe = self.redis_client.pipeline()
            pipe.hset(cache_key, mapping=entry_data)
            pipe.expire(cache_key, ttl)
            await pipe.execute()

            self.stats["sets"] += 1
            logger.debug(
                f"Cache set for {cache_key} (TTL: {ttl}s, Size: {size_bytes} bytes)"
            )
            return True

        except Exception as e:
            logger.error(f"Cache set error for {cache_key}: {e}")
            self.stats["errors"] += 1
            return False

    async def delete(self, repository: str, key_type: CacheKeyType, **kwargs) -> bool:
        """Delete specific cache entry."""
        if not self.redis_client:
            return False

        cache_key = self._generate_cache_key(repository, key_type, **kwargs)

        try:
            deleted = await self.redis_client.delete(cache_key)
            if deleted:
                self.stats["deletes"] += 1
                logger.debug(f"Cache deleted for {cache_key}")
            return bool(deleted)
        except Exception as e:
            logger.error(f"Cache delete error for {cache_key}: {e}")
            self.stats["errors"] += 1
            return False

    async def invalidate_repository(self, repository: str) -> int:
        """
        Invalidate all cache entries for a repository.

        Args:
            repository (str): Repository to invalidate

        Returns:
            int: Number of entries deleted
        """
        if not self.redis_client:
            return 0

        pattern = f"{self.cache_prefix}:{repository.replace('/', ':')}:*"

        try:
            keys = await self.redis_client.keys(pattern)
            if keys:
                deleted = await self.redis_client.delete(*keys)
                self.stats["deletes"] += deleted
                logger.info(
                    f"Invalidated {deleted} cache entries for repository {repository}"
                )
                return deleted
            return 0
        except Exception as e:
            logger.error(f"Cache invalidation error for repository {repository}: {e}")
            self.stats["errors"] += 1
            return 0

    async def warm_cache(
        self,
        repository: str,
        data_dict: Dict[CacheKeyType, Any],
        cache_level: CacheLevel = CacheLevel.MEDIUM_TERM,
    ) -> int:
        """
        Warm cache with multiple data types.

        Args:
            repository (str): Repository identifier
            data_dict (Dict[CacheKeyType, Any]): Data to cache by type
            cache_level (CacheLevel): Cache level for all entries

        Returns:
            int: Number of entries cached
        """
        cached_count = 0

        for key_type, data in data_dict.items():
            if data is not None:
                success = await self.set(repository, key_type, data, cache_level)
                if success:
                    cached_count += 1

        logger.info(f"Cache warmed for {repository}: {cached_count} entries")
        return cached_count

    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total_requests = self.stats["hits"] + self.stats["misses"]
        hit_rate = (
            (self.stats["hits"] / total_requests * 100) if total_requests > 0 else 0
        )

        cache_info = {}
        if self.redis_client:
            try:
                redis_info = await self.redis_client.info("memory")
                cache_info = {
                    "redis_memory_used": redis_info.get("used_memory_human", "Unknown"),
                    "redis_memory_peak": redis_info.get(
                        "used_memory_peak_human", "Unknown"
                    ),
                    "redis_connected_clients": redis_info.get("connected_clients", 0),
                }
            except Exception as e:
                logger.error(f"Failed to get Redis info: {e}")

        return {
            "hits": self.stats["hits"],
            "misses": self.stats["misses"],
            "sets": self.stats["sets"],
            "deletes": self.stats["deletes"],
            "evictions": self.stats["evictions"],
            "errors": self.stats["errors"],
            "hit_rate_percent": round(hit_rate, 2),
            "total_requests": total_requests,
            **cache_info,
        }

    async def cleanup_expired(self) -> int:
        """Clean up expired cache entries."""
        if not self.redis_client:
            return 0

        pattern = f"{self.cache_prefix}:*"
        deleted_count = 0

        try:
            keys = await self.redis_client.keys(pattern)

            for key in keys:
                # Check if key exists (might have been auto-expired)
                exists = await self.redis_client.exists(key)
                if not exists:
                    deleted_count += 1
                    continue

                # Get expiry info
                ttl = await self.redis_client.ttl(key)
                if ttl == -1:  # No expiry set
                    # Force expire old entries without TTL
                    await self.redis_client.delete(key)
                    deleted_count += 1

            if deleted_count > 0:
                self.stats["evictions"] += deleted_count
                logger.info(f"Cleaned up {deleted_count} expired cache entries")

            return deleted_count

        except Exception as e:
            logger.error(f"Cache cleanup error: {e}")
            self.stats["errors"] += 1
            return 0

    async def close(self) -> None:
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Git Activity Cache connection closed")


# Create service instance
git_activity_cache = GitActivityCache()
