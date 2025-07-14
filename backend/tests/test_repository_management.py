"""
Tests for Repository Management Service and API Endpoints
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.services.repository_management_service import (
    RepositoryManagementService,
    RepositoryConnectionType,
    RepositoryCredentialType,
    RepositoryStatus,
    RepositoryConnection
)
from app.services.github.github_repository_service import GitHubRepository
from app.core.cache import CacheService
from app.core.security_monitor import SecurityMonitor
from app.models.user import User


# Test Database Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_repository_management.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


class TestRepositoryManagementService:
    """Test cases for RepositoryManagementService"""
    
    @pytest.fixture
    def mock_db(self):
        db = MagicMock()
        # Mock user with GitHub token
        mock_user = MagicMock()
        mock_user.id = "test_user_123"
        mock_user.github_access_token = "test_token"
        db.query.return_value.filter.return_value.first.return_value = mock_user
        return db
    
    @pytest.fixture
    def mock_cache(self):
        cache = AsyncMock(spec=CacheService)
        cache.get.return_value = None
        cache.set.return_value = None
        cache.delete.return_value = None
        cache.delete_pattern.return_value = None
        return cache
    
    @pytest.fixture
    def mock_security_monitor(self):
        monitor = AsyncMock(spec=SecurityMonitor)
        monitor.log_security_event.return_value = None
        return monitor
    
    @pytest.fixture
    async def repository_service(self, mock_db, mock_cache, mock_security_monitor):
        service = RepositoryManagementService(mock_db, mock_cache, mock_security_monitor)
        service.github_service = AsyncMock()
        service.github_actions_service = AsyncMock()
        service.http_client = AsyncMock()
        return service
    
    @pytest.mark.asyncio
    async def test_discover_repositories_github(self, repository_service):
        """Test GitHub repository discovery"""
        # Mock GitHub repositories
        mock_repos = [
            GitHubRepository(
                id=1,
                name="test-repo",
                full_name="user/test-repo",
                description="Test repository",
                html_url="https://github.com/user/test-repo",
                clone_url="https://github.com/user/test-repo.git",
                ssh_url="git@github.com:user/test-repo.git",
                default_branch="main",
                language="Python",
                visibility="private",
                size=1024,
                stargazers_count=5,
                watchers_count=3,
                forks_count=2,
                open_issues_count=1,
                has_actions=True,
                permissions={"admin": True, "push": True, "pull": True},
                created_at="2024-01-01T00:00:00Z",
                updated_at="2024-01-16T10:00:00Z",
                pushed_at="2024-01-16T09:00:00Z"
            )
        ]
        
        repository_service.github_service.list_user_repositories.return_value = (mock_repos, {})
        
        result = await repository_service.discover_repositories(
            user_id="test_user_123",
            connection_type=RepositoryConnectionType.GITHUB
        )
        
        assert len(result) == 1
        assert result[0].name == "test-repo"
        assert result[0].full_name == "user/test-repo"
        repository_service.cache.set.assert_called()
    
    @pytest.mark.asyncio
    async def test_connect_repository_github(self, repository_service):
        """Test connecting a GitHub repository"""
        repository_service._validate_repository_connection = AsyncMock(return_value=True)
        repository_service._store_repository_connection = AsyncMock()
        repository_service._perform_initial_sync = AsyncMock()
        
        connection = await repository_service.connect_repository(
            user_id="test_user_123",
            repository_url="https://github.com/user/test-repo",
            connection_type=RepositoryConnectionType.GITHUB,
            credential_type=RepositoryCredentialType.OAUTH_TOKEN,
            credentials={"access_token": "test_token"},
            name="test-repo"
        )
        
        assert connection.name == "test-repo"
        assert connection.connection_type == RepositoryConnectionType.GITHUB
        assert connection.status == RepositoryStatus.SYNCING
        assert connection.user_id == "test_user_123"
        
        repository_service._validate_repository_connection.assert_called_once()
        repository_service._store_repository_connection.assert_called()
        repository_service._perform_initial_sync.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_disconnect_repository(self, repository_service):
        """Test disconnecting a repository"""
        # Mock existing connection
        mock_connection = RepositoryConnection(
            id="test_conn_123",
            name="test-repo",
            connection_type=RepositoryConnectionType.GITHUB,
            repository_url="https://github.com/user/test-repo",
            credential_type=RepositoryCredentialType.OAUTH_TOKEN,
            status=RepositoryStatus.ACTIVE,
            user_id="test_user_123"
        )
        
        repository_service._get_repository_connection = AsyncMock(return_value=mock_connection)
        repository_service._store_repository_connection = AsyncMock()
        
        result = await repository_service.disconnect_repository(
            connection_id="test_conn_123",
            user_id="test_user_123"
        )
        
        assert result is True
        assert mock_connection.status == RepositoryStatus.DISCONNECTED
        repository_service.cache.delete_pattern.assert_called()
        repository_service.security_monitor.log_security_event.assert_called()
    
    @pytest.mark.asyncio
    async def test_get_repository_status(self, repository_service):
        """Test getting repository status"""
        mock_connection = RepositoryConnection(
            id="test_conn_123",
            name="test-repo",
            connection_type=RepositoryConnectionType.GITHUB,
            repository_url="https://github.com/user/test-repo",
            credential_type=RepositoryCredentialType.OAUTH_TOKEN,
            status=RepositoryStatus.ACTIVE,
            user_id="test_user_123",
            last_sync=datetime.utcnow()
        )
        
        repository_service._get_repository_connection = AsyncMock(return_value=mock_connection)
        repository_service._get_repository_health_metrics = AsyncMock(return_value={
            "health_score": 85.0,
            "commit_frequency": 4.2
        })
        repository_service._get_recent_activity = AsyncMock(return_value=[])
        repository_service._get_ci_status = AsyncMock(return_value={"status": "passing"})
        repository_service._get_security_status = AsyncMock(return_value={"security_alerts": 0})
        
        status = await repository_service.get_repository_status(
            connection_id="test_conn_123",
            user_id="test_user_123"
        )
        
        assert status["connection_id"] == "test_conn_123"
        assert status["name"] == "test-repo"
        assert status["status"] == RepositoryStatus.ACTIVE
        assert "health_metrics" in status
        assert "recent_activity" in status
        assert "ci_status" in status
        assert "security_status" in status
    
    @pytest.mark.asyncio
    async def test_sync_repository(self, repository_service):
        """Test repository synchronization"""
        mock_connection = RepositoryConnection(
            id="test_conn_123",
            name="test-repo",
            connection_type=RepositoryConnectionType.GITHUB,
            repository_url="https://github.com/user/test-repo",
            credential_type=RepositoryCredentialType.OAUTH_TOKEN,
            status=RepositoryStatus.ACTIVE,
            user_id="test_user_123",
            last_sync=datetime.utcnow() - timedelta(hours=1)  # Old sync
        )
        
        repository_service._get_repository_connection = AsyncMock(return_value=mock_connection)
        repository_service._store_repository_connection = AsyncMock()
        repository_service._perform_repository_sync = AsyncMock(return_value={
            "success": True,
            "synced_items": {"commits": 5, "branches": 2}
        })
        
        result = await repository_service.sync_repository(
            connection_id="test_conn_123",
            user_id="test_user_123",
            force=False
        )
        
        assert result["status"] == "completed"
        assert result["sync_result"]["success"] is True
        assert mock_connection.status == RepositoryStatus.ACTIVE
        repository_service.cache.delete.assert_called_with("repo_status:test_conn_123")
    
    @pytest.mark.asyncio
    async def test_monitor_repositories(self, repository_service):
        """Test repository monitoring"""
        mock_connections = [
            RepositoryConnection(
                id="conn_1",
                name="repo1",
                connection_type=RepositoryConnectionType.GITHUB,
                repository_url="https://github.com/user/repo1",
                credential_type=RepositoryCredentialType.OAUTH_TOKEN,
                status=RepositoryStatus.ACTIVE,
                user_id="test_user_123"
            ),
            RepositoryConnection(
                id="conn_2",
                name="repo2",
                connection_type=RepositoryConnectionType.GITHUB,
                repository_url="https://github.com/user/repo2",
                credential_type=RepositoryCredentialType.OAUTH_TOKEN,
                status=RepositoryStatus.ACTIVE,
                user_id="test_user_123"
            )
        ]
        
        repository_service._get_repository_connections = AsyncMock(return_value=mock_connections)
        repository_service._monitor_single_repository = AsyncMock(side_effect=[
            {"connection_id": "conn_1", "status": "active", "health_score": 85.0},
            {"connection_id": "conn_2", "status": "active", "health_score": 90.0}
        ])
        
        results = await repository_service.monitor_repositories(user_id="test_user_123")
        
        assert len(results) == 2
        assert results[0]["connection_id"] == "conn_1"
        assert results[1]["connection_id"] == "conn_2"
    
    @pytest.mark.asyncio
    async def test_get_repository_analytics(self, repository_service):
        """Test repository analytics"""
        mock_connection = RepositoryConnection(
            id="test_conn_123",
            name="test-repo",
            connection_type=RepositoryConnectionType.GITHUB,
            repository_url="https://github.com/user/test-repo",
            credential_type=RepositoryCredentialType.OAUTH_TOKEN,
            status=RepositoryStatus.ACTIVE,
            user_id="test_user_123"
        )
        
        repository_service._get_repository_connection = AsyncMock(return_value=mock_connection)
        repository_service._get_commit_analytics = AsyncMock(return_value={"total_commits": 45})
        repository_service._get_pr_analytics = AsyncMock(return_value={"total_prs": 12})
        repository_service._get_issue_analytics = AsyncMock(return_value={"total_issues": 25})
        repository_service._get_ci_analytics = AsyncMock(return_value={"total_builds": 48})
        repository_service._get_contributor_analytics = AsyncMock(return_value={"active_contributors": 5})
        repository_service._get_code_quality_trends = AsyncMock(return_value={"current_score": 88.0})
        
        analytics = await repository_service.get_repository_analytics(
            connection_id="test_conn_123",
            user_id="test_user_123",
            time_range="30d"
        )
        
        assert analytics["connection_id"] == "test_conn_123"
        assert analytics["time_range"] == "30d"
        assert "commit_analytics" in analytics
        assert "pr_analytics" in analytics
        assert "issue_analytics" in analytics
        assert "ci_analytics" in analytics
        assert "contributor_analytics" in analytics
        assert "code_quality_trends" in analytics
    
    @pytest.mark.asyncio
    async def test_validate_repository_connection_github(self, repository_service):
        """Test repository connection validation for GitHub"""
        repository_service.github_service.get_repository_details = AsyncMock(return_value=MagicMock())
        
        result = await repository_service._validate_repository_connection(
            repository_url="https://github.com/user/test-repo",
            connection_type=RepositoryConnectionType.GITHUB,
            credentials={"access_token": "test_token"}
        )
        
        assert result is True
        repository_service.github_service.get_repository_details.assert_called_once_with(
            "test_token", "user", "test-repo"
        )
    
    @pytest.mark.asyncio
    async def test_validate_repository_connection_invalid_url(self, repository_service):
        """Test repository connection validation with invalid URL"""
        with pytest.raises(ValueError, match="Invalid GitHub repository URL"):
            await repository_service._validate_repository_connection(
                repository_url="https://github.com/invalid",
                connection_type=RepositoryConnectionType.GITHUB,
                credentials={"access_token": "test_token"}
            )


class TestRepositoryManagementAPI:
    """Test cases for Repository Management API endpoints"""
    
    def test_discover_repositories_endpoint(self):
        """Test repository discovery endpoint"""
        payload = {
            "connection_type": "github",
            "filters": {"visibility": "all"}
        }
        
        with patch('app.services.repository_management_service.RepositoryManagementService') as mock_service:
            mock_instance = AsyncMock()
            mock_service.return_value.__aenter__.return_value = mock_instance
            mock_instance.discover_repositories.return_value = [
                GitHubRepository(
                    id=1, name="test-repo", full_name="user/test-repo",
                    description="Test", html_url="https://github.com/user/test-repo",
                    clone_url="https://github.com/user/test-repo.git",
                    ssh_url="git@github.com:user/test-repo.git",
                    default_branch="main", language="Python", visibility="private",
                    size=1024, stargazers_count=5, watchers_count=3, forks_count=2,
                    open_issues_count=1, has_actions=True, permissions={},
                    created_at="2024-01-01T00:00:00Z", updated_at="2024-01-16T10:00:00Z",
                    pushed_at="2024-01-16T09:00:00Z"
                )
            ]
            
            # Mock authentication
            with patch('app.core.security.get_current_user') as mock_auth:
                mock_user = MagicMock()
                mock_user.id = "test_user"
                mock_auth.return_value = mock_user
                
                response = client.post("/api/v1/repositories/discover", json=payload)
                
                assert response.status_code == 200
                data = response.json()
                assert len(data) == 1
                assert data[0]["name"] == "test-repo"
    
    def test_connect_repository_endpoint(self):
        """Test repository connection endpoint"""
        payload = {
            "name": "test-repo",
            "repository_url": "https://github.com/user/test-repo",
            "connection_type": "github",
            "credential_type": "oauth_token",
            "credentials": {"access_token": "test_token"}
        }
        
        with patch('app.services.repository_management_service.RepositoryManagementService') as mock_service:
            mock_instance = AsyncMock()
            mock_service.return_value.__aenter__.return_value = mock_instance
            
            mock_connection = RepositoryConnection(
                id="conn_123",
                name="test-repo",
                connection_type=RepositoryConnectionType.GITHUB,
                repository_url="https://github.com/user/test-repo",
                credential_type=RepositoryCredentialType.OAUTH_TOKEN,
                status=RepositoryStatus.ACTIVE,
                user_id="test_user"
            )
            mock_instance.connect_repository.return_value = mock_connection
            
            with patch('app.core.security.get_current_user') as mock_auth:
                mock_user = MagicMock()
                mock_user.id = "test_user"
                mock_auth.return_value = mock_user
                
                response = client.post("/api/v1/repositories/connect", json=payload)
                
                assert response.status_code == 200
                data = response.json()
                assert data["name"] == "test-repo"
                assert data["connection_type"] == "github"
    
    def test_get_repository_status_endpoint(self):
        """Test repository status endpoint"""
        with patch('app.services.repository_management_service.RepositoryManagementService') as mock_service:
            mock_instance = AsyncMock()
            mock_service.return_value.__aenter__.return_value = mock_instance
            mock_instance.get_repository_status.return_value = {
                "connection_id": "conn_123",
                "name": "test-repo",
                "status": "active",
                "health_metrics": {"health_score": 85.0},
                "recent_activity": [],
                "ci_status": {"status": "passing"},
                "security_status": {"security_alerts": 0},
                "updated_at": "2024-01-16T10:00:00Z"
            }
            
            with patch('app.core.security.get_current_user') as mock_auth:
                mock_user = MagicMock()
                mock_user.id = "test_user"
                mock_auth.return_value = mock_user
                
                response = client.get("/api/v1/repositories/connections/conn_123/status")
                
                assert response.status_code == 200
                data = response.json()
                assert data["connection_id"] == "conn_123"
                assert data["name"] == "test-repo"
                assert data["status"] == "active"
    
    def test_sync_repository_endpoint(self):
        """Test repository sync endpoint"""
        with patch('app.services.repository_management_service.RepositoryManagementService') as mock_service:
            mock_instance = AsyncMock()
            mock_service.return_value.__aenter__.return_value = mock_instance
            mock_instance.sync_repository.return_value = {
                "status": "completed",
                "sync_result": {"success": True},
                "last_sync": "2024-01-16T10:00:00Z"
            }
            
            with patch('app.core.security.get_current_user') as mock_auth:
                mock_user = MagicMock()
                mock_user.id = "test_user"
                mock_auth.return_value = mock_user
                
                response = client.post("/api/v1/repositories/connections/conn_123/sync")
                
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "completed"
    
    def test_disconnect_repository_endpoint(self):
        """Test repository disconnect endpoint"""
        with patch('app.services.repository_management_service.RepositoryManagementService') as mock_service:
            mock_instance = AsyncMock()
            mock_service.return_value.__aenter__.return_value = mock_instance
            mock_instance.disconnect_repository.return_value = True
            
            with patch('app.core.security.get_current_user') as mock_auth:
                mock_user = MagicMock()
                mock_user.id = "test_user"
                mock_auth.return_value = mock_user
                
                response = client.delete("/api/v1/repositories/connections/conn_123")
                
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "disconnected"
    
    def test_get_supported_providers_endpoint(self):
        """Test supported providers endpoint"""
        response = client.get("/api/v1/repositories/providers")
        
        assert response.status_code == 200
        data = response.json()
        assert "providers" in data
        assert len(data["providers"]) > 0
        
        # Check GitHub provider exists
        github_provider = next((p for p in data["providers"] if p["type"] == "github"), None)
        assert github_provider is not None
        assert github_provider["name"] == "GitHub"
    
    def test_repository_management_health_endpoint(self):
        """Test repository management health endpoint"""
        response = client.get("/api/v1/repositories/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data


if __name__ == "__main__":
    pytest.main([__file__])