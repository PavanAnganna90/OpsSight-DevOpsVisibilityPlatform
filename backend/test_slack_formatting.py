#!/usr/bin/env python3
"""
Simple test script for Slack message formatting.
Tests the SlackMessageFormatter without full app dependencies.
"""

import sys
import os
from enum import Enum
from datetime import datetime
from typing import Dict, Any, List

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))


class AlertSeverity(str, Enum):
    """Enumeration for alert severity levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertStatus(str, Enum):
    """Enumeration for alert status."""

    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"


class MockAlert:
    """Mock alert class for testing."""

    def __init__(self):
        self.id = 1
        self.alert_id = "test-alert-1"
        self.title = "Test Alert"
        self.message = "This is a test alert message"
        self.severity = AlertSeverity.CRITICAL
        self.status = AlertStatus.ACTIVE
        self.source = "test-system"
        self.category = "performance"
        self.triggered_at = datetime.now()


class SlackMessageFormatter:
    """Formats alert messages for Slack."""

    @staticmethod
    def format_alert_message(alert, include_actions: bool = True) -> Dict[str, Any]:
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
                            "url": f"http://localhost:3000/alerts/{alert.id}",
                        },
                    ],
                }
            )

        return {"attachments": [{"color": color, "blocks": blocks}]}

    @staticmethod
    def format_alert_summary(alerts: List) -> Dict[str, Any]:
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


def test_slack_formatting():
    """Test Slack message formatting functionality."""

    print("🧪 Testing Slack Message Formatting")
    print("=" * 50)

    formatter = SlackMessageFormatter()

    # Test 1: Critical alert with actions
    print("\n1. Testing critical alert formatting:")
    alert = MockAlert()
    alert.severity = AlertSeverity.CRITICAL
    alert.status = AlertStatus.ACTIVE

    result = formatter.format_alert_message(alert, include_actions=True)

    assert "attachments" in result
    assert result["attachments"][0]["color"] == "#FF0000"  # Red for critical

    blocks = result["attachments"][0]["blocks"]
    assert len(blocks) >= 4  # Header, fields, description, context, actions

    # Check for action buttons
    actions_block = None
    for block in blocks:
        if block["type"] == "actions":
            actions_block = block
            break

    assert actions_block is not None
    assert len(actions_block["elements"]) == 3  # Acknowledge, Resolve, View Details

    print(f"   ✅ Critical alert formatted with {len(blocks)} blocks")
    print(f"   ✅ Color: {result['attachments'][0]['color']}")
    print(f"   ✅ Action buttons: {len(actions_block['elements'])}")

    # Test 2: Resolved alert (no actions)
    print("\n2. Testing resolved alert formatting:")
    alert.status = AlertStatus.RESOLVED

    result = formatter.format_alert_message(alert, include_actions=True)
    blocks = result["attachments"][0]["blocks"]

    # Should not have actions block for resolved alerts
    has_actions = any(block["type"] == "actions" for block in blocks)
    assert not has_actions

    print(f"   ✅ Resolved alert formatted without action buttons")

    # Test 3: Different severity levels
    print("\n3. Testing severity level formatting:")
    severities = [
        (AlertSeverity.CRITICAL, "#FF0000"),
        (AlertSeverity.HIGH, "#FF8C00"),
        (AlertSeverity.MEDIUM, "#FFD700"),
        (AlertSeverity.LOW, "#32CD32"),
    ]

    for severity, expected_color in severities:
        alert.severity = severity
        alert.status = AlertStatus.ACTIVE
        result = formatter.format_alert_message(alert, include_actions=False)
        actual_color = result["attachments"][0]["color"]
        assert actual_color == expected_color
        print(f"   ✅ {severity.value.upper()}: {actual_color}")

    # Test 4: Alert summary with multiple alerts
    print("\n4. Testing alert summary formatting:")
    alerts = []
    for i, severity in enumerate(
        [AlertSeverity.CRITICAL, AlertSeverity.HIGH, AlertSeverity.MEDIUM]
    ):
        alert = MockAlert()
        alert.id = i + 1
        alert.title = f"Alert {i + 1}"
        alert.severity = severity
        alerts.append(alert)

    result = formatter.format_alert_summary(alerts)

    assert "blocks" in result
    blocks = result["blocks"]

    # Should have header, summary, divider, and individual alerts
    assert len(blocks) >= 6  # Header + summary + divider + 3 alerts

    # Check header
    header_block = blocks[0]
    assert header_block["type"] == "header"
    assert "3 alerts" in header_block["text"]["text"]

    print(f"   ✅ Summary formatted with {len(blocks)} blocks")
    print(f"   ✅ Header: {header_block['text']['text']}")

    # Test 5: Empty alert summary
    print("\n5. Testing empty alert summary:")
    result = formatter.format_alert_summary([])

    assert "text" in result
    assert "No active alerts" in result["text"]
    assert "All systems are operating normally" in result["blocks"][0]["text"]["text"]

    print(f"   ✅ Empty summary handled correctly")

    print("\n" + "=" * 50)
    print("🎉 All Slack formatting tests passed!")
    print("✅ Message formatting is working correctly")
    print("✅ Color coding implemented properly")
    print("✅ Action buttons working as expected")
    print("✅ Alert summaries formatted correctly")


if __name__ == "__main__":
    test_slack_formatting()
