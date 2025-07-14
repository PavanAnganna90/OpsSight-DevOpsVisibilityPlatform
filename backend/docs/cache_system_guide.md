# OpsSight Cache System Guide

## Overview

The OpsSight platform implements a sophisticated multi-level caching system designed for high-performance API responses and optimal resource utilization. This guide covers the cache architecture, management APIs, and best practices.

## 🏗️ Architecture

### Multi-Level Cache Strategy

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Memory Cache  │ -> │   Redis Cache   │ -> │    Database     │
│     <1ms        │    │     <10ms       │    │   50-200ms      │
│   100MB limit   │    │   Unlimited     │    │   Persistent    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Cache Levels

#### Level 1: Memory Cache (Ultra-Fast)
- **Response Time**: <1ms
- **Capacity**: Configurable (default 100MB)
- **Storage**: In-process memory
- **Use Case**: Hot data, frequently accessed endpoints
- **Eviction**: LRU (Least Recently Used)
- **TTL**: Max 5 minutes (automatically enforced)

#### Level 2: Redis Cache (Distributed)
- **Response Time**: <10ms  
- **Capacity**: Redis memory limit
- **Storage**: Redis server
- **Use Case**: Shared data, API responses, computed results
- **Features**: Persistence, clustering, tag-based invalidation
- **TTL**: Configurable per data type

### Data Type Optimization

Different data types have optimized caching strategies:

```python
DataType.API_RESPONSE      # TTL: 5 minutes
DataType.DATABASE_QUERY    # TTL: 15 minutes  
DataType.COMPUTED_RESULT   # TTL: 30 minutes
DataType.USER_SESSION      # TTL: 1 hour
DataType.PERMISSION_CHECK  # TTL: 5 minutes
DataType.METRICS          # TTL: 1 minute
DataType.FILE_CACHE       # TTL: 1 hour
```

## 🔧 Cache Management API

### Authentication Required
All cache management endpoints require `ADMIN_READ` or `ADMIN_WRITE` permissions and proper RBAC authentication.

### Health Monitoring

#### Get Cache Health Status
```http
GET /api/v1/cache/health
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "status": "healthy",
  "redis_connected": true,
  "cache_stats": {
    "hit_rate_percent": 87.5,
    "total_hits": 875,
    "total_misses": 125,
    "memory_hits": 520,
    "redis_hits": 355
  },
  "test_passed": true
}
```

#### Get Performance Statistics
```http
GET /api/v1/cache/stats
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "initialized": true,
  "redis_connected": true,
  "hit_rate_percent": 87.5,
  "total_hits": 875,
  "total_misses": 125,
  "memory_hits": 520,
  "redis_hits": 355,
  "memory_sets": 450,
  "redis_sets": 680,
  "memory_deletes": 23,
  "redis_deletes": 45
}
```

### Cache Operations

#### Set Cache Value (Admin Only)
```http
POST /api/v1/cache/set
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "key": "user_profile_123",
  "data": {"id": 123, "name": "John Doe"},
  "data_type": "computed_result",
  "ttl": 1800,
  "cache_levels": ["memory", "redis"]
}
```

#### Get Cache Value (Admin Only)
```http
POST /api/v1/cache/get
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "key": "user_profile_123",
  "data_type": "computed_result"
}
```

**Response:**
```json
{
  "key": "user_profile_123",
  "found": true,
  "data": {"id": 123, "name": "John Doe"},
  "data_type": "computed_result"
}
```

### Cache Invalidation

#### Invalidate by Pattern
```http
POST /api/v1/cache/invalidate
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "pattern": "endpoint:list_roles:*"
}
```

#### Invalidate by Tag
```http
POST /api/v1/cache/invalidate
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "tag": "user_123"
}
```

#### Invalidate Single Key
```http
POST /api/v1/cache/invalidate
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "key": "user_profile_123"
}
```

#### Clear All Cache (Dangerous!)
```http
POST /api/v1/cache/clear
Authorization: Bearer <admin-token>
```

**⚠️ Warning**: This operation clears ALL cached data. Use with extreme caution!

## 🎯 Automatic Caching

### Cached Endpoints

The following endpoints are automatically cached:

#### Role Management
- `GET /api/v1/roles/` - 5 minutes TTL
- `GET /api/v1/roles/{id}/permissions` - 10 minutes TTL

#### Permission Management  
- `GET /api/v1/permissions/` - 10 minutes TTL
- `GET /api/v1/permissions/categories/all` - 1 hour TTL

### Cache Headers

Cached responses include diagnostic headers:

```http
X-Cache-Status: HIT
X-Cache-Level: memory
X-Cache-TTL: 300
X-Process-Time: 0.002
```

**Cache Status Values:**
- `HIT`: Data served from cache
- `MISS`: Data fetched from source
- `BYPASS`: Caching was bypassed for this request

## 🔄 Auto-Invalidation

The system automatically invalidates cache when data changes:

### Role/Permission Changes
- Creating/updating/deleting roles triggers cache invalidation
- Permission assignments automatically clear related cache entries
- Smart pattern matching ensures only relevant cache is cleared

### Cache Patterns
```
endpoint:list_roles:*                    # All role listings
endpoint:get_role_permissions:*/123/*    # Specific role permissions
tag:user_123                            # All data tagged with user
```

## 📊 Performance Monitoring

### Key Metrics to Monitor

1. **Hit Rate**: Target >80% for good performance
2. **Response Times**: <1ms memory, <10ms Redis
3. **Memory Usage**: Monitor for memory leaks
4. **Redis Connection**: Ensure stable connection

### Performance Troubleshooting

#### Low Hit Rate (<70%)
- Check TTL values are appropriate
- Verify cache invalidation isn't too aggressive
- Review access patterns for cache optimization

#### High Memory Usage
- Reduce memory cache TTL
- Implement more aggressive eviction
- Move more data to Redis-only caching

#### Redis Connection Issues
- Check Redis server status
- Verify network connectivity
- Review Redis server logs

## 🛠️ Development Usage

### Using Cache Decorators

#### Function Caching
```python
from app.core.cache_decorators import cached, DataType

@cached(ttl=300, data_type=DataType.COMPUTED_RESULT)
async def expensive_calculation(input_data):
    # Expensive operation here
    return result
```

#### Endpoint Caching
```python
from app.core.cache_decorators import cached_endpoint, DataType

@cached_endpoint(ttl=600, data_type=DataType.API_RESPONSE)
async def get_user_dashboard(user_id: int):
    # Database queries and computations
    return dashboard_data
```

### Manual Cache Operations
```python
from app.core.cache import get_cache_manager, DataType

# Get cache manager
cache_manager = await get_cache_manager()

# Set data
await cache_manager.set(
    key="custom_key",
    data={"complex": "data"},
    data_type=DataType.COMPUTED_RESULT,
    ttl=1800
)

# Get data
result = await cache_manager.get("custom_key", DataType.COMPUTED_RESULT)

# Invalidate by tag
await cache_manager.invalidate_by_tag("user_123")
```

## 📋 Best Practices

### Cache Design Guidelines

1. **Use Appropriate TTL**: Balance freshness vs performance
2. **Tag Important Data**: Enable efficient invalidation
3. **Monitor Hit Rates**: Optimize cache strategy based on metrics
4. **Graceful Degradation**: Always handle cache misses gracefully

### Security Considerations

1. **Admin-Only Management**: Cache management requires admin permissions
2. **Audit Logging**: All cache operations are logged
3. **Data Sensitivity**: Never cache sensitive data like passwords
4. **Access Control**: Respect user permissions in cached data

### Production Deployment

1. **Redis High Availability**: Use Redis clustering for production
2. **Memory Monitoring**: Set up alerts for memory usage
3. **Performance Baselines**: Establish performance benchmarks
4. **Backup Strategy**: Consider Redis persistence options

## 🚨 Troubleshooting

### Common Issues

#### Cache Not Working
1. Check Redis connection: `GET /api/v1/cache/health`
2. Verify cache initialization in application logs
3. Test with simple cache operations

#### Stale Data Issues
1. Review cache TTL values
2. Check invalidation patterns
3. Verify automatic invalidation triggers

#### Performance Problems
1. Monitor hit rates and response times
2. Check Redis server performance
3. Review cache distribution between levels

### Debug Tools

#### Cache Health Check
```bash
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:8000/api/v1/cache/health
```

#### Performance Statistics
```bash
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:8000/api/v1/cache/stats
```

#### Manual Cache Test
```bash
# Set test data
curl -X POST -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"key":"test","data":"hello","ttl":60}' \
  http://localhost:8000/api/v1/cache/set

# Get test data  
curl -X POST -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"key":"test"}' \
  http://localhost:8000/api/v1/cache/get
```

---

This caching system provides significant performance improvements while maintaining data consistency and security. For questions or issues, refer to the API documentation at `/docs` or contact the development team.