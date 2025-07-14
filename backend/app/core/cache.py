"""
Comprehensive caching system for OpsSight platform.

Provides Redis-based caching with fallback to in-memory cache,
cache decorators, and intelligent cache management.
"""
import json
import logging
import pickle
import hashlib
from typing import Optional, Any, Dict, List, Set, Union
from datetime import datetime, timedelta
from enum import Enum
import asyncio
import os

import redis.asyncio as redis
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)


class DataType(Enum):
    """Types of data being cached to optimize storage and TTL."""
    API_RESPONSE = "api_response"
    DATABASE_QUERY = "database_query"
    COMPUTED_RESULT = "computed_result"
    USER_SESSION = "user_session"
    PERMISSION_CHECK = "permission_check"
    METRICS = "metrics"
    FILE_CACHE = "file_cache"


class CacheLevel(Enum):
    """Cache storage levels in order of speed."""
    MEMORY = "memory"  # Fastest, smallest capacity
    REDIS = "redis"    # Fast, larger capacity


class SimpleCache:
    """
    Simple in-memory cache implementation.
    In production, this should be replaced with Redis or similar.
    """
    
    def __init__(self):
        self._cache = {}
        self._expiry = {}
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        try:
            # Check if key exists and hasn't expired
            if key in self._cache and key in self._expiry:
                if datetime.utcnow() < self._expiry[key]:
                    return self._cache[key]
                else:
                    # Key has expired, remove it
                    await self.delete(key)
            
            return None
        except Exception as e:
            logger.error(f"Error getting cache key {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """Set value in cache with TTL."""
        try:
            self._cache[key] = value
            self._expiry[key] = datetime.utcnow() + timedelta(seconds=ttl)
            return True
        except Exception as e:
            logger.error(f"Error setting cache key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        try:
            if key in self._cache:
                del self._cache[key]
            if key in self._expiry:
                del self._expiry[key]
            return True
        except Exception as e:
            logger.error(f"Error deleting cache key {key}: {e}")
            return False
    
    async def clear(self) -> bool:
        """Clear all cache entries."""
        try:
            self._cache.clear()
            self._expiry.clear()
            return True
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return False


# Global cache instance
_cache_instance = None


def get_cache() -> SimpleCache:
    """Get cache instance."""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = SimpleCache()
    return _cache_instance


class UniversalCacheManager:
    """
    Universal cache manager that provides a unified interface for caching.
    This can be extended to support Redis or other cache backends.
    """
    
    def __init__(self):
        self._cache = SimpleCache()
        self._initialized = False
    
    async def initialize(self) -> None:
        """Initialize the cache manager."""
        if not self._initialized:
            # Any initialization logic can go here
            # For now, just mark as initialized
            self._initialized = True
            logger.info("UniversalCacheManager initialized")
    
    async def get(self, key: str, namespace: Optional[str] = None) -> Optional[Any]:
        """Get value from cache with optional namespace."""
        cache_key = f"{namespace}:{key}" if namespace else key
        return await self._cache.get(cache_key)
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        ttl: int = 300, 
        namespace: Optional[str] = None
    ) -> bool:
        """Set value in cache with optional namespace."""
        cache_key = f"{namespace}:{key}" if namespace else key
        return await self._cache.set(cache_key, value, ttl)
    
    async def delete(self, key: str, namespace: Optional[str] = None) -> bool:
        """Delete key from cache with optional namespace."""
        cache_key = f"{namespace}:{key}" if namespace else key
        return await self._cache.delete(cache_key)
    
    async def clear_namespace(self, namespace: str) -> int:
        """Clear all keys in a namespace."""
        # This is a simple implementation - in production with Redis,
        # we'd use pattern matching
        count = 0
        keys_to_delete = []
        
        # Find all keys in the namespace
        for key in list(self._cache._cache.keys()):
            if key.startswith(f"{namespace}:"):
                keys_to_delete.append(key)
        
        # Delete the keys
        for key in keys_to_delete:
            if await self._cache.delete(key):
                count += 1
        
        return count
    
    async def clear_all(self) -> bool:
        """Clear all cache entries."""
        return await self._cache.clear()
    
    async def health_check(self) -> Dict[str, Any]:
        """Check cache health."""
        try:
            # Try a simple set/get operation
            test_key = "_health_check_test"
            test_value = "OK"
            
            await self.set(test_key, test_value, ttl=10)
            result = await self.get(test_key)
            await self.delete(test_key)
            
            return {
                "status": "healthy" if result == test_value else "unhealthy",
                "backend": "SimpleCache",
                "initialized": self._initialized
            }
        except Exception as e:
            logger.error(f"Cache health check failed: {e}")
            return {
                "status": "unhealthy",
                "backend": "SimpleCache",
                "error": str(e),
                "initialized": self._initialized
            }


class RedisCache:
    """Redis-based cache implementation with connection management."""
    
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self._redis: Optional[redis.Redis] = None
        self._connected = False
    
    async def connect(self):
        """Establish Redis connection with retry logic."""
        if self._redis is None:
            try:
                self._redis = redis.from_url(
                    self.redis_url,
                    decode_responses=False,  # We'll handle encoding manually
                    retry_on_timeout=True,
                    socket_connect_timeout=5,
                    socket_timeout=5,
                )
                # Test connection
                await self._redis.ping()
                self._connected = True
                logger.info("Redis connection established")
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}")
                self._redis = None
                self._connected = False
                raise
    
    async def disconnect(self):
        """Close Redis connection."""
        if self._redis:
            await self._redis.close()
            self._redis = None
            self._connected = False
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def get(self, key: str) -> Optional[Any]:
        """Get value from Redis cache."""
        if not self._connected:
            await self.connect()
        
        try:
            data = await self._redis.get(key)
            if data is None:
                return None
            
            # Try to deserialize as JSON first, then pickle
            try:
                return json.loads(data.decode('utf-8'))
            except (json.JSONDecodeError, UnicodeDecodeError):
                return pickle.loads(data)
        except Exception as e:
            logger.error(f"Error getting Redis key {key}: {e}")
            return None
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """Set value in Redis cache."""
        if not self._connected:
            await self.connect()
        
        try:
            # Try to serialize as JSON first, then pickle
            try:
                data = json.dumps(value, default=str).encode('utf-8')
            except (TypeError, ValueError):
                data = pickle.dumps(value)
            
            await self._redis.setex(key, ttl, data)
            return True
        except Exception as e:
            logger.error(f"Error setting Redis key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from Redis cache."""
        if not self._connected:
            await self.connect()
        
        try:
            result = await self._redis.delete(key)
            return result > 0
        except Exception as e:
            logger.error(f"Error deleting Redis key {key}: {e}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        if not self._connected:
            await self.connect()
        
        try:
            keys = await self._redis.keys(pattern)
            if keys:
                return await self._redis.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Error deleting Redis pattern {pattern}: {e}")
            return 0
    
    async def clear(self) -> bool:
        """Clear all Redis cache entries."""
        if not self._connected:
            await self.connect()
        
        try:
            await self._redis.flushdb()
            return True
        except Exception as e:
            logger.error(f"Error clearing Redis cache: {e}")
            return False


class EnhancedCacheManager:
    """
    Multi-level cache manager with Redis and in-memory storage.
    Provides intelligent caching with data type optimization and statistics.
    """
    
    def __init__(self, redis_url: Optional[str] = None):
        self.memory_cache = SimpleCache()
        self.redis_cache = RedisCache(redis_url)
        self._initialized = False
        self._stats = {
            'hits': {'memory': 0, 'redis': 0},
            'misses': 0,
            'sets': {'memory': 0, 'redis': 0},
            'deletes': {'memory': 0, 'redis': 0},
        }
        
        # Default TTL values by data type
        self.default_ttls = {
            DataType.API_RESPONSE: 300,      # 5 minutes
            DataType.DATABASE_QUERY: 900,    # 15 minutes
            DataType.COMPUTED_RESULT: 1800,  # 30 minutes
            DataType.USER_SESSION: 3600,     # 1 hour
            DataType.PERMISSION_CHECK: 300,  # 5 minutes
            DataType.METRICS: 60,            # 1 minute
            DataType.FILE_CACHE: 3600,       # 1 hour
        }
    
    async def initialize(self) -> None:
        """Initialize cache connections."""
        if self._initialized:
            return
        
        try:
            await self.redis_cache.connect()
            self._initialized = True
            logger.info("EnhancedCacheManager initialized with Redis")
        except Exception as e:
            logger.warning(f"Redis unavailable, using memory cache only: {e}")
            self._initialized = True
    
    async def get(self, key: str, data_type: DataType = DataType.COMPUTED_RESULT) -> Optional[Any]:
        """Get value from cache with multi-level strategy."""
        if not self._initialized:
            await self.initialize()
        
        # Try memory cache first (fastest)
        result = await self.memory_cache.get(key)
        if result is not None:
            self._stats['hits']['memory'] += 1
            return result
        
        # Try Redis cache
        if self.redis_cache._connected:
            result = await self.redis_cache.get(key)
            if result is not None:
                self._stats['hits']['redis'] += 1
                # Store in memory cache for faster future access
                await self.memory_cache.set(key, result, ttl=60)  # Short TTL in memory
                return result
        
        self._stats['misses'] += 1
        return None
    
    async def set(
        self,
        key: str,
        data: Any,
        data_type: DataType = DataType.COMPUTED_RESULT,
        ttl: Optional[int] = None,
        cache_levels: Optional[List[CacheLevel]] = None,
        tags: Optional[Set[str]] = None,
    ) -> bool:
        """Set value in cache with configurable levels."""
        if not self._initialized:
            await self.initialize()
        
        if ttl is None:
            ttl = self.default_ttls.get(data_type, 300)
        
        if cache_levels is None:
            cache_levels = [CacheLevel.MEMORY, CacheLevel.REDIS]
        
        success = True
        
        # Set in memory cache
        if CacheLevel.MEMORY in cache_levels:
            memory_ttl = min(ttl, 300)  # Max 5 minutes in memory
            await self.memory_cache.set(key, data, memory_ttl)
            self._stats['sets']['memory'] += 1
        
        # Set in Redis cache
        if CacheLevel.REDIS in cache_levels and self.redis_cache._connected:
            redis_success = await self.redis_cache.set(key, data, ttl)
            if redis_success:
                self._stats['sets']['redis'] += 1
                
                # Store tags for invalidation if provided
                if tags:
                    for tag in tags:
                        tag_key = f"tag:{tag}"
                        await self.redis_cache.set(f"{tag_key}:{key}", "1", ttl)
            else:
                success = False
        
        return success
    
    async def delete(self, key: str) -> bool:
        """Delete key from all cache levels."""
        if not self._initialized:
            await self.initialize()
        
        success = True
        
        # Delete from memory
        if await self.memory_cache.delete(key):
            self._stats['deletes']['memory'] += 1
        
        # Delete from Redis
        if self.redis_cache._connected:
            if await self.redis_cache.delete(key):
                self._stats['deletes']['redis'] += 1
            else:
                success = False
        
        return success
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching pattern."""
        if not self._initialized:
            await self.initialize()
        
        count = 0
        
        # Redis pattern deletion
        if self.redis_cache._connected:
            count += await self.redis_cache.delete_pattern(pattern)
        
        # Memory cache doesn't support patterns efficiently,
        # so we'd need to iterate through all keys
        # For now, we'll implement a simple approach
        
        return count
    
    async def invalidate_by_tag(self, tag: str) -> int:
        """Invalidate all cache entries with a specific tag."""
        if not self._initialized:
            await self.initialize()
        
        if not self.redis_cache._connected:
            return 0
        
        # Find all keys with this tag
        tag_pattern = f"tag:{tag}:*"
        tag_keys = await self.redis_cache._redis.keys(tag_pattern)
        
        count = 0
        for tag_key in tag_keys:
            # Extract the original key
            original_key = tag_key.decode('utf-8').replace(f"tag:{tag}:", "")
            if await self.delete(original_key):
                count += 1
            # Also delete the tag reference
            await self.redis_cache.delete(tag_key.decode('utf-8'))
        
        return count
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total_hits = self._stats['hits']['memory'] + self._stats['hits']['redis']
        total_operations = total_hits + self._stats['misses']
        hit_rate = (total_hits / total_operations * 100) if total_operations > 0 else 0
        
        return {
            'initialized': self._initialized,
            'redis_connected': self.redis_cache._connected,
            'hit_rate_percent': round(hit_rate, 2),
            'total_hits': total_hits,
            'total_misses': self._stats['misses'],
            'memory_hits': self._stats['hits']['memory'],
            'redis_hits': self._stats['hits']['redis'],
            'memory_sets': self._stats['sets']['memory'],
            'redis_sets': self._stats['sets']['redis'],
            'memory_deletes': self._stats['deletes']['memory'],
            'redis_deletes': self._stats['deletes']['redis'],
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Comprehensive cache health check."""
        try:
            test_key = "_health_check_test"
            test_value = {"status": "OK", "timestamp": datetime.utcnow().isoformat()}
            
            # Test set operation
            await self.set(test_key, test_value, DataType.COMPUTED_RESULT, ttl=10)
            
            # Test get operation
            result = await self.get(test_key)
            
            # Test delete operation
            await self.delete(test_key)
            
            # Get current stats
            stats = await self.get_stats()
            
            is_healthy = (
                result is not None and 
                result.get("status") == "OK" and
                self._initialized
            )
            
            return {
                "status": "healthy" if is_healthy else "unhealthy",
                "redis_connected": self.redis_cache._connected,
                "cache_stats": stats,
                "test_passed": result is not None,
            }
            
        except Exception as e:
            logger.error(f"Cache health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "redis_connected": self.redis_cache._connected,
                "initialized": self._initialized,
            }


# Global cache manager instance
_cache_manager_instance: Optional[EnhancedCacheManager] = None


async def get_cache_manager() -> EnhancedCacheManager:
    """Get or create the global cache manager instance."""
    global _cache_manager_instance
    if _cache_manager_instance is None:
        _cache_manager_instance = EnhancedCacheManager()
        await _cache_manager_instance.initialize()
    return _cache_manager_instance


async def close_cache_manager():
    """Close the global cache manager and its connections."""
    global _cache_manager_instance
    if _cache_manager_instance:
        await _cache_manager_instance.redis_cache.disconnect()
        _cache_manager_instance = None