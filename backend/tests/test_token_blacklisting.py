"""
Tests for JWT token blacklisting functionality.

This module tests the security features of the authentication system,
particularly token invalidation and blacklisting behavior.
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from fastapi import HTTPException
from unittest.mock import AsyncMock, patch

from app.core.auth.token_manager import TokenManager, token_manager
from app.models.user import User
from app.schemas.auth import JWTTokenClaims


class TestTokenBlacklisting:
    """Test cases for token blacklisting functionality."""
    
    @pytest.fixture
    def mock_user(self):
        """Create a mock user for testing."""
        user = User()
        user.id = 123
        user.email = "test@example.com"
        user.full_name = "Test User"
        user.is_active = True
        user.roles = ["user"]
        user.permissions = ["read"]
        return user
    
    @pytest.fixture
    def token_manager_instance(self):
        """Create a token manager instance for testing."""
        return TokenManager()
    
    @pytest.mark.asyncio
    async def test_create_access_token(self, token_manager_instance, mock_user):
        """Test access token creation."""
        token = await token_manager_instance.create_access_token(mock_user)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    @pytest.mark.asyncio
    async def test_validate_access_token_success(self, token_manager_instance, mock_user):
        """Test successful token validation."""
        token = await token_manager_instance.create_access_token(mock_user)
        
        payload = await token_manager_instance.validate_access_token(token)
        
        assert payload["sub"] == str(mock_user.id)
        assert payload["email"] == mock_user.email
        assert payload["aud"] == "opssight-api"
    
    @pytest.mark.asyncio
    async def test_blacklist_token(self, token_manager_instance, mock_user):
        """Test token blacklisting functionality."""
        # Create a token
        token = await token_manager_instance.create_access_token(mock_user)
        
        # Verify token is valid initially
        payload = await token_manager_instance.validate_access_token(token)
        assert payload["sub"] == str(mock_user.id)
        
        # Blacklist the token
        await token_manager_instance.revoke_token(token)
        
        # Verify token is now invalid
        with pytest.raises(HTTPException) as exc_info:
            await token_manager_instance.validate_access_token(token)
        
        assert exc_info.value.status_code == 401
        assert "revoked" in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_blacklist_check_performance(self, token_manager_instance, mock_user):
        """Test that blacklist checks don't significantly impact performance."""
        import time
        
        # Create multiple tokens
        tokens = []
        for i in range(10):
            token = await token_manager_instance.create_access_token(mock_user)
            tokens.append(token)
        
        # Blacklist half of them
        for i in range(0, 5):
            await token_manager_instance.revoke_token(tokens[i])
        
        # Time validation of valid tokens
        start_time = time.time()
        for i in range(5, 10):
            await token_manager_instance.validate_access_token(tokens[i])
        end_time = time.time()
        
        # Should complete quickly (less than 1 second for 5 validations)
        assert (end_time - start_time) < 1.0
    
    @pytest.mark.asyncio 
    async def test_token_expiration_cleanup(self, token_manager_instance, mock_user):
        """Test that expired tokens are properly handled."""
        # Create token with short expiration
        short_expiry = timedelta(seconds=1)
        token = await token_manager_instance.create_access_token(mock_user, short_expiry)
        
        # Token should be valid initially
        payload = await token_manager_instance.validate_access_token(token)
        assert payload["sub"] == str(mock_user.id)
        
        # Wait for token to expire
        await asyncio.sleep(2)
        
        # Token should now be expired
        with pytest.raises(HTTPException) as exc_info:
            await token_manager_instance.validate_access_token(token)
        
        assert exc_info.value.status_code == 401
        assert "expired" in exc_info.value.detail.lower()
    
    @pytest.mark.asyncio
    async def test_refresh_token_creation_and_validation(self, token_manager_instance, mock_user):
        """Test refresh token creation and validation."""
        access_token = await token_manager_instance.create_access_token(mock_user)
        refresh_token = await token_manager_instance.create_refresh_token(
            mock_user, 
            access_token,
            device_id="test-device"
        )
        
        assert refresh_token is not None
        assert isinstance(refresh_token, str)
        assert len(refresh_token) > 0
        
        # Get refresh token data
        token_data = await token_manager_instance._get_refresh_token_data(refresh_token)
        assert token_data is not None
        assert token_data["user_id"] == str(mock_user.id)
        assert token_data["device_id"] == "test-device"
        assert token_data["is_active"] is True
    
    @pytest.mark.asyncio
    async def test_revoke_all_user_tokens(self, token_manager_instance, mock_user):
        """Test revoking all tokens for a specific user."""
        # Create multiple tokens for the user
        tokens = []
        for i in range(3):
            access_token = await token_manager_instance.create_access_token(mock_user)
            refresh_token = await token_manager_instance.create_refresh_token(
                mock_user, 
                access_token,
                device_id=f"device-{i}"
            )
            tokens.append((access_token, refresh_token))
        
        # Verify all tokens are valid
        for access_token, refresh_token in tokens:
            payload = await token_manager_instance.validate_access_token(access_token)
            assert payload["sub"] == str(mock_user.id)
            
            token_data = await token_manager_instance._get_refresh_token_data(refresh_token)
            assert token_data is not None
        
        # Revoke all user tokens
        await token_manager_instance.revoke_all_user_tokens(str(mock_user.id))
        
        # Verify all access tokens are blacklisted
        for access_token, refresh_token in tokens:
            with pytest.raises(HTTPException):
                await token_manager_instance.validate_access_token(access_token)
            
            # Refresh tokens should also be revoked
            token_data = await token_manager_instance._get_refresh_token_data(refresh_token)
            assert token_data is None
    
    @pytest.mark.asyncio
    async def test_cleanup_expired_tokens(self, token_manager_instance, mock_user):
        """Test cleanup of expired tokens."""
        # Create tokens with different expiration times
        valid_token = await token_manager_instance.create_access_token(mock_user)
        
        short_expiry = timedelta(seconds=1)
        expired_token = await token_manager_instance.create_access_token(mock_user, short_expiry)
        
        # Wait for one token to expire
        await asyncio.sleep(2)
        
        # Run cleanup
        await token_manager_instance.cleanup_expired_tokens()
        
        # Valid token should still work
        payload = await token_manager_instance.validate_access_token(valid_token)
        assert payload["sub"] == str(mock_user.id)
        
        # Expired token should be rejected
        with pytest.raises(HTTPException):
            await token_manager_instance.validate_access_token(expired_token)
    
    @pytest.mark.asyncio
    async def test_get_user_sessions(self, token_manager_instance, mock_user):
        """Test getting active sessions for a user."""
        # Create multiple sessions
        sessions_created = []
        for i in range(3):
            access_token = await token_manager_instance.create_access_token(mock_user)
            refresh_token = await token_manager_instance.create_refresh_token(
                mock_user,
                access_token, 
                device_id=f"device-{i}"
            )
            sessions_created.append((access_token, refresh_token))
        
        # Get user sessions
        sessions = await token_manager_instance.get_user_sessions(str(mock_user.id))
        
        assert len(sessions) == 3
        for session in sessions:
            assert "device_id" in session
            assert "created_at" in session
            assert "expires_at" in session
    
    @pytest.mark.asyncio
    async def test_token_manager_redis_fallback(self):
        """Test token manager fallback to in-memory storage when Redis is unavailable."""
        # Create token manager without Redis
        tm = TokenManager(redis_client=None)
        
        user = User()
        user.id = 456
        user.email = "fallback@example.com"
        user.full_name = "Fallback User"
        user.is_active = True
        user.roles = ["user"]
        user.permissions = ["read"]
        
        # Test token creation and validation with in-memory storage
        token = await tm.create_access_token(user)
        payload = await tm.validate_access_token(token)
        assert payload["sub"] == str(user.id)
        
        # Test blacklisting with in-memory storage
        await tm.revoke_token(token)
        with pytest.raises(HTTPException):
            await tm.validate_access_token(token)


class TestTokenBlacklistingIntegration:
    """Integration tests for token blacklisting with the auth endpoints."""
    
    @pytest.mark.asyncio
    async def test_logout_endpoint_blacklists_token(self):
        """Test that the logout endpoint properly blacklists tokens."""
        # This would typically be an integration test with the actual FastAPI app
        # For now, we'll test the core logic
        
        from app.core.auth.token_manager import token_manager
        
        user = User()
        user.id = 789
        user.email = "logout@example.com"
        user.full_name = "Logout User"
        user.is_active = True
        user.roles = ["user"]
        user.permissions = ["read"]
        
        # Create token as if from login
        token = await token_manager.create_access_token(user)
        
        # Verify token is valid
        payload = await token_manager.validate_access_token(token)
        assert payload["sub"] == str(user.id)
        
        # Simulate logout by blacklisting token
        await token_manager.revoke_token(token)
        
        # Verify token is now invalid
        with pytest.raises(HTTPException) as exc_info:
            await token_manager.validate_access_token(token)
        
        assert exc_info.value.status_code == 401
        assert "revoked" in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_concurrent_token_operations(self):
        """Test that concurrent token operations work correctly."""
        from app.core.auth.token_manager import token_manager
        
        user = User()
        user.id = 999
        user.email = "concurrent@example.com"
        user.full_name = "Concurrent User"
        user.is_active = True
        user.roles = ["user"]
        user.permissions = ["read"]
        
        # Create multiple tokens concurrently
        async def create_and_validate_token():
            token = await token_manager.create_access_token(user)
            payload = await token_manager.validate_access_token(token)
            return token, payload
        
        # Run multiple operations concurrently
        tasks = [create_and_validate_token() for _ in range(5)]
        results = await asyncio.gather(*tasks)
        
        # Verify all operations succeeded
        assert len(results) == 5
        for token, payload in results:
            assert token is not None
            assert payload["sub"] == str(user.id)
        
        # Blacklist all tokens concurrently
        blacklist_tasks = [token_manager.revoke_token(token) for token, _ in results]
        await asyncio.gather(*blacklist_tasks)
        
        # Verify all tokens are blacklisted
        for token, _ in results:
            with pytest.raises(HTTPException):
                await token_manager.validate_access_token(token)


if __name__ == "__main__":
    pytest.main([__file__])