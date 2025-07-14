# OpsSight Platform - API Reference

Complete API reference documentation for the OpsSight DevOps Platform backend services.

## 🎯 Overview

The OpsSight API is built with FastAPI and provides comprehensive REST endpoints for:
- **Authentication & User Management** - OAuth, JWT, user profiles
- **Project & Team Management** - Projects, teams, repositories  
- **CI/CD Pipeline Integration** - GitHub Actions, pipeline monitoring
- **Infrastructure Management** - Kubernetes, Terraform, Ansible
- **Monitoring & Observability** - Metrics, logs, health checks
- **Security & Compliance** - Security monitoring, audit logs

## 🔧 Base Configuration

### Base URL
```
Development: http://localhost:8000
Production: https://api.opssight.your-domain.com
```

### API Version
```
Current Version: v1
Base Path: /api/v1
```

### Authentication
All authenticated endpoints require a JWT token in the Authorization header:
```http
Authorization: Bearer <your-jwt-token>
```

### Content Type
```http
Content-Type: application/json
```

## 🔐 Authentication Endpoints

### GitHub OAuth Login
Initiate GitHub OAuth login flow.

```http
GET /api/v1/auth/github/login
```

**Parameters:**
- `redirect_uri` (query, optional): Custom redirect URI after authentication

**Response:**
```json
{
  "auth_url": "https://github.com/login/oauth/authorize?client_id=...",
  "state": "csrf_protection_token"
}
```

### OAuth Callback
Handle GitHub OAuth callback and create user session.

```http
POST /api/v1/auth/github/callback
```

**Request Body:**
```json
{
  "code": "github_oauth_code",
  "state": "csrf_protection_token"
}
```

**Response:**
```json
{
  "access_token": "jwt_access_token",
  "refresh_token": "jwt_refresh_token",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "user_123",
    "username": "johndoe",
    "email": "john@example.com",
    "full_name": "John Doe",
    "avatar_url": "https://github.com/avatar.jpg"
  }
}
```

### Refresh Token
Refresh access token using refresh token.

```http
POST /api/v1/auth/refresh
```

**Request Body:**
```json
{
  "refresh_token": "jwt_refresh_token"
}
```

**Response:**
```json
{
  "access_token": "new_jwt_access_token",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### Get Current User
Get current authenticated user information.

```http
GET /api/v1/auth/me
```

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "user_123",
  "username": "johndoe",
  "email": "john@example.com",
  "full_name": "John Doe",
  "avatar_url": "https://github.com/avatar.jpg",
  "github_id": 12345678,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T12:30:00Z",
  "is_active": true
}
```

### Logout
Invalidate current session and tokens.

```http
POST /api/v1/auth/logout
```

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "message": "Successfully logged out"
}
```

## 👥 User Management

### List Users
Get list of users with pagination and filtering.

```http
GET /api/v1/users
```

**Parameters:**
- `skip` (query, optional): Number of records to skip (default: 0)
- `limit` (query, optional): Number of records to return (default: 10, max: 100)
- `search` (query, optional): Search by username or email
- `is_active` (query, optional): Filter by active status

**Response:**
```json
{
  "users": [
    {
      "id": "user_123",
      "username": "johndoe",
      "email": "john@example.com",
      "full_name": "John Doe",
      "avatar_url": "https://github.com/avatar.jpg",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 50,
  "skip": 0,
  "limit": 10
}
```

### Get User by ID
Get specific user information.

```http
GET /api/v1/users/{user_id}
```

**Response:**
```json
{
  "id": "user_123",
  "username": "johndoe",
  "email": "john@example.com",
  "full_name": "John Doe",
  "avatar_url": "https://github.com/avatar.jpg",
  "github_id": 12345678,
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T12:30:00Z",
  "teams": [
    {
      "id": "team_456",
      "name": "Development Team",
      "role": "member"
    }
  ]
}
```

### Update User
Update user profile information.

```http
PUT /api/v1/users/{user_id}
```

**Request Body:**
```json
{
  "full_name": "John Smith",
  "email": "johnsmith@example.com"
}
```

**Response:**
```json
{
  "id": "user_123",
  "username": "johndoe",
  "email": "johnsmith@example.com",
  "full_name": "John Smith",
  "avatar_url": "https://github.com/avatar.jpg",
  "updated_at": "2024-01-15T14:30:00Z"
}
```

## 🏢 Team Management

### List Teams
Get list of teams for current user.

```http
GET /api/v1/teams
```

**Parameters:**
- `skip` (query, optional): Number of records to skip
- `limit` (query, optional): Number of records to return

**Response:**
```json
{
  "teams": [
    {
      "id": "team_456",
      "name": "Development Team",
      "description": "Frontend and Backend Development",
      "created_at": "2024-01-01T00:00:00Z",
      "member_count": 5,
      "project_count": 3,
      "user_role": "admin"
    }
  ],
  "total": 2,
  "skip": 0,
  "limit": 10
}
```

### Create Team
Create a new team.

```http
POST /api/v1/teams
```

**Request Body:**
```json
{
  "name": "Backend Team",
  "description": "Backend API development and infrastructure"
}
```

**Response:**
```json
{
  "id": "team_789",
  "name": "Backend Team",
  "description": "Backend API development and infrastructure",
  "created_at": "2024-01-15T15:00:00Z",
  "member_count": 1,
  "project_count": 0,
  "user_role": "admin"
}
```

### Get Team Details
Get detailed information about a specific team.

```http
GET /api/v1/teams/{team_id}
```

**Response:**
```json
{
  "id": "team_456",
  "name": "Development Team",
  "description": "Frontend and Backend Development",
  "created_at": "2024-01-01T00:00:00Z",
  "members": [
    {
      "user_id": "user_123",
      "username": "johndoe",
      "full_name": "John Doe",
      "role": "admin",
      "joined_at": "2024-01-01T00:00:00Z"
    }
  ],
  "projects": [
    {
      "id": "project_789",
      "name": "OpsSight Platform",
      "status": "active"
    }
  ]
}
```

### Add Team Member
Add a user to a team.

```http
POST /api/v1/teams/{team_id}/members
```

**Request Body:**
```json
{
  "user_id": "user_456",
  "role": "member"
}
```

**Response:**
```json
{
  "message": "User added to team successfully",
  "member": {
    "user_id": "user_456",
    "username": "janesmith",
    "role": "member",
    "joined_at": "2024-01-15T15:30:00Z"
  }
}
```

## 📊 Project Management

### List Projects
Get list of projects accessible to current user.

```http
GET /api/v1/projects
```

**Parameters:**
- `skip` (query, optional): Number of records to skip
- `limit` (query, optional): Number of records to return
- `status` (query, optional): Filter by project status (active, archived, maintenance)

**Response:**
```json
{
  "projects": [
    {
      "id": "project_789",
      "name": "OpsSight Platform",
      "description": "DevOps monitoring and automation platform",
      "status": "active",
      "repository_url": "https://github.com/company/opssight",
      "created_at": "2024-01-01T00:00:00Z",
      "team": {
        "id": "team_456",
        "name": "Development Team"
      },
      "health_score": 85.5,
      "last_deployment": "2024-01-14T10:30:00Z"
    }
  ],
  "total": 3,
  "skip": 0,
  "limit": 10
}
```

### Create Project
Create a new project.

```http
POST /api/v1/projects
```

**Request Body:**
```json
{
  "name": "Mobile App",
  "description": "OpsSight mobile application",
  "team_id": "team_456",
  "repository_url": "https://github.com/company/mobile-app",
  "github_owner": "company",
  "github_repo": "mobile-app"
}
```

**Response:**
```json
{
  "id": "project_101",
  "name": "Mobile App",
  "description": "OpsSight mobile application",
  "status": "active",
  "repository_url": "https://github.com/company/mobile-app",
  "github_owner": "company",
  "github_repo": "mobile-app",
  "created_at": "2024-01-15T16:00:00Z",
  "team": {
    "id": "team_456",
    "name": "Development Team"
  },
  "health_score": 0,
  "last_deployment": null
}
```

### Get Project Details
Get detailed information about a specific project.

```http
GET /api/v1/projects/{project_id}
```

**Response:**
```json
{
  "id": "project_789",
  "name": "OpsSight Platform",
  "description": "DevOps monitoring and automation platform",
  "status": "active",
  "repository_url": "https://github.com/company/opssight",
  "github_owner": "company",
  "github_repo": "opssight",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T12:00:00Z",
  "team": {
    "id": "team_456",
    "name": "Development Team"
  },
  "health_score": 85.5,
  "last_deployment": "2024-01-14T10:30:00Z",
  "pipelines": [
    {
      "id": "pipeline_123",
      "name": "CI/CD Pipeline",
      "status": "success",
      "last_run": "2024-01-15T14:30:00Z"
    }
  ],
  "clusters": [
    {
      "id": "cluster_456",
      "name": "Production Cluster",
      "status": "healthy",
      "node_count": 5
    }
  ]
}
```

## 🔄 Pipeline Management

### List Pipelines
Get list of CI/CD pipelines for a project.

```http
GET /api/v1/projects/{project_id}/pipelines
```

**Parameters:**
- `status` (query, optional): Filter by pipeline status
- `limit` (query, optional): Number of records to return

**Response:**
```json
{
  "pipelines": [
    {
      "id": "pipeline_123",
      "workflow_id": 12345,
      "name": "CI/CD Pipeline",
      "status": "success",
      "conclusion": "success",
      "run_number": 456,
      "head_branch": "main",
      "head_sha": "abc123def456",
      "created_at": "2024-01-15T14:30:00Z",
      "updated_at": "2024-01-15T14:45:00Z",
      "run_started_at": "2024-01-15T14:30:00Z",
      "duration_seconds": 900,
      "jobs": [
        {
          "id": "job_789",
          "name": "build",
          "status": "completed",
          "conclusion": "success",
          "duration_seconds": 300
        }
      ]
    }
  ],
  "total": 25,
  "skip": 0,
  "limit": 10
}
```

### Get Pipeline Details
Get detailed information about a specific pipeline run.

```http
GET /api/v1/pipelines/{pipeline_id}
```

**Response:**
```json
{
  "id": "pipeline_123",
  "workflow_id": 12345,
  "name": "CI/CD Pipeline",
  "status": "success",
  "conclusion": "success",
  "run_number": 456,
  "head_branch": "main",
  "head_sha": "abc123def456",
  "event": "push",
  "actor": "johndoe",
  "created_at": "2024-01-15T14:30:00Z",
  "updated_at": "2024-01-15T14:45:00Z",
  "run_started_at": "2024-01-15T14:30:00Z",
  "duration_seconds": 900,
  "jobs": [
    {
      "id": "job_789",
      "name": "build",
      "status": "completed",
      "conclusion": "success",
      "started_at": "2024-01-15T14:30:00Z",
      "completed_at": "2024-01-15T14:35:00Z",
      "duration_seconds": 300,
      "steps": [
        {
          "name": "Checkout code",
          "status": "completed",
          "conclusion": "success",
          "number": 1,
          "started_at": "2024-01-15T14:30:00Z",
          "completed_at": "2024-01-15T14:30:30Z"
        }
      ]
    }
  ],
  "logs_url": "/api/v1/pipelines/pipeline_123/logs"
}
```

### Get Pipeline Logs
Get logs for a specific pipeline run.

```http
GET /api/v1/pipelines/{pipeline_id}/logs
```

**Parameters:**
- `job_id` (query, optional): Get logs for specific job only

**Response:**
```json
{
  "logs": [
    {
      "job_id": "job_789",
      "job_name": "build",
      "step_number": 1,
      "step_name": "Checkout code",
      "timestamp": "2024-01-15T14:30:00Z",
      "line": "Run actions/checkout@v4"
    }
  ],
  "total_lines": 1250
}
```

## ☸️ Kubernetes Management

### List Clusters
Get list of Kubernetes clusters.

```http
GET /api/v1/clusters
```

**Response:**
```json
{
  "clusters": [
    {
      "id": "cluster_456",
      "name": "Production Cluster",
      "endpoint": "https://k8s-api.company.com",
      "version": "v1.28.2",
      "status": "healthy",
      "node_count": 5,
      "namespace_count": 12,
      "pod_count": 45,
      "created_at": "2024-01-01T00:00:00Z",
      "last_sync": "2024-01-15T15:00:00Z",
      "health_score": 92.5
    }
  ],
  "total": 2
}
```

### Get Cluster Details
Get detailed information about a specific cluster.

```http
GET /api/v1/clusters/{cluster_id}
```

**Response:**
```json
{
  "id": "cluster_456",
  "name": "Production Cluster",
  "endpoint": "https://k8s-api.company.com",
  "version": "v1.28.2",
  "status": "healthy",
  "node_count": 5,
  "namespace_count": 12,
  "pod_count": 45,
  "created_at": "2024-01-01T00:00:00Z",
  "last_sync": "2024-01-15T15:00:00Z",
  "health_score": 92.5,
  "nodes": [
    {
      "name": "worker-1",
      "status": "Ready",
      "cpu_usage": 65.2,
      "memory_usage": 78.5,
      "pod_count": 12
    }
  ],
  "metrics": {
    "cpu_usage_percentage": 68.5,
    "memory_usage_percentage": 75.2,
    "storage_usage_percentage": 45.8,
    "pod_success_rate": 98.5
  }
}
```

### Get Cluster Metrics
Get real-time metrics for a cluster.

```http
GET /api/v1/clusters/{cluster_id}/metrics
```

**Parameters:**
- `range` (query, optional): Time range (1h, 6h, 24h, 7d)

**Response:**
```json
{
  "timeRange": "1h",
  "metrics": {
    "cpu_usage": [
      {
        "timestamp": "2024-01-15T15:00:00Z",
        "value": 68.5
      }
    ],
    "memory_usage": [
      {
        "timestamp": "2024-01-15T15:00:00Z",
        "value": 75.2
      }
    ],
    "pod_count": [
      {
        "timestamp": "2024-01-15T15:00:00Z",
        "value": 45
      }
    ]
  }
}
```

## 🏗️ Infrastructure Management

### Terraform Logs
Upload and parse Terraform execution logs.

```http
POST /api/v1/terraform/parse-logs
```

**Request Body (multipart/form-data):**
```
file: terraform_logs.txt
```

**Response:**
```json
{
  "id": "tf_log_123",
  "format": "json",
  "operation": "apply",
  "status": "success",
  "duration_seconds": 300,
  "resources": {
    "created": 5,
    "updated": 2,
    "destroyed": 0,
    "total": 7
  },
  "changes": [
    {
      "address": "aws_instance.web",
      "action": "create",
      "before": null,
      "after": {
        "instance_type": "t3.micro",
        "ami": "ami-12345"
      }
    }
  ],
  "modules": ["root", "networking", "compute"],
  "parsed_at": "2024-01-15T15:30:00Z"
}
```

### Ansible Coverage
Upload and analyze Ansible playbook logs.

```http
POST /api/v1/ansible/parse-logs
```

**Request Body (multipart/form-data):**
```
file: ansible_logs.txt
```

**Response:**
```json
{
  "id": "ansible_log_456",
  "format": "json",
  "status": "success",
  "duration_seconds": 180,
  "playbooks": [
    {
      "name": "deploy.yml",
      "status": "success",
      "task_count": 15,
      "changed_count": 8,
      "failed_count": 0
    }
  ],
  "hosts": [
    {
      "name": "web-server-1",
      "status": "success",
      "task_count": 15,
      "changed_count": 8,
      "failed_count": 0,
      "unreachable": false
    }
  ],
  "coverage_analysis": {
    "automation_score": 87.5,
    "module_diversity": 12,
    "success_rate": 100.0
  },
  "parsed_at": "2024-01-15T15:45:00Z"
}
```

## 📊 Monitoring & Health

### System Health
Get comprehensive system health status.

```http
GET /api/v1/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T16:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "healthy",
      "response_time_ms": 15,
      "connection_pool": {
        "active": 5,
        "idle": 15,
        "max": 20
      }
    },
    "redis": {
      "status": "healthy",
      "response_time_ms": 2,
      "memory_usage": "45.2MB",
      "hit_ratio": 0.95
    },
    "external_apis": {
      "github": {
        "status": "healthy",
        "response_time_ms": 150,
        "rate_limit_remaining": 4500
      }
    }
  },
  "system": {
    "cpu_usage": 35.2,
    "memory_usage": 68.5,
    "disk_usage": 45.8,
    "uptime_seconds": 86400
  }
}
```

### Detailed Health Check
Get detailed health information for all components.

```http
GET /api/v1/monitoring/health/detailed
```

**Response:**
```json
{
  "overall_status": "healthy",
  "timestamp": "2024-01-15T16:00:00Z",
  "components": {
    "application": {
      "status": "healthy",
      "checks": {
        "startup": "passed",
        "liveness": "passed",
        "readiness": "passed"
      },
      "metrics": {
        "request_rate": 150.5,
        "error_rate": 0.02,
        "response_time_p95": 250
      }
    },
    "database": {
      "status": "healthy",
      "connection_count": 20,
      "slow_queries": 0,
      "replication_lag": 0
    },
    "cache": {
      "status": "healthy",
      "hit_ratio": 0.95,
      "memory_usage": 0.45,
      "eviction_rate": 0.001
    }
  }
}
```

### Monitoring Dashboard Data
Get complete monitoring dashboard data.

```http
GET /api/v1/monitoring/dashboard
```

**Response:**
```json
{
  "timestamp": "2024-01-15T16:00:00Z",
  "system_metrics": {
    "cpu_usage": 35.2,
    "memory_usage": 68.5,
    "disk_usage": 45.8,
    "network_io": {
      "bytes_in": 1250000,
      "bytes_out": 890000
    }
  },
  "application_metrics": {
    "active_users": 150,
    "requests_per_minute": 1250,
    "error_rate": 0.02,
    "average_response_time": 185
  },
  "database_metrics": {
    "connection_count": 20,
    "query_rate": 450,
    "slow_query_count": 0,
    "cache_hit_ratio": 0.98
  },
  "security_events": {
    "failed_logins": 5,
    "blocked_ips": 2,
    "rate_limit_violations": 0
  }
}
```

## 🔔 Webhook & Notifications

### List Webhooks
Get configured webhooks for alerts and notifications.

```http
GET /api/v1/webhooks
```

**Response:**
```json
{
  "webhooks": [
    {
      "id": "webhook_123",
      "name": "Slack Alerts",
      "url": "https://hooks.slack.com/services/...",
      "events": ["alert.critical", "deployment.success"],
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "last_triggered": "2024-01-15T14:30:00Z",
      "success_count": 45,
      "failure_count": 2
    }
  ]
}
```

### Create Webhook
Create a new webhook configuration.

```http
POST /api/v1/webhooks
```

**Request Body:**
```json
{
  "name": "PagerDuty Integration",
  "url": "https://events.pagerduty.com/integration/...",
  "events": ["alert.critical", "alert.warning"],
  "headers": {
    "Authorization": "Token token=your-token"
  },
  "is_active": true
}
```

**Response:**
```json
{
  "id": "webhook_456",
  "name": "PagerDuty Integration",
  "url": "https://events.pagerduty.com/integration/...",
  "events": ["alert.critical", "alert.warning"],
  "is_active": true,
  "created_at": "2024-01-15T16:15:00Z",
  "secret": "webhook_secret_abc123"
}
```

### Send Test Notification
Send a test notification to verify webhook configuration.

```http
POST /api/v1/webhooks/{webhook_id}/test
```

**Response:**
```json
{
  "success": true,
  "response_status": 200,
  "response_time_ms": 150,
  "message": "Test notification sent successfully"
}
```

## 🔍 Search & Filtering

### Search All Resources
Search across projects, teams, pipelines, and other resources.

```http
GET /api/v1/search
```

**Parameters:**
- `q` (query, required): Search query
- `type` (query, optional): Resource type filter (project, team, pipeline, user)
- `limit` (query, optional): Number of results

**Response:**
```json
{
  "query": "opssight",
  "results": [
    {
      "type": "project",
      "id": "project_789",
      "title": "OpsSight Platform",
      "description": "DevOps monitoring and automation platform",
      "url": "/projects/project_789",
      "relevance": 0.95
    },
    {
      "type": "team",
      "id": "team_456",
      "title": "OpsSight Development",
      "description": "Core development team for OpsSight",
      "url": "/teams/team_456",
      "relevance": 0.85
    }
  ],
  "total": 5,
  "search_time_ms": 25
}
```

## 📈 Analytics & Reports

### Pipeline Analytics
Get analytics data for CI/CD pipelines.

```http
GET /api/v1/analytics/pipelines
```

**Parameters:**
- `project_id` (query, optional): Filter by project
- `time_range` (query, optional): Time range (7d, 30d, 90d)

**Response:**
```json
{
  "time_range": "30d",
  "summary": {
    "total_runs": 150,
    "success_rate": 92.5,
    "average_duration": 450,
    "deployment_frequency": 2.3
  },
  "trends": {
    "success_rate": [
      {
        "date": "2024-01-01",
        "value": 90.5
      }
    ],
    "duration": [
      {
        "date": "2024-01-01",
        "value": 460
      }
    ]
  },
  "top_failures": [
    {
      "reason": "Test failures",
      "count": 8,
      "percentage": 5.3
    }
  ]
}
```

## 🚨 Error Responses

### Error Format
All API errors return a consistent error format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "request_id": "req_123456",
    "timestamp": "2024-01-15T16:30:00Z"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `AUTHENTICATION_REQUIRED` | 401 | Authentication required |
| `INSUFFICIENT_PERMISSIONS` | 403 | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## 📝 Rate Limiting

### Rate Limits
- **Authenticated users**: 1000 requests per hour
- **Anonymous users**: 100 requests per hour
- **Search API**: 100 requests per hour
- **File uploads**: 10 requests per hour

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1642264800
```

## 🔧 SDK & Client Libraries

### Python SDK
```python
from opssight_sdk import OpsSightClient

client = OpsSightClient(
    base_url="https://api.opssight.com",
    access_token="your_token"
)

# Get projects
projects = client.projects.list()

# Create team
team = client.teams.create(
    name="Backend Team",
    description="API development team"
)
```

### JavaScript SDK
```javascript
import { OpsSightClient } from '@opssight/sdk';

const client = new OpsSightClient({
  baseUrl: 'https://api.opssight.com',
  accessToken: 'your_token'
});

// Get pipelines
const pipelines = await client.pipelines.list();

// Get cluster metrics
const metrics = await client.clusters.getMetrics('cluster_123');
```

## 📚 Additional Resources

- **OpenAPI Specification**: `/api/v1/openapi.json`
- **Interactive API Docs**: `/docs` (Swagger UI)
- **ReDoc Documentation**: `/redoc`
- **SDK Documentation**: [GitHub Repository](https://github.com/company/opssight-sdk)
- **Postman Collection**: [Download](https://api.opssight.com/postman.json)

---

**🎉 Happy coding with the OpsSight API!**

For support or questions, please check our [GitHub issues](https://github.com/company/opssight/issues) or contact the development team.