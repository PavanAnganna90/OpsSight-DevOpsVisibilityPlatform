"""
Enhanced Slack notification service for the notification system.
Extends the base SlackService with user mapping, digest support, and preference integration.
"""

import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.db.database import get_db
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.user import User
from app.models.notification_preference import (
    NotificationPreference,
    NotificationChannel,
)
from app.models.notification_log import NotificationLog, DeliveryStatus
from app.services.slack_service import SlackService, SlackMessageFormatter
from app.schemas.alert import SlackNotificationData

logger = logging.getLogger(__name__)


class SlackUserMapper:
    """Maps OpsSight users to Slack users."""

    def __init__(self, slack_service: SlackService):
        """Initialize with Slack service."""
        self.slack_service = slack_service
        self._user_cache = {}  # Cache for user mappings
        self._cache_expiry = {}  # Cache expiry times
        self.cache_duration = timedelta(hours=1)  # Cache for 1 hour

    async def get_slack_user_id(self, user: User) -> Optional[str]:
        """
        Get Slack user ID for an OpsSight user.

        Args:
            user: OpsSight user object

        Returns:
            Slack user ID if found, None otherwise
        """
        cache_key = f"user_{user.id}"

        # Check cache first
        if (
            cache_key in self._user_cache
            and cache_key in self._cache_expiry
            and datetime.utcnow() < self._cache_expiry[cache_key]
        ):
            return self._user_cache[cache_key]

        try:
            # Try multiple strategies to find the user
            slack_user_id = None

            # Strategy 1: Look for email match
            if user.email:
                slack_user_id = await self._find_user_by_email(user.email)

            # Strategy 2: Look for GitHub username in display name
            if not slack_user_id and user.github_username:
                slack_user_id = await self._find_user_by_display_name(
                    user.github_username
                )

            # Strategy 3: Look for real name match
            if not slack_user_id and user.full_name:
                slack_user_id = await self._find_user_by_real_name(user.full_name)

            # Cache the result (even if None)
            self._user_cache[cache_key] = slack_user_id
            self._cache_expiry[cache_key] = datetime.utcnow() + self.cache_duration

            return slack_user_id

        except Exception as e:
            logger.error(f"Failed to map user {user.id} to Slack: {str(e)}")
            return None

    async def _find_user_by_email(self, email: str) -> Optional[str]:
        """Find Slack user by email address."""
        try:
            if not self.slack_service.bot_token:
                return None

            await self.slack_service.rate_limiter.wait_if_needed()

            response = await self.slack_service.client.get(
                f"{self.slack_service.api_base_url}/users.lookupByEmail",
                headers={"Authorization": f"Bearer {self.slack_service.bot_token}"},
                params={"email": email},
            )

            if response.status_code == 200:
                data = response.json()
                if data.get("ok"):
                    return data.get("user", {}).get("id")

            return None

        except Exception as e:
            logger.debug(f"Email lookup failed for {email}: {str(e)}")
            return None

    async def _find_user_by_display_name(self, display_name: str) -> Optional[str]:
        """Find Slack user by display name or real name."""
        try:
            if not self.slack_service.bot_token:
                return None

            await self.slack_service.rate_limiter.wait_if_needed()

            response = await self.slack_service.client.get(
                f"{self.slack_service.api_base_url}/users.list",
                headers={"Authorization": f"Bearer {self.slack_service.bot_token}"},
            )

            if response.status_code == 200:
                data = response.json()
                if data.get("ok"):
                    for user in data.get("members", []):
                        profile = user.get("profile", {})
                        if (
                            profile.get("display_name", "").lower()
                            == display_name.lower()
                            or profile.get("real_name", "").lower()
                            == display_name.lower()
                        ):
                            return user.get("id")

            return None

        except Exception as e:
            logger.debug(f"Display name lookup failed for {display_name}: {str(e)}")
            return None

    async def _find_user_by_real_name(self, real_name: str) -> Optional[str]:
        """Find Slack user by real name."""
        return await self._find_user_by_display_name(real_name)

    def clear_cache(self):
        """Clear the user mapping cache."""
        self._user_cache.clear()
        self._cache_expiry.clear()


class SlackDigestFormatter:
    """Formats digest messages for Slack."""

    @staticmethod
    def format_daily_digest(digest_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format daily digest as Slack message.

        Args:
            digest_data: Aggregated digest data

        Returns:
            Slack message payload
        """
        blocks = [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": f"📊 Daily OpsSight Digest"},
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"*{digest_data.get('date_range', 'Last 24 Hours')}*",
                    }
                ],
            },
        ]

        # Summary statistics
        stats = digest_data.get("stats", {})
        if stats:
            summary_fields = []

            if stats.get("critical_alerts", 0) > 0:
                summary_fields.append(
                    {
                        "type": "mrkdwn",
                        "text": f"🔴 *{stats['critical_alerts']}* Critical Alerts",
                    }
                )

            if stats.get("high_alerts", 0) > 0:
                summary_fields.append(
                    {
                        "type": "mrkdwn",
                        "text": f"🟠 *{stats['high_alerts']}* High Priority",
                    }
                )

            if stats.get("successful_pipelines", 0) > 0:
                summary_fields.append(
                    {
                        "type": "mrkdwn",
                        "text": f"✅ *{stats['successful_pipelines']}* Successful Pipelines",
                    }
                )

            if stats.get("failed_pipelines", 0) > 0:
                summary_fields.append(
                    {
                        "type": "mrkdwn",
                        "text": f"❌ *{stats['failed_pipelines']}* Failed Pipelines",
                    }
                )

            if summary_fields:
                blocks.append({"type": "section", "fields": summary_fields})

        # Recent alerts section
        alerts = digest_data.get("alerts", [])
        if alerts:
            blocks.append(
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": "*🚨 Recent Alerts*"},
                }
            )

            for alert in alerts[:5]:  # Limit to 5 most recent
                severity_emoji = {
                    "critical": "🔴",
                    "high": "🟠",
                    "medium": "🟡",
                    "low": "🟢",
                }
                emoji = severity_emoji.get(alert.get("severity", "").lower(), "⚠️")

                blocks.append(
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"{emoji} *{alert.get('title', 'Unknown Alert')}*\n_{alert.get('source', 'Unknown')} • {alert.get('triggered_at', 'Unknown time')}_",
                        },
                    }
                )

        # Pipeline activity
        pipelines = digest_data.get("pipelines", [])
        if pipelines:
            blocks.append(
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": "*🔄 Pipeline Activity*"},
                }
            )

            pipeline_text = ""
            for pipeline in pipelines[:3]:  # Limit to 3 most recent
                status_emoji = {"success": "✅", "failed": "❌", "running": "🔄"}
                emoji = status_emoji.get(pipeline.get("status", "").lower(), "⚪")
                pipeline_text += f"{emoji} {pipeline.get('name', 'Unknown Pipeline')}\n"

            if pipeline_text:
                blocks.append(
                    {
                        "type": "section",
                        "text": {"type": "mrkdwn", "text": pipeline_text.strip()},
                    }
                )

        # No activity message
        if not alerts and not pipelines:
            blocks.append(
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "🎉 *Great job!* No significant activity to report today.\nAll systems are running smoothly.",
                    },
                }
            )

        # Action buttons
        blocks.append(
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "View Dashboard"},
                        "style": "primary",
                        "url": f"{settings.FRONTEND_URL}/dashboard",
                    },
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Manage Notifications"},
                        "url": f"{settings.FRONTEND_URL}/settings/notifications",
                    },
                ],
            }
        )

        return {"blocks": blocks, "unfurl_links": False, "unfurl_media": False}


class SlackNotificationService:
    """Enhanced Slack notification service with user mapping and digest support."""

    def __init__(self):
        """Initialize Slack notification service."""
        self.slack_service = SlackService()
        self.user_mapper = SlackUserMapper(self.slack_service)
        self.digest_formatter = SlackDigestFormatter()

    async def send_notification(
        self, user: User, content: Dict[str, Any], log_entry: NotificationLog
    ) -> Dict[str, Any]:
        """
        Send notification to user via Slack.

        Args:
            user: OpsSight user to notify
            content: Notification content
            log_entry: Notification log entry

        Returns:
            Delivery result
        """
        try:
            # Get Slack user ID
            slack_user_id = await self.user_mapper.get_slack_user_id(user)
            if not slack_user_id:
                return {
                    "status": "failed",
                    "error": f"Slack user not found for {user.email or user.github_username}",
                }

            # Determine notification type and format message
            if content.get("alert"):
                return await self._send_alert_notification(
                    slack_user_id, content["alert"], content
                )
            elif content.get("digest_data"):
                return await self._send_digest_notification(
                    slack_user_id, content["digest_data"], content
                )
            else:
                return await self._send_generic_notification(slack_user_id, content)

        except Exception as e:
            logger.error(f"Failed to send Slack notification to {user.id}: {str(e)}")
            return {"status": "failed", "error": str(e)}

    async def _send_alert_notification(
        self, slack_user_id: str, alert: Alert, content: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send alert notification via Slack."""
        try:
            # Use existing SlackService alert notification
            notification_data = SlackNotificationData(
                include_actions=content.get("include_actions", True),
                custom_message=content.get("custom_message"),
            )

            # Send to user's DM
            channel = slack_user_id  # Direct message
            result = await self.slack_service.send_alert_notification(
                alert=alert, channel=channel, notification_data=notification_data
            )

            if result:
                return {
                    "status": "sent",
                    "message_id": f"slack_alert_{datetime.utcnow().timestamp()}",
                    "content": alert.title,
                    "channel": channel,
                }
            else:
                return {"status": "failed", "error": "Slack API call failed"}

        except Exception as e:
            return {"status": "failed", "error": str(e)}

    async def _send_digest_notification(
        self, slack_user_id: str, digest_data: Dict[str, Any], content: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send digest notification via Slack."""
        try:
            # Format digest message
            message = self.digest_formatter.format_daily_digest(digest_data)

            # Send to user's DM
            channel = slack_user_id
            result = await self.slack_service.send_message(channel, message)

            if result and result.get("ok"):
                return {
                    "status": "sent",
                    "message_id": result.get(
                        "ts", f"slack_digest_{datetime.utcnow().timestamp()}"
                    ),
                    "content": content.get("subject", "Daily Digest"),
                    "channel": channel,
                }
            else:
                return {"status": "failed", "error": "Slack API call failed"}

        except Exception as e:
            return {"status": "failed", "error": str(e)}

    async def _send_generic_notification(
        self, slack_user_id: str, content: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send generic notification via Slack."""
        try:
            message_text = content.get(
                "body", content.get("subject", "Notification from OpsSight")
            )

            message = {
                "text": message_text,
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*OpsSight Notification*\n{message_text}",
                        },
                    }
                ],
            }

            # Add action button if URL provided
            if content.get("action_url"):
                message["blocks"].append(
                    {
                        "type": "actions",
                        "elements": [
                            {
                                "type": "button",
                                "text": {
                                    "type": "plain_text",
                                    "text": content.get("action_text", "View Details"),
                                },
                                "style": "primary",
                                "url": content["action_url"],
                            }
                        ],
                    }
                )

            # Send to user's DM
            channel = slack_user_id
            result = await self.slack_service.send_message(channel, message)

            if result and result.get("ok"):
                return {
                    "status": "sent",
                    "message_id": result.get(
                        "ts", f"slack_generic_{datetime.utcnow().timestamp()}"
                    ),
                    "content": content.get("subject", "Notification"),
                    "channel": channel,
                }
            else:
                return {"status": "failed", "error": "Slack API call failed"}

        except Exception as e:
            return {"status": "failed", "error": str(e)}

    async def send_team_notification(
        self, team_channel: str, content: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Send notification to a team channel.

        Args:
            team_channel: Slack channel name or ID
            content: Notification content

        Returns:
            Delivery result
        """
        try:
            if content.get("alert"):
                # Send alert to team channel
                result = await self.slack_service.send_alert_notification(
                    alert=content["alert"],
                    channel=team_channel,
                    notification_data=content.get("notification_data"),
                )

                if result:
                    return {
                        "status": "sent",
                        "message_id": f"slack_team_alert_{datetime.utcnow().timestamp()}",
                        "content": content["alert"].title,
                        "channel": team_channel,
                    }
                else:
                    return {"status": "failed", "error": "Team alert send failed"}

            elif content.get("digest_data"):
                # Send digest to team channel
                message = self.digest_formatter.format_daily_digest(
                    content["digest_data"]
                )
                result = await self.slack_service.send_message(team_channel, message)

                if result and result.get("ok"):
                    return {
                        "status": "sent",
                        "message_id": result.get(
                            "ts", f"slack_team_digest_{datetime.utcnow().timestamp()}"
                        ),
                        "content": "Team Digest",
                        "channel": team_channel,
                    }
                else:
                    return {"status": "failed", "error": "Team digest send failed"}

            else:
                # Generic team message
                message_text = content.get(
                    "body", content.get("subject", "Team notification")
                )
                message = {"text": message_text}

                result = await self.slack_service.send_message(team_channel, message)

                if result and result.get("ok"):
                    return {
                        "status": "sent",
                        "message_id": result.get(
                            "ts", f"slack_team_{datetime.utcnow().timestamp()}"
                        ),
                        "content": content.get("subject", "Team Notification"),
                        "channel": team_channel,
                    }
                else:
                    return {"status": "failed", "error": "Team message send failed"}

        except Exception as e:
            logger.error(
                f"Failed to send team notification to {team_channel}: {str(e)}"
            )
            return {"status": "failed", "error": str(e)}

    async def test_user_mapping(self, user: User) -> Dict[str, Any]:
        """
        Test user mapping for debugging.

        Args:
            user: OpsSight user to test

        Returns:
            Mapping test results
        """
        results = {
            "user_id": user.id,
            "email": user.email,
            "github_username": user.github_username,
            "full_name": user.full_name,
            "slack_user_id": None,
            "mapping_successful": False,
            "error": None,
        }

        try:
            slack_user_id = await self.user_mapper.get_slack_user_id(user)
            results["slack_user_id"] = slack_user_id
            results["mapping_successful"] = bool(slack_user_id)

            if slack_user_id:
                # Get additional Slack user info
                try:
                    slack_user_info = await self.slack_service.get_user_info(
                        slack_user_id
                    )
                    results["slack_user_info"] = {
                        "real_name": slack_user_info.get("profile", {}).get(
                            "real_name"
                        ),
                        "display_name": slack_user_info.get("profile", {}).get(
                            "display_name"
                        ),
                        "email": slack_user_info.get("profile", {}).get("email"),
                    }
                except Exception as e:
                    results["slack_user_info_error"] = str(e)

        except Exception as e:
            results["error"] = str(e)

        return results

    async def clear_user_cache(self):
        """Clear the user mapping cache."""
        self.user_mapper.clear_cache()


# Global service instance
slack_notification_service = SlackNotificationService()
