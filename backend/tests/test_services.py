"""
Comprehensive unit tests for all service classes.
Tests CRUD operations, access control, error handling, and business logic.
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta

from app.services.user_service import UserService
from app.services.team_service import TeamService
from app.services.project_service import ProjectService
from app.services.pipeline_service import PipelineService
from app.services.cluster_service import ClusterService
from app.services.automation_run_service import AutomationRunService
from app.services.infrastructure_change_service import InfrastructureChangeService
from app.services.alert_service import AlertService

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


class TestUserService:
    """Test UserService functionality."""

    def test_create_user(self, db_session):
        """Test user creation through service."""
        service = UserService(db_session)

        user_data = {
            "github_id": 12345,
            "username": "testuser",
            "email": "test@example.com",
            "full_name": "Test User",
        }

        user = service.create_user(user_data)

        assert user.id is not None
        assert user.username == "testuser"
        assert user.email == "test@example.com"

    def test_get_user_by_github_id(self, db_session, sample_users):
        """Test retrieving user by GitHub ID."""
        service = UserService(db_session)
        user = sample_users[0]

        found_user = service.get_user_by_github_id(user.github_id)

        assert found_user is not None
        assert found_user.id == user.id
        assert found_user.github_id == user.github_id

    def test_update_user_profile(self, db_session, sample_users):
        """Test updating user profile."""
        service = UserService(db_session)
        user = sample_users[0]

        update_data = {
            "full_name": "Updated Name",
            "bio": "Updated bio",
            "location": "New Location",
        }

        updated_user = service.update_user_profile(user.id, update_data)

        assert updated_user.full_name == "Updated Name"
        assert updated_user.bio == "Updated bio"
        assert updated_user.location == "New Location"

    def test_get_user_teams(self, db_session, sample_team_with_members, sample_users):
        """Test getting user's teams."""
        service = UserService(db_session)
        user = sample_users[0]  # Owner of the team

        teams = service.get_user_teams(user.id)

        assert len(teams) == 1
        assert teams[0].team.id == sample_team_with_members.id
        assert teams[0].role == TeamRole.OWNER


class TestTeamService:
    """Test TeamService functionality."""

    def test_create_team(self, db_session, sample_users):
        """Test team creation through service."""
        service = TeamService(db_session)
        user = sample_users[0]

        team_data = {
            "name": "New Team",
            "description": "A new team",
            "settings": {"notification_channels": ["email"]},
        }

        team = service.create_team(team_data, user.id)

        assert team.id is not None
        assert team.name == "New Team"

        # Check owner was added
        assert team.get_user_role(user.id) == TeamRole.OWNER

    def test_add_team_member(self, db_session, sample_team, sample_users):
        """Test adding member to team."""
        service = TeamService(db_session)
        user = sample_users[0]
        new_member = sample_users[1]

        # Make user an owner first
        member = UserTeam(user_id=user.id, team_id=sample_team.id, role=TeamRole.OWNER)
        db_session.add(member)
        db_session.commit()

        # Add new member
        success = service.add_team_member(
            sample_team.id, new_member.id, TeamRole.MEMBER, user.id
        )

        assert success is True
        assert sample_team.is_user_member(new_member.id) is True
        assert sample_team.get_user_role(new_member.id) == TeamRole.MEMBER

    def test_remove_team_member(
        self, db_session, sample_team_with_members, sample_users
    ):
        """Test removing member from team."""
        service = TeamService(db_session)
        owner = sample_users[0]  # Owner
        member = sample_users[2]  # Member to remove

        success = service.remove_team_member(
            sample_team_with_members.id, member.id, owner.id
        )

        assert success is True
        assert sample_team_with_members.is_user_member(member.id) is False

    def test_update_member_role(
        self, db_session, sample_team_with_members, sample_users
    ):
        """Test updating member role."""
        service = TeamService(db_session)
        owner = sample_users[0]  # Owner
        member = sample_users[2]  # Member to promote

        success = service.update_member_role(
            sample_team_with_members.id, member.id, TeamRole.ADMIN, owner.id
        )

        assert success is True
        assert sample_team_with_members.get_user_role(member.id) == TeamRole.ADMIN

    def test_access_control_permissions(self, db_session, sample_team, sample_users):
        """Test team access control."""
        service = TeamService(db_session)
        non_member = sample_users[0]

        # Non-member should not be able to add members
        success = service.add_team_member(
            sample_team.id, sample_users[1].id, TeamRole.MEMBER, non_member.id
        )

        assert success is False


class TestProjectService:
    """Test ProjectService functionality."""

    def test_create_project(self, db_session, sample_team, sample_users):
        """Test project creation through service."""
        service = ProjectService(db_session)
        user = sample_users[0]

        # Add user to team
        member = UserTeam(user_id=user.id, team_id=sample_team.id, role=TeamRole.OWNER)
        db_session.add(member)
        db_session.commit()

        project_data = {
            "name": "Test Project",
            "description": "A test project",
            "repository_url": "https://github.com/test/project",
            "team_id": sample_team.id,
            "settings": {"environments": ["dev", "prod"]},
        }

        project = service.create_project(project_data, user.id)

        assert project.id is not None
        assert project.name == "Test Project"
        assert project.team_id == sample_team.id

    def test_get_user_projects(self, db_session, sample_project, sample_users):
        """Test getting user's accessible projects."""
        service = ProjectService(db_session)
        user = sample_users[0]

        # Add user to project's team
        member = UserTeam(
            user_id=user.id, team_id=sample_project.team_id, role=TeamRole.MEMBER
        )
        db_session.add(member)
        db_session.commit()

        projects = service.get_user_projects(user.id)

        assert len(projects) == 1
        assert projects[0].id == sample_project.id

    def test_update_project(self, db_session, sample_project, sample_users):
        """Test project update."""
        service = ProjectService(db_session)
        user = sample_users[0]

        # Add user to team
        member = UserTeam(
            user_id=user.id, team_id=sample_project.team_id, role=TeamRole.ADMIN
        )
        db_session.add(member)
        db_session.commit()

        update_data = {
            "description": "Updated description",
            "settings": {"environments": ["dev", "staging", "prod"]},
        }

        updated_project = service.update_project(
            sample_project.id, update_data, user.id
        )

        assert updated_project.description == "Updated description"
        assert len(updated_project.settings["environments"]) == 3

    def test_project_access_control(self, db_session, sample_project, sample_users):
        """Test project access control."""
        service = ProjectService(db_session)
        non_member = sample_users[0]  # Not a team member

        # Should not be able to update project
        update_data = {"description": "Unauthorized update"}
        result = service.update_project(sample_project.id, update_data, non_member.id)

        assert result is None


class TestPipelineService:
    """Test PipelineService functionality."""

    def test_create_pipeline(self, db_session, sample_project, sample_users):
        """Test pipeline creation."""
        service = PipelineService(db_session)
        user = sample_users[0]

        # Add user to team
        member = UserTeam(
            user_id=user.id, team_id=sample_project.team_id, role=TeamRole.MEMBER
        )
        db_session.add(member)
        db_session.commit()

        pipeline_data = {
            "name": "Test Pipeline",
            "description": "Test pipeline",
            "workflow_path": ".github/workflows/test.yml",
            "project_id": sample_project.id,
            "github_actions_config": {"workflow_id": "test.yml"},
        }

        pipeline = service.create_pipeline(pipeline_data, user.id)

        assert pipeline.id is not None
        assert pipeline.name == "Test Pipeline"
        assert pipeline.project_id == sample_project.id

    def test_create_pipeline_run(self, db_session, sample_pipeline, sample_users):
        """Test pipeline run creation."""
        service = PipelineService(db_session)
        user = sample_users[0]

        # Add user to team
        member = UserTeam(
            user_id=user.id,
            team_id=sample_pipeline.project.team_id,
            role=TeamRole.MEMBER,
        )
        db_session.add(member)
        db_session.commit()

        run_data = {
            "run_number": "#124",
            "status": PipelineStatus.RUNNING,
            "branch": "feature/test",
            "commit_sha": "def456",
            "pipeline_id": sample_pipeline.id,
        }

        run = service.create_pipeline_run(run_data, user.id)

        assert run.id is not None
        assert run.run_number == "#124"
        assert run.status == PipelineStatus.RUNNING

    def test_get_pipeline_analytics(self, db_session, sample_pipeline_run):
        """Test pipeline analytics calculation."""
        service = PipelineService(db_session)

        analytics = service.get_pipeline_analytics(sample_pipeline_run.pipeline_id)

        assert analytics is not None
        assert "total_runs" in analytics
        assert "success_rate" in analytics
        assert "average_duration" in analytics


class TestClusterService:
    """Test ClusterService functionality."""

    def test_create_cluster(self, db_session, sample_project, sample_users):
        """Test cluster creation."""
        service = ClusterService(db_session)
        user = sample_users[0]

        # Add user to team
        member = UserTeam(
            user_id=user.id, team_id=sample_project.team_id, role=TeamRole.ADMIN
        )
        db_session.add(member)
        db_session.commit()

        cluster_data = {
            "name": "test-cluster",
            "description": "Test cluster",
            "endpoint": "https://k8s-test.example.com",
            "version": "1.28.0",
            "region": "us-west-2",
            "environment": "staging",
            "project_id": sample_project.id,
            "node_count": 3,
            "total_cpu_cores": 12,
            "total_memory_gb": 24,
        }

        cluster = service.create_cluster(cluster_data, user.id)

        assert cluster.id is not None
        assert cluster.name == "test-cluster"
        assert cluster.project_id == sample_project.id

    def test_update_cluster_health(self, db_session, sample_cluster):
        """Test cluster health update."""
        service = ClusterService(db_session)

        health_data = {
            "status": ClusterStatus.HEALTHY,
            "used_cpu_cores": 10,
            "used_memory_gb": 40,
            "monitoring_config": {"alerts_enabled": True},
        }

        updated_cluster = service.update_cluster_health(sample_cluster.id, health_data)

        assert updated_cluster.status == ClusterStatus.HEALTHY
        assert updated_cluster.used_cpu_cores == 10
        assert updated_cluster.used_memory_gb == 40

    @patch("app.services.cluster_service.requests.get")
    def test_get_cluster_metrics(self, mock_get, db_session, sample_cluster):
        """Test cluster metrics retrieval."""
        service = ClusterService(db_session)

        # Mock Kubernetes API response
        mock_response = Mock()
        mock_response.json.return_value = {
            "items": [
                {
                    "metadata": {"name": "node1"},
                    "status": {"conditions": [{"type": "Ready", "status": "True"}]},
                }
            ]
        }
        mock_response.status_code = 200
        mock_get.return_value = mock_response

        metrics = service.get_cluster_metrics(sample_cluster.id)

        assert metrics is not None
        assert "health_score" in metrics


class TestAutomationRunService:
    """Test AutomationRunService functionality."""

    def test_create_automation_run(self, db_session, sample_project, sample_users):
        """Test automation run creation."""
        service = AutomationRunService(db_session)
        user = sample_users[0]

        # Add user to team
        member = UserTeam(
            user_id=user.id, team_id=sample_project.team_id, role=TeamRole.MEMBER
        )
        db_session.add(member)
        db_session.commit()

        run_data = {
            "name": "Test Automation",
            "description": "Test automation run",
            "automation_type": AutomationType.PLAYBOOK,
            "playbook_path": "playbooks/test.yml",
            "project_id": sample_project.id,
            "total_hosts": 3,
            "variables": {"env": "test"},
        }

        run = service.create_automation_run(run_data, user.id)

        assert run.id is not None
        assert run.name == "Test Automation"
        assert run.project_id == sample_project.id

    def test_update_run_status(self, db_session, sample_automation_run):
        """Test automation run status update."""
        service = AutomationRunService(db_session)

        status_data = {
            "status": AutomationStatus.SUCCESS,
            "successful_hosts": 5,
            "successful_tasks": 25,
            "changed_tasks": 15,
        }

        updated_run = service.update_run_status(sample_automation_run.id, status_data)

        assert updated_run.status == AutomationStatus.SUCCESS
        assert updated_run.successful_hosts == 5
        assert updated_run.successful_tasks == 25

    def test_process_ansible_callback(
        self, db_session, sample_automation_run, sample_ansible_callback_data
    ):
        """Test Ansible callback processing."""
        service = AutomationRunService(db_session)

        result = service.process_ansible_callback(
            sample_automation_run.id, sample_ansible_callback_data
        )

        assert result is True


class TestInfrastructureChangeService:
    """Test InfrastructureChangeService functionality."""

    def test_create_infrastructure_change(
        self, db_session, sample_project, sample_users
    ):
        """Test infrastructure change creation."""
        service = InfrastructureChangeService(db_session)
        user = sample_users[0]

        # Add user to team
        member = UserTeam(
            user_id=user.id, team_id=sample_project.team_id, role=TeamRole.ADMIN
        )
        db_session.add(member)
        db_session.commit()

        change_data = {
            "name": "Test Change",
            "description": "Test infrastructure change",
            "change_type": ChangeType.CREATE,
            "terraform_version": "1.6.0",
            "workspace": "test",
            "target_environment": "staging",
            "project_id": sample_project.id,
            "variables": {"instance_count": 2},
        }

        change = service.create_infrastructure_change(change_data, user.id)

        assert change.id is not None
        assert change.name == "Test Change"
        assert change.project_id == sample_project.id

    def test_approve_change(
        self, db_session, sample_infrastructure_change, sample_users
    ):
        """Test infrastructure change approval."""
        service = InfrastructureChangeService(db_session)
        user = sample_users[0]

        # Add user to team as admin
        member = UserTeam(
            user_id=user.id,
            team_id=sample_infrastructure_change.project.team_id,
            role=TeamRole.ADMIN,
        )
        db_session.add(member)
        db_session.commit()

        approved_change = service.approve_change(
            sample_infrastructure_change.id, user.id
        )

        assert approved_change.status == ChangeStatus.APPROVED
        assert approved_change.approved_by == user.id
        assert approved_change.approved_at is not None

    def test_process_terraform_plan(
        self, db_session, sample_infrastructure_change, sample_terraform_plan_data
    ):
        """Test Terraform plan processing."""
        service = InfrastructureChangeService(db_session)

        result = service.process_terraform_plan(
            sample_infrastructure_change.id, sample_terraform_plan_data
        )

        assert result is True


class TestAlertService:
    """Test AlertService functionality."""

    def test_create_alert(self, db_session, sample_project, sample_users):
        """Test alert creation."""
        service = AlertService(db_session)
        user = sample_users[0]

        # Add user to team
        member = UserTeam(
            user_id=user.id, team_id=sample_project.team_id, role=TeamRole.MEMBER
        )
        db_session.add(member)
        db_session.commit()

        alert_data = {
            "title": "Test Alert",
            "message": "This is a test alert",
            "severity": AlertSeverity.HIGH,
            "source": "Test System",
            "channel": "slack",
            "project_id": sample_project.id,
        }

        alert = service.create_alert(alert_data, user.id)

        assert alert.id is not None
        assert alert.title == "Test Alert"
        assert alert.project_id == sample_project.id

    def test_acknowledge_alert(self, db_session, sample_alert, sample_users):
        """Test alert acknowledgment."""
        service = AlertService(db_session)
        user = sample_users[0]

        # Add user to team
        member = UserTeam(
            user_id=user.id, team_id=sample_alert.project.team_id, role=TeamRole.MEMBER
        )
        db_session.add(member)
        db_session.commit()

        acknowledged_alert = service.acknowledge_alert(sample_alert.id, user.id)

        assert acknowledged_alert.status == AlertStatus.ACKNOWLEDGED
        assert acknowledged_alert.acknowledged_by == user.id
        assert acknowledged_alert.acknowledged_at is not None

    def test_resolve_alert(self, db_session, sample_alert, sample_users):
        """Test alert resolution."""
        service = AlertService(db_session)
        user = sample_users[0]

        # Add user to team
        member = UserTeam(
            user_id=user.id, team_id=sample_alert.project.team_id, role=TeamRole.MEMBER
        )
        db_session.add(member)
        db_session.commit()

        resolved_alert = service.resolve_alert(sample_alert.id, user.id)

        assert resolved_alert.status == AlertStatus.RESOLVED
        assert resolved_alert.resolved_by == user.id
        assert resolved_alert.resolved_at is not None

    def test_get_alert_statistics(self, db_session, sample_project):
        """Test alert statistics calculation."""
        service = AlertService(db_session)

        # Create multiple alerts
        alerts = [
            Alert(
                title=f"Alert {i}",
                severity=AlertSeverity.HIGH,
                project_id=sample_project.id,
            )
            for i in range(3)
        ]
        for alert in alerts:
            db_session.add(alert)
        db_session.commit()

        stats = service.get_alert_statistics(sample_project.id)

        assert stats is not None
        assert "total_alerts" in stats
        assert "active_alerts" in stats
        assert "severity_breakdown" in stats
