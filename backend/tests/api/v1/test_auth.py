import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.config import settings
from app.api.v1.endpoints.auth import get_current_user
from app.schemas.user import User


@pytest.mark.asyncio
async def test_github_login_success():
    """
    Test successful GitHub OAuth login flow.

    Expected use case: Valid GitHub code returns redirect message (stub)
    """
    mock_token = "mock_github_token"
    mock_user_data = {"id": 123, "email": "test@example.com", "name": "Test User"}

    transport = ASGITransport(app=app)
    with patch(
        "app.services.github.github_oauth.github_oauth.get_access_token"
    ) as mock_get_token:
        with patch(
            "app.services.github.github_oauth.github_oauth.get_user_info"
        ) as mock_get_user:
            mock_get_token.return_value = mock_token
            mock_get_user.return_value = mock_user_data

            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.post(
                    "/api/v1/auth/oauth/github", json={"code": "valid_code"}
                )

            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            assert "redirect_url" in data


@pytest.mark.asyncio
async def test_github_login_invalid_code():
    """
    Test GitHub login with invalid code.

    Edge case: Invalid GitHub code returns redirect message (stub)
    """
    transport = ASGITransport(app=app)
    with patch(
        "app.services.github.github_oauth.github_oauth.get_access_token"
    ) as mock_get_token:
        mock_get_token.side_effect = Exception("Invalid code")
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.post(
                "/api/v1/auth/oauth/github", json={"code": "invalid_code"}
            )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "redirect_url" in data


@pytest.mark.asyncio
async def test_me_endpoint_unauthorized():
    """
    Test /me endpoint without authentication.

    Failure case: Accessing /me without token should return 401
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_endpoint_authorized():
    """
    Test /me endpoint with valid authentication.

    Expected use case: Valid token returns user data
    """
    mock_user = User(
        id=1,
        email="test@example.com",
        is_active=True,
        is_superuser=False,
        full_name="Test User",
        github_id="123456",
        github_username="testuser",
        avatar_url=None,
        bio=None,
        company=None,
        location=None,
        blog=None,
        role=None,
        permissions=[],
        created_at=None,
        updated_at=None,
        last_login=None,
    )
    transport = ASGITransport(app=app)
    app.dependency_overrides[get_current_user] = lambda: mock_user
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            "/api/v1/auth/me", headers={"Authorization": "Bearer test_token"}
        )
    app.dependency_overrides = {}  # Clean up
    assert response.status_code == 200
    assert response.json()["email"] == mock_user.email
