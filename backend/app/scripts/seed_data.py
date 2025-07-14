"""
Seed data generation script for development and testing environments.
Generates sample data demonstrating all model features and relationships.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from decimal import Decimal

from app.database import SessionLocal
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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SeedDataGenerator:
    """
    Generates comprehensive seed data for development and testing.

    Creates interconnected sample data demonstrating all model relationships
    and features while respecting foreign key constraints and business logic.
    """

    def __init__(self, db: Session):
        """Initialize generator with database session."""
        self.db = db
        self.created_objects: Dict[str, List[Any]] = {
            "users": [],
            "teams": [],
            "projects": [],
            "pipelines": [],
            "clusters": [],
            "automation_runs": [],
            "infrastructure_changes": [],
            "alerts": [],
        }

    def create_users(self) -> List[User]:
        """Create sample users with different GitHub profiles."""
        logger.info("Creating sample users...")

        users_data = [
            {
                "github_id": 12345678,
                "username": "alice_smith",
                "email": "alice.smith@devops.com",
                "full_name": "Alice Smith",
                "avatar_url": "https://avatars.githubusercontent.com/u/12345678?v=4",
                "github_url": "https://github.com/alice_smith",
                "bio": "Senior DevOps Engineer with 8+ years experience",
                "location": "San Francisco, CA",
                "company": "TechCorp",
            },
            {
                "github_id": 23456789,
                "username": "bob_wilson",
                "email": "bob.wilson@devops.com",
                "full_name": "Bob Wilson",
                "avatar_url": "https://avatars.githubusercontent.com/u/23456789?v=4",
                "github_url": "https://github.com/bob_wilson",
                "bio": "Platform Engineer specializing in Kubernetes",
                "location": "Seattle, WA",
                "company": "CloudInc",
            },
            {
                "github_id": 34567890,
                "username": "charlie_brown",
                "email": "charlie.brown@devops.com",
                "full_name": "Charlie Brown",
                "avatar_url": "https://avatars.githubusercontent.com/u/34567890?v=4",
                "github_url": "https://github.com/charlie_brown",
                "bio": "Infrastructure Automation Specialist",
                "location": "Austin, TX",
                "company": "StartupXYZ",
            },
        ]

        for user_data in users_data:
            user = User(**user_data)
            self.db.add(user)
            self.created_objects["users"].append(user)

        self.db.commit()
        logger.info(f"Created {len(users_data)} users")
        return self.created_objects["users"]

    def create_teams(self, users: List[User]) -> List[Team]:
        """Create sample teams with user memberships."""
        logger.info("Creating sample teams...")

        teams_data = [
            {
                "name": "DevOps Team",
                "description": "Core DevOps infrastructure team responsible for CI/CD and monitoring",
                "is_default": True,
                "settings": {
                    "notification_channels": ["slack", "email"],
                    "default_environment": "staging",
                    "auto_approval_threshold": "low",
                },
            },
            {
                "name": "Platform Team",
                "description": "Kubernetes platform and container orchestration team",
                "is_default": False,
                "settings": {
                    "notification_channels": ["slack"],
                    "default_environment": "development",
                    "auto_approval_threshold": "medium",
                },
            },
        ]

        for i, team_data in enumerate(teams_data):
            team = Team(**team_data)
            self.db.add(team)
            self.db.flush()  # Get team ID

            # Add team memberships
            for j, user in enumerate(users):
                if i == 0:  # DevOps Team - all users
                    role = (
                        TeamRole.OWNER
                        if j == 0
                        else TeamRole.ADMIN if j == 1 else TeamRole.MEMBER
                    )
                elif i == 1 and j < 2:  # Platform Team - first two users only
                    role = TeamRole.OWNER if j == 1 else TeamRole.MEMBER
                else:
                    continue

                user_team = UserTeam(
                    user_id=user.id,
                    team_id=team.id,
                    role=role,
                    joined_at=datetime.utcnow() - timedelta(days=30 - j * 10),
                )
                self.db.add(user_team)

            self.created_objects["teams"].append(team)

        self.db.commit()
        logger.info(f"Created {len(teams_data)} teams with memberships")
        return self.created_objects["teams"]

    def create_projects(self, teams: List[Team]) -> List[Project]:
        """Create sample projects with team associations."""
        logger.info("Creating sample projects...")

        projects_data = [
            {
                "name": "E-commerce Platform",
                "description": "Main e-commerce application with microservices architecture",
                "repository_url": "https://github.com/company/ecommerce-platform",
                "is_active": True,
                "team_id": teams[0].id,
                "settings": {
                    "environments": ["development", "staging", "production"],
                    "notification_settings": {
                        "slack_webhook": "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
                        "email_notifications": True,
                        "alert_threshold": "medium",
                    },
                    "deployment_settings": {
                        "auto_deploy_branches": ["main", "develop"],
                        "required_approvals": 2,
                        "rollback_enabled": True,
                    },
                },
            },
            {
                "name": "Analytics Dashboard",
                "description": "Real-time analytics and reporting dashboard",
                "repository_url": "https://github.com/company/analytics-dashboard",
                "is_active": True,
                "team_id": teams[1].id,
                "settings": {
                    "environments": ["development", "production"],
                    "notification_settings": {
                        "slack_webhook": "https://hooks.slack.com/services/T11111111/B11111111/YYYYYYYYYYYYYYYYYYYYYYYY",
                        "email_notifications": False,
                        "alert_threshold": "high",
                    },
                    "deployment_settings": {
                        "auto_deploy_branches": ["main"],
                        "required_approvals": 1,
                        "rollback_enabled": True,
                    },
                },
            },
        ]

        for project_data in projects_data:
            project = Project(**project_data)
            self.db.add(project)
            self.created_objects["projects"].append(project)

        self.db.commit()
        logger.info(f"Created {len(projects_data)} projects")
        return self.created_objects["projects"]

    def create_sample_data_for_project(
        self, project: Project, users: List[User]
    ) -> None:
        """Create sample pipelines, clusters, etc. for a specific project."""
        logger.info(f"Creating sample data for project: {project.name}")

        # Create pipelines
        self._create_pipelines(project, users)

        # Create clusters
        self._create_clusters(project)

        # Create automation runs
        self._create_automation_runs(project)

        # Create infrastructure changes
        self._create_infrastructure_changes(project)

        # Create alerts
        self._create_alerts(project)

    def _create_pipelines(self, project: Project, users: List[User]) -> None:
        """Create sample pipelines and runs for a project."""
        pipeline = Pipeline(
            name=f"{project.name} CI/CD",
            description=f"Main CI/CD pipeline for {project.name}",
            workflow_path=".github/workflows/ci-cd.yml",
            is_active=True,
            project_id=project.id,
            github_actions_config={
                "workflow_id": "ci-cd.yml",
                "default_branch": "main",
                "environments": ["staging", "production"],
            },
        )
        self.db.add(pipeline)
        self.db.flush()

        # Create pipeline runs
        for i in range(5):
            status = [
                PipelineStatus.SUCCESS,
                PipelineStatus.FAILED,
                PipelineStatus.RUNNING,
            ][i % 3]
            started = datetime.utcnow() - timedelta(hours=i * 2)
            finished = (
                started + timedelta(minutes=15 + i * 5)
                if status != PipelineStatus.RUNNING
                else None
            )

            run = PipelineRun(
                run_number=f"#{100-i}",
                status=status,
                branch="main" if i % 2 == 0 else "develop",
                commit_sha=f"abc123{i:04d}",
                commit_message=f"feat: implement feature {i+1}",
                started_at=started,
                finished_at=finished,
                duration_seconds=900 + i * 300 if finished else None,
                pipeline_id=pipeline.id,
                triggered_by_user=users[i % len(users)].username,
                github_run_id=12345600 + i,
                resource_usage={
                    "cpu_usage": 65.5 + i * 5,
                    "memory_usage": 45.2 + i * 10,
                    "disk_usage": 12.8 + i * 2,
                },
            )
            self.db.add(run)

        self.created_objects["pipelines"].append(pipeline)
        self.db.commit()

    def _create_clusters(self, project: Project) -> None:
        """Create sample Kubernetes clusters for a project."""
        cluster = Cluster(
            name=f'{project.name.lower().replace(" ", "-")}-cluster',
            description=f"Production Kubernetes cluster for {project.name}",
            endpoint="https://k8s-api.example.com",
            version="1.28.0",
            region="us-west-2",
            environment="production",
            status=ClusterStatus.HEALTHY,
            project_id=project.id,
            node_count=5,
            total_cpu_cores=20,
            total_memory_gb=80,
            total_storage_gb=500,
            kubernetes_config={
                "cluster_name": f'{project.name.lower().replace(" ", "-")}-prod',
                "namespace": project.name.lower().replace(" ", "-"),
                "ingress_class": "nginx",
            },
            monitoring_config={
                "prometheus_endpoint": "https://prometheus.example.com",
                "grafana_dashboard_id": "k8s-cluster-overview",
                "alert_manager_endpoint": "https://alertmanager.example.com",
            },
        )
        self.db.add(cluster)
        self.created_objects["clusters"].append(cluster)
        self.db.commit()

    def _create_automation_runs(self, project: Project) -> None:
        """Create sample Ansible automation runs for a project."""
        run = AutomationRun(
            name="Deploy Application Stack",
            description="Deploy and configure application stack with Ansible",
            automation_type=AutomationType.PLAYBOOK,
            playbook_path="playbooks/deploy-stack.yml",
            inventory_path="inventories/production/hosts.yml",
            status=AutomationStatus.SUCCESS,
            project_id=project.id,
            started_at=datetime.utcnow() - timedelta(hours=2),
            finished_at=datetime.utcnow() - timedelta(hours=1, minutes=45),
            duration_seconds=900,
            total_hosts=5,
            successful_hosts=5,
            failed_hosts=0,
            total_tasks=25,
            successful_tasks=25,
            failed_tasks=0,
            changed_tasks=8,
            extra_vars={"env": "production", "version": "1.2.3"},
            tags=["deployment", "production"],
            host_results=[
                {
                    "host": "web-01",
                    "status": "ok",
                    "changed": True,
                    "unreachable": False,
                },
                {
                    "host": "web-02",
                    "status": "ok",
                    "changed": True,
                    "unreachable": False,
                },
                {
                    "host": "db-01",
                    "status": "ok",
                    "changed": False,
                    "unreachable": False,
                },
            ],
        )
        self.db.add(run)
        self.created_objects["automation_runs"].append(run)
        self.db.commit()

    def _create_infrastructure_changes(self, project: Project) -> None:
        """Create sample Terraform infrastructure changes for a project."""
        change = InfrastructureChange(
            name="Scale Production Infrastructure",
            description="Scale up production infrastructure for increased load",
            change_type=ChangeType.CREATE,
            terraform_version="1.6.0",
            workspace="production",
            target_environment="production",
            config_path="terraform/environments/production",
            status=ChangeStatus.APPLIED,
            project_id=project.id,
            started_at=datetime.utcnow() - timedelta(hours=3),
            finished_at=datetime.utcnow() - timedelta(hours=2, minutes=30),
            duration_seconds=1800,
            variables={"instance_count": 5, "instance_type": "t3.large"},
            resource_changes={
                "aws_instance": {"create": 2, "update": 0, "delete": 0},
                "aws_security_group": {"create": 1, "update": 1, "delete": 0},
            },
            cost_estimate={
                "monthly_cost": 245.50,
                "cost_breakdown": {
                    "aws_instance": 200.00,
                    "aws_security_group": 0.00,
                    "data_transfer": 45.50,
                },
            },
        )
        self.db.add(change)
        self.created_objects["infrastructure_changes"].append(change)
        self.db.commit()

    def _create_alerts(self, project: Project) -> None:
        """Create sample alerts for a project."""
        alerts_data = [
            {
                "title": "High CPU Usage Alert",
                "message": "CPU usage is above 80% on production cluster",
                "severity": AlertSeverity.WARNING,
                "status": AlertStatus.ACKNOWLEDGED,
                "source": "Prometheus",
                "channel": "slack",
            },
            {
                "title": "Deployment Failed",
                "message": "Production deployment failed for version 1.2.4",
                "severity": AlertSeverity.CRITICAL,
                "status": AlertStatus.RESOLVED,
                "source": "GitHub Actions",
                "channel": "email",
            },
        ]

        for alert_data in alerts_data:
            alert = Alert(
                project_id=project.id,
                created_at=datetime.utcnow() - timedelta(hours=1),
                **alert_data,
            )
            self.db.add(alert)
            self.created_objects["alerts"].append(alert)

        self.db.commit()

    def generate_all(self) -> Dict[str, List[Any]]:
        """Generate complete seed data set."""
        logger.info("Starting seed data generation...")

        try:
            # Create base entities
            users = self.create_users()
            teams = self.create_teams(users)
            projects = self.create_projects(teams)

            # Create detailed data for each project
            for project in projects:
                self.create_sample_data_for_project(project, users)

            logger.info("Seed data generation completed successfully!")
            logger.info(
                f"Summary: {len(users)} users, {len(teams)} teams, {len(projects)} projects"
            )

            return self.created_objects

        except Exception as e:
            logger.error(f"Error generating seed data: {e}")
            self.db.rollback()
            raise


def main():
    """Main function to run seed data generation."""
    logger.info("Initializing seed data generation...")

    # Create database session
    db = SessionLocal()

    try:
        # Generate seed data
        generator = SeedDataGenerator(db)
        created_objects = generator.generate_all()

        logger.info("✅ Seed data generation completed successfully!")

        # Print summary
        print("\n🌱 Seed Data Generation Summary:")
        for category, objects in created_objects.items():
            print(f"  • {category.replace('_', ' ').title()}: {len(objects)}")

    except Exception as e:
        logger.error(f"❌ Seed data generation failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
