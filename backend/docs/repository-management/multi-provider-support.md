# Multi-Provider Repository Management

The OpsSight DevOps Platform now supports multiple Git repository providers, allowing teams to connect and manage repositories from different sources in a unified interface.

## Overview

### Supported Providers

| Provider | Status | Features Supported |
|----------|--------|-------------------|
| **GitHub** | ✅ Available | Discovery, Monitoring, Analytics, CI Integration |
| **GitLab** | ✅ Available | Discovery, Monitoring, Analytics, CI Integration |
| **Bitbucket** | ✅ Available | Discovery, Monitoring, Analytics |
| **Azure DevOps** | 🚧 Coming Soon | Discovery, Monitoring, Analytics, CI Integration |

### Key Features

- **Unified Discovery**: Search and discover repositories across all providers
- **Centralized Management**: Manage connections from a single interface
- **Provider-Agnostic Analytics**: Consistent metrics regardless of provider
- **Cross-Provider Insights**: Compare performance across different platforms

## Provider-Specific Implementation

### GitHub Integration

The GitHub integration provides the most comprehensive feature set:

```python
from app.services.github.github_repository_service import GitHubRepositoryService

github_service = GitHubRepositoryService()
repositories = await github_service.list_user_repositories(
    access_token="ghp_token",
    visibility="all",
    sort="updated"
)
```

**Features:**
- Repository discovery and search
- GitHub Actions integration
- Webhook processing
- Security monitoring
- Advanced analytics

### GitLab Integration

GitLab integration supports both GitLab.com and self-hosted instances:

```python
from app.services.gitlab.gitlab_repository_service import GitLabRepositoryService
from app.services.gitlab.gitlab_ci_service import GitLabCIService

gitlab_service = GitLabRepositoryService()
repositories = await gitlab_service.discover_repositories(
    access_token="glpat_token",
    query="my-project"
)

# CI/CD integration
ci_service = GitLabCIService()
pipelines = await ci_service.get_project_pipelines(
    access_token="glpat_token",
    project_id=123
)
```

**Features:**
- Project discovery and search
- GitLab CI/CD integration
- Merge request tracking
- Issue management
- Pipeline analytics

### Bitbucket Integration

Bitbucket integration supports both Cloud and Server:

```python
from app.services.bitbucket.bitbucket_repository_service import BitbucketRepositoryService

bitbucket_service = BitbucketRepositoryService()
repositories = await bitbucket_service.discover_repositories(
    access_token="bb_token",
    query="api"
)
```

**Features:**
- Repository discovery and search
- Bitbucket Pipelines integration (planned)
- Pull request tracking
- Issue management
- Team management

## Authentication Setup

### OAuth2 Configuration

Each provider requires OAuth2 application setup:

#### GitHub OAuth Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App with:
   - **Application name**: OpsSight DevOps Platform
   - **Homepage URL**: `https://your-domain.com`
   - **Authorization callback URL**: `https://your-domain.com/auth/callback/github`

3. Add environment variables:
```bash
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=https://your-domain.com/auth/callback/github
```

#### GitLab OAuth Setup

1. Go to GitLab User Settings > Applications
2. Create a new application with:
   - **Name**: OpsSight DevOps Platform
   - **Redirect URI**: `https://your-domain.com/auth/callback/gitlab`
   - **Scopes**: `api`, `read_user`, `read_repository`, `write_repository`

3. Add environment variables:
```bash
GITLAB_CLIENT_ID=your_gitlab_client_id
GITLAB_CLIENT_SECRET=your_gitlab_client_secret
GITLAB_CALLBACK_URL=https://your-domain.com/auth/callback/gitlab
```

#### Bitbucket OAuth Setup

1. Go to Bitbucket Settings > OAuth consumers
2. Create a new consumer with:
   - **Name**: OpsSight DevOps Platform
   - **Callback URL**: `https://your-domain.com/auth/callback/bitbucket`
   - **Permissions**: `Repositories: Read, Write`, `Account: Read`

3. Add environment variables:
```bash
BITBUCKET_CLIENT_ID=your_bitbucket_client_id
BITBUCKET_CLIENT_SECRET=your_bitbucket_client_secret
BITBUCKET_CALLBACK_URL=https://your-domain.com/auth/callback/bitbucket
```

## API Usage

### Repository Discovery

Discover repositories from any provider:

```bash
POST /api/v1/repository-management/discover
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "connection_type": "gitlab",
  "access_token": "glpat_token",
  "filters": {
    "search": "api",
    "visibility": "private"
  }
}
```

### Connect Repository

Connect a repository from any provider:

```bash
POST /api/v1/repository-management/connect
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "name": "my-api-project",
  "repository_url": "https://gitlab.com/myteam/my-api-project",
  "connection_type": "gitlab",
  "credential_type": "oauth_token",
  "credentials": {
    "access_token": "glpat_token"
  },
  "project_id": "proj_123"
}
```

### List Available Providers

Get information about supported providers:

```bash
GET /api/v1/repository-management/providers
```

Response:
```json
{
  "providers": [
    {
      "type": "github",
      "name": "GitHub",
      "description": "GitHub.com and GitHub Enterprise",
      "credential_types": ["oauth_token", "personal_access_token"],
      "features": ["discovery", "monitoring", "analytics", "ci_integration"],
      "status": "available"
    },
    {
      "type": "gitlab",
      "name": "GitLab",
      "description": "GitLab.com and GitLab self-hosted",
      "credential_types": ["oauth_token", "personal_access_token"],
      "features": ["discovery", "monitoring", "analytics", "ci_integration"],
      "status": "available"
    },
    {
      "type": "bitbucket",
      "name": "Bitbucket",
      "description": "Atlassian Bitbucket Cloud and Server",
      "credential_types": ["oauth_token", "app_password"],
      "features": ["discovery", "monitoring", "analytics"],
      "status": "available"
    }
  ]
}
```

## Provider-Specific Features

### GitHub Actions Integration

Monitor and analyze GitHub Actions workflows:

```python
from app.services.github.github_actions_service import GitHubActionsService

actions_service = GitHubActionsService()
workflows = await actions_service.list_workflows(
    access_token="ghp_token",
    owner="myorg",
    repo="myrepo"
)

workflow_runs = await actions_service.list_workflow_runs(
    access_token="ghp_token",
    owner="myorg",
    repo="myrepo",
    workflow_id=123
)
```

### GitLab CI/CD Integration

Monitor GitLab CI/CD pipelines:

```python
from app.services.gitlab.gitlab_ci_service import GitLabCIService

ci_service = GitLabCIService()
pipelines = await ci_service.get_project_pipelines(
    access_token="glpat_token",
    project_id=456,
    status="success"
)

pipeline_jobs = await ci_service.get_pipeline_jobs(
    access_token="glpat_token",
    project_id=456,
    pipeline_id=789
)
```

### Bitbucket Pipelines Integration (Coming Soon)

Future support for Bitbucket Pipelines monitoring.

## Data Models

### Repository Data Structures

Each provider has its own data model that maps to a common interface:

#### GitHub Repository
```python
@dataclass
class GitHubRepository:
    id: int
    name: str
    full_name: str
    html_url: str
    clone_url: str
    default_branch: str
    has_actions: bool
    permissions: Dict[str, bool]
    # ... additional GitHub-specific fields
```

#### GitLab Repository
```python
@dataclass
class GitLabRepository:
    id: int
    name: str
    name_with_namespace: str
    web_url: str
    http_url_to_repo: str
    visibility: str
    ci_enabled: bool
    merge_requests_enabled: bool
    # ... additional GitLab-specific fields
```

#### Bitbucket Repository
```python
@dataclass
class BitbucketRepository:
    uuid: str
    name: str
    full_name: str
    is_private: bool
    has_issues: bool
    has_wiki: bool
    mainbranch: Optional[Dict[str, Any]]
    # ... additional Bitbucket-specific fields
```

## Error Handling

### Provider-Specific Errors

Each provider service handles API-specific errors:

```python
try:
    repositories = await gitlab_service.discover_repositories(token)
except HTTPException as e:
    if e.status_code == 401:
        # Invalid GitLab token
        logger.error("GitLab authentication failed")
    elif e.status_code == 403:
        # Insufficient permissions
        logger.error("GitLab permissions insufficient")
    elif e.status_code == 429:
        # Rate limit exceeded
        logger.error("GitLab rate limit exceeded")
```

### Common Error Patterns

- **401 Unauthorized**: Invalid or expired access token
- **403 Forbidden**: Insufficient permissions for the operation
- **404 Not Found**: Repository or resource doesn't exist
- **429 Too Many Requests**: API rate limit exceeded
- **503 Service Unavailable**: Provider API is temporarily unavailable

## Rate Limiting

### Provider Rate Limits

| Provider | Rate Limit | Reset Window |
|----------|------------|--------------|
| GitHub | 5,000 requests/hour | 1 hour |
| GitLab | 300 requests/minute | 1 minute |
| Bitbucket | 1,000 requests/hour | 1 hour |

### Rate Limit Handling

The system automatically handles rate limits with:

- **Exponential backoff**: Automatic retry with increasing delays
- **Request queuing**: Queue requests when approaching limits
- **Cache optimization**: Reduce API calls through intelligent caching
- **Batch operations**: Combine multiple requests where possible

## Caching Strategy

### Repository Discovery Caching

```python
# Cache discovered repositories for 5 minutes
await self.cache.set(
    f"discovered_repos:{user_id}:{connection_type}",
    [repo.__dict__ for repo in repositories],
    ttl=300
)
```

### Provider-Specific Caching

- **GitHub**: Cache repository lists, workflow runs, and actions data
- **GitLab**: Cache project lists, pipeline data, and merge requests
- **Bitbucket**: Cache repository lists and pull request data

## Monitoring and Analytics

### Cross-Provider Metrics

The system provides unified metrics across all providers:

```python
analytics = {
    "provider_distribution": {
        "github": 60,
        "gitlab": 30,
        "bitbucket": 10
    },
    "total_repositories": 150,
    "active_repositories": 120,
    "ci_success_rate": 85.5,
    "average_build_time": "8m 30s"
}
```

### Provider-Specific Analytics

Each provider offers unique insights:

- **GitHub**: Actions usage, security alerts, dependency insights
- **GitLab**: CI/CD efficiency, merge request velocity, issue resolution
- **Bitbucket**: Pipeline performance, pull request activity, team collaboration

## Security Considerations

### Token Security

- **Encryption**: All access tokens are encrypted at rest
- **Rotation**: Support for automatic token rotation
- **Scoping**: Minimal required scopes for each provider
- **Audit**: Complete audit trail of token usage

### Access Control

- **User-level**: Each user manages their own provider connections
- **Team-level**: Shared repository connections within teams
- **Organization-level**: Centralized management for enterprise deployments

### Webhook Security

- **Signature verification**: Validate webhooks from each provider
- **IP whitelisting**: Restrict webhook sources to known provider IPs
- **Replay protection**: Prevent webhook replay attacks

## Troubleshooting

### Common Issues

#### Connection Failures

1. **Invalid credentials**: Verify OAuth configuration
2. **Network issues**: Check connectivity to provider APIs
3. **Rate limiting**: Monitor and adjust request patterns

#### Discovery Issues

1. **No repositories found**: Check token permissions and scopes
2. **Partial results**: Verify pagination and filtering parameters
3. **Slow performance**: Review caching and request optimization

#### Integration Problems

1. **Webhook failures**: Verify endpoint configuration and security
2. **CI/CD sync issues**: Check provider-specific integration settings
3. **Data inconsistencies**: Review data mapping and transformation

### Debug Commands

```bash
# Test provider connectivity
curl -H "Authorization: Bearer <token>" https://api.github.com/user
curl -H "Authorization: Bearer <token>" https://gitlab.com/api/v4/user
curl -H "Authorization: Bearer <token>" https://api.bitbucket.org/2.0/user

# Check repository management health
curl http://localhost:8000/api/v1/repository-management/health

# List configured providers
curl http://localhost:8000/api/v1/repository-management/providers
```

## Future Enhancements

### Planned Features

1. **Azure DevOps Integration**: Complete implementation
2. **Self-Hosted Providers**: Support for enterprise instances
3. **Advanced Analytics**: Cross-provider trend analysis
4. **Automated Workflows**: Trigger actions across providers
5. **Migration Tools**: Move repositories between providers

### Provider Expansion

- **CodeCommit**: AWS code repository support
- **Gerrit**: Code review platform integration
- **Fossil**: Distributed version control support
- **Perforce**: Enterprise version control integration

## Migration Guide

### From Single Provider to Multi-Provider

1. **Backup existing connections**: Export current repository configurations
2. **Configure new providers**: Set up OAuth applications
3. **Test connectivity**: Verify each provider works correctly
4. **Migrate gradually**: Add new repositories incrementally
5. **Update monitoring**: Adjust dashboards for multi-provider metrics

### Best Practices

- **Gradual rollout**: Introduce new providers to small teams first
- **Training**: Ensure teams understand multi-provider workflows
- **Documentation**: Update internal procedures and runbooks
- **Monitoring**: Establish alerts for cross-provider issues

## Support

For issues with multi-provider repository management:

1. **Check provider status**: Verify each provider's API status
2. **Review configuration**: Ensure OAuth settings are correct
3. **Test connectivity**: Use debug commands to isolate issues
4. **Contact support**: Provide logs and configuration details

## References

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [GitLab API Documentation](https://docs.gitlab.com/ee/api/)
- [Bitbucket Cloud REST API](https://developer.atlassian.com/cloud/bitbucket/rest/)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)
- [Rate Limiting Strategies](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)