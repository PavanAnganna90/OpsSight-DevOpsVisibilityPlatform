"""
Push notification service for sending notifications to mobile devices.
Supports both Firebase Cloud Messaging (FCM) for Android and Apple Push Notification service (APNs) for iOS.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass

import httpx

try:
    from pyfcm import FCMNotification
    FCM_AVAILABLE = True
except ImportError:
    FCMNotification = None
    FCM_AVAILABLE = False

try:
    from apns2.client import APNsClient
    from apns2.payload import Payload
    from apns2.credentials import TokenCredentials
    APNS_AVAILABLE = True
except ImportError:
    APNsClient = None
    Payload = None
    TokenCredentials = None
    APNS_AVAILABLE = False

from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_

from app.core.config import settings
from app.models.user import User
from app.models.push_token import PushToken
from app.models.notification_log import NotificationLog

try:
    from app.utils.celery_app import celery_app
    CELERY_AVAILABLE = True
except ImportError:
    celery_app = None
    CELERY_AVAILABLE = False

logger = logging.getLogger(__name__)


@dataclass
class PushNotificationData:
    """Data structure for push notification content."""
    title: str
    body: str
    data: Dict[str, Any] = None
    sound: str = "default"
    badge: int = None
    category: str = None
    priority: str = "normal"  # low, normal, high
    ttl: int = 86400  # Time to live in seconds
    collapse_key: str = None


@dataclass
class NotificationAction:
    """Action button for rich notifications."""
    identifier: str
    title: str
    options: Dict[str, bool] = None


class PushNotificationService:
    """Service for sending push notifications to mobile devices."""

    def __init__(self):
        """Initialize push notification service with FCM and APNs clients."""
        self.fcm_client = None
        self.apns_client = None
        self._initialize_clients()

    def _initialize_clients(self):
        """Initialize FCM and APNs clients with credentials."""
        try:
            # Initialize FCM client
            if hasattr(settings, 'FCM_SERVER_KEY') and settings.FCM_SERVER_KEY:
                self.fcm_client = FCMNotification(api_key=settings.FCM_SERVER_KEY)
                logger.info("FCM client initialized successfully")
            else:
                logger.warning("FCM server key not configured")

            # Initialize APNs client
            if hasattr(settings, 'APNS_KEY_PATH') and settings.APNS_KEY_PATH:
                credentials = TokenCredentials(
                    auth_key_path=settings.APNS_KEY_PATH,
                    auth_key_id=settings.APNS_KEY_ID,
                    team_id=settings.APNS_TEAM_ID
                )
                self.apns_client = APNsClient(
                    credentials=credentials,
                    use_sandbox=getattr(settings, 'APNS_USE_SANDBOX', False)
                )
                logger.info("APNs client initialized successfully")
            else:
                logger.warning("APNs credentials not configured")

        except Exception as e:
            logger.error(f"Failed to initialize push notification clients: {str(e)}")

    async def send_to_user(
        self,
        db: AsyncSession,
        user_id: int,
        notification: PushNotificationData,
        log_entry: NotificationLog = None
    ) -> Dict[str, Any]:
        """
        Send push notification to all registered devices for a user.

        Args:
            db: AsyncSession for database operations
            user_id: Target user ID
            notification: Notification data
            log_entry: Optional notification log entry

        Returns:
            Dictionary with delivery results
        """
        try:
            # Get all push tokens for the user
            push_tokens = (
                await db.execute(
                    select(PushToken).filter(
                        and_(
                            PushToken.user_id == user_id,
                            PushToken.is_active == True
                        )
                    )
                )
            ).scalars().all()

            if not push_tokens:
                logger.warning(f"No active push tokens found for user {user_id}")
                return {
                    "status": "failed",
                    "error": "No active push tokens",
                    "sent_count": 0,
                    "failed_count": 0
                }

            # Send to each device
            sent_count = 0
            failed_count = 0
            errors = []

            for token in push_tokens:
                try:
                    if token.platform == "ios":
                        result = await self._send_apns_notification(token.token, notification)
                    elif token.platform == "android":
                        result = await self._send_fcm_notification(token.token, notification)
                    else:
                        logger.warning(f"Unsupported platform: {token.platform}")
                        continue

                    if result.get("success"):
                        sent_count += 1
                        # Update token last_used
                        token.last_used = datetime.utcnow()
                        token.success_count += 1
                    else:
                        failed_count += 1
                        token.failure_count += 1
                        errors.append(result.get("error", "Unknown error"))

                        # Deactivate token if too many failures
                        if token.failure_count >= 5:
                            token.is_active = False
                            logger.warning(f"Deactivated push token {token.id} due to repeated failures")

                except Exception as e:
                    failed_count += 1
                    errors.append(str(e))
                    logger.error(f"Failed to send to token {token.id}: {str(e)}")

            await db.commit()

            result = {
                "status": "sent" if sent_count > 0 else "failed",
                "sent_count": sent_count,
                "failed_count": failed_count,
                "total_tokens": len(push_tokens),
                "content": f"{notification.title}: {notification.body}"
            }

            if errors:
                result["errors"] = errors

            return result

        except Exception as e:
            logger.error(f"Failed to send push notification to user {user_id}: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "sent_count": 0,
                "failed_count": 1
            }

    async def _send_fcm_notification(
        self,
        token: str,
        notification: PushNotificationData
    ) -> Dict[str, Any]:
        """Send FCM notification to Android device."""
        if not self.fcm_client:
            return {"success": False, "error": "FCM client not initialized"}

        try:
            # Prepare FCM payload
            data_payload = notification.data or {}
            data_payload.update({
                "click_action": "FLUTTER_NOTIFICATION_CLICK",
                "type": data_payload.get("type", "default"),
                "timestamp": str(int(datetime.utcnow().timestamp()))
            })

            # Set priority
            priority = "high" if notification.priority == "high" else "normal"

            # Send notification
            result = self.fcm_client.notify_single_device(
                registration_id=token,
                message_title=notification.title,
                message_body=notification.body,
                data_message=data_payload,
                sound=notification.sound,
                badge=notification.badge,
                click_action="FLUTTER_NOTIFICATION_CLICK",
                collapse_key=notification.collapse_key,
                time_to_live=notification.ttl,
                priority=priority,
                android_channel_id=self._get_android_channel(notification)
            )

            if result.get("success"):
                return {
                    "success": True,
                    "message_id": result.get("message_id"),
                    "platform": "android"
                }
            else:
                return {
                    "success": False,
                    "error": result.get("failure", "Unknown FCM error"),
                    "platform": "android"
                }

        except Exception as e:
            logger.error(f"FCM send error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "platform": "android"
            }

    async def _send_apns_notification(
        self,
        token: str,
        notification: PushNotificationData
    ) -> Dict[str, Any]:
        """Send APNs notification to iOS device."""
        if not self.apns_client:
            return {"success": False, "error": "APNs client not initialized"}

        try:
            # Prepare APNs payload
            payload_data = {
                "aps": {
                    "alert": {
                        "title": notification.title,
                        "body": notification.body
                    },
                    "sound": notification.sound,
                    "category": notification.category
                }
            }

            if notification.badge is not None:
                payload_data["aps"]["badge"] = notification.badge

            # Add custom data
            if notification.data:
                payload_data.update(notification.data)

            # Set priority
            priority = 10 if notification.priority == "high" else 5

            # Create payload
            payload = Payload(**payload_data)

            # Send notification
            request = self.apns_client.send_notification(
                token_hex=token,
                notification=payload,
                priority=priority,
                expiration=datetime.utcnow() + timedelta(seconds=notification.ttl)
            )

            if request.is_successful:
                return {
                    "success": True,
                    "message_id": request.apns_id,
                    "platform": "ios"
                }
            else:
                return {
                    "success": False,
                    "error": f"APNs error: {request.description}",
                    "status_code": request.status_code,
                    "platform": "ios"
                }

        except Exception as e:
            logger.error(f"APNs send error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "platform": "ios"
            }

    def _get_android_channel(self, notification: PushNotificationData) -> str:
        """Get appropriate Android notification channel based on notification type."""
        data = notification.data or {}
        
        if notification.priority == "high" or data.get("type") in ["critical_alert", "security_alert"]:
            return "critical"
        elif data.get("type") in ["system_alert", "performance_alert"]:
            return "alerts"
        elif data.get("type") == "deployment":
            return "deployments"
        elif data.get("type") == "team_update":
            return "team_updates"
        else:
            return "default"

    async def send_alert_notification(
        self,
        db: AsyncSession,
        user_id: int,
        alert_data: Dict[str, Any],
        log_entry: NotificationLog = None
    ) -> Dict[str, Any]:
        """Send alert-specific push notification."""
        alert = alert_data.get("alert")
        if not alert:
            return {"status": "failed", "error": "No alert data provided"}

        # Determine notification category and actions
        category = "ALERT_CRITICAL" if alert.severity in ["critical", "high"] else "ALERT_NORMAL"
        
        notification = PushNotificationData(
            title=f"🚨 {alert.severity.upper()} Alert",
            body=alert.title,
            data={
                "type": "alert",
                "alert_id": str(alert.id),
                "severity": alert.severity,
                "source": alert.source,
                "team_id": str(alert.team_id) if alert.team_id else None,
                "action_url": f"/alerts/{alert.id}"
            },
            category=category,
            priority="high" if alert.severity in ["critical", "high"] else "normal",
            sound="alert_sound.wav" if alert.severity == "critical" else "default"
        )

        return await self.send_to_user(db, user_id, notification, log_entry)

    async def send_deployment_notification(
        self,
        db: AsyncSession,
        user_id: int,
        deployment_data: Dict[str, Any],
        log_entry: NotificationLog = None
    ) -> Dict[str, Any]:
        """Send deployment-specific push notification."""
        deployment = deployment_data.get("deployment")
        status = deployment_data.get("status", "unknown")

        title = f"🚀 Deployment {status.title()}"
        emoji_map = {
            "success": "✅",
            "failed": "❌",
            "in_progress": "⏳",
            "rollback": "🔄"
        }
        
        notification = PushNotificationData(
            title=f"{emoji_map.get(status, '📦')} {title}",
            body=deployment_data.get("message", f"Deployment {deployment.id} is {status}"),
            data={
                "type": "deployment",
                "deployment_id": str(deployment.id) if deployment else None,
                "status": status,
                "environment": deployment_data.get("environment"),
                "action_url": f"/deployments/{deployment.id}" if deployment else None
            },
            category="DEPLOYMENT",
            priority="normal"
        )

        return await self.send_to_user(db, user_id, notification, log_entry)

    async def send_team_notification(
        self,
        db: AsyncSession,
        user_id: int,
        team_data: Dict[str, Any],
        log_entry: NotificationLog = None
    ) -> Dict[str, Any]:
        """Send team-specific push notification."""
        notification = PushNotificationData(
            title=f"👥 {team_data.get('title', 'Team Update')}",
            body=team_data.get("message", "You have a new team update"),
            data={
                "type": "team_update",
                "team_id": str(team_data.get("team_id")),
                "update_type": team_data.get("update_type"),
                "action_url": team_data.get("action_url")
            },
            category="TEAM_UPDATE",
            priority="normal"
        )

        return await self.send_to_user(db, user_id, notification, log_entry)

    async def register_push_token(
        self,
        db: AsyncSession,
        user_id: int,
        token: str,
        platform: str,
        device_id: str = None,
        app_version: str = None
    ) -> bool:
        """Register or update a push token for a user."""
        try:
            # Check if token already exists
            existing_token = (
                await db.execute(
                    select(PushToken).filter(
                        PushToken.token == token
                    )
                )
            ).scalars().first()

            if existing_token:
                # Update existing token
                existing_token.user_id = user_id
                existing_token.platform = platform
                existing_token.device_id = device_id
                existing_token.app_version = app_version
                existing_token.is_active = True
                existing_token.updated_at = datetime.utcnow()
            else:
                # Create new token
                push_token = PushToken(
                    user_id=user_id,
                    token=token,
                    platform=platform,
                    device_id=device_id,
                    app_version=app_version,
                    is_active=True
                )
                db.add(push_token)

            await db.commit()
            logger.info(f"Registered push token for user {user_id} on {platform}")
            return True

        except Exception as e:
            logger.error(f"Failed to register push token: {str(e)}")
            await db.rollback()
            return False

    async def deactivate_push_token(
        self,
        db: AsyncSession,
        token: str
    ) -> bool:
        """Deactivate a push token."""
        try:
            push_token = (
                await db.execute(
                    select(PushToken).filter(PushToken.token == token)
                )
            ).scalars().first()

            if push_token:
                push_token.is_active = False
                push_token.updated_at = datetime.utcnow()
                await db.commit()
                return True

            return False

        except Exception as e:
            logger.error(f"Failed to deactivate push token: {str(e)}")
            await db.rollback()
            return False


# Celery tasks for background processing
if CELERY_AVAILABLE:
    @celery_app.task(bind=True, retry_kwargs={'max_retries': 3, 'countdown': 60})
    def send_push_notification_task(self, user_id: int, notification_data: dict):
        """Celery task for sending push notifications in background."""
        import asyncio
        from app.db.database import get_async_session
        
        async def _send_notification():
            push_service = PushNotificationService()
            async with get_async_session() as db:
                await push_service.send_to_user(
                    db=db,
                    user_id=user_id,
                    notification=PushNotificationData(**notification_data)
                )
        
        # Run async function in sync context
        asyncio.run(_send_notification())
        
        return {'status': 'success', 'user_id': user_id}
else:
    def send_push_notification_task(self, user_id: int, notification_data: dict):
        """Celery task for sending push notifications in background."""
        import asyncio
        from app.db.database import get_async_session
        
        async def _send_notification():
            push_service = PushNotificationService()
            async with get_async_session() as db:
                notification = PushNotificationData(**notification_data)
                result = await push_service.send_to_user(db, user_id, notification)
                return result

        try:
            loop = asyncio.get_event_loop()
            result = loop.run_until_complete(_send_notification())
            logger.info(f"Background push notification sent: {result}")
            return result
        except Exception as e:
            logger.error(f"Failed to send background push notification: {str(e)}")
            raise Exception(f"Failed to send notification: {e}")


if CELERY_AVAILABLE:
    @celery_app.task(bind=True)
    def cleanup_inactive_tokens_task(self):
        """Celery task to clean up inactive push tokens."""
        import asyncio
        from app.db.database import get_async_session
        
        async def _cleanup():
            push_service = PushNotificationService()
            async with get_async_session() as db:
                return await push_service.cleanup_inactive_tokens(db)
        
        try:
            loop = asyncio.get_event_loop()
            result = loop.run_until_complete(_cleanup())
            logger.info(f"Cleanup inactive tokens result: {result}")
            return result
        except Exception as e:
            logger.error(f"Failed to cleanup inactive tokens: {str(e)}")
            raise self.retry(exc=e)
else:
    def cleanup_inactive_tokens_task(self):
        """Celery task to clean up inactive push tokens."""
        import asyncio
        from app.db.database import get_async_session
        
        async def _cleanup_tokens():
            async with get_async_session() as db:
                # Remove tokens that haven't been used in 30 days and have high failure count
                cutoff_date = datetime.utcnow() - timedelta(days=30)
                
                inactive_tokens = (
                    await db.execute(
                        select(PushToken).filter(
                            and_(
                                PushToken.last_used < cutoff_date,
                                PushToken.failure_count >= 5
                            )
                        )
                    )
                ).scalars().all()

                for token in inactive_tokens:
                    await db.delete(token)

                await db.commit()
                logger.info(f"Cleaned up {len(inactive_tokens)} inactive push tokens")

        try:
            loop = asyncio.get_event_loop()
            loop.run_until_complete(_cleanup_tokens())
        except Exception as e:
            logger.error(f"Failed to cleanup inactive tokens: {str(e)}")


# Global service instance
push_notification_service = PushNotificationService()