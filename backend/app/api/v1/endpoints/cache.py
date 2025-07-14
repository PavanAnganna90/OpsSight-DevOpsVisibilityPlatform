"""
Cache Management API endpoints.
Provides cache statistics, health checks, and cache management operations.
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.cache import get_cache_manager, DataType, CacheLevel
from app.core.auth import (
    get_current_user,
    require_permission,
    RBACContext,
    audit_access_attempt,
)
from app.models.role import PermissionType

router = APIRouter()


class CacheSetRequest(BaseModel):
    """Request model for setting cache values."""
    key: str
    data: Any
    data_type: DataType = DataType.COMPUTED_RESULT
    ttl: Optional[int] = None
    cache_levels: Optional[list[CacheLevel]] = None


class CacheGetRequest(BaseModel):
    """Request model for getting cache values."""
    key: str
    data_type: DataType = DataType.COMPUTED_RESULT


class CacheInvalidateRequest(BaseModel):
    """Request model for cache invalidation."""
    pattern: Optional[str] = None
    tag: Optional[str] = None
    key: Optional[str] = None


@router.get("/health", response_model=Dict[str, Any])
async def get_cache_health(
    context: RBACContext = Depends(require_permission(PermissionType.VIEW_MONITORING)),
) -> Dict[str, Any]:
    """
    Get cache system health status.
    
    Requires VIEW_MONITORING permission.
    """
    try:
        cache_manager = await get_cache_manager()
        health_status = await cache_manager.health_check()
        
        audit_access_attempt(
            user=context.user,
            resource="cache/health",
            action="view",
            granted=True,
        )
        
        return health_status
    except Exception as e:
        audit_access_attempt(
            user=context.user,
            resource="cache/health",
            action="view",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get cache health status",
        )


@router.get("/stats", response_model=Dict[str, Any])
async def get_cache_stats(
    context: RBACContext = Depends(require_permission(PermissionType.VIEW_MONITORING)),
) -> Dict[str, Any]:
    """
    Get cache performance statistics.
    
    Requires VIEW_MONITORING permission.
    """
    try:
        cache_manager = await get_cache_manager()
        stats = await cache_manager.get_stats()
        
        audit_access_attempt(
            user=context.user,
            resource="cache/stats",
            action="view",
            granted=True,
        )
        
        return stats
    except Exception as e:
        audit_access_attempt(
            user=context.user,
            resource="cache/stats",
            action="view",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get cache statistics",
        )


@router.post("/get", response_model=Dict[str, Any])
async def get_cache_value(
    request: CacheGetRequest,
    context: RBACContext = Depends(require_permission(PermissionType.ADMIN_READ)),
) -> Dict[str, Any]:
    """
    Get value from cache (admin only).
    
    Requires ADMIN_READ permission.
    """
    try:
        cache_manager = await get_cache_manager()
        value = await cache_manager.get(request.key, request.data_type)
        
        audit_access_attempt(
            user=context.user,
            resource=f"cache/get/{request.key}",
            action="read",
            granted=True,
        )
        
        return {
            "key": request.key,
            "found": value is not None,
            "data": value,
            "data_type": request.data_type.value,
        }
    except Exception as e:
        audit_access_attempt(
            user=context.user,
            resource=f"cache/get/{request.key}",
            action="read",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get cache value",
        )


@router.post("/set", response_model=Dict[str, Any])
async def set_cache_value(
    request: CacheSetRequest,
    context: RBACContext = Depends(require_permission(PermissionType.ADMIN_WRITE)),
) -> Dict[str, Any]:
    """
    Set value in cache (admin only).
    
    Requires ADMIN_WRITE permission.
    """
    try:
        cache_manager = await get_cache_manager()
        success = await cache_manager.set(
            key=request.key,
            data=request.data,
            data_type=request.data_type,
            ttl=request.ttl,
            cache_levels=request.cache_levels,
        )
        
        audit_access_attempt(
            user=context.user,
            resource=f"cache/set/{request.key}",
            action="write",
            granted=True,
        )
        
        return {
            "key": request.key,
            "success": success,
            "data_type": request.data_type.value,
            "ttl": request.ttl,
        }
    except Exception as e:
        audit_access_attempt(
            user=context.user,
            resource=f"cache/set/{request.key}",
            action="write",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set cache value",
        )


@router.post("/invalidate", response_model=Dict[str, Any])
async def invalidate_cache(
    request: CacheInvalidateRequest,
    context: RBACContext = Depends(require_permission(PermissionType.ADMIN_WRITE)),
) -> Dict[str, Any]:
    """
    Invalidate cache entries (admin only).
    
    Supports invalidation by:
    - Pattern matching (Redis keys pattern)
    - Tag-based invalidation
    - Single key deletion
    
    Requires ADMIN_WRITE permission.
    """
    try:
        cache_manager = await get_cache_manager()
        
        if request.pattern:
            count = await cache_manager.invalidate_pattern(request.pattern)
            operation = f"pattern:{request.pattern}"
        elif request.tag:
            count = await cache_manager.invalidate_by_tag(request.tag)
            operation = f"tag:{request.tag}"
        elif request.key:
            success = await cache_manager.delete(request.key)
            count = 1 if success else 0
            operation = f"key:{request.key}"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Must specify either pattern, tag, or key for invalidation",
            )
        
        audit_access_attempt(
            user=context.user,
            resource=f"cache/invalidate/{operation}",
            action="delete",
            granted=True,
        )
        
        return {
            "operation": operation,
            "invalidated_count": count,
            "success": count > 0,
        }
    except HTTPException:
        raise
    except Exception as e:
        audit_access_attempt(
            user=context.user,
            resource="cache/invalidate",
            action="delete",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to invalidate cache",
        )


@router.post("/clear", response_model=Dict[str, Any])
async def clear_cache(
    context: RBACContext = Depends(require_permission(PermissionType.ADMIN_WRITE)),
) -> Dict[str, Any]:
    """
    Clear all cache entries (admin only).
    
    WARNING: This operation will clear all cached data!
    
    Requires ADMIN_WRITE permission.
    """
    try:
        cache_manager = await get_cache_manager()
        
        # Clear both memory and Redis caches
        memory_success = await cache_manager.memory_cache.clear()
        redis_success = await cache_manager.redis_cache.clear()
        
        audit_access_attempt(
            user=context.user,
            resource="cache/clear",
            action="delete",
            granted=True,
        )
        
        return {
            "memory_cleared": memory_success,
            "redis_cleared": redis_success,
            "success": memory_success or redis_success,
        }
    except Exception as e:
        audit_access_attempt(
            user=context.user,
            resource="cache/clear",
            action="delete",
            granted=False,
            reason=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear cache",
        )