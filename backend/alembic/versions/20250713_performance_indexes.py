"""Performance optimization indexes

Revision ID: 20250713_performance_indexes
Revises: d8b40ecdc203
Create Date: 2025-07-13 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250713_performance_indexes'
down_revision = 'd8b40ecdc203'
branch_labels = None
depends_on = None


def upgrade():
    """Add performance optimization indexes."""
    
    # Permissions table indexes
    op.create_index(
        'idx_permission_name_active', 
        'permissions', 
        ['name', 'is_active'],
        unique=False
    )
    
    # Role permissions composite index
    op.create_index(
        'idx_role_permissions_composite', 
        'role_permissions', 
        ['role_id', 'permission_id'],
        unique=False
    )
    
    # Users table indexes for frequent queries
    op.create_index(
        'idx_users_email_active', 
        'users', 
        ['email', 'is_active'],
        unique=False
    )
    
    op.create_index(
        'idx_users_github_id', 
        'users', 
        ['github_id'],
        unique=True,
        postgresql_where=sa.text('github_id IS NOT NULL')
    )
    
    # Teams table indexes
    op.create_index(
        'idx_teams_name_active', 
        'teams', 
        ['name', 'is_active'],
        unique=False
    )
    
    # Projects table indexes
    op.create_index(
        'idx_projects_team_active', 
        'projects', 
        ['team_id', 'is_active'],
        unique=False
    )
    
    op.create_index(
        'idx_projects_github_repo', 
        'projects', 
        ['github_repo_url'],
        unique=False,
        postgresql_where=sa.text('github_repo_url IS NOT NULL')
    )
    
    # Pipelines table indexes for dashboard queries
    op.create_index(
        'idx_pipelines_project_status', 
        'pipelines', 
        ['project_id', 'status'],
        unique=False
    )
    
    op.create_index(
        'idx_pipelines_created_at_desc', 
        'pipelines', 
        [sa.text('created_at DESC')],
        unique=False
    )
    
    # Clusters table indexes
    op.create_index(
        'idx_clusters_project_status', 
        'clusters', 
        ['project_id', 'status'],
        unique=False
    )
    
    # Automation runs indexes for Ansible queries
    op.create_index(
        'idx_automation_runs_project_status', 
        'automation_runs', 
        ['project_id', 'status'],
        unique=False
    )
    
    op.create_index(
        'idx_automation_runs_start_time_desc', 
        'automation_runs', 
        [sa.text('start_time DESC')],
        unique=False
    )
    
    op.create_index(
        'idx_automation_runs_playbook_env', 
        'automation_runs', 
        ['playbook_name', 'environment'],
        unique=False,
        postgresql_where=sa.text('playbook_name IS NOT NULL')
    )
    
    # Infrastructure changes indexes
    op.create_index(
        'idx_infra_changes_project_timestamp', 
        'infrastructure_changes', 
        ['project_id', sa.text('timestamp DESC')],
        unique=False
    )
    
    # Alerts table indexes for monitoring queries
    op.create_index(
        'idx_alerts_project_severity_status', 
        'alerts', 
        ['project_id', 'severity', 'status'],
        unique=False
    )
    
    op.create_index(
        'idx_alerts_created_at_desc', 
        'alerts', 
        [sa.text('created_at DESC')],
        unique=False
    )
    
    op.create_index(
        'idx_alerts_source_status', 
        'alerts', 
        ['source', 'status'],
        unique=False
    )


def downgrade():
    """Remove performance optimization indexes."""
    
    # Drop all indexes in reverse order
    op.drop_index('idx_alerts_source_status', table_name='alerts')
    op.drop_index('idx_alerts_created_at_desc', table_name='alerts')
    op.drop_index('idx_alerts_project_severity_status', table_name='alerts')
    op.drop_index('idx_infra_changes_project_timestamp', table_name='infrastructure_changes')
    op.drop_index('idx_automation_runs_playbook_env', table_name='automation_runs')
    op.drop_index('idx_automation_runs_start_time_desc', table_name='automation_runs')
    op.drop_index('idx_automation_runs_project_status', table_name='automation_runs')
    op.drop_index('idx_clusters_project_status', table_name='clusters')
    op.drop_index('idx_pipelines_created_at_desc', table_name='pipelines')
    op.drop_index('idx_pipelines_project_status', table_name='pipelines')
    op.drop_index('idx_projects_github_repo', table_name='projects')
    op.drop_index('idx_projects_team_active', table_name='projects')
    op.drop_index('idx_teams_name_active', table_name='teams')
    op.drop_index('idx_users_github_id', table_name='users')
    op.drop_index('idx_users_email_active', table_name='users')
    op.drop_index('idx_role_permissions_composite', table_name='role_permissions')
    op.drop_index('idx_permission_name_active', table_name='permissions')