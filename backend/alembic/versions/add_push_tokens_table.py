"""Add push tokens table

Revision ID: add_push_tokens
Revises: previous_revision
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_push_tokens'
down_revision = 'previous_revision'  # Update this with the actual previous revision
branch_labels = None
depends_on = None


def upgrade():
    """Create push_tokens table."""
    op.create_table(
        'push_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('token', sa.Text(), nullable=False),
        sa.Column('platform', sa.String(length=20), nullable=False),
        sa.Column('device_id', sa.String(length=255), nullable=True),
        sa.Column('app_version', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('last_used', sa.DateTime(), nullable=True),
        sa.Column('success_count', sa.Integer(), nullable=False, default=0),
        sa.Column('failure_count', sa.Integer(), nullable=False, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token')
    )
    
    # Create indexes for efficient queries
    op.create_index('idx_push_tokens_user_id', 'push_tokens', ['user_id'])
    op.create_index('idx_push_tokens_token', 'push_tokens', ['token'])
    op.create_index('idx_push_tokens_user_platform', 'push_tokens', ['user_id', 'platform'])
    op.create_index('idx_push_tokens_active', 'push_tokens', ['is_active'])
    op.create_index('idx_push_tokens_last_used', 'push_tokens', ['last_used'])
    op.create_index('idx_push_tokens_failures', 'push_tokens', ['failure_count'])


def downgrade():
    """Drop push_tokens table."""
    op.drop_index('idx_push_tokens_failures', table_name='push_tokens')
    op.drop_index('idx_push_tokens_last_used', table_name='push_tokens')
    op.drop_index('idx_push_tokens_active', table_name='push_tokens')
    op.drop_index('idx_push_tokens_user_platform', table_name='push_tokens')
    op.drop_index('idx_push_tokens_token', table_name='push_tokens')
    op.drop_index('idx_push_tokens_user_id', table_name='push_tokens')
    op.drop_table('push_tokens')