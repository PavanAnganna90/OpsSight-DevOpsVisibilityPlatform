"""
Tests for repository management providers (GitLab and Bitbucket).

This module tests the new provider integrations for repository management,
including discovery, authentication, and API functionality.
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import HTTPException

from app.services.gitlab.gitlab_repository_service import GitLabRepositoryService
from app.services.gitlab.gitlab_oauth import GitLabOAuth
from app.services.gitlab.gitlab_ci_service import GitLabCIService
from app.services.bitbucket.bitbucket_repository_service import BitbucketRepositoryService
from app.services.bitbucket.bitbucket_oauth import BitbucketOAuth


class TestGitLabRepositoryService:
    """Test cases for GitLab repository service."""
    
    @pytest.fixture
    def gitlab_service(self):
        """Create GitLab repository service instance."""
        return GitLabRepositoryService()
    
    @pytest.fixture
    def mock_gitlab_response(self):
        """Mock GitLab API response."""
        return {
            "id": 123,
            "name": "test-repo",
            "name_with_namespace": "testuser/test-repo",
            "path": "test-repo",
            "path_with_namespace": "testuser/test-repo",
            "description": "Test repository",
            "web_url": "https://gitlab.com/testuser/test-repo",
            "http_url_to_repo": "https://gitlab.com/testuser/test-repo.git",
            "ssh_url_to_repo": "git@gitlab.com:testuser/test-repo.git",
            "default_branch": "main",
            "tag_list": ["python", "api"],
            "topics": ["backend"],
            "visibility": "private",
            "namespace": {"id": 456, "name": "testuser", "path": "testuser"},
            "star_count": 5,
            "forks_count": 2,
            "open_issues_count": 3,
            "merge_requests_enabled": True,
            "issues_enabled": True,
            "wiki_enabled": True,
            "snippets_enabled": True,
            "ci_enabled": True,
            "builds_enabled": True,
            "shared_runners_enabled": True,
            "archived": False,
            "permissions": {"project_access": {"access_level": 40}},
            "created_at": "2024-01-01T00:00:00Z",
            "last_activity_at": "2024-01-15T12:00:00Z",
            "avatar_url": None,
        }
    
    @pytest.mark.asyncio
    async def test_discover_repositories_success(self, gitlab_service, mock_gitlab_response):
        """Test successful GitLab repository discovery."""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [mock_gitlab_response]
            mock_response.headers = {"X-Next-Page": None}
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            repositories = await gitlab_service.discover_repositories("test_token")
            
            assert len(repositories) == 1
            repo = repositories[0]
            assert repo.id == 123
            assert repo.name == "test-repo"
            assert repo.visibility == "private"
            assert repo.ci_enabled is True
    
    @pytest.mark.asyncio
    async def test_discover_repositories_with_query(self, gitlab_service, mock_gitlab_response):
        """Test GitLab repository discovery with search query."""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [mock_gitlab_response]
            mock_response.headers = {"X-Next-Page": None}
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            repositories = await gitlab_service.discover_repositories("test_token", query="test")
            
            assert len(repositories) == 1
            # Verify that query parameter was passed
            mock_client.return_value.__aenter__.return_value.get.assert_called()
            call_args = mock_client.return_value.__aenter__.return_value.get.call_args
            assert "search" in call_args[1]["params"]
            assert call_args[1]["params"]["search"] == "test"
    
    @pytest.mark.asyncio
    async def test_get_repository_details(self, gitlab_service, mock_gitlab_response):
        """Test getting detailed GitLab repository information."""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_gitlab_response
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            repo = await gitlab_service.get_repository_details("test_token", 123)
            
            assert repo is not None
            assert repo.id == 123
            assert repo.name == "test-repo"
            assert repo.merge_requests_enabled is True
    
    @pytest.mark.asyncio
    async def test_validate_repository_access_success(self, gitlab_service, mock_gitlab_response):
        """Test successful GitLab repository access validation."""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_gitlab_response
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            has_access = await gitlab_service.validate_repository_access("test_token", 123)
            
            assert has_access is True
    
    @pytest.mark.asyncio
    async def test_validate_repository_access_denied(self, gitlab_service):
        """Test GitLab repository access validation when access is denied."""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 403
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            with pytest.raises(HTTPException) as exc_info:
                await gitlab_service.validate_repository_access("test_token", 123)
            
            assert exc_info.value.status_code == 403
    
    @pytest.mark.asyncio
    async def test_get_repository_languages(self, gitlab_service):
        """Test getting GitLab repository languages."""
        languages_data = {"Python": 85.2, "JavaScript": 14.8}
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = languages_data
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            languages = await gitlab_service.get_repository_languages("test_token", 123)
            
            assert languages == languages_data
            assert "Python" in languages
            assert languages["Python"] == 85.2


class TestGitLabOAuth:
    """Test cases for GitLab OAuth service."""
    
    @pytest.fixture
    def gitlab_oauth(self):
        """Create GitLab OAuth service instance."""
        return GitLabOAuth()
    
    def test_generate_authorization_url(self, gitlab_oauth):
        """Test GitLab OAuth authorization URL generation."""
        url = gitlab_oauth.generate_authorization_url("test_state")
        
        assert "https://gitlab.com/oauth/authorize" in url
        assert "client_id=" in url
        assert "state=test_state" in url
        assert "scope=api" in url
    
    @pytest.mark.asyncio
    async def test_exchange_code_for_token_success(self, gitlab_oauth):
        """Test successful GitLab OAuth token exchange."""
        token_data = {
            "access_token": "glab_test_token",
            "token_type": "Bearer",
            "expires_in": 7200,
            "refresh_token": "glab_refresh_token",
            "scope": "api read_user read_repository"
        }
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = token_data
            
            mock_client.return_value.__aenter__.return_value.post.return_value = mock_response
            
            result = await gitlab_oauth.exchange_code_for_token("test_code")
            
            assert result == token_data
            assert result["access_token"] == "glab_test_token"
    
    @pytest.mark.asyncio
    async def test_get_user_info_success(self, gitlab_oauth):
        """Test successful GitLab user info retrieval."""
        user_data = {
            "id": 123,
            "username": "testuser",
            "name": "Test User",
            "email": "test@example.com",
            "avatar_url": "https://gitlab.com/avatar.png",
            "web_url": "https://gitlab.com/testuser"
        }
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = user_data
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            result = await gitlab_oauth.get_user_info("test_token")
            
            assert result == user_data
            assert result["username"] == "testuser"
    
    @pytest.mark.asyncio
    async def test_validate_token_success(self, gitlab_oauth):
        """Test successful GitLab token validation."""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            is_valid = await gitlab_oauth.validate_token("test_token")
            
            assert is_valid is True
    
    def test_is_configured_true(self, gitlab_oauth):
        """Test GitLab OAuth configuration check when properly configured."""
        gitlab_oauth.client_id = "test_client_id"
        gitlab_oauth.client_secret = "test_client_secret"
        gitlab_oauth.redirect_uri = "http://localhost:8000/callback"
        
        assert gitlab_oauth.is_configured() is True
    
    def test_is_configured_false(self, gitlab_oauth):
        """Test GitLab OAuth configuration check when not configured."""
        gitlab_oauth.client_id = ""
        gitlab_oauth.client_secret = ""
        gitlab_oauth.redirect_uri = ""
        
        assert gitlab_oauth.is_configured() is False


class TestBitbucketRepositoryService:
    """Test cases for Bitbucket repository service."""
    
    @pytest.fixture
    def bitbucket_service(self):
        """Create Bitbucket repository service instance."""
        return BitbucketRepositoryService()
    
    @pytest.fixture
    def mock_bitbucket_response(self):
        """Mock Bitbucket API response."""
        return {
            "uuid": "{12345678-1234-1234-1234-123456789abc}",
            "name": "test-repo",
            "full_name": "testuser/test-repo",
            "description": "Test repository",
            "website": "https://example.com",
            "scm": "git",
            "is_private": True,
            "has_issues": True,
            "has_wiki": True,
            "language": "Python",
            "size": 1024,
            "created_on": "2024-01-01T00:00:00Z",
            "updated_on": "2024-01-15T12:00:00Z",
            "fork_policy": "allow_forks",
            "mainbranch": {"name": "main"},
            "project": {"key": "TEST"},
            "owner": {"username": "testuser", "display_name": "Test User"},
            "links": {
                "clone": [
                    {"name": "https", "href": "https://bitbucket.org/testuser/test-repo.git"},
                    {"name": "ssh", "href": "git@bitbucket.org:testuser/test-repo.git"}
                ],
                "html": {"href": "https://bitbucket.org/testuser/test-repo"}
            }
        }
    
    @pytest.mark.asyncio
    async def test_discover_repositories_success(self, bitbucket_service, mock_bitbucket_response):
        """Test successful Bitbucket repository discovery."""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"values": [mock_bitbucket_response]}
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            repositories = await bitbucket_service.discover_repositories("test_token")
            
            assert len(repositories) == 1
            repo = repositories[0]
            assert repo.name == "test-repo"
            assert repo.is_private is True
            assert repo.language == "Python"
    
    @pytest.mark.asyncio
    async def test_get_repository_details(self, bitbucket_service, mock_bitbucket_response):
        """Test getting detailed Bitbucket repository information."""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_bitbucket_response
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            repo = await bitbucket_service.get_repository_details("test_token", "testuser", "test-repo")
            
            assert repo is not None
            assert repo.name == "test-repo"
            assert repo.has_issues is True
    
    @pytest.mark.asyncio
    async def test_validate_repository_access_success(self, bitbucket_service, mock_bitbucket_response):
        """Test successful Bitbucket repository access validation."""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_bitbucket_response
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            has_access = await bitbucket_service.validate_repository_access("test_token", "testuser", "test-repo")
            
            assert has_access is True
    
    @pytest.mark.asyncio
    async def test_search_repositories(self, bitbucket_service, mock_bitbucket_response):
        """Test Bitbucket repository search functionality."""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"values": [mock_bitbucket_response]}
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            repositories = await bitbucket_service.search_repositories("test_token", "test", per_page=10)
            
            assert len(repositories) == 1
            # Verify that search parameter was passed
            mock_client.return_value.__aenter__.return_value.get.assert_called()
            call_args = mock_client.return_value.__aenter__.return_value.get.call_args
            assert "q" in call_args[1]["params"]


class TestBitbucketOAuth:
    """Test cases for Bitbucket OAuth service."""
    
    @pytest.fixture
    def bitbucket_oauth(self):
        """Create Bitbucket OAuth service instance."""
        return BitbucketOAuth()
    
    def test_generate_authorization_url(self, bitbucket_oauth):
        """Test Bitbucket OAuth authorization URL generation."""
        url = bitbucket_oauth.generate_authorization_url("test_state")
        
        assert "https://bitbucket.org/site/oauth2/authorize" in url
        assert "client_id=" in url
        assert "state=test_state" in url
        assert "scope=repositories" in url
    
    @pytest.mark.asyncio
    async def test_exchange_code_for_token_success(self, bitbucket_oauth):
        """Test successful Bitbucket OAuth token exchange."""
        token_data = {
            "access_token": "bb_test_token",
            "token_type": "bearer",
            "expires_in": 3600,
            "refresh_token": "bb_refresh_token",
            "scopes": "repositories account"
        }
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = token_data
            
            mock_client.return_value.__aenter__.return_value.post.return_value = mock_response
            
            result = await bitbucket_oauth.exchange_code_for_token("test_code")
            
            assert result == token_data
            assert result["access_token"] == "bb_test_token"
    
    @pytest.mark.asyncio
    async def test_get_user_info_success(self, bitbucket_oauth):
        """Test successful Bitbucket user info retrieval."""
        user_data = {
            "uuid": "{12345678-1234-1234-1234-123456789abc}",
            "username": "testuser",
            "display_name": "Test User",
            "account_id": "557058:12345678-1234-1234-1234-123456789abc",
            "links": {
                "avatar": {"href": "https://bitbucket.org/avatar.png"},
                "html": {"href": "https://bitbucket.org/testuser"}
            }
        }
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = user_data
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            result = await bitbucket_oauth.get_user_info("test_token")
            
            assert result == user_data
            assert result["username"] == "testuser"


class TestGitLabCIService:
    """Test cases for GitLab CI/CD service."""
    
    @pytest.fixture
    def gitlab_ci_service(self):
        """Create GitLab CI service instance."""
        return GitLabCIService()
    
    @pytest.fixture
    def mock_pipeline_response(self):
        """Mock GitLab pipeline API response."""
        return {
            "id": 123,
            "project_id": 456,
            "status": "success",
            "ref": "main",
            "sha": "abc123def456",
            "web_url": "https://gitlab.com/testuser/test-repo/-/pipelines/123",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:10:00Z",
            "started_at": "2024-01-01T00:01:00Z",
            "finished_at": "2024-01-01T00:09:00Z",
            "duration": 480,
            "queued_duration": 5,
            "coverage": "85.2",
            "tag": False,
            "yaml_errors": None,
            "user": {"id": 789, "username": "testuser"},
            "source": "push"
        }
    
    @pytest.mark.asyncio
    async def test_get_project_pipelines(self, gitlab_ci_service, mock_pipeline_response):
        """Test getting GitLab project pipelines."""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [mock_pipeline_response]
            mock_response.headers = {"X-Next-Page": None}
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            pipelines = await gitlab_ci_service.get_project_pipelines("test_token", 456)
            
            assert len(pipelines) == 1
            pipeline = pipelines[0]
            assert pipeline.id == 123
            assert pipeline.status == "success"
            assert pipeline.duration == 480
    
    @pytest.mark.asyncio
    async def test_get_pipeline_statistics(self, gitlab_ci_service):
        """Test getting GitLab pipeline statistics."""
        mock_pipelines = [
            {"status": "success", "duration": 300},
            {"status": "success", "duration": 400},
            {"status": "failed", "duration": 200},
            {"status": "running", "duration": None},
        ]
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_pipelines
            mock_response.headers = {"X-Next-Page": None}
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            stats = await gitlab_ci_service.get_pipeline_statistics("test_token", 456)
            
            assert stats["total_pipelines"] == 4
            assert stats["success_count"] == 2
            assert stats["failed_count"] == 1
            assert stats["running_count"] == 1
            assert stats["success_rate"] == 66.67  # 2 out of 3 completed


class TestRepositoryManagerIntegration:
    """Integration tests for repository management with multiple providers."""
    
    @pytest.mark.asyncio
    async def test_provider_discovery_integration(self):
        """Test that all providers can be discovered correctly."""
        # This would be an integration test with the repository management service
        # Testing that GitLab and Bitbucket are properly integrated
        
        from app.services.repository_management_service import RepositoryConnectionType
        
        # Verify all expected providers are available
        providers = list(RepositoryConnectionType)
        assert RepositoryConnectionType.GITHUB in providers
        assert RepositoryConnectionType.GITLAB in providers
        assert RepositoryConnectionType.BITBUCKET in providers
        assert RepositoryConnectionType.AZURE_DEVOPS in providers
    
    @pytest.mark.asyncio
    async def test_multi_provider_support(self):
        """Test that the system can handle multiple providers simultaneously."""
        # This test would verify that the repository management service
        # can handle connections to multiple providers at once
        pass


if __name__ == "__main__":
    pytest.main([__file__])