#!/usr/bin/env python3
"""
Comprehensive Sample Data Generator for OpsSight DevOps Platform
Creates realistic development and testing data with proper relationships and multi-tenancy support.
"""

import asyncio
import os
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from decimal import Decimal
import json
import random

# Set environment variables
os.environ.update(
    {
        "DATABASE_URL": "postgresql+asyncpg://opssight:opssight123@localhost:5432/opssight_dev",
        "CORS_ORIGINS": "http://localhost:3000",
        "APP_NAME": "OpsSight",
        "APP_ENV": "development",
        "SECRET_KEY": "local-development-secret-key-for-testing-only-must-be-at-least-32-chars",
        "JWT_SECRET_KEY": "local-development-secret-key-for-testing-only-must-be-at-least-32-chars",
        "SECURITY_JWT_SECRET_KEY": "local-development-secret-key-for-testing-only-must-be-at-least-32-chars",
        "JWT_ALGORITHM": "HS256",
        "JWT_ACCESS_TOKEN_EXPIRE_MINUTES": "60",
        "JWT_REFRESH_TOKEN_EXPIRE_DAYS": "7",
        "CSRF_SECRET": "local-csrf-secret-for-development-only",
        "GITHUB_CLIENT_ID": "dev-client-id",
        "GITHUB_CLIENT_SECRET": "dev-client-secret",
        "GITHUB_CALLBACK_URL": "http://localhost:3000/auth/github/callback",
        "REDIS_URL": "redis://localhost:6379/0",
        "DEBUG": "true",
        "ENVIRONMENT": "development",
    }
)

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

# Import database and models
from app.db.database import get_async_db, async_engine
from app.models.organization import Organization
from app.models.user import User
from app.models.team import Team, TeamRole
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
from app.models.role import Role
from app.models.user_role import UserRole
from app.models.user_permission import UserPermission
from app.models.metrics import Metric, MetricSummary
from app.models.aws_cost import AwsCostData
from app.models.notification_preference import (
    NotificationPreference,
    NotificationType,
    NotificationChannel,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class ComprehensiveSeedDataGenerator:
    """
    Generates comprehensive sample data for the OpsSight DevOps Platform.

    Creates interconnected sample data demonstrating all model relationships,
    multi-tenancy, RBAC, and business features while respecting constraints.
    """

    def __init__(self):
        """Initialize generator."""
        self.created_objects: Dict[str, List[Any]] = {
            "organizations": [],
            "users": [],
            "roles": [],
            "teams": [],
            "projects": [],
            "pipelines": [],
            "clusters": [],
            "automation_runs": [],
            "infrastructure_changes": [],
            "alerts": [],
            "metrics": [],
            "cost_data": [],
            "notification_preferences": [],
        }

    async def cleanup_existing_data(self, db: AsyncSession):
        """Clean up existing sample data."""
        logger.info("🧹 Cleaning up existing sample data...")

        # Delete in reverse dependency order
        tables_to_clean = [
            Metric,
            AwsCostData,
            NotificationPreference,
            Alert,
            InfrastructureChange,
            AutomationRun,
            PipelineRun,
            Pipeline,
            Cluster,
            Project,
            UserPermission,
            UserRole,
            User,
            Team,
            Role,
            Organization,
        ]

        for table in tables_to_clean:
            try:
                await db.execute(delete(table))
                await db.commit()
                logger.info(f"   Cleaned {table.__tablename__}")
            except Exception as e:
                logger.warning(f"   Could not clean {table.__tablename__}: {e}")
                await db.rollback()

    async def create_organizations(self, db: AsyncSession) -> List[Organization]:
        """Create sample organizations."""
        logger.info("🏢 Creating organizations...")

        orgs_data = [
            {
                "name": "TechCorp Solutions",
                "slug": "techcorp",
                "display_name": "TechCorp Solutions Inc.",
                "description": "Leading technology solutions provider specializing in cloud infrastructure and DevOps automation",
                "website": "https://techcorp.com",
                "contact_email": "contact@techcorp.com",
                "phone": "+1-555-0101",
                "address_line1": "123 Innovation Drive",
                "city": "San Francisco",
                "state": "California",
                "postal_code": "94105",
                "country": "United States",
                "timezone": "America/Los_Angeles",
                "is_active": True,
                "subscription_tier": "enterprise",
                "max_users": 100,
                "max_projects": 50,
                "settings": {
                    "features": [
                        "rbac",
                        "audit_logs",
                        "advanced_monitoring",
                        "cost_analysis",
                    ],
                    "integrations": ["github", "slack", "aws", "kubernetes"],
                    "security": {
                        "require_2fa": True,
                        "password_policy": "strong",
                        "session_timeout": 8,
                    },
                },
            },
            {
                "name": "StartupXYZ",
                "slug": "startupxyz",
                "display_name": "StartupXYZ",
                "description": "Fast-growing startup focused on AI-powered solutions",
                "website": "https://startupxyz.io",
                "contact_email": "hello@startupxyz.io",
                "phone": "+1-555-0202",
                "address_line1": "456 Startup Blvd",
                "city": "Austin",
                "state": "Texas",
                "postal_code": "73301",
                "country": "United States",
                "timezone": "America/Chicago",
                "is_active": True,
                "subscription_tier": "professional",
                "max_users": 25,
                "max_projects": 15,
                "settings": {
                    "features": ["rbac", "basic_monitoring"],
                    "integrations": ["github", "slack"],
                    "security": {
                        "require_2fa": False,
                        "password_policy": "medium",
                        "session_timeout": 4,
                    },
                },
            },
        ]

        for org_data in orgs_data:
            org = Organization(**org_data)
            db.add(org)
            self.created_objects["organizations"].append(org)

        await db.commit()
        logger.info(f"   Created {len(orgs_data)} organizations")
        return self.created_objects["organizations"]

    async def create_roles(
        self, db: AsyncSession, organizations: List[Organization]
    ) -> List[Role]:
        """Create sample roles for RBAC."""
        logger.info("👤 Creating roles...")

        roles_data = [
            {
                "name": "Platform Admin",
                "description": "Full platform administration access",
                "permissions": [
                    "admin_read",
                    "admin_write",
                    "admin_delete",
                    "user_read",
                    "user_write",
                    "user_delete",
                    "team_read",
                    "team_write",
                    "team_delete",
                    "project_read",
                    "project_write",
                    "project_delete",
                    "pipeline_read",
                    "pipeline_write",
                    "pipeline_execute",
                    "cluster_read",
                    "cluster_write",
                    "cluster_admin",
                    "infrastructure_read",
                    "infrastructure_write",
                    "alert_read",
                    "alert_write",
                    "alert_manage",
                ],
                "is_default": False,
            },
            {
                "name": "DevOps Engineer",
                "description": "DevOps operations and deployment access",
                "permissions": [
                    "user_read",
                    "team_read",
                    "project_read",
                    "project_write",
                    "pipeline_read",
                    "pipeline_write",
                    "pipeline_execute",
                    "cluster_read",
                    "cluster_write",
                    "infrastructure_read",
                    "infrastructure_write",
                    "alert_read",
                    "alert_write",
                ],
                "is_default": True,
            },
            {
                "name": "Developer",
                "description": "Application development and limited deployment access",
                "permissions": [
                    "user_read",
                    "team_read",
                    "project_read",
                    "pipeline_read",
                    "pipeline_execute",
                    "cluster_read",
                    "infrastructure_read",
                    "alert_read",
                ],
                "is_default": False,
            },
            {
                "name": "Viewer",
                "description": "Read-only access to platform resources",
                "permissions": [
                    "user_read",
                    "team_read",
                    "project_read",
                    "pipeline_read",
                    "cluster_read",
                    "infrastructure_read",
                    "alert_read",
                ],
                "is_default": False,
            },
        ]

        for org in organizations:
            for role_data in roles_data:
                role = Role(organization_id=org.id, **role_data)
                db.add(role)
                self.created_objects["roles"].append(role)

        await db.commit()
        logger.info(f"   Created {len(roles_data) * len(organizations)} roles")
        return self.created_objects["roles"]

    async def create_users(
        self, db: AsyncSession, organizations: List[Organization], roles: List[Role]
    ) -> List[User]:
        """Create sample users with realistic profiles."""
        logger.info("👥 Creating users...")

        users_data = [
            {
                "github_id": "12345678",
                "github_username": "alice_smith",
                "email": "alice.smith@techcorp.com",
                "full_name": "Alice Smith",
                "avatar_url": "https://avatars.githubusercontent.com/u/12345678?v=4",
                "github_url": "https://github.com/alice_smith",
                "bio": "Senior DevOps Engineer with 8+ years experience in cloud infrastructure and automation",
                "location": "San Francisco, CA",
                "company": "TechCorp Solutions",
                "is_active": True,
                "last_login_at": datetime.utcnow() - timedelta(hours=2),
                "roles": ["Platform Admin", "DevOps Engineer"],
            },
            {
                "github_id": "23456789",
                "github_username": "bob_wilson",
                "email": "bob.wilson@techcorp.com",
                "full_name": "Bob Wilson",
                "avatar_url": "https://avatars.githubusercontent.com/u/23456789?v=4",
                "github_url": "https://github.com/bob_wilson",
                "bio": "Platform Engineer specializing in Kubernetes and container orchestration",
                "location": "Seattle, WA",
                "company": "TechCorp Solutions",
                "is_active": True,
                "last_login_at": datetime.utcnow() - timedelta(hours=1),
                "roles": ["DevOps Engineer"],
            },
            {
                "github_id": "34567890",
                "github_username": "charlie_brown",
                "email": "charlie.brown@startupxyz.io",
                "full_name": "Charlie Brown",
                "avatar_url": "https://avatars.githubusercontent.com/u/34567890?v=4",
                "github_url": "https://github.com/charlie_brown",
                "bio": "Full-stack developer with DevOps interests",
                "location": "Austin, TX",
                "company": "StartupXYZ",
                "is_active": True,
                "last_login_at": datetime.utcnow() - timedelta(minutes=30),
                "roles": ["Developer"],
            },
            {
                "github_id": "45678901",
                "github_username": "diana_martinez",
                "email": "diana.martinez@techcorp.com",
                "full_name": "Diana Martinez",
                "avatar_url": "https://avatars.githubusercontent.com/u/45678901?v=4",
                "github_url": "https://github.com/diana_martinez",
                "bio": "Site Reliability Engineer focused on monitoring and automation",
                "location": "New York, NY",
                "company": "TechCorp Solutions",
                "is_active": True,
                "last_login_at": datetime.utcnow() - timedelta(days=1),
                "roles": ["DevOps Engineer"],
            },
            {
                "github_id": "56789012",
                "github_username": "eve_johnson",
                "email": "eve.johnson@startupxyz.io",
                "full_name": "Eve Johnson",
                "avatar_url": "https://avatars.githubusercontent.com/u/56789012?v=4",
                "github_url": "https://github.com/eve_johnson",
                "bio": "DevOps consultant and infrastructure automation specialist",
                "location": "Remote",
                "company": "StartupXYZ",
                "is_active": True,
                "last_login_at": datetime.utcnow() - timedelta(hours=5),
                "roles": ["DevOps Engineer"],
            },
        ]

        # Create users for each organization
        for org in organizations:
            org_users_data = [
                u
                for u in users_data
                if ("techcorp.com" in u["email"] and org.slug == "techcorp")
                or ("startupxyz.io" in u["email"] and org.slug == "startupxyz")
            ]

            for user_data in org_users_data:
                user_roles = user_data.pop("roles")
                user = User(organization_id=org.id, **user_data)
                db.add(user)
                await db.flush()  # Get user ID

                # Assign roles to user
                for role_name in user_roles:
                    role = next(
                        (
                            r
                            for r in roles
                            if r.name == role_name and r.organization_id == org.id
                        ),
                        None,
                    )
                    if role:
                        user_role = UserRole(
                            user_id=user.id,
                            role_id=role.id,
                            granted_at=datetime.utcnow()
                            - timedelta(days=random.randint(1, 30)),
                        )
                        db.add(user_role)

                self.created_objects["users"].append(user)

        await db.commit()
        logger.info(
            f"   Created {len(self.created_objects['users'])} users with role assignments"
        )
        return self.created_objects["users"]

    async def create_teams(
        self, db: AsyncSession, organizations: List[Organization], users: List[User]
    ) -> List[Team]:
        """Create sample teams with memberships."""
        logger.info("👥 Creating teams...")

        teams_data = [
            {
                "name": "Platform Engineering",
                "slug": "platform-engineering",
                "description": "Core platform infrastructure team responsible for Kubernetes, CI/CD, and monitoring",
                "is_default": True,
                "settings": {
                    "notification_channels": ["slack", "email"],
                    "default_environment": "production",
                    "auto_approval_threshold": "medium",
                    "slack_webhook": "https://hooks.slack.com/services/EXAMPLE/TEAM/TOKEN",
                },
            },
            {
                "name": "DevOps Automation",
                "slug": "devops-automation",
                "description": "Automation specialists focused on infrastructure as code and deployment pipelines",
                "is_default": False,
                "settings": {
                    "notification_channels": ["slack"],
                    "default_environment": "staging",
                    "auto_approval_threshold": "high",
                    "slack_webhook": "https://hooks.slack.com/services/EXAMPLE/TEAM/TOKEN",
                },
            },
            {
                "name": "Application Development",
                "slug": "app-development",
                "description": "Application developers with limited infrastructure access",
                "is_default": False,
                "settings": {
                    "notification_channels": ["email"],
                    "default_environment": "development",
                    "auto_approval_threshold": "low",
                },
            },
        ]

        for org in organizations:
            org_users = [u for u in users if u.organization_id == org.id]

            for i, team_data in enumerate(teams_data):
                team = Team(organization_id=org.id, **team_data)
                db.add(team)
                await db.flush()  # Get team ID

                # Add team memberships based on team type and user roles
                for j, user in enumerate(org_users):
                    # Platform Engineering - all DevOps users
                    if i == 0 and any(
                        "DevOps" in ur.role.name or "Admin" in ur.role.name
                        for ur in await db.execute(
                            select(UserRole).where(UserRole.user_id == user.id)
                        )
                    ):
                        role = (
                            TeamRole.OWNER
                            if j == 0
                            else TeamRole.ADMIN if j == 1 else TeamRole.MEMBER
                        )
                    # DevOps Automation - DevOps engineers only
                    elif i == 1 and any(
                        "DevOps" in ur.role.name
                        for ur in await db.execute(
                            select(UserRole).where(UserRole.user_id == user.id)
                        )
                    ):
                        role = TeamRole.ADMIN if j == 0 else TeamRole.MEMBER
                    # Application Development - developers
                    elif i == 2 and any(
                        "Developer" in ur.role.name or "Viewer" in ur.role.name
                        for ur in await db.execute(
                            select(UserRole).where(UserRole.user_id == user.id)
                        )
                    ):
                        role = TeamRole.MEMBER
                    else:
                        continue

                    # Create team membership through the association table
                    from app.models.team import team_memberships

                    await db.execute(
                        team_memberships.insert().values(
                            team_id=team.id,
                            user_id=user.id,
                            role=role,
                            joined_at=datetime.utcnow()
                            - timedelta(days=random.randint(1, 90)),
                        )
                    )

                self.created_objects["teams"].append(team)

        await db.commit()
        logger.info(
            f"   Created {len(self.created_objects['teams'])} teams with memberships"
        )
        return self.created_objects["teams"]

    async def create_projects(
        self, db: AsyncSession, organizations: List[Organization], teams: List[Team]
    ) -> List[Project]:
        """Create sample projects."""
        logger.info("🚀 Creating projects...")

        projects_data = [
            {
                "name": "E-commerce Platform",
                "slug": "ecommerce-platform",
                "display_name": "E-commerce Platform",
                "description": "Main e-commerce application with microservices architecture built on Kubernetes",
                "repository_url": "https://github.com/company/ecommerce-platform",
                "repository_provider": "github",
                "default_branch": "main",
                "is_active": True,
                "is_public": False,
                "settings": {
                    "environments": ["development", "staging", "production"],
                    "notification_settings": {
                        "slack_webhook": "https://hooks.slack.com/services/EXAMPLE/TEAM/TOKEN",
                        "email_notifications": True,
                        "alert_threshold": "medium",
                    },
                    "deployment_settings": {
                        "auto_deploy_branches": ["main", "develop"],
                        "required_approvals": 2,
                        "rollback_enabled": True,
                        "health_checks": True,
                    },
                    "ci_cd_settings": {
                        "build_timeout": 30,
                        "test_timeout": 20,
                        "deploy_timeout": 15,
                    },
                },
            },
            {
                "name": "Analytics Dashboard",
                "slug": "analytics-dashboard",
                "display_name": "Real-time Analytics Dashboard",
                "description": "Real-time analytics and reporting dashboard with advanced visualizations",
                "repository_url": "https://github.com/company/analytics-dashboard",
                "repository_provider": "github",
                "default_branch": "main",
                "is_active": True,
                "is_public": False,
                "settings": {
                    "environments": ["development", "production"],
                    "notification_settings": {
                        "slack_webhook": "https://hooks.slack.com/services/EXAMPLE/TEAM/TOKEN",
                        "email_notifications": False,
                        "alert_threshold": "high",
                    },
                    "deployment_settings": {
                        "auto_deploy_branches": ["main"],
                        "required_approvals": 1,
                        "rollback_enabled": True,
                        "health_checks": True,
                    },
                },
            },
            {
                "name": "AI Processing Service",
                "slug": "ai-processing-service",
                "display_name": "AI Processing Service",
                "description": "High-performance AI model processing service with GPU acceleration",
                "repository_url": "https://github.com/company/ai-processing-service",
                "repository_provider": "github",
                "default_branch": "main",
                "is_active": True,
                "is_public": False,
                "settings": {
                    "environments": ["development", "staging", "production"],
                    "gpu_enabled": True,
                    "scaling_settings": {
                        "min_replicas": 2,
                        "max_replicas": 10,
                        "cpu_threshold": 70,
                        "memory_threshold": 80,
                    },
                },
            },
        ]

        for org in organizations:
            org_teams = [t for t in teams if t.organization_id == org.id]

            for i, project_data in enumerate(projects_data):
                # Skip AI service for StartupXYZ (smaller org)
                if org.slug == "startupxyz" and i == 2:
                    continue

                # Assign teams to projects
                team = org_teams[i % len(org_teams)]

                project = Project(
                    organization_id=org.id, team_id=team.id, **project_data
                )
                db.add(project)
                self.created_objects["projects"].append(project)

        await db.commit()
        logger.info(f"   Created {len(self.created_objects['projects'])} projects")
        return self.created_objects["projects"]

    async def create_pipelines_and_runs(
        self, db: AsyncSession, projects: List[Project], users: List[User]
    ):
        """Create sample CI/CD pipelines and runs."""
        logger.info("🔄 Creating pipelines and runs...")

        for project in projects:
            # Create main CI/CD pipeline
            pipeline = Pipeline(
                name=f"{project.name} CI/CD",
                description=f"Main CI/CD pipeline for {project.name}",
                workflow_path=".github/workflows/ci-cd.yml",
                is_active=True,
                project_id=project.id,
                github_actions_config={
                    "workflow_id": "ci-cd.yml",
                    "default_branch": project.default_branch,
                    "environments": project.settings.get(
                        "environments", ["staging", "production"]
                    ),
                    "triggers": ["push", "pull_request"],
                    "matrix": {
                        "os": ["ubuntu-latest"],
                        "node": (
                            ["18", "20"]
                            if "dashboard" in project.name.lower()
                            else None
                        ),
                    },
                },
            )
            db.add(pipeline)
            await db.flush()

            # Create pipeline runs (last 10 runs)
            for i in range(10):
                status_choices = [
                    PipelineStatus.SUCCESS,
                    PipelineStatus.FAILED,
                    PipelineStatus.RUNNING,
                ]
                weights = [0.7, 0.2, 0.1]  # 70% success, 20% failed, 10% running
                status = random.choices(status_choices, weights=weights)[0]

                started = datetime.utcnow() - timedelta(
                    hours=i * 3 + random.randint(0, 2)
                )
                finished = (
                    started + timedelta(minutes=random.randint(10, 45))
                    if status != PipelineStatus.RUNNING
                    else None
                )

                org_users = [
                    u for u in users if u.organization_id == project.organization_id
                ]
                triggered_by = random.choice(org_users)

                run = PipelineRun(
                    run_number=f"#{150-i}",
                    status=status,
                    branch=random.choice(
                        ["main", "develop", "feature/new-ui", "hotfix/critical-bug"]
                    ),
                    commit_sha=f"{''.join(random.choices('abcdef0123456789', k=8))}",
                    commit_message=random.choice(
                        [
                            "feat: add new user authentication system",
                            "fix: resolve memory leak in processing service",
                            "docs: update API documentation",
                            "refactor: optimize database queries",
                            "test: add integration tests for payment flow",
                            "chore: update dependencies to latest versions",
                        ]
                    ),
                    started_at=started,
                    finished_at=finished,
                    duration_seconds=(
                        int((finished - started).total_seconds()) if finished else None
                    ),
                    pipeline_id=pipeline.id,
                    triggered_by_user=triggered_by.github_username,
                    github_run_id=random.randint(1000000, 9999999),
                    resource_usage={
                        "cpu_usage": round(random.uniform(30, 95), 1),
                        "memory_usage": round(random.uniform(25, 85), 1),
                        "disk_usage": round(random.uniform(5, 25), 1),
                        "network_io": round(random.uniform(10, 100), 1),
                    },
                    artifacts=(
                        {
                            "build_artifacts": ["dist.zip", "coverage-report.html"],
                            "test_results": "junit.xml",
                            "docker_images": [f"app:{pipeline.id}-{run.run_number}"],
                        }
                        if status == PipelineStatus.SUCCESS
                        else None
                    ),
                )
                db.add(run)

            self.created_objects["pipelines"].append(pipeline)

        await db.commit()
        logger.info(
            f"   Created {len(self.created_objects['pipelines'])} pipelines with runs"
        )

    async def generate_all_sample_data(self, db: AsyncSession) -> Dict[str, List[Any]]:
        """Generate complete sample data set."""
        logger.info("🌱 Starting comprehensive sample data generation...")

        try:
            # Clean existing data
            await self.cleanup_existing_data(db)

            # Create base entities
            logger.info("Creating foundational data...")
            organizations = await self.create_organizations(db)
            roles = await self.create_roles(db, organizations)
            users = await self.create_users(db, organizations, roles)
            teams = await self.create_teams(db, organizations, users)
            projects = await self.create_projects(db, organizations, teams)

            # Create operational data
            logger.info("Creating operational data...")
            await self.create_pipelines_and_runs(db, projects, users)

            # TODO: Add more data creation methods for:
            # - Clusters and Kubernetes resources
            # - Infrastructure changes (Terraform)
            # - Automation runs (Ansible)
            # - Alerts and notifications
            # - Metrics and cost data

            logger.info("✅ Sample data generation completed successfully!")

            # Generate summary
            summary = {}
            for category, objects in self.created_objects.items():
                summary[category] = len(objects)

            return summary

        except Exception as e:
            logger.error(f"❌ Error generating sample data: {e}")
            await db.rollback()
            raise


async def main():
    """Main function to run sample data generation."""
    logger.info("🚀 Initializing comprehensive sample data generation...")

    try:
        # Get async database session
        async with async_engine.begin() as conn:
            # Create async session
            from sqlalchemy.ext.asyncio import AsyncSession

            async_session = AsyncSession(bind=conn)

            # Generate sample data
            generator = ComprehensiveSeedDataGenerator()
            summary = await generator.generate_all_sample_data(async_session)

            logger.info("✅ Sample data generation completed successfully!")

            # Print summary
            print("\n🌱 Sample Data Generation Summary:")
            print("=" * 50)
            total_objects = 0
            for category, count in summary.items():
                if count > 0:
                    print(f"  📊 {category.replace('_', ' ').title()}: {count}")
                    total_objects += count

            print(f"\n📈 Total objects created: {total_objects}")
            print("🎉 Database is now populated with realistic development data!")

    except Exception as e:
        logger.error(f"❌ Sample data generation failed: {e}")
        import traceback

        traceback.print_exc()
        raise


if __name__ == "__main__":
    asyncio.run(main())
