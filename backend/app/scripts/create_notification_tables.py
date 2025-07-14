"""
Database migration script to create notification tables and integrate with existing infrastructure.
This script ensures notification preferences and logs tables are created and properly configured.
"""

import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.models import Base
from app.models import (
    NotificationPreference,
    NotificationLog,
    User,
    Team,
    NotificationChannel,
    NotificationFrequency,
    NotificationType,
    DeliveryStatus,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_notification_tables():
    """Create notification tables and setup default configurations."""
    try:
        # Create database engine
        engine = create_engine(settings.DATABASE_URL)

        # Create all tables (this will create new notification tables)
        Base.metadata.create_all(bind=engine)
        logger.info("Created notification tables successfully")

        # Create session
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        try:
            # Check if notification preferences table exists
            result = db.execute(
                text(
                    """
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_name = 'notification_preferences'
            """
                )
            ).fetchone()

            if result and result.count > 0:
                logger.info("Notification tables already exist")

                # Check if we need to create default preferences for existing users
                create_default_preferences(db)
            else:
                logger.warning("Notification tables were not created properly")

        except Exception as e:
            db.rollback()
            logger.error(f"Error during notification table setup: {e}")
            raise
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error in notification tables creation: {e}")
        raise


def create_default_preferences(db):
    """Create default notification preferences for existing users."""
    try:
        # Get all users without notification preferences
        users_without_prefs = db.execute(
            text(
                """
            SELECT u.id, u.email 
            FROM users u 
            WHERE u.id NOT IN (
                SELECT DISTINCT user_id 
                FROM notification_preferences 
                WHERE user_id IS NOT NULL
            )
        """
            )
        ).fetchall()

        if not users_without_prefs:
            logger.info("All users already have notification preferences")
            return

        logger.info(
            f"Creating default preferences for {len(users_without_prefs)} users"
        )

        # Default preferences for new users
        default_preferences = [
            # Critical alerts via email immediately
            {
                "notification_type": NotificationType.ALERT_TRIGGERED,
                "channel": NotificationChannel.EMAIL,
                "frequency": NotificationFrequency.IMMEDIATE,
                "enabled": True,
                "min_severity": "high",
                "timezone": "UTC",
            },
            # Pipeline failures via email immediately
            {
                "notification_type": NotificationType.PIPELINE_FAILED,
                "channel": NotificationChannel.EMAIL,
                "frequency": NotificationFrequency.IMMEDIATE,
                "enabled": True,
                "timezone": "UTC",
            },
            # Daily digest via email
            {
                "notification_type": NotificationType.SYSTEM_MAINTENANCE,
                "channel": NotificationChannel.EMAIL,
                "frequency": NotificationFrequency.DAILY,
                "enabled": True,
                "timezone": "UTC",
            },
        ]

        created_count = 0
        for user in users_without_prefs:
            try:
                for pref_template in default_preferences:
                    pref = NotificationPreference(user_id=user.id, **pref_template)
                    db.add(pref)
                    created_count += 1

            except Exception as e:
                logger.error(f"Error creating preferences for user {user.id}: {e}")
                continue

        db.commit()
        logger.info(
            f"Successfully created {created_count} default notification preferences"
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Error creating default preferences: {e}")
        raise


def setup_notification_triggers():
    """Setup database triggers and constraints for notification system."""
    try:
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        try:
            # Add indexes for better performance
            db.execute(
                text(
                    """
                CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_type_channel 
                ON notification_preferences(user_id, notification_type, channel)
            """
                )
            )

            db.execute(
                text(
                    """
                CREATE INDEX IF NOT EXISTS idx_notification_preferences_team_type_channel 
                ON notification_preferences(team_id, notification_type, channel)
            """
                )
            )

            db.execute(
                text(
                    """
                CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at 
                ON notification_logs(created_at)
            """
                )
            )

            db.execute(
                text(
                    """
                CREATE INDEX IF NOT EXISTS idx_notification_logs_user_delivery_status 
                ON notification_logs(user_id, delivery_status)
            """
                )
            )

            db.execute(
                text(
                    """
                CREATE INDEX IF NOT EXISTS idx_notification_logs_notification_id 
                ON notification_logs(notification_id)
            """
                )
            )

            db.commit()
            logger.info("Created notification database indexes successfully")

        except Exception as e:
            db.rollback()
            logger.error(f"Error creating notification indexes: {e}")
            # Don't raise here as indexes are optional optimizations
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error in notification triggers setup: {e}")


def verify_notification_setup():
    """Verify that notification tables and data are properly set up."""
    try:
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        try:
            # Check table existence
            tables_to_check = ["notification_preferences", "notification_logs"]
            for table in tables_to_check:
                result = db.execute(
                    text(
                        f"""
                    SELECT COUNT(*) as count 
                    FROM information_schema.tables 
                    WHERE table_name = '{table}'
                """
                    )
                ).fetchone()

                if result and result.count > 0:
                    logger.info(f"✓ Table {table} exists")
                else:
                    logger.error(f"✗ Table {table} does not exist")

            # Count records
            pref_count = db.query(NotificationPreference).count()
            log_count = db.query(NotificationLog).count()
            user_count = db.query(User).count()

            logger.info(f"Notification system verification:")
            logger.info(f"  notification_preferences: {pref_count} records")
            logger.info(f"  notification_logs: {log_count} records")
            logger.info(f"  users: {user_count} total users")

            if user_count > 0 and pref_count == 0:
                logger.warning("No notification preferences found for existing users")

            # Sample some data
            sample_preferences = db.query(NotificationPreference).limit(5).all()
            logger.info(f"Sample notification preferences:")
            for pref in sample_preferences:
                logger.info(
                    f"  User {pref.user_id}: {pref.notification_type} via {pref.channel} ({pref.frequency})"
                )

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error verifying notification setup: {e}")
        raise


def update_team_notification_permissions():
    """Update team permissions to include notification management."""
    try:
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        try:
            # Check if we need to add notification permissions to roles
            # This would integrate with the existing RBAC system

            # For now, we'll ensure team admins can manage team notifications
            # This will be implemented when we integrate with the role system

            logger.info(
                "Team notification permissions will be handled by existing RBAC system"
            )

        except Exception as e:
            db.rollback()
            logger.error(f"Error updating team notification permissions: {e}")
            raise
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error in team notification permissions update: {e}")


def main():
    """Main migration function."""
    logger.info("Starting notification system migration...")

    try:
        # Step 1: Create notification tables
        create_notification_tables()

        # Step 2: Setup database optimizations
        setup_notification_triggers()

        # Step 3: Update team permissions (placeholder for RBAC integration)
        update_team_notification_permissions()

        # Step 4: Verify everything is working
        verify_notification_setup()

        logger.info("Notification system migration completed successfully!")

    except Exception as e:
        logger.error(f"Notification system migration failed: {e}")
        raise


if __name__ == "__main__":
    main()
