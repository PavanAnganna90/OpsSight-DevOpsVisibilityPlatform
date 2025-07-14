"""
Database migration script to create RBAC tables and update User model.
This script creates the roles, permissions, and role_permissions tables,
and adds the role_id foreign key to the users table.
"""

import asyncio
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.models import Base
from app.models import Role, Permission, SystemRole, PermissionType, User
from app.services.role_service import RoleService
from app.schemas.role import SystemRoleSetup

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_rbac_tables():
    """Create RBAC tables and update User model."""
    try:
        # Create database engine
        engine = create_engine(settings.DATABASE_URL)

        # Create all tables (this will create new tables but not modify existing ones)
        Base.metadata.create_all(bind=engine)
        logger.info("Created RBAC tables successfully")

        # Create session
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        try:
            # Check if role_id column exists in users table
            result = db.execute(
                text(
                    """
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'role_id'
            """
                )
            ).fetchone()

            if not result:
                # Add role_id column to users table
                logger.info("Adding role_id column to users table...")
                db.execute(
                    text(
                        """
                    ALTER TABLE users 
                    ADD COLUMN role_id INTEGER REFERENCES roles(id)
                """
                    )
                )
                db.commit()
                logger.info("Added role_id column to users table")
            else:
                logger.info("role_id column already exists in users table")

            # Set up default roles and permissions
            logger.info("Setting up default roles and permissions...")
            setup_data = SystemRoleSetup(
                create_default_roles=True,
                create_default_permissions=True,
                assign_super_admin=None,  # Can be set to a user ID if needed
            )

            result = RoleService.setup_default_system(db, setup_data)
            logger.info(f"Setup complete: {result}")

        except Exception as e:
            db.rollback()
            logger.error(f"Error during setup: {e}")
            raise
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error creating RBAC tables: {e}")
        raise


def assign_default_roles():
    """Assign default roles to existing users."""
    try:
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        try:
            # Get default viewer role
            viewer_role = RoleService.get_role_by_name(db, SystemRole.VIEWER)
            if not viewer_role:
                logger.error("Default viewer role not found")
                return

            # Assign viewer role to users without roles
            users_without_roles = db.query(User).filter(User.role_id.is_(None)).all()

            for user in users_without_roles:
                user.role_id = viewer_role.id
                logger.info(f"Assigned viewer role to user: {user.github_username}")

            db.commit()
            logger.info(f"Assigned default roles to {len(users_without_roles)} users")

        except Exception as e:
            db.rollback()
            logger.error(f"Error assigning default roles: {e}")
            raise
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error in assign_default_roles: {e}")
        raise


def verify_rbac_setup():
    """Verify that RBAC setup is working correctly."""
    try:
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        try:
            # Check roles
            roles = RoleService.get_roles(db)
            logger.info(f"Found {len(roles)} roles:")
            for role in roles:
                logger.info(
                    f"  - {role.name}: {role.display_name} ({len(role.permissions)} permissions)"
                )

            # Check permissions
            permissions = db.query(Permission).all()
            logger.info(f"Found {len(permissions)} permissions")

            # Check users with roles
            users_with_roles = db.query(User).filter(User.role_id.isnot(None)).count()
            total_users = db.query(User).count()
            logger.info(f"Users with roles: {users_with_roles}/{total_users}")

            # Get analytics
            analytics = RoleService.get_rbac_analytics(db)
            logger.info(f"RBAC Analytics: {analytics.model_dump()}")

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error verifying RBAC setup: {e}")
        raise


def main():
    """Main migration function."""
    logger.info("Starting RBAC migration...")

    try:
        # Step 1: Create tables
        create_rbac_tables()

        # Step 2: Assign default roles
        assign_default_roles()

        # Step 3: Verify setup
        verify_rbac_setup()

        logger.info("RBAC migration completed successfully!")

    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise


if __name__ == "__main__":
    main()
