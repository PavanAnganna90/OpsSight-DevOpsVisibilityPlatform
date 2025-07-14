"""
Email notification service for sending email notifications.
Handles template rendering, SMTP delivery, and tracking.
"""

import asyncio
import logging
import smtplib
import uuid
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from typing import Dict, List, Optional, Any, Union
from jinja2 import Environment, FileSystemLoader, Template
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.notification_log import NotificationLog, DeliveryStatus

logger = logging.getLogger(__name__)


class EmailTemplate:
    """Email template wrapper for rendering dynamic content."""

    def __init__(self, template_name: str, template_dir: str = "templates/email"):
        """
        Initialize email template.

        Args:
            template_name: Name of the template file
            template_dir: Directory containing templates
        """
        self.template_name = template_name
        self.template_dir = Path(template_dir)

        # Set up Jinja2 environment
        self.env = Environment(
            loader=FileSystemLoader(self.template_dir),
            autoescape=True,
            trim_blocks=True,
            lstrip_blocks=True,
        )

        # Register custom filters
        self.env.filters["datetime"] = self._format_datetime
        self.env.filters["severity_color"] = self._get_severity_color

    def render(self, **context) -> Dict[str, str]:
        """
        Render template with provided context.

        Args:
            **context: Template variables

        Returns:
            Dict with 'html' and 'text' content
        """
        try:
            # Render HTML template
            html_template = self.env.get_template(f"{self.template_name}.html")
            html_content = html_template.render(**context)

            # Try to render text template, fallback to HTML if not found
            try:
                text_template = self.env.get_template(f"{self.template_name}.txt")
                text_content = text_template.render(**context)
            except:
                # Simple HTML to text conversion
                import re

                text_content = re.sub(r"<[^>]+>", "", html_content)
                text_content = re.sub(r"\s+", " ", text_content).strip()

            return {"html": html_content, "text": text_content}

        except Exception as e:
            logger.error(
                f"Failed to render email template {self.template_name}: {str(e)}"
            )
            raise

    @staticmethod
    def _format_datetime(
        dt: datetime, format_str: str = "%Y-%m-%d %H:%M:%S UTC"
    ) -> str:
        """Format datetime for template display."""
        if dt:
            return dt.strftime(format_str)
        return ""

    @staticmethod
    def _get_severity_color(severity: AlertSeverity) -> str:
        """Get color for alert severity."""
        color_map = {
            AlertSeverity.CRITICAL: "#FF0000",  # Red
            AlertSeverity.HIGH: "#FF8C00",  # Orange
            AlertSeverity.MEDIUM: "#FFD700",  # Yellow
            AlertSeverity.LOW: "#32CD32",  # Green
        }
        return color_map.get(severity, "#808080")


class EmailService:
    """Service for sending email notifications."""

    def __init__(self):
        """Initialize email service with SMTP configuration."""
        self.smtp_host = getattr(settings, "SMTP_HOST", "localhost")
        self.smtp_port = getattr(settings, "SMTP_PORT", 587)
        self.smtp_username = getattr(settings, "SMTP_USERNAME", None)
        self.smtp_password = getattr(settings, "SMTP_PASSWORD", None)
        self.smtp_use_tls = getattr(settings, "SMTP_USE_TLS", True)
        self.from_email = getattr(settings, "FROM_EMAIL", "noreply@opssight.io")
        self.from_name = getattr(settings, "FROM_NAME", "OpsSight Platform")

        # Rate limiting
        self.max_emails_per_minute = getattr(settings, "EMAIL_RATE_LIMIT", 60)
        self.sent_times = []

    async def send_email(
        self,
        to_email: str,
        subject: str,
        content: Union[str, Dict[str, str]],
        template_name: str = None,
        template_context: Dict[str, Any] = None,
        cc: List[str] = None,
        bcc: List[str] = None,
    ) -> Dict[str, Any]:
        """
        Send an email.

        Args:
            to_email: Recipient email address
            subject: Email subject
            content: Email content (string or dict with 'html'/'text')
            template_name: Name of template to use (optional)
            template_context: Context for template rendering (optional)
            cc: CC recipients (optional)
            bcc: BCC recipients (optional)

        Returns:
            Dict with delivery status and message ID
        """
        try:
            # Rate limiting check
            await self._check_rate_limit()

            # Prepare content
            if template_name and template_context:
                template = EmailTemplate(template_name)
                content = template.render(**template_context)
            elif isinstance(content, str):
                content = {"html": content, "text": content}

            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = formataddr((self.from_name, self.from_email))
            msg["To"] = to_email

            if cc:
                msg["Cc"] = ", ".join(cc)
            if bcc:
                msg["Bcc"] = ", ".join(bcc)

            # Add content parts
            if content.get("text"):
                text_part = MIMEText(content["text"], "plain", "utf-8")
                msg.attach(text_part)

            if content.get("html"):
                html_part = MIMEText(content["html"], "html", "utf-8")
                msg.attach(html_part)

            # Send email
            message_id = await self._send_smtp_message(
                msg, [to_email] + (cc or []) + (bcc or [])
            )

            return {
                "status": "sent",
                "message_id": message_id,
                "timestamp": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }

    async def send_alert_notification(
        self, alert: Alert, to_email: str, include_context: bool = True
    ) -> Dict[str, Any]:
        """
        Send alert notification email.

        Args:
            alert: Alert object to send
            to_email: Recipient email address
            include_context: Whether to include detailed context

        Returns:
            Dict with delivery status
        """
        try:
            # Prepare template context
            context = {
                "alert": alert,
                "alert_url": f"{settings.FRONTEND_URL}/alerts/{alert.id}",
                "dashboard_url": f"{settings.FRONTEND_URL}/dashboard",
                "include_context": include_context,
            }

            # Format subject
            severity_emoji = {
                AlertSeverity.CRITICAL: "🚨",
                AlertSeverity.HIGH: "⚠️",
                AlertSeverity.MEDIUM: "📢",
                AlertSeverity.LOW: "ℹ️",
            }
            emoji = severity_emoji.get(alert.severity, "📢")
            subject = f"{emoji} [{alert.severity.value.upper()}] {alert.title}"

            return await self.send_email(
                to_email=to_email,
                subject=subject,
                content=None,
                template_name="alert_notification",
                template_context=context,
            )

        except Exception as e:
            logger.error(
                f"Failed to send alert notification for alert {alert.id}: {str(e)}"
            )
            return {
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }

    async def send_digest_email(
        self, to_email: str, digest_data: Dict[str, Any], digest_type: str = "daily"
    ) -> Dict[str, Any]:
        """
        Send digest notification email.

        Args:
            to_email: Recipient email address
            digest_data: Aggregated notification data
            digest_type: Type of digest (daily, weekly)

        Returns:
            Dict with delivery status
        """
        try:
            # Prepare template context
            context = {
                "digest_data": digest_data,
                "digest_type": digest_type,
                "dashboard_url": f"{settings.FRONTEND_URL}/dashboard",
                "preferences_url": f"{settings.FRONTEND_URL}/settings/notifications",
            }

            # Format subject
            subject_map = {
                "daily": "📊 Daily OpsSight Digest",
                "weekly": "📈 Weekly OpsSight Summary",
            }
            subject = subject_map.get(digest_type, "📊 OpsSight Digest")

            return await self.send_email(
                to_email=to_email,
                subject=subject,
                content=None,
                template_name=f"digest_{digest_type}",
                template_context=context,
            )

        except Exception as e:
            logger.error(f"Failed to send {digest_type} digest to {to_email}: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }

    async def _check_rate_limit(self) -> None:
        """Check and enforce rate limiting."""
        now = datetime.utcnow()

        # Remove timestamps older than 1 minute
        self.sent_times = [
            sent_time
            for sent_time in self.sent_times
            if now - sent_time < timedelta(minutes=1)
        ]

        # Check if we're at the limit
        if len(self.sent_times) >= self.max_emails_per_minute:
            wait_time = 60 - (now - self.sent_times[0]).total_seconds()
            if wait_time > 0:
                logger.info(f"Email rate limiting: waiting {wait_time:.2f} seconds")
                await asyncio.sleep(wait_time)

        # Record this send time
        self.sent_times.append(now)

    async def _send_smtp_message(
        self, msg: MIMEMultipart, recipients: List[str]
    ) -> str:
        """
        Send email via SMTP.

        Args:
            msg: Email message object
            recipients: List of recipient email addresses

        Returns:
            Message ID for tracking
        """
        message_id = str(uuid.uuid4())
        msg["Message-ID"] = f"<{message_id}@{self.from_email.split('@')[1]}>"

        # Use asyncio to run SMTP in thread pool
        def _send_sync():
            if self.smtp_use_tls:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port)
                server.starttls()
            else:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port)

            if self.smtp_username and self.smtp_password:
                server.login(self.smtp_username, self.smtp_password)

            server.send_message(msg, to_addrs=recipients)
            server.quit()

            return message_id

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _send_sync)

    async def test_connection(self) -> Dict[str, Any]:
        """
        Test SMTP connection.

        Returns:
            Dict with connection status
        """
        try:

            def _test_sync():
                if self.smtp_use_tls:
                    server = smtplib.SMTP(self.smtp_host, self.smtp_port)
                    server.starttls()
                else:
                    server = smtplib.SMTP(self.smtp_host, self.smtp_port)

                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)

                server.quit()
                return True

            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, _test_sync)

            return {
                "status": "success",
                "message": "SMTP connection successful",
                "timestamp": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"SMTP connection test failed: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }
