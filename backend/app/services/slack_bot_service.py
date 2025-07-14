"""
Slack bot service for two-way integration with Slack workspaces.
Handles receiving alerts from Slack and sending status updates back.
"""

import json
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

import httpx
from slack_sdk.web.async_client import AsyncWebClient
from slack_sdk.errors import SlackApiError

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.webhook_config import WebhookConfig
from app.services.alert_processing_service import alert_processor

logger = logging.getLogger(__name__)


@dataclass
class SlackMessage:
    """Data structure for Slack messages."""
    channel: str
    text: str
    user: str
    timestamp: str
    thread_ts: Optional[str] = None
    blocks: Optional[List[Dict]] = None


@dataclass
class SlackResponse:
    """Data structure for Slack API responses."""
    success: bool
    message: str
    channel: Optional[str] = None
    timestamp: Optional[str] = None
    error: Optional[str] = None


class SlackBotService:
    """Service for Slack bot integration and two-way communication."""

    def __init__(self):
        """Initialize Slack bot service."""
        self.bot_token = getattr(settings, 'SLACK_BOT_TOKEN', None)
        self.client = None
        self.user_token = getattr(settings, 'SLACK_USER_TOKEN', None)
        self.signing_secret = getattr(settings, 'SLACK_SIGNING_SECRET', None)
        
        if self.bot_token:
            self.client = AsyncWebClient(token=self.bot_token)

    async def initialize(self) -> bool:
        """Initialize the Slack bot and verify connection."""
        if not self.client:
            logger.warning("Slack bot token not configured")
            return False

        try:
            # Test the connection
            response = await self.client.auth_test()
            if response.get("ok"):
                bot_info = response.data
                logger.info(f"Slack bot connected: {bot_info.get('user')}")
                return True
            else:
                logger.error("Failed to authenticate with Slack")
                return False

        except SlackApiError as e:
            logger.error(f"Slack authentication error: {e.response['error']}")
            return False
        except Exception as e:
            logger.error(f"Failed to initialize Slack bot: {str(e)}")
            return False

    async def process_message(
        self,
        db: AsyncSession,
        message: Dict[str, Any],
        webhook_config: Optional[WebhookConfig] = None
    ) -> Optional[Alert]:
        """Process a Slack message for potential alerts."""
        try:
            slack_message = SlackMessage(
                channel=message.get('channel', ''),
                text=message.get('text', ''),
                user=message.get('user', ''),
                timestamp=message.get('ts', ''),
                thread_ts=message.get('thread_ts'),
                blocks=message.get('blocks', [])
            )

            # Skip bot messages if configured
            if webhook_config and webhook_config.get_setting('ignore_bots', True):
                if message.get('bot_id') or message.get('subtype') == 'bot_message':
                    return None

            # Check for alert keywords
            alert_keywords = self._get_alert_keywords(webhook_config)
            if not self._contains_alert_keywords(slack_message.text, alert_keywords):
                return None

            # Parse alert from message
            parsed_alert = await self._parse_slack_alert(slack_message, webhook_config)
            if not parsed_alert:
                return None

            # Create alert in database
            alert = await alert_processor.create_alert_from_webhook(
                db, parsed_alert, 'slack'
            )

            if alert:
                logger.info(f"Created alert {alert.id} from Slack message in {slack_message.channel}")
                
                # React to the original message
                await self._react_to_message(slack_message.channel, slack_message.timestamp, "eyes")
                
                # Send confirmation if configured
                if webhook_config and webhook_config.get_setting('send_confirmations', True):
                    await self._send_alert_confirmation(slack_message, alert)

            return alert

        except Exception as e:
            logger.error(f"Failed to process Slack message: {str(e)}")
            return None

    async def process_app_mention(
        self,
        db: AsyncSession,
        mention: Dict[str, Any]
    ) -> None:
        """Process app mentions for interactive commands."""
        try:
            channel = mention.get('channel')
            user = mention.get('user')
            text = mention.get('text', '').lower()
            thread_ts = mention.get('thread_ts') or mention.get('ts')

            if 'status' in text:
                await self._send_system_status(channel, thread_ts)
            elif 'alerts' in text:
                await self._send_alerts_summary(db, channel, thread_ts)
            elif 'help' in text:
                await self._send_help_message(channel, thread_ts)
            else:
                await self._send_unknown_command_message(channel, thread_ts)

        except Exception as e:
            logger.error(f"Failed to process app mention: {str(e)}")

    async def send_alert_to_slack(
        self,
        alert: Alert,
        channel: str,
        webhook_config: Optional[WebhookConfig] = None
    ) -> SlackResponse:
        """Send an alert notification to a Slack channel."""
        if not self.client:
            return SlackResponse(
                success=False,
                error="Slack client not initialized"
            )

        try:
            # Build alert message
            blocks = self._build_alert_blocks(alert)
            text = f"🚨 {alert.severity.value.upper()} Alert: {alert.title}"

            response = await self.client.chat_postMessage(
                channel=channel,
                text=text,
                blocks=blocks
            )

            if response.get("ok"):
                return SlackResponse(
                    success=True,
                    message="Alert sent to Slack",
                    channel=channel,
                    timestamp=response.data.get('ts')
                )
            else:
                return SlackResponse(
                    success=False,
                    error=response.get('error', 'Unknown error')
                )

        except SlackApiError as e:
            logger.error(f"Slack API error: {e.response['error']}")
            return SlackResponse(
                success=False,
                error=e.response['error']
            )
        except Exception as e:
            logger.error(f"Failed to send alert to Slack: {str(e)}")
            return SlackResponse(
                success=False,
                error=str(e)
            )

    async def update_alert_status_in_slack(
        self,
        alert: Alert,
        channel: str,
        message_ts: str,
        status: AlertStatus
    ) -> SlackResponse:
        """Update an alert status in a Slack message."""
        if not self.client:
            return SlackResponse(
                success=False,
                error="Slack client not initialized"
            )

        try:
            # Build updated blocks
            blocks = self._build_alert_blocks(alert, status)
            text = f"🔄 Alert Updated: {alert.title} - {status.value}"

            response = await self.client.chat_update(
                channel=channel,
                ts=message_ts,
                text=text,
                blocks=blocks
            )

            if response.get("ok"):
                return SlackResponse(
                    success=True,
                    message="Alert status updated in Slack",
                    channel=channel,
                    timestamp=message_ts
                )
            else:
                return SlackResponse(
                    success=False,
                    error=response.get('error', 'Unknown error')
                )

        except SlackApiError as e:
            logger.error(f"Slack API error: {e.response['error']}")
            return SlackResponse(
                success=False,
                error=e.response['error']
            )
        except Exception as e:
            logger.error(f"Failed to update alert in Slack: {str(e)}")
            return SlackResponse(
                success=False,
                error=str(e)
            )

    async def get_channel_history(
        self,
        channel: str,
        hours: int = 24,
        filter_keywords: Optional[List[str]] = None
    ) -> List[SlackMessage]:
        """Get recent channel history for alert monitoring."""
        if not self.client:
            return []

        try:
            # Calculate oldest timestamp
            oldest = datetime.utcnow() - timedelta(hours=hours)
            oldest_ts = str(int(oldest.timestamp()))

            response = await self.client.conversations_history(
                channel=channel,
                oldest=oldest_ts,
                limit=100
            )

            messages = []
            if response.get("ok"):
                for msg in response.data.get('messages', []):
                    text = msg.get('text', '')
                    
                    # Filter by keywords if provided
                    if filter_keywords:
                        if not any(keyword.lower() in text.lower() for keyword in filter_keywords):
                            continue

                    messages.append(SlackMessage(
                        channel=channel,
                        text=text,
                        user=msg.get('user', ''),
                        timestamp=msg.get('ts', ''),
                        thread_ts=msg.get('thread_ts'),
                        blocks=msg.get('blocks', [])
                    ))

            return messages

        except SlackApiError as e:
            logger.error(f"Failed to get channel history: {e.response['error']}")
            return []
        except Exception as e:
            logger.error(f"Failed to get channel history: {str(e)}")
            return []

    # Helper methods

    def _get_alert_keywords(self, webhook_config: Optional[WebhookConfig]) -> List[str]:
        """Get alert keywords from webhook configuration."""
        if webhook_config and webhook_config.settings:
            return webhook_config.settings.get('alert_keywords', [])
        
        # Default alert keywords
        return [
            'ALERT', 'ERROR', 'CRITICAL', 'DOWN', 'FAILED', 'INCIDENT',
            'EMERGENCY', 'OUTAGE', 'WARNING', 'ISSUE', 'PROBLEM'
        ]

    def _contains_alert_keywords(self, text: str, keywords: List[str]) -> bool:
        """Check if text contains any alert keywords."""
        text_upper = text.upper()
        return any(keyword.upper() in text_upper for keyword in keywords)

    async def _parse_slack_alert(
        self,
        message: SlackMessage,
        webhook_config: Optional[WebhookConfig]
    ) -> Optional:
        """Parse a Slack message into an alert object."""
        # This would use the existing alert_processor.parse_slack_message
        # but with additional configuration from webhook_config
        return await alert_processor.parse_slack_message({
            'text': message.text,
            'channel': message.channel,
            'user': message.user,
            'ts': message.timestamp,
            'thread_ts': message.thread_ts,
            'blocks': message.blocks
        })

    async def _react_to_message(self, channel: str, timestamp: str, emoji: str) -> None:
        """Add reaction to a message."""
        if not self.client:
            return

        try:
            await self.client.reactions_add(
                channel=channel,
                timestamp=timestamp,
                name=emoji
            )
        except Exception as e:
            logger.error(f"Failed to react to message: {str(e)}")

    async def _send_alert_confirmation(self, message: SlackMessage, alert: Alert) -> None:
        """Send confirmation that an alert was created."""
        if not self.client:
            return

        try:
            text = f"✅ Alert created: {alert.title} (ID: {alert.id})"
            
            await self.client.chat_postMessage(
                channel=message.channel,
                thread_ts=message.timestamp,
                text=text
            )
        except Exception as e:
            logger.error(f"Failed to send alert confirmation: {str(e)}")

    async def _send_system_status(self, channel: str, thread_ts: str) -> None:
        """Send system status information."""
        if not self.client:
            return

        try:
            # This would fetch actual system status
            status_text = "🟢 System Status: All systems operational"
            
            await self.client.chat_postMessage(
                channel=channel,
                thread_ts=thread_ts,
                text=status_text
            )
        except Exception as e:
            logger.error(f"Failed to send system status: {str(e)}")

    async def _send_alerts_summary(self, db: AsyncSession, channel: str, thread_ts: str) -> None:
        """Send current alerts summary."""
        if not self.client:
            return

        try:
            # Get active alerts
            active_alerts = (
                await db.execute(
                    select(Alert).filter(Alert.status == AlertStatus.ACTIVE)
                    .order_by(Alert.created_at.desc())
                    .limit(10)
                )
            ).scalars().all()

            if not active_alerts:
                text = "✅ No active alerts"
            else:
                text = f"🚨 Active Alerts ({len(active_alerts)}):\n"
                for alert in active_alerts:
                    text += f"• {alert.severity.value.upper()}: {alert.title}\n"

            await self.client.chat_postMessage(
                channel=channel,
                thread_ts=thread_ts,
                text=text
            )
        except Exception as e:
            logger.error(f"Failed to send alerts summary: {str(e)}")

    async def _send_help_message(self, channel: str, thread_ts: str) -> None:
        """Send help message with available commands."""
        if not self.client:
            return

        try:
            help_text = """
🤖 OpsSight Bot Commands:
• `@opssight status` - Get system status
• `@opssight alerts` - Get active alerts summary
• `@opssight help` - Show this help message

The bot also monitors this channel for alert keywords and will automatically create alerts when detected.
            """

            await self.client.chat_postMessage(
                channel=channel,
                thread_ts=thread_ts,
                text=help_text
            )
        except Exception as e:
            logger.error(f"Failed to send help message: {str(e)}")

    async def _send_unknown_command_message(self, channel: str, thread_ts: str) -> None:
        """Send message for unknown commands."""
        if not self.client:
            return

        try:
            text = "❓ Unknown command. Type `@opssight help` for available commands."
            
            await self.client.chat_postMessage(
                channel=channel,
                thread_ts=thread_ts,
                text=text
            )
        except Exception as e:
            logger.error(f"Failed to send unknown command message: {str(e)}")

    def _build_alert_blocks(self, alert: Alert, status: Optional[AlertStatus] = None) -> List[Dict]:
        """Build Slack blocks for alert message."""
        current_status = status or alert.status
        
        # Emoji mapping for severity
        severity_emojis = {
            AlertSeverity.LOW: "🔵",
            AlertSeverity.MEDIUM: "🟡",
            AlertSeverity.HIGH: "🟠",
            AlertSeverity.CRITICAL: "🔴"
        }

        # Status emoji mapping
        status_emojis = {
            AlertStatus.ACTIVE: "🚨",
            AlertStatus.ACKNOWLEDGED: "👁️",
            AlertStatus.RESOLVED: "✅"
        }

        emoji = severity_emojis.get(alert.severity, "⚪")
        status_emoji = status_emojis.get(current_status, "❓")

        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{emoji} {alert.severity.value.title()} Alert"
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Title:*\n{alert.title}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Status:*\n{status_emoji} {current_status.value.title()}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Source:*\n{alert.source}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Created:*\n<!date^{int(alert.created_at.timestamp())}^{'{date_short} at {time}'}|{alert.created_at}>"
                    }
                ]
            }
        ]

        if alert.description:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Description:*\n{alert.description[:500]}"
                }
            })

        # Add action buttons
        if current_status == AlertStatus.ACTIVE:
            blocks.append({
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "Acknowledge"
                        },
                        "value": f"acknowledge_{alert.id}",
                        "action_id": "acknowledge_alert"
                    },
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "Resolve"
                        },
                        "value": f"resolve_{alert.id}",
                        "action_id": "resolve_alert",
                        "style": "primary"
                    }
                ]
            })

        if alert.url:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"<{alert.url}|View Details>"
                }
            })

        return blocks


# Global service instance
slack_bot_service = SlackBotService()