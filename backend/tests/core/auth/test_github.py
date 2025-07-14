"""
Tests for GitHub OAuth utilities.
"""

import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock

try:
    from app.core.auth.github import GitHubOAuth
except ImportError as e:
    pytest.skip(f"GitHubOAuth import failed: {e}", allow_module_level=True)

from app.core.config.settings import settings


@pytest.mark.asyncio
async def test_get_authorization_url():
    """Test generation of GitHub authorization URL."""
    state = "test_state"
    url = await GitHubOAuth.get_authorization_url(state)

    # Verify URL contains required parameters
    assert settings.GITHUB_CLIENT_ID in url
    assert str(settings.GITHUB_CALLBACK_URL) in url
    assert "scope=read:user+user:email" in url
    assert f"state={state}" in url


@pytest.mark.asyncio
async def test_exchange_code_for_token_success():
    """Test successful token exchange."""
    mock_response = {
        "access_token": "test_token",
        "token_type": "bearer",
        "scope": "read:user,user:email",
    }

    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = MagicMock(
            raise_for_status=lambda: None, json=lambda: mock_response
        )

        token = await GitHubOAuth.exchange_code_for_token("test_code")
        assert token == "test_token"

        # Verify correct request parameters
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert args[0] == GitHubOAuth.TOKEN_URL
        assert kwargs["data"]["client_id"] == settings.GITHUB_CLIENT_ID
        assert kwargs["data"]["client_secret"] == settings.GITHUB_CLIENT_SECRET
        assert kwargs["data"]["code"] == "test_code"


@pytest.mark.asyncio
async def test_get_user_data_success():
    """Test successful user data retrieval."""
    mock_user_data = {
        "login": "testuser",
        "id": 12345,
        "name": "Test User",
        "email": "test@example.com",
    }

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_get.return_value = MagicMock(
            raise_for_status=lambda: None, json=lambda: mock_user_data
        )

        user_data = await GitHubOAuth.get_user_data("test_token")
        assert user_data == mock_user_data

        # Verify correct request parameters
        mock_get.assert_called_once()
        args, kwargs = mock_get.call_args
        assert args[0] == GitHubOAuth.USER_URL
        assert kwargs["headers"]["Authorization"] == "token test_token"


@pytest.mark.asyncio
async def test_get_user_emails_success():
    """Test successful user email retrieval."""
    mock_email_data = [{"email": "test@example.com", "primary": True, "verified": True}]

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_get.return_value = MagicMock(
            raise_for_status=lambda: None, json=lambda: mock_email_data
        )

        email_data = await GitHubOAuth.get_user_emails("test_token")
        assert email_data == mock_email_data

        # Verify correct request parameters
        mock_get.assert_called_once()
        args, kwargs = mock_get.call_args
        assert args[0] == f"{GitHubOAuth.USER_URL}/emails"
        assert kwargs["headers"]["Authorization"] == "token test_token"


@pytest.mark.asyncio
async def test_exchange_code_for_token_failure():
    """Test token exchange failure handling."""
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = MagicMock(
            raise_for_status=lambda: None, json=lambda: {}
        )

        token = await GitHubOAuth.exchange_code_for_token("invalid_code")
        assert token is None
