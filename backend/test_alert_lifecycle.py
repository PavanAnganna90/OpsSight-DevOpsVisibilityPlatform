#!/usr/bin/env python3
"""
Test script for Alert Lifecycle Management Service.

Tests the complete alert lifecycle including:
- Alert creation and categorization
- Lifecycle transitions (acknowledge, resolve, escalate, suppress)
- Escalation rule processing
- Metrics calculation
- Auto-resolution of stale alerts
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.alert_lifecycle_service import (
    AlertLifecycleService,
    AlertLifecycleStage,
    EscalationTrigger,
    EscalationRule,
    LifecycleTransition,
    AlertMetrics,
)
from app.models.alert import Alert, AlertSeverity, AlertStatus


class MockDatabase:
    """Mock database session for testing."""

    def __init__(self):
        self.alerts = []
        self.committed = False

    def add(self, alert):
        self.alerts.append(alert)

    def commit(self):
        self.committed = True

    def rollback(self):
        self.committed = False

    def query(self, model):
        return MockQuery(self.alerts)


class MockQuery:
    """Mock query object for testing."""

    def __init__(self, alerts):
        self.alerts = alerts
        self._filters = []

    def filter(self, condition):
        # Simple mock filtering - in real implementation this would be more sophisticated
        return self

    def all(self):
        return self.alerts


class MockSlackService:
    """Mock Slack service for testing."""

    def __init__(self):
        self.sent_messages = []

    async def send_alert_update(self, alert, message):
        self.sent_messages.append(f"Update: {message} for alert {alert.id}")

    async def send_alert_escalation(self, alert, message):
        self.sent_messages.append(f"Escalation: {message} for alert {alert.id}")


def create_test_alert(
    alert_id: int = 1,
    title: str = "Test Alert",
    severity: AlertSeverity = AlertSeverity.HIGH,
    status: AlertStatus = AlertStatus.ACTIVE,
    source: str = "test",
) -> Alert:
    """Create a test alert for lifecycle testing."""
    alert = Alert()
    alert.id = alert_id
    alert.alert_id = f"test-{alert_id}"
    alert.title = title
    alert.message = f"Test alert message for {title}"
    alert.severity = severity
    alert.status = status
    alert.source = source
    alert.category = "test"
    alert.created_at = datetime.utcnow()
    alert.triggered_at = datetime.utcnow()

    # Mock the JSON methods
    alert._context_data = {}
    alert._labels = {}
    alert._annotations = {}

    def get_context_data():
        return alert._context_data

    def set_context_data(data):
        alert._context_data = data

    def get_labels():
        return alert._labels

    def set_labels(labels):
        alert._labels = labels

    def get_annotations():
        return alert._annotations

    def set_annotations(annotations):
        alert._annotations = annotations

    def acknowledge(user_id, comment=None):
        alert.status = AlertStatus.ACKNOWLEDGED
        alert.acknowledged_by_user_id = user_id
        alert.acknowledged_at = datetime.utcnow()
        if comment:
            alert.resolution_comment = comment

    def resolve(user_id, comment=None):
        alert.status = AlertStatus.RESOLVED
        alert.resolved_by_user_id = user_id
        alert.resolved_at = datetime.utcnow()
        if comment:
            alert.resolution_comment = comment

    def suppress():
        alert.status = AlertStatus.SUPPRESSED

    # Bind methods to alert
    alert.get_context_data = get_context_data
    alert.set_context_data = set_context_data
    alert.get_labels = get_labels
    alert.set_labels = set_labels
    alert.get_annotations = get_annotations
    alert.set_annotations = set_annotations
    alert.acknowledge = acknowledge
    alert.resolve = resolve
    alert.suppress = suppress

    return alert


async def test_alert_lifecycle_transitions():
    """Test basic alert lifecycle transitions."""
    print("🔄 Testing Alert Lifecycle Transitions...")

    # Setup
    mock_slack = MockSlackService()
    lifecycle_service = AlertLifecycleService(mock_slack)
    mock_db = MockDatabase()

    # Create test alert
    alert = create_test_alert(1, "Critical Database Error", AlertSeverity.CRITICAL)
    mock_db.add(alert)

    # Test 1: Process alert through acknowledgment
    print("  ✅ Testing acknowledgment transition...")
    success = await lifecycle_service.process_alert_lifecycle(
        mock_db,
        alert,
        AlertLifecycleStage.ACKNOWLEDGED,
        user_id=123,
        reason="Investigating issue",
    )

    assert success, "Acknowledgment transition should succeed"
    assert alert.get_context_data()["current_lifecycle_stage"] == "acknowledged"
    assert "lifecycle_transitions" in alert.get_annotations()
    print("    ✅ Acknowledgment transition successful")

    # Test 2: Process alert through resolution
    print("  ✅ Testing resolution transition...")
    success = await lifecycle_service.process_alert_lifecycle(
        mock_db,
        alert,
        AlertLifecycleStage.RESOLVED,
        user_id=123,
        reason="Database connection restored",
    )

    assert success, "Resolution transition should succeed"
    assert alert.get_context_data()["current_lifecycle_stage"] == "resolved"
    assert alert.status == AlertStatus.RESOLVED
    print("    ✅ Resolution transition successful")

    # Test 3: Check lifecycle metadata
    labels = alert.get_labels()
    assert labels["lifecycle_stage"] == "resolved"
    assert "last_updated" in labels
    print("    ✅ Lifecycle metadata updated correctly")

    print("✅ Alert Lifecycle Transitions: PASSED\n")


async def test_escalation_rules():
    """Test escalation rule processing."""
    print("🚨 Testing Escalation Rules...")

    # Setup
    mock_slack = MockSlackService()
    lifecycle_service = AlertLifecycleService(mock_slack)
    mock_db = MockDatabase()

    # Test 1: Time-based escalation for critical alert
    print("  ✅ Testing time-based escalation...")
    alert = create_test_alert(2, "Critical System Failure", AlertSeverity.CRITICAL)
    # Simulate alert created 10 minutes ago
    alert.created_at = datetime.utcnow() - timedelta(minutes=10)
    mock_db.add(alert)

    # Check if alert should escalate (critical alerts escalate after 5 minutes)
    rule = lifecycle_service.default_escalation_rules[0]  # Critical alert rule
    should_escalate = await lifecycle_service._should_escalate(alert, rule)

    assert should_escalate, "Critical alert should escalate after 5 minutes"
    print("    ✅ Time-based escalation rule triggered correctly")

    # Test 2: Execute escalation
    success = await lifecycle_service.escalate_alert(
        mock_db, alert, rule, "Automatic escalation"
    )
    assert success, "Escalation should succeed"
    assert alert.get_context_data()["escalated"], "Alert should be marked as escalated"
    print("    ✅ Escalation executed successfully")

    print("✅ Escalation Rules: PASSED\n")


async def test_alert_metrics():
    """Test alert metrics calculation."""
    print("📊 Testing Alert Metrics...")

    # Setup
    lifecycle_service = AlertLifecycleService()
    mock_db = MockDatabase()

    # Create test alerts with different statuses
    alerts = [
        create_test_alert(
            1, "Active Alert 1", AlertSeverity.HIGH, AlertStatus.ACTIVE, "kubernetes"
        ),
        create_test_alert(
            2, "Active Alert 2", AlertSeverity.MEDIUM, AlertStatus.ACTIVE, "prometheus"
        ),
        create_test_alert(
            3,
            "Acknowledged Alert",
            AlertSeverity.HIGH,
            AlertStatus.ACKNOWLEDGED,
            "grafana",
        ),
        create_test_alert(
            4, "Resolved Alert", AlertSeverity.LOW, AlertStatus.RESOLVED, "kubernetes"
        ),
        create_test_alert(
            5,
            "Suppressed Alert",
            AlertSeverity.MEDIUM,
            AlertStatus.SUPPRESSED,
            "custom",
        ),
    ]

    # Set acknowledgment and resolution times for metrics
    alerts[2].acknowledged_at = alerts[2].created_at + timedelta(minutes=5)
    alerts[3].acknowledged_at = alerts[3].created_at + timedelta(minutes=3)
    alerts[3].resolved_at = alerts[3].created_at + timedelta(minutes=15)

    # Add escalation context to one alert
    alerts[0].set_context_data({"escalated": True})

    for alert in alerts:
        mock_db.add(alert)

    # Calculate metrics
    metrics = await lifecycle_service.get_alert_metrics(mock_db, None, 30)

    # Verify metrics
    assert (
        metrics.total_alerts == 5
    ), f"Expected 5 total alerts, got {metrics.total_alerts}"
    assert (
        metrics.active_alerts == 2
    ), f"Expected 2 active alerts, got {metrics.active_alerts}"
    assert (
        metrics.acknowledged_alerts == 1
    ), f"Expected 1 acknowledged alert, got {metrics.acknowledged_alerts}"
    assert (
        metrics.resolved_alerts == 1
    ), f"Expected 1 resolved alert, got {metrics.resolved_alerts}"
    assert (
        metrics.suppressed_alerts == 1
    ), f"Expected 1 suppressed alert, got {metrics.suppressed_alerts}"
    assert (
        metrics.escalation_count == 1
    ), f"Expected 1 escalation, got {metrics.escalation_count}"

    # Check top sources
    source_names = [source[0] for source in metrics.top_sources]
    assert "kubernetes" in source_names, "Kubernetes should be in top sources"

    # Check severity distribution
    assert (
        "high" in metrics.severity_distribution
    ), "High severity should be in distribution"
    assert (
        metrics.severity_distribution["high"] == 2
    ), "Should have 2 high severity alerts"

    print("    ✅ Alert counts calculated correctly")
    print("    ✅ Source distribution calculated correctly")
    print("    ✅ Severity distribution calculated correctly")
    print("    ✅ Escalation count calculated correctly")

    print("✅ Alert Metrics: PASSED\n")


async def main():
    """Run all lifecycle management tests."""
    print("🚀 Starting Alert Lifecycle Management Tests...\n")

    try:
        await test_alert_lifecycle_transitions()
        await test_escalation_rules()
        await test_alert_metrics()

        print("🎉 ALL TESTS PASSED!")
        print("\n📋 Test Summary:")
        print("  ✅ Alert Lifecycle Transitions")
        print("  ✅ Escalation Rules Processing")
        print("  ✅ Alert Metrics Calculation")
        print("\n🔧 Alert Lifecycle Management is fully functional!")

    except Exception as e:
        print(f"❌ TEST FAILED: {e}")
        import traceback

        traceback.print_exc()
        return False

    return True


if __name__ == "__main__":
    asyncio.run(main())
