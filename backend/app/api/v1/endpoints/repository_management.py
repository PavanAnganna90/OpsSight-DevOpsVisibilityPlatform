"""
Repository Management API Endpoints
Handles repository discovery, connection management, and status monitoring
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, Field, validator

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.logger import logger
from app.core.cache import CacheService
from app.core.security_monitor import SecurityMonitor
from app.models.user import User
from app.services.repository_management_service import (
    RepositoryManagementService,
    RepositoryConnectionType,
    RepositoryCredentialType,
    RepositoryStatus
)

router = APIRouter()


# Pydantic Models
class RepositoryDiscoveryRequest(BaseModel):
    connection_type: str = Field("github", description="Repository provider type")
    access_token: Optional[str] = Field(None, description="Optional access token override")
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Discovery filters")


class RepositoryConnectionRequest(BaseModel):
    name: str = Field(..., description="Repository name")
    repository_url: str = Field(..., description="Repository URL")
    connection_type: str = Field("github", description="Repository provider type")
    credential_type: str = Field("oauth_token", description="Credential type")
    credentials: Dict[str, Any] = Field(..., description="Connection credentials")
    project_id: Optional[str] = Field(None, description="Optional project ID")
    
    @validator("repository_url")
    def validate_repository_url(cls, v):
        if not v.startswith(("https://", "git@")):
            raise ValueError("Repository URL must be a valid HTTPS or SSH URL")
        return v


class RepositoryConnectionResponse(BaseModel):
    id: str
    name: str
    connection_type: str
    repository_url: str
    status: str
    last_sync: Optional[str]
    created_at: str
    metadata: Dict[str, Any]


class RepositoryStatusResponse(BaseModel):
    connection_id: str
    name: str
    status: str
    health_metrics: Dict[str, Any]
    recent_activity: List[Dict[str, Any]]
    ci_status: Dict[str, Any]
    security_status: Dict[str, Any]
    updated_at: str


class RepositoryAnalyticsResponse(BaseModel):
    connection_id: str
    time_range: str
    commit_analytics: Dict[str, Any]
    pr_analytics: Dict[str, Any]
    issue_analytics: Dict[str, Any]
    ci_analytics: Dict[str, Any]
    contributor_analytics: Dict[str, Any]
    code_quality_trends: Dict[str, Any]
    generated_at: str


# Repository Discovery Endpoints
@router.post("/discover", response_model=List[Dict[str, Any]])
async def discover_repositories(
    request: RepositoryDiscoveryRequest,
    db: Session = Depends(get_db),
    cache: CacheService = Depends(lambda: CacheService()),
    security_monitor: SecurityMonitor = Depends(lambda: SecurityMonitor()),
    current_user: User = Depends(get_current_user)
):
    """Discover available repositories for the current user"""
    try:
        async with RepositoryManagementService(db, cache, security_monitor) as service:
            repositories = await service.discover_repositories(
                user_id=current_user.id,
                connection_type=RepositoryConnectionType(request.connection_type),
                access_token=request.access_token,
                filters=request.filters
            )
            
            # Convert to dict format for response
            return [repo.__dict__ for repo in repositories]
            
    except ValueError as e:
        logger.warning(f"Invalid discovery request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to discover repositories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to discover repositories"
        )


@router.get("/search")
async def search_repositories(
    query: str = Query(..., description="Search query"),
    connection_type: str = Query("github", description="Repository provider"),
    sort: str = Query("updated", description="Sort order"),
    per_page: int = Query(30, ge=1, le=100, description="Results per page"),
    page: int = Query(1, ge=1, description="Page number"),
    db: Session = Depends(get_db),
    cache: CacheService = Depends(lambda: CacheService()),
    security_monitor: SecurityMonitor = Depends(lambda: SecurityMonitor()),
    current_user: User = Depends(get_current_user)
):
    """Search repositories across providers"""
    try:
        # For now, implement GitHub search (extend for other providers)
        if connection_type == "github":
            from app.services.github.github_repository_service import github_repository_service
            
            # Get user's GitHub token
            if not current_user.github_access_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="GitHub access token required"
                )
            
            repositories, pagination = await github_repository_service.search_repositories(
                access_token=current_user.github_access_token,
                query=query,
                sort=sort,
                per_page=per_page,
                page=page
            )
            
            return {
                "repositories": [repo.__dict__ for repo in repositories],
                "pagination": pagination
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Search not supported for {connection_type}"
            )
            
    except Exception as e:
        logger.error(f"Failed to search repositories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search repositories"
        )


# Repository Connection Management
@router.post("/connect", response_model=RepositoryConnectionResponse)
async def connect_repository(
    request: RepositoryConnectionRequest,
    db: Session = Depends(get_db),
    cache: CacheService = Depends(lambda: CacheService()),
    security_monitor: SecurityMonitor = Depends(lambda: SecurityMonitor()),
    current_user: User = Depends(get_current_user)
):
    """Connect a repository to the platform"""
    try:
        async with RepositoryManagementService(db, cache, security_monitor) as service:
            connection = await service.connect_repository(
                user_id=current_user.id,
                repository_url=request.repository_url,
                connection_type=RepositoryConnectionType(request.connection_type),
                credential_type=RepositoryCredentialType(request.credential_type),
                credentials=request.credentials,
                name=request.name,
                project_id=request.project_id
            )
            
            return RepositoryConnectionResponse(
                id=connection.id,
                name=connection.name,
                connection_type=connection.connection_type,
                repository_url=connection.repository_url,
                status=connection.status,
                last_sync=connection.last_sync.isoformat() if connection.last_sync else None,
                created_at=connection.created_at.isoformat(),
                metadata={k: v for k, v in connection.metadata.items() if k != "credentials"}
            )
            
    except ValueError as e:
        logger.warning(f"Invalid connection request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to connect repository: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to connect repository"
        )


@router.delete("/connections/{connection_id}")
async def disconnect_repository(
    connection_id: str,
    db: Session = Depends(get_db),
    cache: CacheService = Depends(lambda: CacheService()),
    security_monitor: SecurityMonitor = Depends(lambda: SecurityMonitor()),
    current_user: User = Depends(get_current_user)
):
    """Disconnect a repository from the platform"""
    try:
        async with RepositoryManagementService(db, cache, security_monitor) as service:
            success = await service.disconnect_repository(
                connection_id=connection_id,
                user_id=current_user.id
            )
            
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Repository connection not found"
                )
            
            return {"status": "disconnected", "connection_id": connection_id}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to disconnect repository: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disconnect repository"
        )


@router.get("/connections", response_model=List[RepositoryConnectionResponse])
async def list_repository_connections(
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
    cache: CacheService = Depends(lambda: CacheService()),
    security_monitor: SecurityMonitor = Depends(lambda: SecurityMonitor()),
    current_user: User = Depends(get_current_user)
):
    """List all repository connections for the current user"""
    try:
        async with RepositoryManagementService(db, cache, security_monitor) as service:
            connections = await service._get_repository_connections(
                user_id=current_user.id,
                project_id=project_id
            )
            
            # Filter by status if provided
            if status:
                connections = [c for c in connections if c.status == status]
            
            return [
                RepositoryConnectionResponse(
                    id=conn.id,
                    name=conn.name,
                    connection_type=conn.connection_type,
                    repository_url=conn.repository_url,
                    status=conn.status,
                    last_sync=conn.last_sync.isoformat() if conn.last_sync else None,
                    created_at=conn.created_at.isoformat(),
                    metadata={k: v for k, v in conn.metadata.items() if k != "credentials"}
                )
                for conn in connections
            ]
            
    except Exception as e:
        logger.error(f"Failed to list repository connections: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list repository connections"
        )


# Repository Status and Monitoring
@router.get("/connections/{connection_id}/status", response_model=RepositoryStatusResponse)
async def get_repository_status(
    connection_id: str,
    db: Session = Depends(get_db),
    cache: CacheService = Depends(lambda: CacheService()),
    security_monitor: SecurityMonitor = Depends(lambda: SecurityMonitor()),
    current_user: User = Depends(get_current_user)
):
    """Get current status for a repository connection"""
    try:
        async with RepositoryManagementService(db, cache, security_monitor) as service:
            status_info = await service.get_repository_status(
                connection_id=connection_id,
                user_id=current_user.id
            )
            
            return RepositoryStatusResponse(**status_info)
            
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get repository status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get repository status"
        )


@router.post("/connections/{connection_id}/sync")
async def sync_repository(
    connection_id: str,
    force: bool = Query(False, description="Force sync even if recently synced"),
    db: Session = Depends(get_db),
    cache: CacheService = Depends(lambda: CacheService()),
    security_monitor: SecurityMonitor = Depends(lambda: SecurityMonitor()),
    current_user: User = Depends(get_current_user)
):
    """Manually sync a repository"""
    try:
        async with RepositoryManagementService(db, cache, security_monitor) as service:
            result = await service.sync_repository(
                connection_id=connection_id,
                user_id=current_user.id,
                force=force
            )
            
            return result
            
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to sync repository: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sync repository"
        )


@router.get("/monitor")
async def monitor_repositories(
    project_id: Optional[str] = Query(None, description="Monitor repositories for specific project"),
    db: Session = Depends(get_db),
    cache: CacheService = Depends(lambda: CacheService()),
    security_monitor: SecurityMonitor = Depends(lambda: SecurityMonitor()),
    current_user: User = Depends(get_current_user)
):
    """Monitor all repositories for the current user"""
    try:
        async with RepositoryManagementService(db, cache, security_monitor) as service:
            monitoring_results = await service.monitor_repositories(
                user_id=current_user.id,
                project_id=project_id
            )
            
            return {
                "monitoring_results": monitoring_results,
                "total_repositories": len(monitoring_results),
                "healthy_repositories": len([r for r in monitoring_results if r.get("health_score", 0) > 80]),
                "monitored_at": datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Failed to monitor repositories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to monitor repositories"
        )


# Repository Analytics
@router.get("/connections/{connection_id}/analytics", response_model=RepositoryAnalyticsResponse)
async def get_repository_analytics(
    connection_id: str,
    time_range: str = Query("30d", description="Analytics time range (7d, 30d, 90d)"),
    db: Session = Depends(get_db),
    cache: CacheService = Depends(lambda: CacheService()),
    security_monitor: SecurityMonitor = Depends(lambda: SecurityMonitor()),
    current_user: User = Depends(get_current_user)
):
    """Get analytics for a repository connection"""
    try:
        async with RepositoryManagementService(db, cache, security_monitor) as service:
            analytics = await service.get_repository_analytics(
                connection_id=connection_id,
                user_id=current_user.id,
                time_range=time_range
            )
            
            return RepositoryAnalyticsResponse(**analytics)
            
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get repository analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get repository analytics"
        )


# Repository Configuration
@router.get("/providers")
async def get_supported_providers():
    """Get list of supported repository providers"""
    return {
        "providers": [
            {
                "type": "github",
                "name": "GitHub",
                "description": "GitHub.com and GitHub Enterprise",
                "credential_types": ["oauth_token", "personal_access_token"],
                "features": ["discovery", "monitoring", "analytics", "ci_integration"],
                "status": "available"
            },
            {
                "type": "gitlab",
                "name": "GitLab", 
                "description": "GitLab.com and GitLab self-hosted",
                "credential_types": ["oauth_token", "personal_access_token"],
                "features": ["discovery", "monitoring", "analytics", "ci_integration"],
                "status": "available"
            },
            {
                "type": "bitbucket",
                "name": "Bitbucket",
                "description": "Atlassian Bitbucket Cloud and Server",
                "credential_types": ["oauth_token", "app_password"],
                "features": ["discovery", "monitoring", "analytics"],
                "status": "available"
            },
            {
                "type": "azure_devops",
                "name": "Azure DevOps",
                "description": "Microsoft Azure DevOps Services and Server",
                "credential_types": ["oauth_token", "personal_access_token"],
                "features": ["discovery", "monitoring", "analytics", "ci_integration"],
                "status": "coming_soon"
            }
        ]
    }


@router.get("/health")
async def get_repository_management_health(
    db: Session = Depends(get_db),
    cache: CacheService = Depends(lambda: CacheService())
):
    """Health check for repository management service"""
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        
        # Test cache connection
        await cache.set("repo_health_check", "ok", ttl=10)
        health_check = await cache.get("repo_health_check")
        
        if health_check != "ok":
            raise Exception("Cache health check failed")
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "connected",
            "cache": "connected",
            "services": {
                "github_integration": "available",
                "monitoring": "active",
                "analytics": "available"
            }
        }
        
    except Exception as e:
        logger.error(f"Repository management health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unhealthy"
        )