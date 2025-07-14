# JWT Token Blacklisting System

This document describes the implementation of JWT token blacklisting in the OpsSight DevOps Platform, which provides secure token invalidation for logout and security enforcement.

## Overview

The token blacklisting system ensures that JWT tokens can be properly invalidated before their natural expiration time. This is crucial for:

- **Secure logout**: Ensures tokens cannot be reused after logout
- **Security incidents**: Ability to immediately revoke compromised tokens
- **Account management**: Revoke all tokens when user accounts are disabled
- **Session management**: Control active user sessions

## Architecture

### Components

1. **TokenManager**: Core service managing token lifecycle
2. **Token Blacklist**: Redis-based storage for revoked tokens
3. **Cleanup Service**: Background service for maintenance
4. **Authentication Middleware**: Validates tokens against blacklist

### Storage Strategy

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   JWT Token     │    │  Token Manager  │    │  Redis/Memory   │
│   Validation    │────│                 │────│   Blacklist     │
│                 │    │                 │    │   Storage       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Implementation Details

### Token Blacklisting Process

1. **Token Validation**: Check if token exists in blacklist
2. **Token Revocation**: Add token to blacklist with TTL
3. **Automatic Cleanup**: Expired entries are removed automatically

### Redis Storage Format

```
Key: blacklisted_token:{jwt_token}
Value: "1"
TTL: Token expiration time
```

### In-Memory Fallback

For development environments without Redis, the system falls back to in-memory storage:

```python
_blacklisted_tokens: Set[str] = set()
```

## API Usage

### Logout with Token Blacklisting

```python
POST /api/v1/auth/logout
Authorization: Bearer <jwt_token>

Response:
{
    "message": "Successfully logged out"
}
```

### Revoke Specific Token

```python
POST /api/v1/auth/token/revoke
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
    "token": "<token_to_revoke>"
}
```

### Revoke All User Tokens

```python
POST /api/v1/auth/token/revoke-all
Authorization: Bearer <jwt_token>

Response:
{
    "message": "All tokens revoked successfully"
}
```

## Security Features

### 1. Immediate Invalidation
- Tokens are blacklisted immediately upon logout
- No delay between logout and token invalidation

### 2. Automatic TTL Management
- Blacklisted tokens expire automatically
- No manual cleanup required in production

### 3. Performance Optimization
- Redis-based storage for fast lookups
- Minimal impact on token validation performance

### 4. Graceful Degradation
- Falls back to in-memory storage if Redis unavailable
- System remains functional during Redis outages

## Configuration

### Environment Variables

```bash
# Redis configuration for token storage
REDIS_URL=redis://localhost:6379/0

# JWT configuration
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
```

### Token Manager Settings

```python
class TokenManager:
    def __init__(self, redis_client=None):
        self.access_token_expire_minutes = 30
        self.refresh_token_expire_days = 7
        # Redis fallback to in-memory storage
```

## Performance Considerations

### Redis Benefits
- **Fast Lookups**: O(1) complexity for blacklist checks
- **Automatic Cleanup**: TTL handles expired entries
- **Scalability**: Shared state across multiple app instances

### Memory Usage
- Blacklisted tokens stored until expiration
- Memory usage proportional to logout frequency
- Automatic cleanup prevents unbounded growth

### Benchmark Results
```
Token Validation (with blacklist check): ~1ms
Token Blacklisting: ~2ms
Cleanup Operations: Runs every 60 minutes
```

## Monitoring and Observability

### Metrics Available

1. **Blacklisted Tokens Count**: Number of active blacklisted tokens
2. **Blacklist Hit Rate**: Percentage of requests with blacklisted tokens
3. **Cleanup Operations**: Success/failure of cleanup runs

### Logging

```python
# Successful logout
logger.info(f"User {user.email} logged out successfully")

# Token blacklisting
logger.info(f"Token blacklisted for user {user_id}")

# Cleanup operations
logger.info(f"Token cleanup completed in {duration:.2f} seconds")
```

## Testing

### Unit Tests

```python
async def test_blacklist_token():
    token = await token_manager.create_access_token(user)
    await token_manager.revoke_token(token)
    
    with pytest.raises(HTTPException):
        await token_manager.validate_access_token(token)
```

### Integration Tests

```python
async def test_logout_endpoint():
    # Login and get token
    response = await client.post("/auth/login", data=credentials)
    token = response.json()["access_token"]
    
    # Logout
    await client.post("/auth/logout", 
                     headers={"Authorization": f"Bearer {token}"})
    
    # Verify token is invalid
    response = await client.get("/auth/me",
                              headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
```

## Error Handling

### Common Scenarios

1. **Redis Connection Lost**
   - Fallback to in-memory storage
   - Log warning and continue operation

2. **Invalid Token Format**
   - Return 401 Unauthorized
   - Log security event

3. **Cleanup Service Failure**
   - Retry with backoff
   - Alert if persistent failures

### Error Responses

```json
{
    "detail": "Token has been revoked",
    "status_code": 401
}
```

## Deployment Considerations

### Production Requirements

1. **Redis High Availability**
   - Use Redis Cluster or Sentinel
   - Configure backup and failover

2. **Monitoring Setup**
   - Monitor blacklist size and growth
   - Alert on cleanup service failures

3. **Security Hardening**
   - Secure Redis with authentication
   - Use TLS for Redis connections

### Scaling Considerations

- Multiple app instances share Redis blacklist
- Cleanup service should run on only one instance
- Consider Redis memory limits for high-traffic scenarios

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Check cleanup service status
   - Verify TTL settings are correct
   - Monitor blacklist growth rate

2. **Performance Degradation**
   - Check Redis connection latency
   - Monitor blacklist hit rate
   - Verify cleanup intervals

3. **Token Still Valid After Logout**
   - Check Redis connectivity
   - Verify token format and blacklist key
   - Review error logs for failures

### Debug Commands

```bash
# Check blacklisted tokens in Redis
redis-cli KEYS "blacklisted_token:*"

# Check cleanup service status
curl http://localhost:8000/api/v1/admin/token-cleanup/status

# Manual cleanup trigger
curl -X POST http://localhost:8000/api/v1/admin/token-cleanup/force
```

## Security Best Practices

1. **Logout on Security Events**
   - Revoke all tokens on password change
   - Blacklist tokens on suspicious activity

2. **Token Rotation**
   - Use short-lived access tokens
   - Implement refresh token rotation

3. **Audit Logging**
   - Log all token revocation events
   - Monitor for unusual patterns

4. **Rate Limiting**
   - Limit token revocation requests
   - Prevent abuse of blacklist system

## Future Enhancements

1. **Enhanced Cleanup**
   - More granular cleanup policies
   - User-specific token cleanup

2. **Advanced Monitoring**
   - Real-time blacklist metrics
   - Automated alerting

3. **Performance Optimization**
   - Bloom filters for faster lookups
   - Batch operations for cleanup

4. **Security Features**
   - Token fingerprinting
   - Geolocation-based revocation

## References

- [JWT RFC 7519](https://tools.ietf.org/html/rfc7519)
- [Redis TTL Documentation](https://redis.io/commands/ttl)
- [FastAPI Security Documentation](https://fastapi.tiangolo.com/tutorial/security/)
- [OWASP JWT Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)