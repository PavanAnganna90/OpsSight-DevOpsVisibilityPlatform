"""
Token Cleanup Service

Handles periodic cleanup of expired tokens and blacklisted tokens.
This service should be run as a background task to maintain system performance.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

from app.core.auth.token_manager import token_manager
from app.core.config import settings

logger = logging.getLogger(__name__)


class TokenCleanupService:
    """Service for cleaning up expired and invalid tokens."""
    
    def __init__(self, cleanup_interval_minutes: int = 60):
        """
        Initialize the token cleanup service.
        
        Args:
            cleanup_interval_minutes: How often to run cleanup (default: 60 minutes)
        """
        self.cleanup_interval = timedelta(minutes=cleanup_interval_minutes)
        self.is_running = False
        self._cleanup_task: Optional[asyncio.Task] = None
    
    async def start(self):
        """Start the token cleanup service."""
        if self.is_running:
            logger.warning("Token cleanup service is already running")
            return
        
        self.is_running = True
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info(f"Token cleanup service started (interval: {self.cleanup_interval})")
    
    async def stop(self):
        """Stop the token cleanup service."""
        if not self.is_running:
            return
        
        self.is_running = False
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Token cleanup service stopped")
    
    async def _cleanup_loop(self):
        """Main cleanup loop that runs periodically."""
        while self.is_running:
            try:
                await self._run_cleanup()
                await asyncio.sleep(self.cleanup_interval.total_seconds())
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in token cleanup loop: {e}")
                # Wait a bit before retrying on error
                await asyncio.sleep(60)
    
    async def _run_cleanup(self):
        """Run the actual cleanup operations."""
        start_time = datetime.utcnow()
        logger.info("Starting token cleanup")
        
        try:
            # Clean up expired tokens
            await token_manager.cleanup_expired_tokens()
            
            # Additional cleanup operations can be added here
            await self._cleanup_expired_blacklist_entries()
            await self._cleanup_expired_refresh_tokens()
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            logger.info(f"Token cleanup completed in {duration:.2f} seconds")
            
        except Exception as e:
            logger.error(f"Token cleanup failed: {e}")
            raise
    
    async def _cleanup_expired_blacklist_entries(self):
        """Clean up expired blacklist entries (Redis handles this automatically)."""
        if not token_manager.redis_client:
            # For in-memory storage, we could implement manual cleanup
            # but tokens in the blacklist set don't have expiration info
            # In practice, the in-memory fallback is only for development
            pass
    
    async def _cleanup_expired_refresh_tokens(self):
        """Clean up expired refresh tokens."""
        if token_manager.redis_client:
            # Redis handles TTL automatically, but we can clean up any orphaned keys
            try:
                pattern = "refresh_token:*"
                keys = await token_manager.redis_client.keys(pattern)
                
                expired_count = 0
                for key in keys:
                    # Check if key still exists (Redis might have cleaned it up)
                    if not await token_manager.redis_client.exists(key):
                        expired_count += 1
                
                if expired_count > 0:
                    logger.info(f"Found {expired_count} expired refresh token keys")
                    
            except Exception as e:
                logger.error(f"Failed to cleanup expired refresh tokens: {e}")
        else:
            # Manual cleanup for in-memory storage
            now = datetime.utcnow()
            expired_tokens = []
            
            for token, data in token_manager._refresh_tokens.items():
                try:
                    expires_at = datetime.fromisoformat(data["expires_at"])
                    if now > expires_at:
                        expired_tokens.append(token)
                except (KeyError, ValueError):
                    # Invalid data, remove it
                    expired_tokens.append(token)
            
            for token in expired_tokens:
                del token_manager._refresh_tokens[token]
            
            if expired_tokens:
                logger.info(f"Cleaned up {len(expired_tokens)} expired refresh tokens")
    
    async def force_cleanup(self):
        """Force an immediate cleanup run."""
        logger.info("Running forced token cleanup")
        await self._run_cleanup()
    
    def get_status(self) -> dict:
        """Get the current status of the cleanup service."""
        return {
            "is_running": self.is_running,
            "cleanup_interval_minutes": self.cleanup_interval.total_seconds() / 60,
            "has_redis": token_manager.redis_client is not None,
            "last_cleanup": "N/A"  # Could be enhanced to track last cleanup time
        }


# Global cleanup service instance
cleanup_service = TokenCleanupService()


async def start_token_cleanup_service():
    """Start the global token cleanup service."""
    await cleanup_service.start()


async def stop_token_cleanup_service():
    """Stop the global token cleanup service."""
    await cleanup_service.stop()


# Context manager for testing
class TokenCleanupServiceContext:
    """Context manager for token cleanup service in tests."""
    
    def __init__(self, cleanup_interval_minutes: int = 1):
        self.service = TokenCleanupService(cleanup_interval_minutes)
    
    async def __aenter__(self):
        await self.service.start()
        return self.service
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.service.stop()


if __name__ == "__main__":
    # Simple test runner
    async def test_cleanup_service():
        async with TokenCleanupServiceContext(cleanup_interval_minutes=1) as service:
            print("Cleanup service started")
            await asyncio.sleep(5)  # Let it run for a few seconds
            print("Cleanup service stopping")
        print("Cleanup service stopped")
    
    asyncio.run(test_cleanup_service())