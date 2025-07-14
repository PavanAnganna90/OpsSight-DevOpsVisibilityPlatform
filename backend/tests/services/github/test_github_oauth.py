"""
Tests for GitHub OAuth service.
"""

import pytest
from unittest.mock import patch, AsyncMock
from fastapi import HTTPException

from app.services.github.github_oauth import GitHubOAuth
from app.core.config import settings


@pytest.fixture
def oauth_service():
    """Fixture to create a GitHubOAuth instance with mock credentials."""
    with patch.object(settings, "GITHUB_CLIENT_ID", "mock_id"):
        with patch.object(settings, "GITHUB_CLIENT_SECRET", "mock_secret"):
            return GitHubOAuth()


@pytest.mark.asyncio
async def test_get_access_token_success(oauth_service):
    """
    Test successful access token retrieval.

    Expected use case: Valid code returns access token
    """
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"access_token": "mock_token"}

    with patch("httpx.AsyncClient.post", return_value=mock_response):
        token = await oauth_service.get_access_token("valid_code")
        assert token == "mock_token"


@pytest.mark.asyncio
async def test_get_access_token_error(oauth_service):
    """
    Test access token retrieval with error response.

    Edge case: GitHub returns error in response
    """
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "error": "bad_verification_code",
        "error_description": "The code passed is incorrect",
    }

    with patch("httpx.AsyncClient.post", return_value=mock_response):
        with pytest.raises(HTTPException) as exc_info:
            await oauth_service.get_access_token("invalid_code")
        assert exc_info.value.status_code == 401
        assert "The code passed is incorrect" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_get_access_token_http_error(oauth_service):
    """
    Test access token retrieval with HTTP error.

    Failure case: GitHub API returns non-200 status
    """
    mock_response = AsyncMock()
    mock_response.status_code = 500

    with patch("httpx.AsyncClient.post", return_value=mock_response):
        with pytest.raises(HTTPException) as exc_info:
            await oauth_service.get_access_token("valid_code")
        assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_get_user_info_success(oauth_service):
    """
    Test successful user info retrieval.

    Expected use case: Valid token returns user data
    """
    mock_user_data = {"id": 123, "login": "testuser", "email": "test@example.com"}
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_user_data

    with patch("httpx.AsyncClient.get", return_value=mock_response):
        user_info = await oauth_service.get_user_info("valid_token")
        assert user_info == mock_user_data


@pytest.mark.asyncio
async def test_get_user_info_error(oauth_service):
    """
    Test user info retrieval with error.

    Failure case: GitHub API returns error
    """
    mock_response = AsyncMock()
    mock_response.status_code = 401

    with patch("httpx.AsyncClient.get", return_value=mock_response):
        with pytest.raises(HTTPException) as exc_info:
            await oauth_service.get_user_info("invalid_token")
        assert exc_info.value.status_code == 401
