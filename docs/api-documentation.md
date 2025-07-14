# API Documentation

This document provides comprehensive documentation for the OpsSight DevOps Platform API.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Webhooks](#webhooks)
8. [SDKs and Libraries](#sdks-and-libraries)
9. [Examples](#examples)

## Overview

The OpsSight API is a RESTful API that provides access to DevOps metrics, monitoring data, and platform functionality. The API is built using FastAPI and follows OpenAPI 3.0 specification.

**Base URL**: `https://api.your-domain.com/api/v1`

**Content Type**: `application/json`

**API Version**: `v1`

### Interactive Documentation

- **Swagger UI**: `https://api.your-domain.com/docs`
- **ReDoc**: `https://api.your-domain.com/redoc`
- **OpenAPI Schema**: `https://api.your-domain.com/openapi.json`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication with GitHub OAuth integration.

### OAuth Flow

1. **Authorization Request**
   ```
   GET /auth/github
   ```

2. **Authorization Callback**
   ```
   GET /auth/github/callback?code={authorization_code}&state={state}
   ```

3. **Token Response**
   ```json
   {
     "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
     "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
     "token_type": "bearer",
     "expires_in": 3600
   }
   ```

### Authentication Headers

All authenticated requests must include the Authorization header:

```
Authorization: Bearer {access_token}
```

### Token Refresh

```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

## API Endpoints

### Authentication Endpoints

#### GET /auth/github
Initiate GitHub OAuth flow.

**Parameters:**
- `redirect_uri` (query): Optional redirect URI after authentication

**Response:**
```json
{
  "auth_url": "https://github.com/login/oauth/authorize?client_id=...",
  "state": "random_state_string"
}
```

#### GET /auth/github/callback
Handle GitHub OAuth callback.

**Parameters:**
- `code` (query): Authorization code from GitHub
- `state` (query): State parameter for CSRF protection

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 123,
    "login": "username",
    "name": "Full Name",
    "email": "user@example.com",
    "avatar_url": "https://avatars.githubusercontent.com/u/123"
  }
}
```

#### POST /auth/refresh
Refresh access token.

**Request Body:**
```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Response:**
```json
{
  "access_token": "new_access_token",
  "token_type": "bearer",
  "expires_in": 3600
}
```

#### POST /auth/logout
Logout and invalidate tokens.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "message": "Successfully logged out"
}
```

### User Management

#### GET /users/me
Get current user profile.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "id": 123,
  "login": "username",
  "name": "Full Name",
  "email": "user@example.com",
  "avatar_url": "https://avatars.githubusercontent.com/u/123",
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z",
  "permissions": ["read", "write", "admin"]
}
```

#### PUT /users/me
Update current user profile.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```

**Response:**
```json
{
  "id": 123,
  "login": "username",
  "name": "Updated Name",
  "email": "updated@example.com",
  "avatar_url": "https://avatars.githubusercontent.com/u/123",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

### Metrics and Monitoring

#### GET /metrics
Get application metrics.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Parameters:**
- `start_time` (query): Start time in ISO format
- `end_time` (query): End time in ISO format
- `metric_type` (query): Type of metric (cpu, memory, requests, etc.)

**Response:**
```json
{
  "metrics": [
    {
      "name": "cpu_usage",
      "value": 75.5,
      "unit": "percent",
      "timestamp": "2023-01-01T00:00:00Z",
      "tags": {
        "host": "web-01",
        "service": "frontend"
      }
    }
  ],
  "total_count": 100,
  "start_time": "2023-01-01T00:00:00Z",
  "end_time": "2023-01-01T01:00:00Z"
}
```

#### POST /metrics
Submit custom metrics.

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "metrics": [
    {
      "name": "custom_metric",
      "value": 42.0,
      "unit": "count",
      "timestamp": "2023-01-01T00:00:00Z",
      "tags": {
        "component": "api",
        "environment": "production"
      }
    }
  ]
}
```

**Response:**
```json
{
  "message": "Metrics submitted successfully",
  "accepted_count": 1
}
```

### Kubernetes Monitoring

#### GET /kubernetes/clusters
Get Kubernetes cluster information.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "clusters": [
    {
      "name": "production-cluster",
      "version": "v1.25.0",
      "status": "healthy",
      "nodes": 5,
      "pods": 120,
      "namespaces": 15,
      "created_at": "2023-01-01T00:00:00Z"
    }
  ]
}
```

#### GET /kubernetes/clusters/{cluster_name}/nodes
Get cluster nodes.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Path Parameters:**
- `cluster_name`: Name of the cluster

**Response:**
```json
{
  "nodes": [
    {
      "name": "node-1",
      "status": "Ready",
      "cpu_usage": 45.2,
      "memory_usage": 67.8,
      "pods": 25,
      "created_at": "2023-01-01T00:00:00Z"
    }
  ]
}
```

#### GET /kubernetes/clusters/{cluster_name}/pods
Get cluster pods.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Path Parameters:**
- `cluster_name`: Name of the cluster

**Query Parameters:**
- `namespace` (optional): Filter by namespace
- `status` (optional): Filter by pod status

**Response:**
```json
{
  "pods": [
    {
      "name": "app-pod-123",
      "namespace": "default",
      "status": "Running",
      "ready": true,
      "cpu_usage": 10.5,
      "memory_usage": 128.0,
      "created_at": "2023-01-01T00:00:00Z"
    }
  ]
}
```

### CI/CD Pipeline Monitoring

#### GET /pipelines
Get CI/CD pipeline information.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `repository` (optional): Filter by repository
- `branch` (optional): Filter by branch
- `status` (optional): Filter by pipeline status

**Response:**
```json
{
  "pipelines": [
    {
      "id": "pipeline-123",
      "repository": "org/repo",
      "branch": "main",
      "status": "success",
      "duration": 300,
      "started_at": "2023-01-01T00:00:00Z",
      "finished_at": "2023-01-01T00:05:00Z",
      "commit": {
        "sha": "abc123",
        "message": "Add new feature",
        "author": "developer@example.com"
      }
    }
  ]
}
```

#### GET /pipelines/{pipeline_id}
Get specific pipeline details.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Path Parameters:**
- `pipeline_id`: ID of the pipeline

**Response:**
```json
{
  "id": "pipeline-123",
  "repository": "org/repo",
  "branch": "main",
  "status": "success",
  "duration": 300,
  "started_at": "2023-01-01T00:00:00Z",
  "finished_at": "2023-01-01T00:05:00Z",
  "commit": {
    "sha": "abc123",
    "message": "Add new feature",
    "author": "developer@example.com"
  },
  "stages": [
    {
      "name": "build",
      "status": "success",
      "duration": 120,
      "started_at": "2023-01-01T00:00:00Z",
      "finished_at": "2023-01-01T00:02:00Z"
    },
    {
      "name": "test",
      "status": "success",
      "duration": 180,
      "started_at": "2023-01-01T00:02:00Z",
      "finished_at": "2023-01-01T00:05:00Z"
    }
  ]
}
```

### Ansible Automation

#### GET /ansible/playbooks
Get Ansible playbook execution history.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `playbook` (optional): Filter by playbook name
- `status` (optional): Filter by execution status

**Response:**
```json
{
  "executions": [
    {
      "id": "exec-123",
      "playbook": "deploy.yml",
      "status": "success",
      "duration": 240,
      "started_at": "2023-01-01T00:00:00Z",
      "finished_at": "2023-01-01T00:04:00Z",
      "hosts": ["web-01", "web-02"],
      "tasks_total": 10,
      "tasks_successful": 10,
      "tasks_failed": 0
    }
  ]
}
```

#### POST /ansible/playbooks/{playbook_name}/execute
Execute Ansible playbook.

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
- `playbook_name`: Name of the playbook to execute

**Request Body:**
```json
{
  "hosts": ["web-01", "web-02"],
  "variables": {
    "app_version": "1.2.3",
    "environment": "production"
  }
}
```

**Response:**
```json
{
  "execution_id": "exec-456",
  "status": "running",
  "message": "Playbook execution started"
}
```

### Alerts and Notifications

#### GET /alerts
Get active alerts.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `severity` (optional): Filter by alert severity
- `status` (optional): Filter by alert status

**Response:**
```json
{
  "alerts": [
    {
      "id": "alert-123",
      "name": "High CPU Usage",
      "severity": "critical",
      "status": "active",
      "description": "CPU usage above 90% for 5 minutes",
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:05:00Z",
      "tags": {
        "host": "web-01",
        "service": "frontend"
      }
    }
  ]
}
```

#### POST /alerts/{alert_id}/acknowledge
Acknowledge an alert.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Path Parameters:**
- `alert_id`: ID of the alert to acknowledge

**Response:**
```json
{
  "message": "Alert acknowledged successfully",
  "acknowledged_at": "2023-01-01T00:00:00Z"
}
```

### Health Check

#### GET /health
Get API health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-01-01T00:00:00Z",
  "version": "1.0.0",
  "database": {
    "status": "connected",
    "response_time": 5.2
  },
  "external_services": {
    "github": {
      "status": "available",
      "response_time": 120.5
    },
    "kubernetes": {
      "status": "available",
      "response_time": 45.8
    }
  }
}
```

## Data Models

### User Model
```json
{
  "id": "integer",
  "login": "string",
  "name": "string",
  "email": "string",
  "avatar_url": "string",
  "created_at": "datetime",
  "updated_at": "datetime",
  "permissions": ["string"]
}
```

### Metric Model
```json
{
  "name": "string",
  "value": "number",
  "unit": "string",
  "timestamp": "datetime",
  "tags": {
    "key": "string"
  }
}
```

### Pipeline Model
```json
{
  "id": "string",
  "repository": "string",
  "branch": "string",
  "status": "string",
  "duration": "integer",
  "started_at": "datetime",
  "finished_at": "datetime",
  "commit": {
    "sha": "string",
    "message": "string",
    "author": "string"
  },
  "stages": [
    {
      "name": "string",
      "status": "string",
      "duration": "integer",
      "started_at": "datetime",
      "finished_at": "datetime"
    }
  ]
}
```

### Alert Model
```json
{
  "id": "string",
  "name": "string",
  "severity": "string",
  "status": "string",
  "description": "string",
  "created_at": "datetime",
  "updated_at": "datetime",
  "tags": {
    "key": "string"
  }
}
```

## Error Handling

The API uses standard HTTP status codes and returns detailed error information in JSON format.

### Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details"
    }
  },
  "request_id": "unique_request_identifier"
}
```

### Common Error Codes

#### 400 Bad Request
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request is invalid",
    "details": {
      "field": "start_time",
      "error": "Invalid datetime format"
    }
  },
  "request_id": "req-123"
}
```

#### 401 Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "details": {
      "reason": "Missing or invalid token"
    }
  },
  "request_id": "req-124"
}
```

#### 403 Forbidden
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions",
    "details": {
      "required_permission": "admin"
    }
  },
  "request_id": "req-125"
}
```

#### 404 Not Found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "details": {
      "resource": "pipeline",
      "id": "pipeline-123"
    }
  },
  "request_id": "req-126"
}
```

#### 429 Too Many Requests
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 100,
      "remaining": 0,
      "reset_at": "2023-01-01T01:00:00Z"
    }
  },
  "request_id": "req-127"
}
```

#### 500 Internal Server Error
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An internal server error occurred",
    "details": {
      "error_id": "err-789"
    }
  },
  "request_id": "req-128"
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage and system stability.

### Rate Limits

- **Authenticated requests**: 1000 requests per hour
- **Unauthenticated requests**: 100 requests per hour
- **Webhook endpoints**: 100 requests per hour

### Rate Limit Headers

All API responses include rate limit information:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded Response

When rate limits are exceeded, the API returns a 429 status code:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 1000,
      "remaining": 0,
      "reset_at": "2023-01-01T01:00:00Z"
    }
  },
  "request_id": "req-127"
}
```

## Webhooks

The API supports webhooks for real-time event notifications.

### Webhook Events

- `pipeline.started`: Pipeline execution started
- `pipeline.completed`: Pipeline execution completed
- `pipeline.failed`: Pipeline execution failed
- `alert.created`: New alert created
- `alert.resolved`: Alert resolved
- `deployment.started`: Deployment started
- `deployment.completed`: Deployment completed

### Webhook Payload Format

```json
{
  "event": "pipeline.completed",
  "timestamp": "2023-01-01T00:00:00Z",
  "data": {
    "pipeline": {
      "id": "pipeline-123",
      "repository": "org/repo",
      "branch": "main",
      "status": "success",
      "duration": 300
    }
  }
}
```

### Webhook Security

Webhooks are signed using HMAC-SHA256. The signature is included in the `X-Webhook-Signature` header:

```
X-Webhook-Signature: sha256=5d41402abc4b2a76b9719d911017c592
```

### Webhook Configuration

Configure webhooks through the API:

```http
POST /webhooks
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "url": "https://your-domain.com/webhook",
  "events": ["pipeline.completed", "alert.created"],
  "secret": "your-webhook-secret"
}
```

## SDKs and Libraries

### Official SDKs

- **Python**: `pip install opsight-python`
- **Node.js**: `npm install opsight-js`
- **Go**: `go get github.com/org/opsight-go`

### Python SDK Example

```python
from opsight import Client

client = Client(
    api_url="https://api.your-domain.com/api/v1",
    access_token="your_access_token"
)

# Get user profile
user = client.users.get_me()
print(f"Hello, {user.name}!")

# Get metrics
metrics = client.metrics.list(
    start_time="2023-01-01T00:00:00Z",
    end_time="2023-01-01T01:00:00Z"
)
```

### Node.js SDK Example

```javascript
import { OpsightClient } from 'opsight-js';

const client = new OpsightClient({
  apiUrl: 'https://api.your-domain.com/api/v1',
  accessToken: 'your_access_token'
});

// Get user profile
const user = await client.users.getMe();
console.log(`Hello, ${user.name}!`);

// Get pipelines
const pipelines = await client.pipelines.list({
  repository: 'org/repo'
});
```

## Examples

### Authentication Flow

```javascript
// 1. Initiate OAuth flow
const authResponse = await fetch('/api/v1/auth/github');
const { auth_url, state } = await authResponse.json();

// 2. Redirect user to GitHub
window.location.href = auth_url;

// 3. Handle callback (on callback URL)
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');

const tokenResponse = await fetch(`/api/v1/auth/github/callback?code=${code}&state=${state}`);
const { access_token } = await tokenResponse.json();

// 4. Store token and make authenticated requests
localStorage.setItem('access_token', access_token);
```

### Fetching Metrics

```javascript
const response = await fetch('/api/v1/metrics?start_time=2023-01-01T00:00:00Z&end_time=2023-01-01T01:00:00Z', {
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  }
});

const { metrics } = await response.json();
console.log('Metrics:', metrics);
```

### Submitting Custom Metrics

```javascript
const metrics = [
  {
    name: 'api_requests',
    value: 150,
    unit: 'count',
    timestamp: new Date().toISOString(),
    tags: {
      endpoint: '/api/users',
      method: 'GET',
      status: '200'
    }
  }
];

const response = await fetch('/api/v1/metrics', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ metrics })
});

const result = await response.json();
console.log('Metrics submitted:', result);
```

### Handling Webhooks

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', 'your-webhook-secret')
    .update(payload)
    .digest('hex');
  
  if (signature !== `sha256=${expectedSignature}`) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook event
  const { event, data } = req.body;
  console.log(`Received ${event} event:`, data);
  
  res.status(200).send('OK');
});
```

### Error Handling

```javascript
async function apiCall() {
  try {
    const response = await fetch('/api/v1/metrics', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.error.message}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API call failed:', error.message);
    throw error;
  }
}
```

---

For more information and live examples, visit the [interactive API documentation](https://api.your-domain.com/docs) or check out the [SDK documentation](https://docs.your-domain.com/sdks).