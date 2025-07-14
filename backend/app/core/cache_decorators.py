"""
Cache Decorators for OpsSight Platform.

Provides convenient decorators for caching function results and FastAPI endpoints.
"""

import hashlib
from functools import wraps
from typing import Any, Callable, Optional, Set, List
from fastapi import Request

from app.core.cache import get_cache_manager, DataType, CacheLevel

AsyncCallable = Callable[..., Any]


def cached(
    ttl: int = 3600,
    data_type: DataType = DataType.COMPUTED_RESULT,
    cache_levels: List[CacheLevel] = None,
    key_prefix: Optional[str] = None,
    tags: Optional[Set[str]] = None,
):
    """
    Cache decorator for async functions.

    Usage:
        @cached(ttl=300, data_type=DataType.API_RESPONSE)
        async def get_user_profile(user_id: int):
            return {"user_id": user_id, "name": "John"}
    """
    if cache_levels is None:
        cache_levels = [CacheLevel.MEMORY, CacheLevel.REDIS]

    def decorator(func: AsyncCallable) -> AsyncCallable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            # Get cache manager
            cache_manager = await get_cache_manager()

            # Generate cache key
            prefix = key_prefix or func.__name__
            cache_key = f"{prefix}:{func.__name__}:{hash(str(args) + str(kwargs))}"

            # Try to get from cache
            cached_result = await cache_manager.get(cache_key, data_type)
            if cached_result is not None:
                return cached_result

            # Execute function and cache result
            result = await func(*args, **kwargs)

            # Cache the result
            await cache_manager.set(
                key=cache_key,
                data=result,
                data_type=data_type,
                ttl=ttl,
                cache_levels=cache_levels,
                tags=tags,
            )

            return result

        return wrapper

    return decorator


def cached_endpoint(
    ttl: int = 300,
    data_type: DataType = DataType.API_RESPONSE,
    include_user: bool = False,
):
    """
    Cache decorator for FastAPI endpoints.

    Usage:
        @cached_endpoint(ttl=60, include_user=True)
        async def get_user_dashboard(request: Request, user_id: int):
            return {"dashboard": "data"}
    """

    def decorator(func: AsyncCallable) -> AsyncCallable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            # Extract request object
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break

            if not request:
                # Fallback to regular function caching
                return await cached(ttl, data_type)(func)(*args, **kwargs)

            # Get cache manager
            cache_manager = await get_cache_manager()

            # Generate endpoint cache key
            cache_key = f"endpoint:{func.__name__}:{request.url.path}:{hash(str(args) + str(kwargs))}"

            if include_user:
                user_id = getattr(request.state, "user_id", "anonymous")
                cache_key += f":user:{user_id}"

            # Try to get from cache
            cached_result = await cache_manager.get(cache_key, data_type)
            if cached_result is not None:
                return cached_result

            # Execute endpoint and cache result
            result = await func(*args, **kwargs)

            # Cache the result
            await cache_manager.set(
                key=cache_key, data=result, data_type=data_type, ttl=ttl
            )

            return result

        return wrapper

    return decorator


async def invalidate_cache_pattern(pattern: str) -> int:
    """Manually invalidate cache entries matching pattern."""
    cache_manager = await get_cache_manager()
    return await cache_manager.invalidate_pattern(pattern)


async def get_cache_stats() -> dict:
    """Get current cache statistics."""
    cache_manager = await get_cache_manager()
    return await cache_manager.get_stats()
