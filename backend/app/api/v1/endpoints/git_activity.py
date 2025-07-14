"""
Git Activity API Endpoints

API endpoints for Git activity data with caching support.
Provides repository analysis, heatmap data, and cache management.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.models.user import User
from app.services.git_activity_service import GitProvider, git_activity_service
from app.services.git_activity_cache import CacheLevel, git_activity_cache
from app.core.monitoring import track_cache_metrics
from app.core.dependencies import get_async_db

logger = logging.getLogger(__name__)

router = APIRouter()


class GitActivityRequest(BaseModel):
    """Request model for Git activity analysis."""

    owner: str = Field(..., description="Repository owner")
    repo: str = Field(..., description="Repository name")
    provider: GitProvider = Field(GitProvider.GITHUB, description="Git provider")
    days_back: int = Field(365, description="Days of history to analyze", ge=1, le=1095)
    use_cache: bool = Field(True, description="Whether to use cache")
    force_refresh: bool = Field(False, description="Force refresh from API")


class GitActivityResponse(BaseModel):
    """Response model for Git activity analysis."""

    repository: str
    provider: str
    analysis_period_days: int
    total_commits: int
    total_prs: int
    total_contributors: int
    active_branches: int
    lines_of_code: int
    code_churn: int
    avg_commits_per_day: float
    avg_pr_size: float
    top_contributors: List[Dict[str, Any]]
    activity_heatmap: List[Dict[str, Any]]
    velocity_trend: List[Dict[str, Any]]
    language_distribution: Dict[str, int]
    cache_info: Dict[str, Any]


class CacheStatsResponse(BaseModel):
    """Cache statistics response model."""

    cache_enabled: bool
    hits: int
    misses: int
    sets: int
    deletes: int
    evictions: int
    errors: int
    hit_rate_percent: float
    total_requests: int
    redis_memory_used: Optional[str] = None
    redis_memory_peak: Optional[str] = None
    redis_connected_clients: Optional[int] = None


@router.post("/activity", response_model=GitActivityResponse)
async def get_repository_activity(
    request: GitActivityRequest, current_user: User = Depends(get_current_user)
) -> GitActivityResponse:
    """
    Get comprehensive Git activity analysis for a repository.

    Args:
        request: Git activity analysis request
        current_user: Current authenticated user

    Returns:
        Comprehensive repository activity analysis
    """
    try:
        # Validate GitHub access token
        if not current_user.github_access_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="GitHub access token required for Git activity analysis",
            )

        logger.info(
            f"Git activity analysis requested for {request.owner}/{request.repo} "
            f"by user {current_user.login} ({request.days_back} days)"
        )

        # Get comprehensive activity metrics
        metrics = await git_activity_service.get_comprehensive_repository_activity(
            access_token=current_user.github_access_token,
            owner=request.owner,
            repo=request.repo,
            provider=request.provider,
            days_back=request.days_back,
        )

        # Get cache information
        cache_info = {
            "cache_used": request.use_cache,
            "force_refresh": request.force_refresh,
            "cache_available": True,
        }

        try:
            cache_stats = await git_activity_cache.get_cache_stats()
            cache_info.update(
                {
                    "hit_rate_percent": cache_stats.get("hit_rate_percent", 0),
                    "total_requests": cache_stats.get("total_requests", 0),
                }
            )
        except Exception as e:
            logger.warning(f"Failed to get cache stats: {e}")
            cache_info["cache_available"] = False

        return GitActivityResponse(
            repository=f"{request.owner}/{request.repo}",
            provider=request.provider.value,
            analysis_period_days=request.days_back,
            total_commits=metrics.total_commits,
            total_prs=metrics.total_prs,
            total_contributors=metrics.total_contributors,
            active_branches=metrics.active_branches,
            lines_of_code=metrics.lines_of_code,
            code_churn=metrics.code_churn,
            avg_commits_per_day=metrics.avg_commits_per_day,
            avg_pr_size=metrics.avg_pr_size,
            top_contributors=[
                {
                    "login": c.login,
                    "name": c.name,
                    "contributions": c.contributions,
                    "commits_count": c.commits_count,
                    "additions": c.additions,
                    "deletions": c.deletions,
                }
                for c in metrics.top_contributors
            ],
            activity_heatmap=[
                {
                    "date": h.date,
                    "activity_count": h.activity_count,
                    "commit_count": h.commit_count,
                    "pr_count": h.pr_count,
                    "contributor_count": h.contributor_count,
                    "lines_added": h.lines_added,
                    "lines_deleted": h.lines_deleted,
                    "files_changed": h.files_changed,
                    "activity_types": h.activity_types,
                }
                for h in metrics.activity_heatmap
            ],
            velocity_trend=metrics.velocity_trend,
            language_distribution=metrics.language_distribution,
            cache_info=cache_info,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Git activity analysis failed for {request.owner}/{request.repo}: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze Git activity: {str(e)}",
        )


@router.get("/cache/stats", response_model=CacheStatsResponse)
async def get_cache_statistics(
    current_user: User = Depends(get_current_user),
) -> CacheStatsResponse:
    """
    Get Git activity cache statistics.

    Returns:
        Cache performance statistics and metrics
    """
    try:
        cache_stats = await git_activity_cache.get_cache_stats()

        return CacheStatsResponse(
            cache_enabled=True,
            hits=cache_stats.get("hits", 0),
            misses=cache_stats.get("misses", 0),
            sets=cache_stats.get("sets", 0),
            deletes=cache_stats.get("deletes", 0),
            evictions=cache_stats.get("evictions", 0),
            errors=cache_stats.get("errors", 0),
            hit_rate_percent=cache_stats.get("hit_rate_percent", 0.0),
            total_requests=cache_stats.get("total_requests", 0),
            redis_memory_used=cache_stats.get("redis_memory_used"),
            redis_memory_peak=cache_stats.get("redis_memory_peak"),
            redis_connected_clients=cache_stats.get("redis_connected_clients"),
        )

    except Exception as e:
        logger.error(f"Failed to get cache statistics: {e}")
        return CacheStatsResponse(
            cache_enabled=False,
            hits=0,
            misses=0,
            sets=0,
            deletes=0,
            evictions=0,
            errors=1,
            hit_rate_percent=0.0,
            total_requests=0,
        )


@router.delete("/cache/{owner}/{repo}")
async def invalidate_repository_cache(
    owner: str = Path(..., description="Repository owner"),
    repo: str = Path(..., description="Repository name"),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Invalidate cache for a specific repository.

    Args:
        owner: Repository owner
        repo: Repository name
        current_user: Current authenticated user

    Returns:
        Cache invalidation result
    """
    try:
        repository = f"{owner}/{repo}"
        deleted_count = await git_activity_cache.invalidate_repository(repository)

        logger.info(
            f"Cache invalidated for {repository} by user {current_user.login}: {deleted_count} entries"
        )

        return {
            "repository": repository,
            "invalidated_entries": deleted_count,
            "message": f"Successfully invalidated cache for {repository}",
        }

    except Exception as e:
        logger.error(f"Failed to invalidate cache for {owner}/{repo}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to invalidate repository cache: {str(e)}",
        )


@router.post("/cache/cleanup")
async def cleanup_expired_cache(
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Clean up expired cache entries.

    Returns:
        Cleanup operation result
    """
    try:
        deleted_count = await git_activity_cache.cleanup_expired()

        logger.info(
            f"Cache cleanup completed by user {current_user.login}: {deleted_count} entries removed"
        )

        return {
            "cleaned_entries": deleted_count,
            "message": f"Successfully cleaned up {deleted_count} expired cache entries",
        }

    except Exception as e:
        logger.error(f"Failed to cleanup expired cache: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cleanup expired cache: {str(e)}",
        )


@router.get("/heatmap/{owner}/{repo}")
async def get_repository_heatmap(
    owner: str = Path(..., description="Repository owner"),
    repo: str = Path(..., description="Repository name"),
    days_back: int = Query(365, description="Days of history", ge=1, le=1095),
    provider: GitProvider = Query(GitProvider.GITHUB, description="Git provider"),
    use_cache: bool = Query(True, description="Use cache"),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Get activity heatmap data for a repository.

    Returns:
        Repository activity heatmap data optimized for visualization
    """
    try:
        # Validate GitHub access token
        if not current_user.github_access_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="GitHub access token required",
            )

        # Calculate date range
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days_back)

        # Fetch commits and PRs
        tasks = [
            git_activity_service.get_repository_commits(
                current_user.github_access_token,
                owner,
                repo,
                provider,
                since=start_date,
                until=end_date,
            ),
            git_activity_service.get_repository_pull_requests(
                current_user.github_access_token,
                owner,
                repo,
                provider,
                since=start_date,
            ),
        ]

        commits, pull_requests = await asyncio.gather(*tasks)

        # Generate heatmap
        heatmap_data = git_activity_service.generate_activity_heatmap(
            commits, pull_requests, start_date, end_date
        )

        return {
            "repository": f"{owner}/{repo}",
            "provider": provider.value,
            "period_days": days_back,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "total_commits": len(commits),
            "total_prs": len(pull_requests),
            "heatmap_data": [
                {
                    "date": h.date,
                    "activity_count": h.activity_count,
                    "commit_count": h.commit_count,
                    "pr_count": h.pr_count,
                    "contributor_count": h.contributor_count,
                    "lines_added": h.lines_added,
                    "lines_deleted": h.lines_deleted,
                    "files_changed": h.files_changed,
                    "activity_types": h.activity_types,
                }
                for h in heatmap_data
            ],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Heatmap generation failed for {owner}/{repo}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate heatmap: {str(e)}",
        )
