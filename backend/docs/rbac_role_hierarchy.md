# RBAC Role Hierarchy and Permission Structure

## Overview

This document defines the Role-Based Access Control (RBAC) system for the OpsSight DevOps Platform, implementing a hierarchical role structure that aligns with the Product Requirements Document (PRD) specifications.

## Role Hierarchy

The system implements a hierarchical role structure with clearly defined access levels and responsibilities:

```
SUPER_ADMIN (Platform-wide)
├── ORGANIZATION_OWNER (Organization-scoped)
    ├── DEVOPS_ADMIN (DevOps Operations)
    ├── MANAGER (Management)
    ├── ENGINEER (Engineering)
    ├── VIEWER (Read-only)
    └── API_ONLY (Programmatic)
```

## Role Definitions

### 1. SUPER_ADMIN
**Description**: Platform-wide administrative access across all organizations
**Scope**: System-wide
**Use Case**: Platform administrators, SaaS operators
**Priority**: 100

**Access Level**: Full access to all permissions and resources across the entire platform

---

### 2. ORGANIZATION_OWNER
**Description**: Complete control over organization resources and settings
**Scope**: Organization-specific
**Use Case**: Business owners, CTO/VP Engineering, organization administrators
**Priority**: 90

**Key Responsibilities**:
- Full user and team management within organization
- Complete project and infrastructure oversight
- Financial and billing management
- Role and permission administration
- Integration and API management

**Core Permissions**:
- All user management (create, update, delete, view, invite)
- All team management including member assignment
- All project lifecycle management
- Full infrastructure and deployment control
- Complete pipeline and automation management
- Alert management and resolution
- Cost management and budget control
- Role administration within organization
- Organization settings and billing
- Full API access and token management
- All DevOps operations

---

### 3. DEVOPS_ADMIN
**Description**: Operational focus on infrastructure, deployments, and system reliability
**Scope**: Organization-specific
**Use Case**: DevOps engineers, Site Reliability Engineers, Platform engineers
**Priority**: 80

**Key Responsibilities**:
- Infrastructure management and deployment
- CI/CD pipeline administration
- Monitoring and alerting
- Cluster and container orchestration
- Security scanning and compliance
- Operational troubleshooting

**Core Permissions**:
- View users and limited team management
- Project viewing and updates
- **Full infrastructure access** (view, manage, deploy)
- **Full pipeline management** (view, trigger, manage)
- **Full automation access** (view, trigger, manage)
- **Complete alert management** (operational responsibility)
- Cost viewing and budget management
- Organization settings viewing
- **All DevOps-specific operations**:
  - Cluster management
  - Deployment management
  - Monitoring management
  - Log access
  - Security scanning
- Limited API access (read/write for operations)

---

### 4. MANAGER
**Description**: Management-level access with team and project oversight capabilities
**Scope**: Organization-specific
**Use Case**: Engineering managers, Team leads, Project managers
**Priority**: 60

**Key Responsibilities**:
- Team formation and management
- Project oversight and planning
- Resource allocation
- Budget oversight
- Strategic decision making

**Core Permissions**:
- User viewing and invitation
- Full team management (create, update, manage members)
- Project creation and management
- Infrastructure viewing (no modification)
- Pipeline viewing and triggering
- Automation viewing and triggering
- Alert acknowledgment and resolution
- Cost viewing and budget management
- Role viewing
- Organization settings viewing
- Log access for troubleshooting
- API read access for reporting

---

### 5. ENGINEER
**Description**: Engineering access with operational capabilities for development work
**Scope**: Organization-specific
**Use Case**: Software engineers, Developers, Technical contributors
**Priority**: 40

**Key Responsibilities**:
- Development and coding
- Testing and debugging
- Deployment participation
- Issue investigation
- Technical implementation

**Core Permissions**:
- User and team viewing
- Project viewing
- Infrastructure viewing
- Pipeline viewing and triggering
- Automation viewing and triggering
- Alert viewing and acknowledgment
- Cost viewing
- **Engineering-specific DevOps access**:
  - Deployment management (for CI/CD)
  - Log access (for debugging)
- API read access

---

### 6. VIEWER
**Description**: Read-only access across the platform for monitoring and reporting
**Scope**: Organization-specific
**Use Case**: Stakeholders, Auditors, Read-only users, Interns
**Priority**: 20

**Key Responsibilities**:
- Monitoring and observability
- Reporting and analytics
- Compliance and auditing
- Information gathering

**Core Permissions**:
- **Read-only access to all main resources**:
  - View users, teams, projects
  - View infrastructure status
  - View pipelines and automation
  - View alerts and costs
  - View roles and organization settings
- API read access for data retrieval

---

### 7. API_ONLY
**Description**: Programmatic access for integrations, automation, and third-party systems
**Scope**: Organization-specific
**Use Case**: CI/CD systems, Monitoring tools, Third-party integrations, Automation scripts
**Priority**: 30

**Key Responsibilities**:
- System integration
- Automated operations
- Data synchronization
- Webhook management
- API-driven workflows

**Core Permissions**:
- **Core API access**:
  - Read and write API access
  - Webhook management
  - Token management
- **Limited viewing permissions** for API data:
  - Projects, infrastructure, pipelines, automation
  - Alerts and cost data
- **Operational permissions** for automation:
  - Pipeline triggering
  - Automation triggering
  - Alert acknowledgment
- **DevOps operations** for CI/CD integration:
  - Deployment management
  - Log access

## Permission Categories

### API Access Management
- `api_read_access`: Read data via API
- `api_write_access`: Modify data via API
- `api_admin_access`: Administrative API functions
- `webhook_management`: Manage webhooks and integrations
- `token_management`: Create and manage API tokens

### DevOps Operations
- `cluster_management`: Kubernetes cluster operations
- `deployment_management`: Application deployment control
- `monitoring_management`: Monitoring system configuration
- `log_access`: Application and system log viewing
- `security_scanning`: Security vulnerability scanning

## Role Assignment Guidelines

### ORGANIZATION_OWNER
- Assign to: Business owners, CTOs, VP Engineering
- Limit: 1-2 per organization
- Considerations: Full financial and administrative responsibility

### DEVOPS_ADMIN
- Assign to: Senior DevOps engineers, SREs, Platform team
- Limit: 3-5 per organization (based on team size)
- Considerations: Operational responsibility for system reliability

### MANAGER
- Assign to: Engineering managers, team leads
- Limit: Based on organizational structure
- Considerations: Team and project oversight needs

### ENGINEER
- Assign to: Software developers, engineers
- Limit: Majority of technical team members
- Considerations: Development workflow requirements

### VIEWER
- Assign to: Stakeholders, auditors, interns
- Limit: No specific limit
- Considerations: Read-only monitoring needs

### API_ONLY
- Assign to: Service accounts, CI/CD systems, integrations
- Limit: Based on integration requirements
- Considerations: Security and scope of automation

## Security Considerations

1. **Principle of Least Privilege**: Users receive minimum permissions necessary for their role
2. **Role Escalation**: Clear escalation path through role hierarchy
3. **API Security**: API_ONLY roles have limited scope to prevent privilege escalation
4. **Audit Trail**: All role assignments and permission changes are logged
5. **Time-bound Access**: Consider expiration dates for temporary access
6. **Multi-factor Authentication**: Required for ORGANIZATION_OWNER and DEVOPS_ADMIN roles

## Implementation Notes

- Roles are organization-scoped except for SUPER_ADMIN
- Permission inheritance follows the hierarchy structure
- Custom roles can be created based on these base templates
- Role assignments can be temporary with expiration dates
- API access is controlled through separate authentication mechanisms

## Migration Path

For existing systems:
1. `ORG_ADMIN` → `ORGANIZATION_OWNER`
2. `ADMIN` → `DEVOPS_ADMIN` (if infrastructure-focused) or `MANAGER` (if management-focused)
3. Existing roles map directly: `MANAGER`, `ENGINEER`, `VIEWER`
4. New `API_ONLY` role for service accounts

This structure provides clear separation of concerns while maintaining operational flexibility and security best practices. 