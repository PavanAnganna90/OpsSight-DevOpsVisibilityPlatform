# OpsSight DevOps Platform API Documentation

## Overview

The OpsSight DevOps Platform provides a comprehensive REST API for managing DevOps operations, monitoring, and team collaboration. This API follows OpenAPI 3.0 specifications and provides full CRUD operations for all platform resources.

## 🚀 API Information

- **Version**: 1.0.0
- **Base URL**: `https://api.opssight.dev` (Production) / `http://localhost:8000` (Development)
- **Documentation**: 
  - **Swagger UI**: `/docs`
  - **ReDoc**: `/redoc`
  - **OpenAPI Schema**: `/openapi.json`
- **API Prefix**: `/api/v1`

## 🔐 Authentication

### Authentication Methods

The API supports multiple authentication methods:

#### 1. JWT Bearer Token (Primary)
```bash
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

#### 2. OAuth2 Providers
- **GitHub OAuth**: `/api/v1/auth/github`
- **Google OAuth**: `/api/v1/auth/google`
- **Microsoft OAuth**: `/api/v1/auth/microsoft`

#### 3. SAML 2.0 SSO
- **Azure AD**: `/api/v1/auth/saml/azure`
- **Okta**: `/api/v1/auth/saml/okta`
- **Generic SAML**: `/api/v1/auth/saml/generic`

#### 4. API Keys
```bash
X-API-Key: your-api-key-here
```

### Token Management
- **Access Token Lifetime**: 30 minutes
- **Refresh Token Lifetime**: 7 days
- **Token Refresh**: `/api/v1/auth/refresh`

### Example Authentication Flow
```python
import requests

# Login
response = requests.post("http://localhost:8000/api/v1/auth/login", json={
    "email": "user@example.com",
    "password": "password"
})

token = response.json()["access_token"]

# Use token
headers = {"Authorization": f"Bearer {token}"}
response = requests.get("http://localhost:8000/api/v1/users/me", headers=headers)
```

## 🔒 Authorization & RBAC

### Role-Based Access Control

The API implements a comprehensive RBAC system with hierarchical permissions:

#### Permission Categories
1. **User Management**: `VIEW_USERS`, `CREATE_USERS`, `UPDATE_USERS`, `DELETE_USERS`
2. **Role Management**: `VIEW_ROLES`, `MANAGE_ROLES`, `ASSIGN_ROLES`
3. **Team Management**: `VIEW_TEAMS`, `MANAGE_TEAMS`, `JOIN_TEAMS`
4. **Project Management**: `VIEW_PROJECTS`, `CREATE_PROJECTS`, `MANAGE_PROJECTS`
5. **Pipeline Operations**: `VIEW_PIPELINES`, `EXECUTE_PIPELINES`, `MANAGE_PIPELINES`
6. **Infrastructure**: `VIEW_INFRASTRUCTURE`, `MANAGE_INFRASTRUCTURE`
7. **Monitoring**: `VIEW_METRICS`, `MANAGE_ALERTS`, `VIEW_LOGS`
8. **Security**: `VIEW_AUDIT_LOGS`, `MANAGE_SECURITY`, `VIEW_SECURITY_EVENTS`
9. **Administration**: `MANAGE_SYSTEM`, `VIEW_ADMIN_PANEL`, `MANAGE_INTEGRATIONS`

#### Built-in Roles
- **Super Admin**: All permissions
- **Organization Admin**: Organization-level management
- **Team Lead**: Team and project management
- **Developer**: Development and deployment operations
- **Viewer**: Read-only access to assigned resources

### Permission Checking
Each endpoint documents required permissions:

```yaml
/api/v1/users:
  get:
    summary: List users
    security:
      - bearerAuth: []
    x-required-permissions:
      - VIEW_USERS
    responses:
      200:
        description: List of users
      403:
        description: Insufficient permissions
```

## 📚 API Endpoints

### Core Resource Endpoints

#### 1. Authentication & Users
```yaml
# Authentication
POST   /api/v1/auth/login                 # User login
POST   /api/v1/auth/logout                # User logout
POST   /api/v1/auth/refresh               # Refresh access token
GET    /api/v1/auth/me                    # Get current user info

# OAuth Providers
GET    /api/v1/auth/github                # GitHub OAuth initiation
GET    /api/v1/auth/github/callback       # GitHub OAuth callback
GET    /api/v1/auth/google                # Google OAuth initiation
GET    /api/v1/auth/google/callback       # Google OAuth callback

# SAML SSO
POST   /api/v1/auth/saml/azure            # Azure AD SSO
POST   /api/v1/auth/saml/okta             # Okta SSO

# User Management
GET    /api/v1/users                      # List users
POST   /api/v1/users                      # Create user
GET    /api/v1/users/{id}                 # Get user details
PUT    /api/v1/users/{id}                 # Update user
DELETE /api/v1/users/{id}                 # Delete user
GET    /api/v1/users/me                   # Get current user
PUT    /api/v1/users/me                   # Update current user
```

#### 2. Teams & Projects
```yaml
# Team Management
GET    /api/v1/teams                      # List teams
POST   /api/v1/teams                      # Create team
GET    /api/v1/teams/{id}                 # Get team details
PUT    /api/v1/teams/{id}                 # Update team
DELETE /api/v1/teams/{id}                 # Delete team
POST   /api/v1/teams/{id}/members         # Add team member
DELETE /api/v1/teams/{id}/members/{user_id} # Remove team member

# Project Management
GET    /api/v1/projects                   # List projects
POST   /api/v1/projects                   # Create project
GET    /api/v1/projects/{id}              # Get project details
PUT    /api/v1/projects/{id}              # Update project
DELETE /api/v1/projects/{id}              # Delete project
```

#### 3. Pipelines & Automation
```yaml
# Pipeline Management
GET    /api/v1/pipelines                  # List pipelines
POST   /api/v1/pipelines                  # Create pipeline
GET    /api/v1/pipelines/{id}             # Get pipeline details
PUT    /api/v1/pipelines/{id}             # Update pipeline
DELETE /api/v1/pipelines/{id}             # Delete pipeline
POST   /api/v1/pipelines/{id}/execute     # Execute pipeline
GET    /api/v1/pipelines/{id}/runs        # Get pipeline runs
GET    /api/v1/pipelines/{id}/runs/{run_id} # Get specific run

# Automation Runs
GET    /api/v1/automation-runs            # List automation runs
POST   /api/v1/automation-runs            # Create automation run
GET    /api/v1/automation-runs/{id}       # Get run details
GET    /api/v1/automation-runs/{id}/logs  # Get run logs
```

#### 4. Infrastructure & Monitoring
```yaml
# Cluster Management
GET    /api/v1/clusters                   # List clusters
POST   /api/v1/clusters                   # Create cluster
GET    /api/v1/clusters/{id}              # Get cluster details
PUT    /api/v1/clusters/{id}              # Update cluster
DELETE /api/v1/clusters/{id}              # Delete cluster
GET    /api/v1/clusters/{id}/status       # Get cluster status

# Infrastructure Changes
GET    /api/v1/infrastructure-changes     # List changes
POST   /api/v1/infrastructure-changes     # Create change
GET    /api/v1/infrastructure-changes/{id} # Get change details

# Alerts
GET    /api/v1/alerts                     # List alerts
POST   /api/v1/alerts                     # Create alert
GET    /api/v1/alerts/{id}                # Get alert details
PUT    /api/v1/alerts/{id}                # Update alert
DELETE /api/v1/alerts/{id}                # Delete alert
```

#### 5. Integrations
```yaml
# GitHub Integration
GET    /api/v1/github/repositories        # List repositories
POST   /api/v1/github/webhooks            # Setup webhooks
GET    /api/v1/github/workflows           # List workflows
POST   /api/v1/github/workflows/{id}/run  # Trigger workflow

# Terraform Integration
POST   /api/v1/terraform/parse-logs       # Parse Terraform logs
GET    /api/v1/terraform/plans            # List Terraform plans
POST   /api/v1/terraform/apply            # Apply Terraform

# Ansible Integration
POST   /api/v1/ansible/parse-logs         # Parse Ansible logs
GET    /api/v1/ansible/playbooks          # List playbooks
POST   /api/v1/ansible/execute            # Execute playbook
```

#### 6. Monitoring & Health
```yaml
# Health Checks
GET    /api/v1/health                     # Comprehensive health check
GET    /api/v1/health/readiness           # Kubernetes readiness probe
GET    /api/v1/health/liveness            # Kubernetes liveness probe
GET    /api/v1/health/startup             # Kubernetes startup probe

# Metrics
GET    /api/v1/metrics                    # Application metrics
GET    /metrics                           # Prometheus metrics endpoint

# Cache Management
GET    /api/v1/cache/stats                # Cache statistics
POST   /api/v1/cache/clear                # Clear cache
GET    /api/v1/cache/keys                 # List cache keys
```

## 📖 Data Models

### Core Entities

#### User Model
```json
{
  "id": "usr_123456789",
  "email": "user@example.com",
  "username": "johndoe",
  "full_name": "John Doe",
  "is_active": true,
  "is_verified": true,
  "avatar_url": "https://example.com/avatar.jpg",
  "github_username": "johndoe",
  "roles": ["developer", "team_lead"],
  "teams": [
    {
      "id": "team_123",
      "name": "Backend Team",
      "role": "member"
    }
  ],
  "last_login": "2024-01-15T10:30:00Z",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### Team Model
```json
{
  "id": "team_123456789",
  "name": "Backend Development Team",
  "description": "Responsible for backend services and APIs",
  "is_active": true,
  "members": [
    {
      "user_id": "usr_123",
      "role": "team_lead",
      "joined_at": "2024-01-01T00:00:00Z"
    }
  ],
  "projects": ["proj_123", "proj_456"],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### Project Model
```json
{
  "id": "proj_123456789",
  "name": "OpsSight Backend API",
  "description": "Core backend API for the OpsSight platform",
  "repository_url": "https://github.com/company/opssight-backend",
  "team_id": "team_123",
  "is_active": true,
  "environment": "production",
  "metadata": {
    "language": "Python",
    "framework": "FastAPI",
    "database": "PostgreSQL"
  },
  "pipelines": ["pipe_123", "pipe_456"],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### Pipeline Model
```json
{
  "id": "pipe_123456789",
  "name": "CI/CD Pipeline",
  "description": "Automated build, test, and deployment pipeline",
  "project_id": "proj_123",
  "pipeline_type": "ci_cd",
  "configuration": {
    "triggers": ["push", "pull_request"],
    "stages": ["build", "test", "deploy"],
    "environment": "production"
  },
  "is_active": true,
  "last_run": {
    "id": "run_123",
    "status": "success",
    "started_at": "2024-01-15T10:00:00Z",
    "finished_at": "2024-01-15T10:15:00Z",
    "duration": 900
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### Health Check Response
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "environment": "production",
  "uptime_seconds": 86400,
  "components": [
    {
      "name": "database",
      "status": "healthy",
      "response_time_ms": 45.2,
      "details": {
        "active_connections": 5,
        "idle_connections": 15,
        "pool_size": 20
      },
      "last_checked": "2024-01-15T10:30:00Z"
    },
    {
      "name": "cache",
      "status": "healthy",
      "response_time_ms": 12.1,
      "details": {
        "hit_rate": 0.85,
        "memory_usage_mb": 128
      },
      "last_checked": "2024-01-15T10:30:00Z"
    }
  ],
  "system_metrics": {
    "cpu_percent": 25.4,
    "memory_percent": 68.2,
    "memory_available_mb": 2048,
    "disk_usage_percent": 45.1,
    "disk_free_gb": 12.5,
    "process_count": 142,
    "open_file_descriptors": 85
  },
  "summary": {
    "total_components": 3,
    "healthy_components": 3,
    "degraded_components": 0,
    "unhealthy_components": 0,
    "check_duration_ms": 156.7
  }
}
```

## 🔄 API Versioning

### Version Strategy
- **Current Version**: v1
- **Version Header**: `Accept: application/vnd.opssight.v1+json`
- **URL Versioning**: `/api/v1/`
- **Backward Compatibility**: Maintained for major versions

### Version Lifecycle
- **v1**: Current stable version
- **v2**: Planned (breaking changes will be announced 6 months in advance)

## 📊 Rate Limiting

### Rate Limit Headers
All API responses include rate limiting information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642249200
Retry-After: 60
```

### Rate Limits by Endpoint Category
- **Authentication**: 5 requests/5 minutes
- **General API**: 100 requests/minute
- **File Upload**: 10 requests/hour
- **Admin Operations**: 1000 requests/minute

### Rate Limit Responses
```json
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded",
  "details": {
    "limit": 100,
    "window": "1 minute",
    "retry_after": 60
  }
}
```

## 🚨 Error Handling

### Standard Error Response Format
```json
{
  "error": "validation_error",
  "message": "Request validation failed",
  "details": {
    "field": "email",
    "issue": "Invalid email format"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/v1/users",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736"
}
```

### HTTP Status Codes
- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **204 No Content**: Request successful, no content to return
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict (e.g., duplicate email)
- **422 Unprocessable Entity**: Validation error
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error
- **503 Service Unavailable**: Service temporarily unavailable

### Error Categories
1. **Validation Errors**: Invalid input data
2. **Authentication Errors**: Invalid or missing credentials
3. **Authorization Errors**: Insufficient permissions
4. **Resource Errors**: Resource not found or conflicts
5. **Rate Limiting Errors**: Too many requests
6. **System Errors**: Internal server errors

## 📱 Webhooks

### Webhook Events
The API supports webhooks for real-time event notifications:

#### Available Events
- `user.created`, `user.updated`, `user.deleted`
- `team.created`, `team.updated`, `team.deleted`
- `project.created`, `project.updated`, `project.deleted`
- `pipeline.started`, `pipeline.completed`, `pipeline.failed`
- `deployment.started`, `deployment.completed`, `deployment.failed`
- `alert.triggered`, `alert.resolved`

#### Webhook Configuration
```json
{
  "url": "https://your-app.com/webhooks/opssight",
  "events": ["pipeline.completed", "deployment.failed"],
  "secret": "your-webhook-secret",
  "active": true
}
```

#### Webhook Payload Example
```json
{
  "event": "pipeline.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "pipeline": {
      "id": "pipe_123",
      "name": "CI/CD Pipeline",
      "project_id": "proj_123"
    },
    "run": {
      "id": "run_456",
      "status": "success",
      "duration": 900,
      "started_at": "2024-01-15T10:15:00Z",
      "finished_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

## 🔧 SDK and Client Libraries

### Official SDKs
- **Python SDK**: `pip install opssight-python`
- **JavaScript/TypeScript SDK**: `npm install @opssight/sdk`
- **Go SDK**: `go get github.com/opssight/go-sdk`

### Python SDK Example
```python
from opssight import Client

client = Client(
    base_url="https://api.opssight.dev",
    api_key="your-api-key"
)

# Get current user
user = client.users.me()
print(f"Hello, {user.full_name}")

# List projects
projects = client.projects.list()
for project in projects:
    print(f"Project: {project.name}")

# Execute pipeline
run = client.pipelines.execute("pipe_123")
print(f"Pipeline run started: {run.id}")
```

### JavaScript SDK Example
```javascript
import { OpsSightClient } from '@opssight/sdk';

const client = new OpsSightClient({
  baseUrl: 'https://api.opssight.dev',
  apiKey: 'your-api-key'
});

// Get current user
const user = await client.users.me();
console.log(`Hello, ${user.fullName}`);

// List projects
const projects = await client.projects.list();
projects.forEach(project => {
  console.log(`Project: ${project.name}`);
});

// Execute pipeline
const run = await client.pipelines.execute('pipe_123');
console.log(`Pipeline run started: ${run.id}`);
```

## 🧪 Testing the API

### Interactive Documentation
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### API Testing with curl
```bash
# Login to get token
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'

# Use token for authenticated requests
TOKEN="your-access-token"
curl -X GET "http://localhost:8000/api/v1/users/me" \
  -H "Authorization: Bearer $TOKEN"

# Create a new project
curl -X POST "http://localhost:8000/api/v1/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My New Project",
    "description": "A test project",
    "repository_url": "https://github.com/user/repo",
    "team_id": "team_123"
  }'
```

### Postman Collection
Import our Postman collection for comprehensive API testing:
```
https://api.opssight.dev/postman/collection.json
```

## 📚 Additional Resources

### Documentation Links
- **Architecture Guide**: `/docs/architecture`
- **Deployment Guide**: `/docs/deployment`
- **Security Guide**: `/docs/security`
- **Monitoring Guide**: `/docs/monitoring`

### Support
- **GitHub Issues**: https://github.com/opssight/platform/issues
- **Documentation**: https://docs.opssight.dev
- **Community**: https://community.opssight.dev
- **Support Email**: support@opssight.dev

### Changelog
- **v1.0.0**: Initial release with core functionality
- **Latest Updates**: Check `/api/v1/version` for current version info

---

This API documentation is automatically generated and synchronized with the codebase. For the most up-to-date information, visit the interactive documentation at `/docs`.