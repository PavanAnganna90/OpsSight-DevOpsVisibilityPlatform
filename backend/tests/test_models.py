"""
Comprehensive unit tests for all data models.
Tests model creation, validation, relationships, helper methods, and factory methods.
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.exc import IntegrityError

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


class TestUserModel:
    """Test User model functionality."""

    def test_user_creation(self, db_session):
        """Test basic user creation."""
        user = User(
            github_id=12345,
            username="testuser",
            email="test@example.com",
            full_name="Test User",
        )
        db_session.add(user)
        db_session.commit()

        assert user.id is not None
        assert user.username == "testuser"
        assert user.email == "test@example.com"
        assert user.created_at is not None

    def test_user_github_integration(self, db_session):
        """Test GitHub-specific fields."""
        user = User(
            github_id=12345,
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            avatar_url="https://avatars.githubusercontent.com/u/12345",
            github_url="https://github.com/testuser",
            bio="Test bio",
            location="Test City",
            company="Test Company",
        )
        db_session.add(user)
        db_session.commit()

        assert user.github_id == 12345
        assert user.avatar_url == "https://avatars.githubusercontent.com/u/12345"
        assert user.github_url == "https://github.com/testuser"


class TestTeamModel:
    """Test Team model functionality."""

    def test_team_creation(self, db_session):
        """Test basic team creation."""
        team = Team(
            name="DevOps Team",
            description="Core DevOps team",
            is_default=True,
            settings={"notification_channels": ["slack", "email"]},
        )
        db_session.add(team)
        db_session.commit()

        assert team.id is not None
        assert team.name == "DevOps Team"
        assert team.is_default is True
        assert team.settings["notification_channels"] == ["slack", "email"]

    def test_team_member_methods(self, db_session, sample_users):
        """Test team member helper methods."""
        team = Team(name="Test Team", description="Test")
        user1, user2 = sample_users[:2]

        db_session.add(team)
        db_session.commit()

        # Add members
        member1 = UserTeam(user_id=user1.id, team_id=team.id, role=TeamRole.OWNER)
        member2 = UserTeam(user_id=user2.id, team_id=team.id, role=TeamRole.MEMBER)
        db_session.add_all([member1, member2])
        db_session.commit()

        # Test helper methods
        assert team.get_member_count() == 2
        assert team.is_user_member(user1.id) is True
        assert team.get_user_role(user1.id) == TeamRole.OWNER
        assert team.get_user_role(user2.id) == TeamRole.MEMBER


class TestProjectModel:
    """Test Project model functionality."""

    def test_project_creation(self, db_session, sample_team):
        """Test basic project creation."""
        project = Project(
            name="Test Project",
            description="A test project",
            repository_url="https://github.com/test/project",
            team_id=sample_team.id,
            settings={
                "environments": ["dev", "staging", "prod"],
                "notification_settings": {
                    "slack_webhook": "https://hooks.slack.com/test"
                },
            },
        )
        db_session.add(project)
        db_session.commit()

        assert project.id is not None
        assert project.name == "Test Project"
        assert project.team_id == sample_team.id
        assert "environments" in project.settings

    def test_project_access_control(self, db_session, sample_project, sample_users):
        """Test project access control methods."""
        user1, user2 = sample_users[:2]

        # Add user1 to project's team
        member = UserTeam(
            user_id=user1.id, team_id=sample_project.team_id, role=TeamRole.MEMBER
        )
        db_session.add(member)
        db_session.commit()

        # Test access control
        assert sample_project.is_accessible_by_user(user1.id) is True
        assert sample_project.is_accessible_by_user(user2.id) is False


class TestPipelineModel:
    """Test Pipeline and PipelineRun models."""

    def test_pipeline_creation(self, db_session, sample_project):
        """Test pipeline creation."""
        pipeline = Pipeline(
            name="CI/CD Pipeline",
            description="Main pipeline",
            workflow_path=".github/workflows/ci.yml",
            project_id=sample_project.id,
            github_actions_config={"workflow_id": "ci.yml", "default_branch": "main"},
        )
        db_session.add(pipeline)
        db_session.commit()

        assert pipeline.id is not None
        assert pipeline.name == "CI/CD Pipeline"
        assert pipeline.project_id == sample_project.id
        assert pipeline.is_active is True  # Default value

    def test_pipeline_run_creation(self, db_session, sample_pipeline):
        """Test pipeline run creation and helper methods."""
        run = PipelineRun(
            run_number="#123",
            status=PipelineStatus.SUCCESS,
            branch="main",
            commit_sha="abc123",
            started_at=datetime.utcnow() - timedelta(minutes=10),
            finished_at=datetime.utcnow(),
            pipeline_id=sample_pipeline.id,
            triggered_by_user="testuser",
            resource_usage={"cpu_usage": 75.5, "memory_usage": 45.2},
        )
        db_session.add(run)
        db_session.commit()

        # Test duration calculation
        assert run.duration_seconds is not None
        assert run.duration_seconds > 0

        # Test helper methods
        assert run.is_successful() is True
        assert run.get_resource_summary() is not None


class TestClusterModel:
    """Test Cluster model functionality."""

    def test_cluster_creation(self, db_session, sample_project):
        """Test cluster creation."""
        cluster = Cluster(
            name="test-cluster",
            description="Test Kubernetes cluster",
            endpoint="https://k8s-test.example.com",
            version="1.28.0",
            region="us-west-2",
            environment="production",
            project_id=sample_project.id,
            node_count=3,
            total_cpu_cores=12,
            total_memory_gb=48,
            kubernetes_config={"namespace": "default", "ingress_class": "nginx"},
        )
        db_session.add(cluster)
        db_session.commit()

        assert cluster.id is not None
        assert cluster.name == "test-cluster"
        assert cluster.status == ClusterStatus.UNKNOWN  # Default value

    def test_cluster_health_methods(self, db_session, sample_cluster):
        """Test cluster health calculation methods."""
        # Test health scoring
        health_score = sample_cluster.calculate_health_score()
        assert isinstance(health_score, (int, float))
        assert 0 <= health_score <= 100

        # Test resource utilization
        sample_cluster.used_cpu_cores = 8
        sample_cluster.used_memory_gb = 32

        cpu_util = sample_cluster.get_cpu_utilization()
        memory_util = sample_cluster.get_memory_utilization()

        assert cpu_util == 40.0  # 8/20 * 100
        assert memory_util == 40.0  # 32/80 * 100


class TestAutomationRunModel:
    """Test AutomationRun model functionality."""

    def test_automation_run_creation(self, db_session, sample_project):
        """Test automation run creation."""
        run = AutomationRun(
            name="Deploy Stack",
            description="Deploy application stack",
            automation_type=AutomationType.PLAYBOOK,
            playbook_path="playbooks/deploy.yml",
            project_id=sample_project.id,
            status=AutomationStatus.SUCCESS,
            total_hosts=5,
            successful_hosts=5,
            total_tasks=20,
            successful_tasks=18,
            changed_tasks=8,
        )
        db_session.add(run)
        db_session.commit()

        assert run.id is not None
        assert run.automation_type == AutomationType.PLAYBOOK
        assert run.status == AutomationStatus.SUCCESS

    def test_automation_run_calculations(self, db_session, sample_automation_run):
        """Test automation run calculation methods."""
        # Test success rate calculation
        success_rate = sample_automation_run.calculate_success_rate()
        assert isinstance(success_rate, (int, float))
        assert 0 <= success_rate <= 100

        # Test execution summary
        summary = sample_automation_run.get_execution_summary()
        assert isinstance(summary, dict)
        assert "total_hosts" in summary
        assert "success_rate" in summary

    def test_ansible_callback_factory(self, db_session):
        """Test factory method for Ansible callback data."""
        callback_data = {
            "playbook": "deploy.yml",
            "play": "Deploy Application",
            "task": "Install packages",
            "host": "web-01",
            "status": "ok",
            "changed": True,
        }

        run = AutomationRun.from_ansible_callback_data(callback_data, 1)
        assert run.name == "deploy.yml"
        assert run.automation_type == AutomationType.PLAYBOOK


class TestInfrastructureChangeModel:
    """Test InfrastructureChange model functionality."""

    def test_infrastructure_change_creation(self, db_session, sample_project):
        """Test infrastructure change creation."""
        change = InfrastructureChange(
            name="Scale Infrastructure",
            description="Scale production infrastructure",
            change_type=ChangeType.UPDATE,
            terraform_version="1.6.0",
            workspace="production",
            target_environment="production",
            project_id=sample_project.id,
            variables={"instance_count": 5},
            resource_changes={"aws_instance": {"create": 2, "update": 1, "delete": 0}},
            cost_estimate={"monthly_cost": 245.50},
        )
        db_session.add(change)
        db_session.commit()

        assert change.id is not None
        assert change.change_type == ChangeType.UPDATE
        assert change.status == ChangeStatus.PENDING  # Default value

    def test_infrastructure_change_cost_methods(
        self, db_session, sample_infrastructure_change
    ):
        """Test cost calculation methods."""
        # Test estimated cost
        cost = sample_infrastructure_change.get_estimated_monthly_cost()
        assert isinstance(cost, (int, float))

        # Test risk assessment
        risk = sample_infrastructure_change.calculate_risk_score()
        assert isinstance(risk, (int, float))
        assert 0 <= risk <= 10

    def test_terraform_plan_factory(self, db_session):
        """Test factory method for Terraform plan data."""
        plan_data = {
            "terraform_version": "1.6.0",
            "planned_values": {
                "root_module": {
                    "resources": [
                        {
                            "type": "aws_instance",
                            "values": {"instance_type": "t3.medium"},
                        }
                    ]
                }
            },
            "resource_changes": [
                {"type": "aws_instance", "change": {"actions": ["create"]}}
            ],
        }

        change = InfrastructureChange.from_terraform_plan(plan_data, 1)
        assert change.terraform_version == "1.6.0"
        assert change.change_type == ChangeType.CREATE


class TestAlertModel:
    """Test Alert model functionality."""

    def test_alert_creation(self, db_session, sample_project):
        """Test alert creation."""
        alert = Alert(
            title="High CPU Usage",
            message="CPU usage above 80%",
            severity=AlertSeverity.WARNING,
            source="Prometheus",
            channel="slack",
            project_id=sample_project.id,
        )
        db_session.add(alert)
        db_session.commit()

        assert alert.id is not None
        assert alert.severity == AlertSeverity.WARNING
        assert alert.status == AlertStatus.ACTIVE  # Default value

    def test_alert_lifecycle_methods(self, db_session, sample_alert):
        """Test alert lifecycle methods."""
        # Test acknowledgment
        sample_alert.acknowledge()
        assert sample_alert.status == AlertStatus.ACKNOWLEDGED
        assert sample_alert.acknowledged_at is not None

        # Test resolution
        sample_alert.resolve()
        assert sample_alert.status == AlertStatus.RESOLVED
        assert sample_alert.resolved_at is not None

    def test_alert_slack_factory(self, db_session):
        """Test factory method for Slack webhook data."""
        slack_data = {
            "text": "Alert: High memory usage",
            "channel": "#alerts",
            "username": "AlertBot",
            "attachments": [
                {
                    "color": "warning",
                    "title": "Memory Alert",
                    "text": "Memory usage is above 85%",
                }
            ],
        }

        alert = Alert.from_slack_webhook_data(slack_data, 1)
        assert alert.title == "Memory Alert"
        assert alert.message == "Memory usage is above 85%"
        assert alert.severity == AlertSeverity.WARNING
        assert alert.channel == "slack"


class TestModelRelationships:
    """Test relationships between models."""

    def test_user_team_relationships(self, db_session, sample_users, sample_team):
        """Test user-team many-to-many relationships."""
        user1, user2 = sample_users[:2]

        # Add users to team
        member1 = UserTeam(
            user_id=user1.id, team_id=sample_team.id, role=TeamRole.OWNER
        )
        member2 = UserTeam(
            user_id=user2.id, team_id=sample_team.id, role=TeamRole.MEMBER
        )
        db_session.add_all([member1, member2])
        db_session.commit()

        # Test relationships
        assert len(sample_team.members) == 2
        assert len(user1.teams) == 1
        assert user1.teams[0].team_id == sample_team.id

    def test_project_dependencies(self, db_session, sample_project):
        """Test project's dependent models."""
        # Create dependent objects
        pipeline = Pipeline(name="Test Pipeline", project_id=sample_project.id)
        cluster = Cluster(name="test-cluster", project_id=sample_project.id)
        alert = Alert(title="Test Alert", project_id=sample_project.id)

        db_session.add_all([pipeline, cluster, alert])
        db_session.commit()

        # Test relationships
        assert len(sample_project.pipelines) == 1
        assert len(sample_project.clusters) == 1
        assert len(sample_project.alerts) == 1

    def test_cascade_deletions(self, db_session, sample_project):
        """Test that deletions cascade properly."""
        pipeline = Pipeline(name="Test Pipeline", project_id=sample_project.id)
        db_session.add(pipeline)
        db_session.commit()
        pipeline_id = pipeline.id

        # Delete project should cascade to pipeline
        db_session.delete(sample_project)
        db_session.commit()

        # Verify pipeline was deleted
        deleted_pipeline = (
            db_session.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
        )
        assert deleted_pipeline is None


class TestModelValidation:
    """Test model validation and constraints."""

    def test_required_fields(self, db_session):
        """Test that required fields are enforced."""
        # User without required fields should fail
        with pytest.raises(IntegrityError):
            user = User()  # Missing required fields
            db_session.add(user)
            db_session.commit()

    def test_unique_constraints(self, db_session):
        """Test unique constraints."""
        # Two users with same GitHub ID should fail
        user1 = User(github_id=12345, username="user1", email="user1@test.com")
        user2 = User(github_id=12345, username="user2", email="user2@test.com")

        db_session.add(user1)
        db_session.commit()

        with pytest.raises(IntegrityError):
            db_session.add(user2)
            db_session.commit()

    def test_enum_constraints(self, db_session, sample_project):
        """Test enum field constraints."""
        # Valid enum value should work
        alert = Alert(
            title="Test Alert",
            severity=AlertSeverity.HIGH,
            status=AlertStatus.ACTIVE,
            project_id=sample_project.id,
        )
        db_session.add(alert)
        db_session.commit()
        assert alert.severity == AlertSeverity.HIGH

        # Invalid enum value should be handled by Pydantic validation


class TestJSONFields:
    """Test JSON field functionality."""

    def test_json_storage_and_retrieval(self, db_session, sample_project):
        """Test JSON field storage and retrieval."""
        complex_config = {
            "kubernetes": {
                "namespace": "production",
                "replicas": 3,
                "resources": {
                    "requests": {"cpu": "100m", "memory": "128Mi"},
                    "limits": {"cpu": "500m", "memory": "512Mi"},
                },
            },
            "monitoring": {
                "enabled": True,
                "endpoints": ["prometheus", "grafana"],
                "alerts": {"cpu_threshold": 80, "memory_threshold": 85},
            },
        }

        cluster = Cluster(
            name="json-test-cluster",
            project_id=sample_project.id,
            kubernetes_config=complex_config["kubernetes"],
            monitoring_config=complex_config["monitoring"],
        )
        db_session.add(cluster)
        db_session.commit()

        # Verify JSON data integrity
        retrieved_cluster = (
            db_session.query(Cluster)
            .filter(Cluster.name == "json-test-cluster")
            .first()
        )
        assert retrieved_cluster.kubernetes_config["namespace"] == "production"
        assert retrieved_cluster.monitoring_config["alerts"]["cpu_threshold"] == 80
