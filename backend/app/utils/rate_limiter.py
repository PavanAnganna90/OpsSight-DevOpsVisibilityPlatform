"""
Advanced Rate Limiting System

Provides Redis-based distributed rate limiting with multiple algorithms,
sliding windows, and intelligent threat detection.
"""

import json
import time
import logging
import asyncio
from typing import Dict, List, Optional, Tuple, Union
from datetime import datetime, timedelta
from enum import Enum
import redis.asyncio as redis
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


class RateLimitAlgorithm(Enum):
    """Rate limiting algorithms."""
    FIXED_WINDOW = "fixed_window"
    SLIDING_WINDOW = "sliding_window"
    TOKEN_BUCKET = "token_bucket"
    LEAKY_BUCKET = "leaky_bucket"


class RateLimitResult:
    """Result of rate limit check."""
    
    def __init__(self, allowed: bool, limit: int, remaining: int, reset_time: int, 
                 retry_after: Optional[int] = None):
        self.allowed = allowed
        self.limit = limit
        self.remaining = remaining
        self.reset_time = reset_time
        self.retry_after = retry_after
    
    def to_headers(self) -> Dict[str, str]:
        """Convert to HTTP headers."""
        headers = {
            "X-RateLimit-Limit": str(self.limit),
            "X-RateLimit-Remaining": str(self.remaining),
            "X-RateLimit-Reset": str(self.reset_time),
        }
        if self.retry_after:
            headers["Retry-After"] = str(self.retry_after)
        return headers


class AdvancedRateLimiter:
    """
    Advanced Redis-based rate limiter with multiple algorithms and threat detection.
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None, config: Optional[Dict] = None):
        """Initialize rate limiter."""
        self.redis_client = redis_client
        self.config = config or {}
        self.fallback_cache = {}  # In-memory fallback when Redis is unavailable
        
        # Default rate limits
        self.default_limits = {
            "api": {"requests": 100, "window": 60},  # 100 req/min
            "auth": {"requests": 5, "window": 300},   # 5 req/5min
            "upload": {"requests": 10, "window": 3600}, # 10 req/hour
            "admin": {"requests": 1000, "window": 60},  # 1000 req/min
        }
        
        # Burst protection
        self.burst_limits = {
            "api": {"requests": 20, "window": 10},    # 20 req/10sec
            "auth": {"requests": 3, "window": 60},    # 3 req/min
            "upload": {"requests": 3, "window": 300}, # 3 req/5min
        }
        
        # Threat detection thresholds
        self.threat_thresholds = {
            "suspicious_requests_per_hour": 500,
            "failed_auth_attempts": 10,
            "different_endpoints_per_minute": 50,
        }
    
    async def check_rate_limit(
        self, 
        identifier: str, 
        limit_type: str = "api",
        algorithm: RateLimitAlgorithm = RateLimitAlgorithm.SLIDING_WINDOW
    ) -> RateLimitResult:
        """
        Check if request is within rate limits.
        
        Args:
            identifier: Unique identifier (IP, user ID, API key)
            limit_type: Type of limit (api, auth, upload, admin)
            algorithm: Rate limiting algorithm to use
            
        Returns:
            RateLimitResult with limit status and headers
        """
        # Get rate limit configuration
        limits = self.default_limits.get(limit_type, self.default_limits["api"])
        burst_limits = self.burst_limits.get(limit_type)
        
        try:
            if algorithm == RateLimitAlgorithm.SLIDING_WINDOW:
                return await self._sliding_window_check(identifier, limit_type, limits, burst_limits)
            elif algorithm == RateLimitAlgorithm.TOKEN_BUCKET:
                return await self._token_bucket_check(identifier, limit_type, limits)
            elif algorithm == RateLimitAlgorithm.FIXED_WINDOW:
                return await self._fixed_window_check(identifier, limit_type, limits)
            else:
                # Default to sliding window
                return await self._sliding_window_check(identifier, limit_type, limits, burst_limits)
                
        except Exception as e:
            logger.error(f"Rate limiter error: {e}")
            # Fallback to in-memory rate limiting
            return await self._fallback_rate_limit(identifier, limit_type, limits)
    
    async def _sliding_window_check(
        self, 
        identifier: str, 
        limit_type: str, 
        limits: Dict, 
        burst_limits: Optional[Dict] = None
    ) -> RateLimitResult:
        """Sliding window rate limit implementation."""
        now = time.time()
        window = limits["window"]
        max_requests = limits["requests"]
        
        # Redis keys
        main_key = f"rate_limit:{limit_type}:{identifier}"
        burst_key = f"rate_limit:burst:{limit_type}:{identifier}"
        
        if self.redis_client:
            # Use Redis for distributed rate limiting
            pipe = self.redis_client.pipeline()
            
            # Remove old entries (outside the window)
            cutoff = now - window
            pipe.zremrangebyscore(main_key, 0, cutoff)
            
            # Count current requests in window
            pipe.zcount(main_key, cutoff, now)
            
            # Add current request
            pipe.zadd(main_key, {str(now): now})
            pipe.expire(main_key, int(window) + 10)  # Set expiry
            
            # Check burst limits if configured
            if burst_limits:
                burst_cutoff = now - burst_limits["window"]
                pipe.zremrangebyscore(burst_key, 0, burst_cutoff)
                pipe.zcount(burst_key, burst_cutoff, now)
                pipe.zadd(burst_key, {str(now): now})
                pipe.expire(burst_key, burst_limits["window"] + 10)
            
            results = await pipe.execute()
            
            current_requests = results[1]
            burst_requests = results[5] if burst_limits else 0
            
            # Check burst limit first
            if burst_limits and burst_requests > burst_limits["requests"]:
                return RateLimitResult(
                    allowed=False,
                    limit=burst_limits["requests"],
                    remaining=0,
                    reset_time=int(now + burst_limits["window"]),
                    retry_after=burst_limits["window"]
                )
            
            # Check main limit
            if current_requests > max_requests:
                return RateLimitResult(
                    allowed=False,
                    limit=max_requests,
                    remaining=0,
                    reset_time=int(now + window),
                    retry_after=window
                )
            
            remaining = max(0, max_requests - current_requests)
            return RateLimitResult(
                allowed=True,
                limit=max_requests,
                remaining=remaining,
                reset_time=int(now + window)
            )
        else:
            # Fallback to in-memory
            return await self._fallback_rate_limit(identifier, limit_type, limits)
    
    async def _token_bucket_check(
        self, 
        identifier: str, 
        limit_type: str, 
        limits: Dict
    ) -> RateLimitResult:
        """Token bucket rate limit implementation."""
        now = time.time()
        capacity = limits["requests"]
        refill_rate = capacity / limits["window"]  # tokens per second
        
        key = f"token_bucket:{limit_type}:{identifier}"
        
        if self.redis_client:
            # Lua script for atomic token bucket operation
            lua_script = """
            local key = KEYS[1]
            local capacity = tonumber(ARGV[1])
            local refill_rate = tonumber(ARGV[2])
            local now = tonumber(ARGV[3])
            local requested_tokens = tonumber(ARGV[4])
            
            local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
            local tokens = tonumber(bucket[1]) or capacity
            local last_refill = tonumber(bucket[2]) or now
            
            -- Calculate tokens to add
            local time_passed = now - last_refill
            local tokens_to_add = time_passed * refill_rate
            tokens = math.min(capacity, tokens + tokens_to_add)
            
            -- Check if request can be satisfied
            if tokens >= requested_tokens then
                tokens = tokens - requested_tokens
                redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
                redis.call('EXPIRE', key, 3600)
                return {1, tokens, capacity}
            else
                redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
                redis.call('EXPIRE', key, 3600)
                return {0, tokens, capacity}
            end
            """
            
            result = await self.redis_client.eval(
                lua_script, 1, key, capacity, refill_rate, now, 1
            )
            
            allowed = bool(result[0])
            remaining_tokens = result[1]
            
            if allowed:
                return RateLimitResult(
                    allowed=True,
                    limit=capacity,
                    remaining=int(remaining_tokens),
                    reset_time=int(now + limits["window"])
                )
            else:
                # Calculate retry after
                tokens_needed = 1 - remaining_tokens
                retry_after = int(tokens_needed / refill_rate)
                
                return RateLimitResult(
                    allowed=False,
                    limit=capacity,
                    remaining=0,
                    reset_time=int(now + retry_after),
                    retry_after=retry_after
                )
        else:
            return await self._fallback_rate_limit(identifier, limit_type, limits)
    
    async def _fixed_window_check(
        self, 
        identifier: str, 
        limit_type: str, 
        limits: Dict
    ) -> RateLimitResult:
        """Fixed window rate limit implementation."""
        now = time.time()
        window = limits["window"]
        max_requests = limits["requests"]
        
        # Calculate window start
        window_start = int(now // window) * window
        key = f"fixed_window:{limit_type}:{identifier}:{window_start}"
        
        if self.redis_client:
            pipe = self.redis_client.pipeline()
            pipe.incr(key)
            pipe.expire(key, window)
            results = await pipe.execute()
            
            current_requests = results[0]
            
            if current_requests > max_requests:
                return RateLimitResult(
                    allowed=False,
                    limit=max_requests,
                    remaining=0,
                    reset_time=window_start + window,
                    retry_after=int(window_start + window - now)
                )
            
            remaining = max(0, max_requests - current_requests)
            return RateLimitResult(
                allowed=True,
                limit=max_requests,
                remaining=remaining,
                reset_time=window_start + window
            )
        else:
            return await self._fallback_rate_limit(identifier, limit_type, limits)
    
    async def _fallback_rate_limit(
        self, 
        identifier: str, 
        limit_type: str, 
        limits: Dict
    ) -> RateLimitResult:
        """Fallback in-memory rate limiting when Redis is unavailable."""
        now = time.time()
        window = limits["window"]
        max_requests = limits["requests"]
        
        key = f"{limit_type}:{identifier}"
        
        if key not in self.fallback_cache:
            self.fallback_cache[key] = []
        
        # Clean old entries
        cutoff = now - window
        self.fallback_cache[key] = [
            timestamp for timestamp in self.fallback_cache[key] 
            if timestamp > cutoff
        ]
        
        current_requests = len(self.fallback_cache[key])
        
        if current_requests >= max_requests:
            return RateLimitResult(
                allowed=False,
                limit=max_requests,
                remaining=0,
                reset_time=int(now + window),
                retry_after=window
            )
        
        # Add current request
        self.fallback_cache[key].append(now)
        
        remaining = max(0, max_requests - current_requests - 1)
        return RateLimitResult(
            allowed=True,
            limit=max_requests,
            remaining=remaining,
            reset_time=int(now + window)
        )
    
    async def is_ip_blocked(self, ip: str) -> bool:
        """Check if IP is blocked due to abuse."""
        block_key = f"blocked_ip:{ip}"
        
        if self.redis_client:
            result = await self.redis_client.get(block_key)
            return result is not None
        else:
            # Fallback to in-memory check
            blocked_key = f"blocked:{ip}"
            return blocked_key in self.fallback_cache
    
    async def block_ip(self, ip: str, duration: int = 3600, reason: str = "Rate limit exceeded"):
        """Block an IP address for a specified duration."""
        block_key = f"blocked_ip:{ip}"
        block_data = {
            "blocked_at": time.time(),
            "duration": duration,
            "reason": reason
        }
        
        if self.redis_client:
            await self.redis_client.setex(block_key, duration, json.dumps(block_data))
        else:
            # Fallback to in-memory
            blocked_key = f"blocked:{ip}"
            self.fallback_cache[blocked_key] = block_data
        
        logger.warning(f"IP {ip} blocked for {duration} seconds. Reason: {reason}")
    
    async def detect_threats(self, identifier: str, endpoint: str, status_code: int):
        """Detect potential threats based on request patterns."""
        now = time.time()
        hour_key = f"threat_detection:{identifier}:{int(now // 3600)}"
        minute_key = f"endpoints:{identifier}:{int(now // 60)}"
        
        if self.redis_client:
            pipe = self.redis_client.pipeline()
            
            # Track requests per hour
            pipe.incr(hour_key)
            pipe.expire(hour_key, 3600)
            
            # Track different endpoints per minute
            pipe.sadd(minute_key, endpoint)
            pipe.expire(minute_key, 60)
            pipe.scard(minute_key)
            
            # Track failed auth attempts
            if status_code == 401:
                auth_key = f"failed_auth:{identifier}:{int(now // 3600)}"
                pipe.incr(auth_key)
                pipe.expire(auth_key, 3600)
            
            results = await pipe.execute()
            
            requests_per_hour = results[0]
            endpoints_per_minute = results[4] if len(results) > 4 else 0
            
            # Check thresholds
            if requests_per_hour > self.threat_thresholds["suspicious_requests_per_hour"]:
                await self.block_ip(identifier, 3600, "Suspicious request volume")
                return True
            
            if endpoints_per_minute > self.threat_thresholds["different_endpoints_per_minute"]:
                await self.block_ip(identifier, 1800, "Endpoint scanning detected")
                return True
        
        return False
    
    async def get_rate_limit_status(self, identifier: str, limit_type: str = "api") -> Dict:
        """Get current rate limit status for debugging."""
        limits = self.default_limits.get(limit_type, self.default_limits["api"])
        result = await self.check_rate_limit(identifier, limit_type)
        
        return {
            "identifier": identifier,
            "limit_type": limit_type,
            "algorithm": "sliding_window",
            "limit": result.limit,
            "remaining": result.remaining,
            "reset_time": result.reset_time,
            "allowed": result.allowed,
            "window_seconds": limits["window"],
        }
    
    async def cleanup_expired_entries(self):
        """Clean up expired entries to prevent memory leaks."""
        if not self.redis_client:
            # Clean fallback cache
            now = time.time()
            expired_keys = []
            
            for key, data in self.fallback_cache.items():
                if isinstance(data, list):
                    # Rate limit entries
                    self.fallback_cache[key] = [
                        timestamp for timestamp in data 
                        if timestamp > now - 3600  # Keep last hour
                    ]
                    if not self.fallback_cache[key]:
                        expired_keys.append(key)
                elif isinstance(data, dict) and "blocked_at" in data:
                    # Blocked IP entries
                    if now - data["blocked_at"] > data["duration"]:
                        expired_keys.append(key)
            
            for key in expired_keys:
                del self.fallback_cache[key]


# Global rate limiter instance
rate_limiter = None


async def get_rate_limiter() -> AdvancedRateLimiter:
    """Get or create global rate limiter instance."""
    global rate_limiter
    
    if rate_limiter is None:
        # Try to get Redis client from cache system
        try:
            from app.core.cache import CacheManager
            cache_manager = CacheManager()
            redis_client = getattr(cache_manager, 'redis_client', None)
        except ImportError:
            redis_client = None
        
        rate_limiter = AdvancedRateLimiter(redis_client)
    
    return rate_limiter


def create_rate_limit_dependency(limit_type: str = "api"):
    """Create a dependency for FastAPI that checks rate limits."""
    async def check_rate_limit(request):
        from fastapi import Request
        
        limiter = await get_rate_limiter()
        
        # Get client identifier
        client_ip = request.client.host if request.client else "unknown"
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        
        # Check if IP is blocked
        if await limiter.is_ip_blocked(client_ip):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="IP address is temporarily blocked due to suspicious activity"
            )
        
        # Check rate limits
        result = await limiter.check_rate_limit(client_ip, limit_type)
        
        if not result.allowed:
            # Add rate limit headers to the response
            headers = result.to_headers()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
                headers=headers
            )
        
        # Store result for adding headers to successful responses
        request.state.rate_limit_result = result
        return result
    
    return check_rate_limit