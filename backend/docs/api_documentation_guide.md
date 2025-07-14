# OpsSight DevOps Platform API Documentation Guide

## Overview

The OpsSight DevOps Platform API provides comprehensive infrastructure management, CI/CD automation, and real-time monitoring capabilities. This guide covers the enhanced API documentation, caching architecture, and interactive features.

## 🚀 Quick Start

### 1. Access Documentation
- **Swagger UI**: `http://localhost:8000/docs` (development)
- **ReDoc**: `http://localhost:8000/redoc` (alternative view)
- **OpenAPI Schema**: `http://localhost:8000/api/v1/openapi.json`

### 2. Authentication
```bash
# Login to get access token
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=your-email@company.com&password=your-password"

# Use token in subsequent requests
curl -X GET "http://localhost:8000/api/v1/users/me" \
  -H "Authorization: Bearer <your-access-token>"
```

## 📚 Documentation Features

### Enhanced OpenAPI Schema
- **Comprehensive Descriptions**: Every endpoint includes detailed descriptions with use cases
- **Interactive Examples**: Live examples you can execute directly in the browser
- **Response Models**: Strongly typed response schemas with validation
- **Error Documentation**: Detailed error responses with examples
- **Performance Information**: Cache behavior and performance expectations

### Tag Organization
The API is organized into logical groups with permission requirements:

- **🔐 Authentication**: User login, registration, and token management *(Public/Authenticated)*
- **👤 Role Management**: RBAC system and permissions *(VIEW_ROLES/MANAGE_ROLES)*
- **🔑 Permission Management**: Direct user permissions and effective permission calculation *(VIEW_ROLES/MANAGE_ROLES)*
- **👥 Team Management**: Team collaboration and organization *(VIEW_TEAMS/MANAGE_TEAMS)*
- **🔄 CI/CD Pipelines**: Build, test, and deployment automation *(VIEW_PIPELINES/MANAGE_PIPELINES)*
- **☸️ Kubernetes**: Container orchestration and management *(VIEW_KUBERNETES/MANAGE_KUBERNETES)*
- **🏗️ Infrastructure**: Terraform-based infrastructure as code *(VIEW_INFRASTRUCTURE/MANAGE_INFRASTRUCTURE)*
- **🤖 Automation**: Ansible configuration management *(VIEW_AUTOMATION/MANAGE_AUTOMATION)*
- **🚨 Alerts**: Monitoring and incident management *(VIEW_ALERTS/MANAGE_ALERTS)*
- **💰 Cost Analysis**: Cloud cost optimization *(VIEW_COST_ANALYSIS/MANAGE_COST_ANALYSIS)*
- **📢 Notifications**: Multi-channel notification system *(VIEW_NOTIFICATIONS/MANAGE_NOTIFICATIONS)*
- **⚡ Real-time Updates**: WebSocket communication *(Authenticated)*
- **📊 Monitoring**: Performance metrics and analytics *(VIEW_MONITORING/ADMIN_READ)*
- **⚡ Cache Management**: Multi-level cache system administration *(ADMIN_READ/ADMIN_WRITE)*

## ⚡ Caching Architecture

### Multi-Level Caching Strategy

The API implements intelligent caching for optimal performance:

#### Level 1: Memory Cache (Ultra-Fast)
- **Response Time**: <1ms
- **Capacity**: 100MB default (configurable)
- **Use Cases**: Frequently accessed data, user sessions, hot data
- **Eviction**: LRU (Least Recently Used)

#### Level 2: Redis Cache (Distributed)
- **Response Time**: <10ms
- **Capacity**: Unlimited (Redis memory)
- **Use Cases**: Shared data, persistent cache, distributed deployments
- **Features**: TTL support, data persistence, cluster support

#### Auto-Promotion Strategy
- Frequently accessed Redis data is automatically promoted to memory cache
- Provides best-of-both-worlds: speed + persistence
- Intelligent cache warming based on access patterns

### Cache Monitoring

#### Real-Time Metrics
```bash
# Get cache performance metrics
GET /cache/metrics
```

Response:
```json
{
  "hit_rate": 0.85,
  "miss_rate": 0.15,
  "total_requests": 1000,
  "hits": 850,
  "misses": 150,
  "size": 500,
  "max_size": 1000
}
```

#### API Performance Information
```bash
# Get API-wide performance data
GET /api/performance
```

Response:
```json
{
  "response_time_ms": 45.2,
  "cache_enabled": true,
  "cache_ttl": 300,
  "cache_level": "both"
}
```

### Cache Headers
Cached responses include informative headers:
```
X-Cache-Status: HIT|MISS|BYPASS
X-Cache-Level: memory|redis|both
X-Cache-TTL: 300
X-Process-Time: 0.012
X-Permission-Required: VIEW_ROLES
X-User-Role: devops_admin
```

### Cache Management API

#### Administrative Cache Control

The platform provides comprehensive cache management endpoints for administrators:

```bash
# Monitor cache health and performance
GET /api/v1/cache/health
Authorization: Bearer <admin-token>
```

Response includes Redis connectivity, hit rates, and system health metrics.

```bash
# Get detailed cache statistics
GET /api/v1/cache/stats
Authorization: Bearer <admin-token>
```

Provides comprehensive metrics including:
- Hit/miss rates by cache level
- Memory usage and limits
- Request patterns and performance data

```bash
# Manual cache operations (Admin only)
POST /api/v1/cache/set
POST /api/v1/cache/get
POST /api/v1/cache/invalidate
POST /api/v1/cache/clear
```

**Security**: All cache management endpoints require `ADMIN_READ` or `ADMIN_WRITE` permissions and are fully audited.

## 🔧 Performance Optimization

### Cache-Aware Development

When designing API consumers:

1. **Leverage Caching**: Prefer cached endpoints for frequently accessed data
2. **Cache Headers**: Check cache status headers for debugging
3. **TTL Awareness**: Understand cache expiration for time-sensitive data
4. **Batch Requests**: Use list endpoints instead of multiple individual requests

### Performance Expectations

| Cache Level | Response Time | Use Case |
|-------------|---------------|----------|
| Memory (L1) | <1ms | Hot data, user sessions |
| Redis (L2) | <10ms | Shared data, API responses |
| Database | 50-200ms | Complex queries, real-time data |
| External APIs | 100-1000ms | Third-party integrations |

## 📖 Interactive Documentation

### Swagger UI Features

#### Try It Out Functionality
1. Click "Try it out" on any endpoint
2. Fill in required parameters
3. Execute the request directly in the browser
4. View real response data and headers

#### Authentication Integration
1. Click the "Authorize" button (🔒 icon)
2. Enter your JWT token: `Bearer <your-token>`
3. All subsequent requests will include authentication
4. Token persists across browser sessions

#### Schema Exploration
- Click on response models to expand schema details
- View field types, validation rules, and examples
- Understand request/response structure before implementation

### ReDoc Features
- Clean, organized documentation view
- Hierarchical navigation
- Code examples in multiple languages
- Comprehensive schema documentation

## 🛠️ Developer Tools

### Health Checks
```bash
# Basic health check
GET /health

# Detailed health with dependencies
GET /health/detailed
```

### Debugging Headers
Every response includes debugging information:
```
X-Request-ID: uuid-for-tracing
X-Process-Time: processing-time-in-seconds
X-Cache-Status: cache-hit-status
```

### Error Handling
Standardized error responses:
```json
{
  "status": "error",
  "message": "Human-readable error message",
  "error_code": "VALIDATION_ERROR",
  "details": {
    "field": "specific error details"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "req-12345"
}
```

## 🚀 Best Practices

### API Consumption
1. **Always handle errors gracefully** - Implement proper error handling for 401, 403, and 5xx responses
2. **Use appropriate HTTP methods** - Follow RESTful conventions
3. **Include proper Content-Type headers** - Ensure correct content negotiation
4. **Implement exponential backoff for retries** - Respect rate limits and temporary failures
5. **Monitor rate limiting headers** - Track API usage to avoid limits

### Authentication & Authorization
1. **Store tokens securely** - Use secure storage mechanisms (keychain, encrypted storage)
2. **Implement token refresh logic** - Handle token expiration gracefully
3. **Handle 401/403 responses appropriately** - Distinguish authentication vs authorization failures
4. **Use HTTPS in production** - Never send tokens over unencrypted connections
5. **Check permissions before UI actions** - Hide/disable actions user cannot perform
6. **Validate permissions on both client and server** - Never rely solely on client-side checks

### Performance & Caching
1. **Leverage caching when appropriate** - Use cache headers to avoid unnecessary requests
2. **Respect cache TTL values** - Don't make redundant requests for cached data
3. **Use pagination for large datasets** - Implement proper pagination for list endpoints
4. **Implement client-side caching** - Cache frequently accessed data locally
5. **Monitor API performance metrics** - Track response times and error rates
6. **Use bulk operations** - Prefer batch endpoints over multiple individual requests

### Security Considerations
1. **Principle of least privilege** - Request only necessary permissions
2. **Validate all inputs** - Sanitize and validate all user inputs
3. **Log security events** - Monitor authentication and authorization failures
4. **Handle sensitive data carefully** - Never log or cache sensitive information
5. **Implement CSRF protection** - Use appropriate CSRF tokens for state-changing operations
6. **Monitor for suspicious activity** - Watch for unusual access patterns

## 📞 Support

### Resources
- **API Documentation**: `/docs` (Swagger UI) - Interactive API documentation with live examples
- **Alternative Docs**: `/redoc` (ReDoc) - Clean, organized documentation view  
- **RBAC Permissions Guide**: `/docs/api_rbac_permissions_guide.md` - Comprehensive permission reference
- **Cache System Guide**: `/docs/cache_system_guide.md` - Detailed caching documentation
- **Health Status**: `/health/detailed` - System health and dependency status
- **Performance Metrics**: `/cache/metrics` - Real-time cache performance data
- **Cache Management**: `/api/v1/cache/*` - Administrative cache control endpoints

### Getting Help
- **Interactive Documentation**: Start with `/docs` for live examples and testing
- **Permission Issues**: Use `/api/v1/permissions/users/{id}/check` to debug access problems
- **Performance Problems**: Check `/cache/metrics` and `/api/performance` for insights
- **System Health**: Monitor `/health/detailed` for dependency status
- **Error Analysis**: Review structured error responses and request IDs for tracing
- **Permission Reference**: Consult the RBAC permissions guide for detailed permission requirements
- **Development Support**: Contact the development team for complex integration issues

---

This documentation is automatically generated and kept up-to-date with the API implementation. For the most current information, always refer to the live documentation at `/docs`. 