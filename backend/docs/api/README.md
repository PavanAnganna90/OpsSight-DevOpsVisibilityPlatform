# OpsSight API Documentation

This directory contains the complete API documentation for the OpsSight DevOps Platform.

## 📁 Files

- **`postman_collection.json`** - Postman collection for testing all API endpoints
- **`CHANGELOG.md`** - API changelog with recent changes and version history
- **`../api_documentation_complete.md`** - Complete API documentation with detailed endpoint descriptions

## 🚀 Quick Start

### 1. Testing with Postman
1. Import `postman_collection.json` into Postman
2. Set the `base_url` variable to your API endpoint (default: `http://localhost:8000`)
3. Authenticate using the Login endpoint to get an access token
4. The collection will automatically set the token for subsequent requests

### 2. Interactive Documentation
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/api/v1/openapi.json

### 3. Generate Updated Documentation
```bash
# Generate all API documentation
make docs-api

# Or run the script directly (requires running server)
cd backend
python scripts/generate_docs.py
```

## 📊 API Overview

The OpsSight API provides comprehensive endpoints for:

- **Authentication & Authorization**: JWT, OAuth2, SAML, API Keys
- **User & Team Management**: User CRUD, team collaboration, RBAC
- **Infrastructure Management**: Kubernetes, Terraform, Ansible
- **Monitoring & Alerts**: Metrics, logs, notifications
- **Webhooks & Integrations**: GitHub, Slack, custom webhooks

## 🔐 Authentication

All protected endpoints require authentication. The API supports:

1. **JWT Bearer Token** (Primary method)
2. **OAuth2 Providers** (GitHub, Google, Microsoft)
3. **SAML 2.0 SSO** (Azure AD, Okta, Generic)
4. **API Keys** (For service-to-service communication)

## 📈 Rate Limits

- **Authenticated Users**: 1000 requests/hour
- **Unauthenticated**: 100 requests/hour
- **Admin Users**: 10000 requests/hour

## 🛠️ Development

### Updating Documentation
1. Make changes to API endpoints
2. Run `make docs-api` to regenerate documentation
3. Update changelog with new features/changes
4. Test with Postman collection

### Adding New Endpoints
1. Add endpoint to appropriate router
2. Update API documentation
3. Add to Postman collection
4. Update CHANGELOG.md

## 📞 Support

- **Documentation**: http://localhost:8000/docs
- **Issues**: Create GitHub issues for bugs/features
- **Email**: support@opsight.dev

## 🔗 Related Documentation

- [Backend API Documentation](../api_documentation_complete.md)
- [RBAC System Guide](../api_rbac_permissions_guide.md)
- [Security Implementation](../security_implementation_guide.md)
- [Cache System Guide](../cache_system_guide.md)