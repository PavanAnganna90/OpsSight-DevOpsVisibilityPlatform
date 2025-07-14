"""
Migration script to migrate from team_memberships association table to UserTeam model.
This script creates the user_teams table and migrates existing data.
"""

import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.models import Base
from app.models import UserTeam, Team, User, TeamRole

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate_team_memberships():
    """Migrate from team_memberships table to user_teams table."""
    try:
        # Create database engine
        engine = create_engine(settings.DATABASE_URL)

        # Create all tables (this will create the new user_teams table)
        Base.metadata.create_all(bind=engine)
        logger.info("Created user_teams table successfully")

        # Create session
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        try:
            # Check if team_memberships table exists and has data
            result = db.execute(
                text(
                    """
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_name = 'team_memberships'
            """
                )
            ).fetchone()

            if not result or result.count == 0:
                logger.info("team_memberships table does not exist, skipping migration")
                return

            # Check if there's data to migrate
            membership_count = db.execute(
                text(
                    """
                SELECT COUNT(*) as count FROM team_memberships
            """
                )
            ).fetchone()

            if not membership_count or membership_count.count == 0:
                logger.info("No data in team_memberships table to migrate")
                return

            logger.info(f"Found {membership_count.count} memberships to migrate")

            # Check if user_teams table already has data
            existing_count = db.query(UserTeam).count()
            if existing_count > 0:
                logger.warning(
                    f"user_teams table already has {existing_count} records. Skipping migration to avoid duplicates."
                )
                return

            # Migrate data from team_memberships to user_teams
            logger.info("Migrating team membership data...")

            # Get all memberships from the old table
            memberships = db.execute(
                text(
                    """
                SELECT team_id, user_id, role, joined_at, invited_by_user_id
                FROM team_memberships
            """
                )
            ).fetchall()

            migrated_count = 0
            for membership in memberships:
                try:
                    # Create new UserTeam record
                    user_team = UserTeam(
                        user_id=membership.user_id,
                        team_id=membership.team_id,
                        role=TeamRole(membership.role),
                        joined_at=membership.joined_at,
                        invited_by_user_id=membership.invited_by_user_id,
                        is_active=True,
                    )

                    db.add(user_team)
                    migrated_count += 1

                except Exception as e:
                    logger.error(f"Error migrating membership {membership}: {e}")
                    continue

            # Commit all migrations
            db.commit()
            logger.info(f"Successfully migrated {migrated_count} team memberships")

            # Verify migration
            new_count = db.query(UserTeam).count()
            logger.info(f"user_teams table now has {new_count} records")

        except Exception as e:
            db.rollback()
            logger.error(f"Error during migration: {e}")
            raise
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error in team membership migration: {e}")
        raise


def verify_migration():
    """Verify that the migration was successful."""
    try:
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        try:
            # Count records in both tables
            old_count = db.execute(
                text(
                    """
                SELECT COUNT(*) as count FROM team_memberships
            """
                )
            ).fetchone()

            new_count = db.query(UserTeam).count()

            logger.info(f"Migration verification:")
            logger.info(
                f"  team_memberships: {old_count.count if old_count else 0} records"
            )
            logger.info(f"  user_teams: {new_count} records")

            # Check for any teams and users
            team_count = db.query(Team).count()
            user_count = db.query(User).count()

            logger.info(f"  teams: {team_count}")
            logger.info(f"  users: {user_count}")

            # Sample some data
            sample_memberships = db.query(UserTeam).limit(5).all()
            logger.info(f"Sample migrated memberships:")
            for membership in sample_memberships:
                logger.info(
                    f"  User {membership.user_id} -> Team {membership.team_id} ({membership.role})"
                )

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error verifying migration: {e}")
        raise


def cleanup_old_table():
    """
    Optional: Remove the old team_memberships table after successful migration.
    WARNING: This is irreversible!
    """
    try:
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        try:
            # Verify migration was successful first
            old_count = db.execute(
                text(
                    """
                SELECT COUNT(*) as count FROM team_memberships
            """
                )
            ).fetchone()

            new_count = db.query(UserTeam).count()

            if old_count and new_count >= old_count.count:
                logger.info(
                    "Migration verified. Dropping old team_memberships table..."
                )
                db.execute(text("DROP TABLE team_memberships"))
                db.commit()
                logger.info("Successfully dropped team_memberships table")
            else:
                logger.warning("Migration verification failed. Not dropping old table.")

        except Exception as e:
            db.rollback()
            logger.error(f"Error dropping old table: {e}")
            raise
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error in cleanup: {e}")
        raise


def main():
    """Main migration function."""
    logger.info("Starting team membership migration...")

    try:
        # Step 1: Migrate data
        migrate_team_memberships()

        # Step 2: Verify migration
        verify_migration()

        # Step 3: Optional cleanup (commented out for safety)
        # cleanup_old_table()

        logger.info("Team membership migration completed successfully!")
        logger.info(
            "Note: Old team_memberships table preserved for safety. Run cleanup_old_table() manually if needed."
        )

    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise


if __name__ == "__main__":
    main()
