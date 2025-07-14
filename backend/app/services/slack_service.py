"""
Slack API service for alert notifications and team communication.
Handles message formatting, rate limiting, and OAuth integration.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from urllib.parse import urlencode
import httpx
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.schemas.alert import SlackNotificationData

logger = logging.getLogger(__name__)


class SlackRateLimiter:
    """Rate limiter for Slack API calls."""

    def __init__(self):
        self.calls = []
        self.max_calls_per_minute = 50  # Slack API limit

    async def wait_if_needed(self):
        """Wait if rate limit would be exceeded."""
        now = datetime.now()
        # Remove calls older than 1 minute
        self.calls = [
            call_time
            for call_time in self.calls
            if now - call_time < timedelta(minutes=1)
        ]

        if len(self.calls) >= self.max_calls_per_minute:
            # Wait until the oldest call is more than 1 minute old
            wait_time = 60 - (now - self.calls[0]).total_seconds()
            if wait_time > 0:
                logger.info(f"Rate limiting: waiting {wait_time:.2f} seconds")
                await asyncio.sleep(wait_time)

        self.calls.append(now)


class SlackMessageFormatter:
    """Formats alert messages for Slack."""

    @staticmethod
    def format_alert_message(
        alert: Alert, include_actions: bool = True
    ) -> Dict[str, Any]:
        """
        Format alert as Slack message with blocks.

        Args:
            alert: Alert object to format
            include_actions: Whether to include action buttons

        Returns:
            Slack message payload
        """
        # Determine color based on severity
        color_map = {
            AlertSeverity.CRITICAL: "#FF0000",  # Red
            AlertSeverity.HIGH: "#FF8C00",  # Orange
            AlertSeverity.MEDIUM: "#FFD700",  # Yellow
            AlertSeverity.LOW: "#32CD32",  # Green
        }
        color = color_map.get(alert.severity, "#808080")

        # Status emoji
        status_emoji = {
            AlertStatus.ACTIVE: "🔴",
            AlertStatus.ACKNOWLEDGED: "🟡",
            AlertStatus.RESOLVED: "✅",
            AlertStatus.SUPPRESSED: "🔇",
        }
        emoji = status_emoji.get(alert.status, "⚠️")

        # Build message blocks
        blocks = [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": f"{emoji} {alert.title}"},
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Severity:* {alert.severity.value.upper()}",
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Status:* {alert.status.value.title()}",
                    },
                    {"type": "mrkdwn", "text": f"*Source:* {alert.source}"},
                    {
                        "type": "mrkdwn",
                        "text": f"*Category:* {alert.category or 'General'}",
                    },
                ],
            },
        ]

        # Add message content
        if alert.message:
            blocks.append(
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Description:*\n{alert.message[:2000]}",  # Slack limit
                    },
                }
            )

        # Add context information
        context_elements = []
        if alert.triggered_at:
            context_elements.append(
                f"Triggered: {alert.triggered_at.strftime('%Y-%m-%d %H:%M:%S UTC')}"
            )
        if alert.alert_id:
            context_elements.append(f"ID: {alert.alert_id}")

        if context_elements:
            blocks.append(
                {
                    "type": "context",
                    "elements": [
                        {"type": "mrkdwn", "text": " | ".join(context_elements)}
                    ],
                }
            )

        # Add action buttons if requested and alert is active
        if include_actions and alert.status == AlertStatus.ACTIVE:
            blocks.append(
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {"type": "plain_text", "text": "Acknowledge"},
                            "style": "primary",
                            "action_id": "acknowledge_alert",
                            "value": str(alert.id),
                        },
                        {
                            "type": "button",
                            "text": {"type": "plain_text", "text": "Resolve"},
                            "style": "danger",
                            "action_id": "resolve_alert",
                            "value": str(alert.id),
                        },
                        {
                            "type": "button",
                            "text": {"type": "plain_text", "text": "View Details"},
                            "action_id": "view_alert_details",
                            "value": str(alert.id),
                            "url": f"{settings.FRONTEND_URL}/alerts/{alert.id}",
                        },
                    ],
                }
            )

        return {"attachments": [{"color": color, "blocks": blocks}]}

    @staticmethod
    def format_alert_summary(alerts: List[Alert]) -> Dict[str, Any]:
        """
        Format multiple alerts as summary message.

        Args:
            alerts: List of alerts to summarize

        Returns:
            Slack message payload
        """
        if not alerts:
            return {
                "text": "No active alerts",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "✅ *No active alerts*\nAll systems are operating normally.",
                        },
                    }
                ],
            }

        # Count by severity
        severity_counts = {}
        for alert in alerts:
            severity_counts[alert.severity] = severity_counts.get(alert.severity, 0) + 1

        # Build summary text
        summary_parts = []
        for severity in [
            AlertSeverity.CRITICAL,
            AlertSeverity.HIGH,
            AlertSeverity.MEDIUM,
            AlertSeverity.LOW,
        ]:
            count = severity_counts.get(severity, 0)
            if count > 0:
                emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}[
                    severity.value
                ]
                summary_parts.append(f"{emoji} {count} {severity.value}")

        summary_text = f"*Alert Summary* ({len(alerts)} total)\n" + " | ".join(
            summary_parts
        )

        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"🚨 Alert Summary ({len(alerts)} alerts)",
                },
            },
            {"type": "section", "text": {"type": "mrkdwn", "text": summary_text}},
        ]

        # Add top alerts (up to 5)
        if alerts:
            blocks.append({"type": "divider"})

            for alert in alerts[:5]:
                emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}[
                    alert.severity.value
                ]
                blocks.append(
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"{emoji} *{alert.title}*\n{alert.message[:100]}{'...' if len(alert.message) > 100 else ''}",
                        },
                        "accessory": {
                            "type": "button",
                            "text": {"type": "plain_text", "text": "View"},
                            "action_id": "view_alert_details",
                            "value": str(alert.id),
                        },
                    }
                )

            if len(alerts) > 5:
                blocks.append(
                    {
                        "type": "context",
                        "elements": [
                            {
                                "type": "mrkdwn",
                                "text": f"... and {len(alerts) - 5} more alerts",
                            }
                        ],
                    }
                )

        return {"blocks": blocks}


class SlackService:
    """
    Slack API service for sending notifications and managing integration.
    """

    def __init__(self):
        """Initialize Slack service with configuration."""
        self.bot_token = settings.SLACK_BOT_TOKEN
        self.webhook_url = settings.SLACK_WEBHOOK_URL
        self.client_id = settings.SLACK_CLIENT_ID
        self.client_secret = settings.SLACK_CLIENT_SECRET
        self.signing_secret = settings.SLACK_SIGNING_SECRET

        self.api_base_url = "https://slack.com/api"
        self.oauth_base_url = "https://slack.com/oauth/v2"

        self.rate_limiter = SlackRateLimiter()
        self.formatter = SlackMessageFormatter()

        # HTTP client for API calls
        self.client = httpx.AsyncClient(
            timeout=30.0,
            headers={"User-Agent": f"{settings.PROJECT_NAME}/{settings.VERSION}"},
        )

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.client.aclose()

    def get_oauth_url(self, state: str, scopes: List[str] = None) -> str:
        """
        Generate Slack OAuth authorization URL.

        Args:
            state: CSRF protection state parameter
            scopes: List of OAuth scopes to request

        Returns:
            OAuth authorization URL
        """
        if not self.client_id:
            raise ValueError("Slack client ID not configured")

        if scopes is None:
            scopes = [
                "chat:write",
                "chat:write.public",
                "channels:read",
                "groups:read",
                "im:read",
                "mpim:read",
                "users:read",
                "users:read.email",
            ]

        params = {
            "client_id": self.client_id,
            "scope": ",".join(scopes),
            "state": state,
            "response_type": "code",
        }

        return f"{self.oauth_base_url}/authorize?{urlencode(params)}"

    async def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        """
        Exchange OAuth code for access token.

        Args:
            code: OAuth authorization code

        Returns:
            OAuth response with tokens and team info
        """
        if not self.client_id or not self.client_secret:
            raise ValueError("Slack OAuth credentials not configured")

        await self.rate_limiter.wait_if_needed()

        response = await self.client.post(
            f"{self.oauth_base_url}/access",
            data={
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "code": code,
            },
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange Slack OAuth code",
            )

        data = response.json()
        if not data.get("ok"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=data.get("error", "Slack OAuth error"),
            )

        return data

    async def send_message(
        self,
        channel: str,
        message: Union[str, Dict[str, Any]],
        thread_ts: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send message to Slack channel.

        Args:
            channel: Channel ID or name
            message: Message text or blocks
            thread_ts: Thread timestamp for replies

        Returns:
            Slack API response
        """
        if not self.bot_token:
            raise ValueError("Slack bot token not configured")

        await self.rate_limiter.wait_if_needed()

        # Prepare payload
        payload = {"channel": channel}

        if isinstance(message, str):
            payload["text"] = message
        else:
            payload.update(message)

        if thread_ts:
            payload["thread_ts"] = thread_ts

        # Send via API
        response = await self.client.post(
            f"{self.api_base_url}/chat.postMessage",
            headers={"Authorization": f"Bearer {self.bot_token}"},
            json=payload,
        )

        if response.status_code != 200:
            logger.error(f"Slack API error: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send Slack message",
            )

        data = response.json()
        if not data.get("ok"):
            logger.error(f"Slack message failed: {data.get('error')}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=data.get("error", "Slack message failed"),
            )

        return data

    async def send_webhook_message(self, message: Union[str, Dict[str, Any]]) -> bool:
        """
        Send message via webhook URL (simpler but less features).

        Args:
            message: Message text or payload

        Returns:
            Success status
        """
        if not self.webhook_url:
            raise ValueError("Slack webhook URL not configured")

        await self.rate_limiter.wait_if_needed()

        # Prepare payload
        if isinstance(message, str):
            payload = {"text": message}
        else:
            payload = message

        try:
            response = await self.client.post(self.webhook_url, json=payload)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Webhook send failed: {e}")
            return False

    async def send_alert_notification(
        self,
        alert: Alert,
        channel: str,
        notification_data: Optional[SlackNotificationData] = None,
    ) -> bool:
        """
        Send alert notification to Slack.

        Args:
            alert: Alert to send
            channel: Slack channel
            notification_data: Additional notification settings

        Returns:
            Success status
        """
        try:
            # Format message
            include_actions = (
                notification_data.include_actions if notification_data else True
            )
            message = self.formatter.format_alert_message(alert, include_actions)

            # Add custom message if provided
            if notification_data and notification_data.custom_message:
                message["text"] = notification_data.custom_message

            # Send message
            if self.bot_token:
                result = await self.send_message(channel, message)
                logger.info(f"Alert {alert.id} sent to Slack channel {channel}")
                return True
            elif self.webhook_url:
                result = await self.send_webhook_message(message)
                logger.info(f"Alert {alert.id} sent via Slack webhook")
                return result
            else:
                logger.error("No Slack credentials configured")
                return False

        except Exception as e:
            logger.error(f"Failed to send alert {alert.id} to Slack: {e}")
            return False

    async def send_alert_summary(self, alerts: List[Alert], channel: str) -> bool:
        """
        Send alert summary to Slack.

        Args:
            alerts: List of alerts to summarize
            channel: Slack channel

        Returns:
            Success status
        """
        try:
            message = self.formatter.format_alert_summary(alerts)

            if self.bot_token:
                await self.send_message(channel, message)
            elif self.webhook_url:
                await self.send_webhook_message(message)
            else:
                logger.error("No Slack credentials configured")
                return False

            logger.info(f"Alert summary sent to Slack channel {channel}")
            return True

        except Exception as e:
            logger.error(f"Failed to send alert summary to Slack: {e}")
            return False

    async def get_channels(self) -> List[Dict[str, Any]]:
        """
        Get list of Slack channels.

        Returns:
            List of channel information
        """
        if not self.bot_token:
            raise ValueError("Slack bot token not configured")

        await self.rate_limiter.wait_if_needed()

        response = await self.client.get(
            f"{self.api_base_url}/conversations.list",
            headers={"Authorization": f"Bearer {self.bot_token}"},
            params={"types": "public_channel,private_channel"},
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch Slack channels",
            )

        data = response.json()
        if not data.get("ok"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=data.get("error", "Failed to fetch channels"),
            )

        return data.get("channels", [])

    async def get_user_info(self, user_id: str) -> Dict[str, Any]:
        """
        Get Slack user information.

        Args:
            user_id: Slack user ID

        Returns:
            User information
        """
        if not self.bot_token:
            raise ValueError("Slack bot token not configured")

        await self.rate_limiter.wait_if_needed()

        response = await self.client.get(
            f"{self.api_base_url}/users.info",
            headers={"Authorization": f"Bearer {self.bot_token}"},
            params={"user": user_id},
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch Slack user info",
            )

        data = response.json()
        if not data.get("ok"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=data.get("error", "Failed to fetch user info"),
            )

        return data.get("user", {})

    async def test_connection(self) -> Dict[str, Any]:
        """
        Test Slack API connection.

        Returns:
            Connection test results
        """
        results = {
            "bot_token_configured": bool(self.bot_token),
            "webhook_url_configured": bool(self.webhook_url),
            "oauth_configured": bool(self.client_id and self.client_secret),
            "api_connection": False,
            "webhook_connection": False,
        }

        # Test API connection
        if self.bot_token:
            try:
                await self.rate_limiter.wait_if_needed()
                response = await self.client.get(
                    f"{self.api_base_url}/auth.test",
                    headers={"Authorization": f"Bearer {self.bot_token}"},
                )

                if response.status_code == 200:
                    data = response.json()
                    results["api_connection"] = data.get("ok", False)
                    if results["api_connection"]:
                        results["team_info"] = {
                            "team": data.get("team"),
                            "user": data.get("user"),
                            "bot_id": data.get("bot_id"),
                        }
            except Exception as e:
                logger.error(f"API connection test failed: {e}")

        # Test webhook connection
        if self.webhook_url:
            try:
                test_message = {"text": "OpsSight connection test"}
                response = await self.client.post(self.webhook_url, json=test_message)
                results["webhook_connection"] = response.status_code == 200
            except Exception as e:
                logger.error(f"Webhook connection test failed: {e}")

        return results


# Global service instance
slack_service = SlackService()
