"""
Pytest configuration and shared fixtures for testing.
Provides database setup, test data fixtures, and common utilities.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
from alembic.config import Config
from alembic import command
import os
import uuid
import sys

import prometheus_client
from prometheus_client import CollectorRegistry

prometheus_client.REGISTRY = CollectorRegistry()

from app.db.database import Base, SessionLocal, AsyncSessionLocal
from app.models.user import User
from app.models.team import Team, TeamRole
from app.models.user_team import UserTeam
from app.models.project import Project
from app.models.pipeline import Pipeline, PipelineRun, PipelineStatus
from app.models.cluster import Cluster, ClusterStatus
from app.models.automation_run import AutomationRun, AutomationStatus, AutomationType
from app.models.infrastructure_change import (
    InfrastructureChange,
    ChangeStatus,
    ChangeType,
)
from app.models.alert import Alert, AlertStatus, AlertSeverity
from app.models.organization import Organization
from app.models.role import Permission, PermissionType
from app.core.dependencies import get_test_db
import pytest_asyncio
from app.models.role import Role, SystemRole
from sqlalchemy.ext.asyncio import AsyncSession
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api.v1.api import api_router
from app.core.error_handlers import setup_error_handlers

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# Database configuration for testing
SQLALCHEMY_DATABASE_URL = "postgresql://postgres@localhost/opsight"

print("PYTHONPATH:", sys.path)


@pytest.fixture(scope="session")
def engine():
    """Create test database engine."""
    return create_engine(SQLALCHEMY_DATABASE_URL)


@pytest.fixture(scope="session")
def alembic_migrate(engine):
    """
    Run Alembic migrations to head before tests.
    """
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")
    yield
    # Optionally, you could drop the database or downgrade after tests


# New: async DB session fixture for async tests
@pytest_asyncio.fixture(scope="function")
def async_db_session_factory():
    @asynccontextmanager
    async def _session():
        async with AsyncSessionLocal() as session:
            try:
                yield session
                await session.rollback()
            finally:
                await session.close()

    return _session


@pytest.fixture(scope="function")
def db_session(engine):
    """Create a synchronous database session for testing."""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest_asyncio.fixture
async def sample_users(async_db_session_factory):
    """Create sample users for testing."""
    async with async_db_session_factory() as session:
        users = [
            User(
                github_id=12345,
                username="testuser1",
                email="user1@example.com",
                full_name="Test User 1",
                avatar_url="https://avatars.githubusercontent.com/u/12345",
                github_url="https://github.com/testuser1",
            ),
            User(
                github_id=12346,
                username="testuser2",
                email="user2@example.com",
                full_name="Test User 2",
                avatar_url="https://avatars.githubusercontent.com/u/12346",
                github_url="https://github.com/testuser2",
            ),
            User(
                github_id=12347,
                username="testuser3",
                email="user3@example.com",
                full_name="Test User 3",
                avatar_url="https://avatars.githubusercontent.com/u/12347",
                github_url="https://github.com/testuser3",
            ),
        ]

        for user in users:
            session.add(user)
        await session.commit()

        for user in users:
            await session.refresh(user)

        return users


@pytest_asyncio.fixture
async def sample_team(async_db_session_factory):
    """Create a sample team for testing."""
    async with async_db_session_factory() as session:
        team = Team(
            name="DevOps Team",
            description="Main DevOps team for testing",
            is_default=True,
            settings={
                "notification_channels": ["slack", "email"],
                "default_approvers": 2,
                "slack_webhook": "https://hooks.slack.com/test",
            },
        )
        session.add(team)
        await session.commit()
        await session.refresh(team)
        return team


@pytest_asyncio.fixture
async def sample_project(async_db_session_factory, sample_team):
    """Create a sample project for testing."""
    async with async_db_session_factory() as session:
        project = Project(
            name="OpsSight Platform",
            description="DevOps visibility platform",
            repository_url="https://github.com/example/opssight",
            team_id=sample_team.id,
            settings={
                "environments": ["development", "staging", "production"],
                "notification_settings": {
                    "slack_webhook": "https://hooks.slack.com/test",
                    "email_notifications": True,
                },
                "deployment_settings": {
                    "auto_deploy_dev": True,
                    "require_approval_prod": True,
                },
            },
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)
        return project


@pytest_asyncio.fixture
async def sample_pipeline(async_db_session_factory, sample_project):
    """Create a sample pipeline for testing."""
    async with async_db_session_factory() as session:
        pipeline = Pipeline(
            name="CI/CD Pipeline",
            description="Main CI/CD pipeline",
            workflow_path=".github/workflows/ci.yml",
            project_id=sample_project.id,
            is_active=True,
            github_actions_config={
                "workflow_id": "ci.yml",
                "default_branch": "main",
                "triggers": ["push", "pull_request"],
                "secrets": ["DATABASE_URL", "API_KEY"],
            },
        )
        session.add(pipeline)
        await session.commit()
        await session.refresh(pipeline)
        return pipeline


@pytest_asyncio.fixture
async def sample_pipeline_run(async_db_session_factory, sample_pipeline):
    """Create a sample pipeline run for testing."""
    async with async_db_session_factory() as session:
        run = PipelineRun(
            run_number="#123",
            status=PipelineStatus.SUCCESS,
            branch="main",
            commit_sha="abc123def456",
            commit_message="feat: add new feature",
            started_at=datetime.utcnow() - timedelta(minutes=15),
            finished_at=datetime.utcnow() - timedelta(minutes=5),
            pipeline_id=sample_pipeline.id,
            triggered_by_user="testuser1",
            resource_usage={
                "cpu_usage": 75.5,
                "memory_usage": 45.2,
                "disk_usage": 60.0,
                "network_io": 25.8,
            },
            logs_url="https://github.com/example/repo/actions/runs/123",
        )
        session.add(run)
        await session.commit()
        await session.refresh(run)
        return run


@pytest_asyncio.fixture
async def sample_cluster(async_db_session_factory, sample_project):
    """Create a sample cluster for testing."""
    async with async_db_session_factory() as session:
        cluster = Cluster(
            name="production-cluster",
            description="Production Kubernetes cluster",
            endpoint="https://k8s-prod.example.com",
            version="1.28.0",
            region="us-west-2",
            environment="production",
            project_id=sample_project.id,
            status=ClusterStatus.HEALTHY,
            node_count=5,
            total_cpu_cores=20,
            total_memory_gb=80,
            used_cpu_cores=12,
            used_memory_gb=45,
            kubernetes_config={
                "namespace": "production",
                "ingress_class": "nginx",
                "storage_class": "gp3",
                "network_policy": "enabled",
            },
            monitoring_config={
                "prometheus_enabled": True,
                "grafana_enabled": True,
                "alert_manager_enabled": True,
                "log_aggregation": "elasticsearch",
            },
        )
        session.add(cluster)
        await session.commit()
        await session.refresh(cluster)
        return cluster


@pytest_asyncio.fixture
async def sample_automation_run(async_db_session_factory, sample_project):
    """Create a sample automation run for testing."""
    async with async_db_session_factory() as session:
        run = AutomationRun(
            name="Deploy Application Stack",
            description="Deploy complete application stack to production",
            automation_type=AutomationType.PLAYBOOK,
            playbook_path="playbooks/deploy-stack.yml",
            project_id=sample_project.id,
            status=AutomationStatus.SUCCESS,
            started_at=datetime.utcnow() - timedelta(minutes=30),
            finished_at=datetime.utcnow() - timedelta(minutes=10),
            total_hosts=5,
            successful_hosts=5,
            failed_hosts=0,
            total_tasks=25,
            successful_tasks=23,
            failed_tasks=0,
            changed_tasks=12,
            skipped_tasks=2,
            variables={
                "environment": "production",
                "app_version": "v1.2.3",
                "database_migration": True,
            },
            vault_secrets=["db_password", "api_key", "ssl_cert"],
            inventory_source="dynamic",
            callback_url="https://api.example.com/webhooks/ansible",
        )
        session.add(run)
        await session.commit()
        await session.refresh(run)
        return run


@pytest_asyncio.fixture
async def sample_infrastructure_change(async_db_session_factory, sample_project):
    """Create a sample infrastructure change for testing."""
    async with async_db_session_factory() as session:
        change = InfrastructureChange(
            name="Scale Production Infrastructure",
            description="Scale production infrastructure for increased load",
            change_type=ChangeType.UPDATE,
            terraform_version="1.6.0",
            workspace="production",
            target_environment="production",
            project_id=sample_project.id,
            status=ChangeStatus.PLANNED,
            variables={
                "instance_count": 5,
                "instance_type": "t3.large",
                "auto_scaling_enabled": True,
            },
            resource_changes={
                "aws_instance": {"create": 2, "update": 3, "delete": 0},
                "aws_security_group": {"create": 0, "update": 1, "delete": 0},
                "aws_load_balancer": {"create": 0, "update": 1, "delete": 0},
            },
            cost_estimate={
                "monthly_cost": 485.50,
                "cost_diff": 125.00,
                "currency": "USD",
            },
            plan_file_path="/tmp/terraform/production.tfplan",
            auto_approve=False,
            requires_approval=True,
        )
        session.add(change)
        await session.commit()
        await session.refresh(change)
        return change


@pytest_asyncio.fixture
async def sample_alert(async_db_session_factory, sample_project):
    """Create a sample alert for testing."""
    async with async_db_session_factory() as session:
        alert = Alert(
            title="High CPU Usage",
            message="CPU usage has exceeded 80% for the past 10 minutes",
            severity=AlertSeverity.WARNING,
            source="Prometheus",
            source_url="https://prometheus.example.com/alerts",
            channel="slack",
            project_id=sample_project.id,
            status=AlertStatus.ACTIVE,
            metadata={
                "cluster_name": "production-cluster",
                "namespace": "default",
                "pod_name": "api-deployment-abc123",
                "metric_value": 85.2,
                "threshold": 80.0,
            },
            labels={"environment": "production", "service": "api", "team": "backend"},
        )
        session.add(alert)
        await session.commit()
        await session.refresh(alert)
        return alert


@pytest_asyncio.fixture
async def sample_team_with_members(async_db_session_factory, sample_users, sample_team):
    """Create a team with member relationships for testing."""
    async with async_db_session_factory() as session:
        user1, user2, user3 = sample_users

        # Add users to team with different roles
        members = [
            UserTeam(user_id=user1.id, team_id=sample_team.id, role=TeamRole.OWNER),
            UserTeam(user_id=user2.id, team_id=sample_team.id, role=TeamRole.ADMIN),
            UserTeam(user_id=user3.id, team_id=sample_team.id, role=TeamRole.MEMBER),
        ]

        for member in members:
            session.add(member)
        await session.commit()

        return sample_team


@pytest_asyncio.fixture
async def sample_complete_project(
    async_db_session_factory,
    sample_project,
    sample_pipeline,
    sample_cluster,
    sample_automation_run,
    sample_infrastructure_change,
    sample_alert,
):
    """Create a project with all related entities for comprehensive testing."""
    # All fixtures are already created and linked to the project
    async with async_db_session_factory() as session:
        return {
            "project": sample_project,
            "pipeline": sample_pipeline,
            "cluster": sample_cluster,
            "automation_run": sample_automation_run,
            "infrastructure_change": sample_infrastructure_change,
            "alert": sample_alert,
        }


# Test utilities
@pytest.fixture
def mock_datetime():
    """Provide a mock datetime for consistent testing."""
    return datetime(2024, 1, 15, 10, 30, 0)


@pytest.fixture
def sample_github_webhook_data():
    """Provide sample GitHub webhook data for testing."""
    return {
        "action": "completed",
        "workflow_run": {
            "id": 123456789,
            "name": "CI",
            "head_branch": "main",
            "head_sha": "abc123def456",
            "status": "completed",
            "conclusion": "success",
            "created_at": "2024-01-15T10:00:00Z",
            "updated_at": "2024-01-15T10:15:00Z",
        },
        "repository": {"name": "test-repo", "full_name": "example/test-repo"},
    }


@pytest.fixture
def sample_terraform_plan_data():
    """Provide sample Terraform plan data for testing."""
    return {
        "format_version": "1.1",
        "terraform_version": "1.6.0",
        "planned_values": {
            "root_module": {
                "resources": [
                    {
                        "address": "aws_instance.web",
                        "mode": "managed",
                        "type": "aws_instance",
                        "values": {"instance_type": "t3.medium", "ami": "ami-12345678"},
                    }
                ]
            }
        },
        "resource_changes": [
            {
                "address": "aws_instance.web",
                "mode": "managed",
                "type": "aws_instance",
                "change": {
                    "actions": ["create"],
                    "before": None,
                    "after": {"instance_type": "t3.medium", "ami": "ami-12345678"},
                },
            }
        ],
    }


@pytest.fixture
def sample_ansible_callback_data():
    """Provide sample Ansible callback data for testing."""
    return {
        "playbook": "deploy-app.yml",
        "play": "Deploy Application",
        "task": "Install packages",
        "host": "web-server-01",
        "status": "ok",
        "changed": True,
        "failed": False,
        "start": "2024-01-15T10:00:00.000000Z",
        "end": "2024-01-15T10:00:30.000000Z",
        "duration": 30.0,
        "res": {"msg": "Package installed successfully", "changed": True},
    }


@pytest_asyncio.fixture
async def test_organization(async_db_session_factory):
    async with async_db_session_factory() as session:
        unique_id = str(uuid.uuid4())[:8]
        org = Organization(name=f"Test Org {unique_id}", slug=f"test-org-{unique_id}")
        session.add(org)
        await session.commit()
        await session.refresh(org)
        return org.id


@pytest_asyncio.fixture
async def test_user(async_db_session_factory, test_organization):
    async with async_db_session_factory() as session:
        org_id = test_organization
        user = User(
            organization_id=org_id,
            github_id="123456",
            github_username="apitestuser",
            email="apitestuser@example.com",
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user.id


@pytest_asyncio.fixture
async def test_permission(async_db_session_factory, test_organization):
    async with async_db_session_factory() as session:
        org_id = test_organization
        permission = Permission(
            organization_id=org_id,
            name=PermissionType.VIEW_USERS,
            display_name="View Users",
            description="Permission to view users",
            category="user_management",
            is_active=True,
            is_system_permission=False,
        )
        session.add(permission)
        await session.commit()
        await session.refresh(permission)
        return permission.id


@pytest_asyncio.fixture
async def manage_roles_permission(async_db_session_factory, test_organization):
    async with async_db_session_factory() as session:
        org_id = test_organization
        permission = Permission(
            organization_id=org_id,
            name=PermissionType.MANAGE_ROLES,
            display_name="Manage Roles",
            description="Permission to manage roles",
            category="role_management",
            is_active=True,
            is_system_permission=False,
        )
        session.add(permission)
        await session.commit()
        await session.refresh(permission)
        return permission.id


@pytest_asyncio.fixture
async def test_user_with_manage_roles(async_db_session_factory):
    """
    Creates an organization, a permission (MANAGE_ROLES), a role (MANAGER) with that permission, and a user assigned to that role.
    All objects are created and related in a single session to avoid async/greenlet issues.
    Returns:
        int: The user.id of the created user.
    """
    async with async_db_session_factory() as session:
        # Create organization
        unique_id = str(uuid.uuid4())[:8]
        org = Organization(name=f"Test Org {unique_id}", slug=f"test-org-{unique_id}")
        session.add(org)
        await session.commit()
        await session.refresh(org)

        # Create permission
        permission = Permission(
            organization_id=org.id,
            name=PermissionType.MANAGE_ROLES,
            display_name="Manage Roles",
            description="Permission to manage roles",
            category="role_management",
            is_active=True,
            is_system_permission=False,
        )
        session.add(permission)
        await session.commit()
        await session.refresh(permission)

        # Create role and assign permission
        role = Role(
            organization_id=org.id,
            name=SystemRole.MANAGER,
            display_name="Manager",
            description="Role with manage roles permission",
            is_active=True,
            is_default=False,
            priority=0,
            is_system_role=False,
        )
        role.permissions.append(permission)
        session.add(role)
        await session.commit()
        await session.refresh(role)

        # Create user and assign role
        user = User(
            organization_id=org.id,
            github_id="654321",
            github_username="manageruser",
            email="manageruser@example.com",
            is_active=True,
            role_id=role.id,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user.id


# Factory to create a fresh FastAPI app for tests
def create_test_app():
    app = FastAPI()
    app.include_router(api_router, prefix="/api/v1")
    setup_error_handlers(app)
    return app


import pytest


@pytest.fixture
def test_app():
    return create_test_app()
