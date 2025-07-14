"""
Security utilities for webhook signature verification and validation.
"""

import hmac
import hashlib
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)


def verify_webhook_signature(body: bytes, signature: str, secret: str) -> bool:
    """
    Verify webhook signature using HMAC.
    
    Args:
        body: Raw request body
        signature: Signature from request headers
        secret: Webhook secret for verification
        
    Returns:
        bool: True if signature is valid
    """
    try:
        if not signature or not secret:
            return False
        
        # Support different signature formats
        if signature.startswith('sha256='):
            expected_signature = 'sha256=' + hmac.new(
                secret.encode(),
                body,
                hashlib.sha256
            ).hexdigest()
        elif signature.startswith('sha1='):
            expected_signature = 'sha1=' + hmac.new(
                secret.encode(),
                body,
                hashlib.sha1
            ).hexdigest()
        else:
            # Assume plain HMAC-SHA256
            expected_signature = hmac.new(
                secret.encode(),
                body,
                hashlib.sha256
            ).hexdigest()

        return hmac.compare_digest(signature, expected_signature)

    except Exception as e:
        logger.error(f"Failed to verify webhook signature: {str(e)}")
        return False


def generate_webhook_secret(length: int = 32) -> str:
    """
    Generate a secure webhook secret.
    
    Args:
        length: Length of the secret in bytes
        
    Returns:
        str: Hex-encoded secret
    """
    return secrets.token_hex(length)


def verify_timestamp(timestamp: str, max_age_seconds: int = 300) -> bool:
    """
    Verify that a timestamp is within acceptable age.
    
    Args:
        timestamp: Unix timestamp as string
        max_age_seconds: Maximum age in seconds (default: 5 minutes)
        
    Returns:
        bool: True if timestamp is valid and recent
    """
    try:
        request_time = int(timestamp)
        current_time = int(datetime.utcnow().timestamp())
        
        return abs(current_time - request_time) <= max_age_seconds
        
    except (ValueError, TypeError):
        logger.error(f"Invalid timestamp format: {timestamp}")
        return False


def sanitize_webhook_data(data: str, max_length: int = 10000) -> str:
    """
    Sanitize webhook data to prevent injection attacks.
    
    Args:
        data: Raw data string
        max_length: Maximum allowed length
        
    Returns:
        str: Sanitized data
    """
    if not data:
        return ""
    
    # Truncate if too long
    if len(data) > max_length:
        data = data[:max_length]
    
    # Remove null bytes and control characters
    data = ''.join(char for char in data if ord(char) >= 32 or char in '\n\r\t')
    
    return data


def is_safe_url(url: str) -> bool:
    """
    Check if a URL is safe (no file:// or javascript: schemes).
    
    Args:
        url: URL to check
        
    Returns:
        bool: True if URL is safe
    """
    if not url:
        return False
    
    url_lower = url.lower().strip()
    
    # Block dangerous schemes
    dangerous_schemes = [
        'javascript:',
        'file:',
        'ftp:',
        'data:',
        'vbscript:',
    ]
    
    for scheme in dangerous_schemes:
        if url_lower.startswith(scheme):
            return False
    
    return True


def validate_json_size(json_str: str, max_size_mb: int = 1) -> bool:
    """
    Validate JSON string size.
    
    Args:
        json_str: JSON string
        max_size_mb: Maximum size in megabytes
        
    Returns:
        bool: True if size is acceptable
    """
    max_size_bytes = max_size_mb * 1024 * 1024
    return len(json_str.encode('utf-8')) <= max_size_bytes


def hash_sensitive_data(data: str) -> str:
    """
    Hash sensitive data for logging/storage.
    
    Args:
        data: Sensitive data to hash
        
    Returns:
        str: SHA256 hash of the data
    """
    return hashlib.sha256(data.encode()).hexdigest()


def mask_secret(secret: str, visible_chars: int = 4) -> str:
    """
    Mask a secret for display purposes.
    
    Args:
        secret: Secret to mask
        visible_chars: Number of characters to show at start/end
        
    Returns:
        str: Masked secret
    """
    if not secret or len(secret) <= visible_chars * 2:
        return "*" * len(secret) if secret else ""
    
    return f"{secret[:visible_chars]}{'*' * (len(secret) - visible_chars * 2)}{secret[-visible_chars:]}"


class RateLimiter:
    """Simple in-memory rate limiter for webhook endpoints."""
    
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        """
        Initialize rate limiter.
        
        Args:
            max_requests: Maximum requests per window
            window_seconds: Time window in seconds
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = {}  # {client_id: [timestamps]}
    
    def is_allowed(self, client_id: str) -> bool:
        """
        Check if client is allowed to make a request.
        
        Args:
            client_id: Unique identifier for the client
            
        Returns:
            bool: True if request is allowed
        """
        now = datetime.utcnow()
        cutoff = now - timedelta(seconds=self.window_seconds)
        
        # Clean old entries
        if client_id in self.requests:
            self.requests[client_id] = [
                ts for ts in self.requests[client_id] if ts > cutoff
            ]
        else:
            self.requests[client_id] = []
        
        # Check if limit exceeded
        if len(self.requests[client_id]) >= self.max_requests:
            return False
        
        # Add current request
        self.requests[client_id].append(now)
        return True
    
    def cleanup(self):
        """Remove old entries to prevent memory leak."""
        cutoff = datetime.utcnow() - timedelta(seconds=self.window_seconds * 2)
        
        for client_id in list(self.requests.keys()):
            self.requests[client_id] = [
                ts for ts in self.requests[client_id] if ts > cutoff
            ]
            
            if not self.requests[client_id]:
                del self.requests[client_id]


# Global rate limiter instance
webhook_rate_limiter = RateLimiter(max_requests=100, window_seconds=60)