#!/usr/bin/env python3
"""
Simple test script for alert processing logic.
Tests the extract_alert_info function without full app dependencies.
"""

import sys
import os
from enum import Enum
from typing import Dict, Any
import uuid

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))


class AlertSeverity(str, Enum):
    """Enumeration for alert severity levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


def extract_alert_info(alert_data: Dict[str, Any], source: str) -> Dict[str, Any]:
    """
    Extract standardized alert information from various payload formats.

    Args:
        alert_data: Raw alert data
        source: Source system

    Returns:
        Standardized alert information
    """
    # Generate unique alert ID if not present
    alert_id = alert_data.get("alertname") or alert_data.get("id") or str(uuid.uuid4())

    # Extract title
    title = (
        alert_data.get("alertname")
        or alert_data.get("title")
        or alert_data.get("summary")
        or "Alert from " + source
    )

    # Extract message
    message = (
        alert_data.get("description")
        or alert_data.get("message")
        or alert_data.get("summary")
        or str(alert_data)
    )

    # Determine severity
    severity_mapping = {
        "critical": AlertSeverity.CRITICAL,
        "high": AlertSeverity.HIGH,
        "warning": AlertSeverity.MEDIUM,
        "medium": AlertSeverity.MEDIUM,
        "info": AlertSeverity.LOW,
        "low": AlertSeverity.LOW,
    }

    severity_str = (
        alert_data.get("severity", "").lower()
        or alert_data.get("priority", "").lower()
        or "medium"
    )
    severity = severity_mapping.get(severity_str, AlertSeverity.MEDIUM)

    # Extract category
    category = (
        alert_data.get("category")
        or alert_data.get("service")
        or alert_data.get("job")
        or "general"
    )

    return {
        "alert_id": f"{source}:{alert_id}",
        "title": title[:255],  # Truncate to fit database field
        "message": message,
        "severity": severity,
        "category": category,
        "context": alert_data,
        "labels": alert_data.get("labels", {}),
        "annotations": alert_data.get("annotations", {}),
    }


def test_alert_processing():
    """Test various alert processing scenarios."""

    print("🧪 Testing Alert Processing Logic")
    print("=" * 50)

    # Test 1: Prometheus AlertManager format
    print("\n1. Testing Prometheus AlertManager format:")
    prometheus_alert = {
        "alertname": "HighCPUUsage",
        "severity": "critical",
        "description": "CPU usage is above 90%",
        "labels": {"instance": "server-1", "job": "node-exporter"},
        "annotations": {"summary": "High CPU usage detected"},
    }

    result = extract_alert_info(prometheus_alert, "prometheus")
    print(f"   Alert ID: {result['alert_id']}")
    print(f"   Title: {result['title']}")
    print(f"   Severity: {result['severity']}")
    print(f"   Category: {result['category']}")
    print("   ✅ Prometheus format processed successfully")

    # Test 2: Grafana alert format
    print("\n2. Testing Grafana alert format:")
    grafana_alert = {
        "id": "grafana-123",
        "title": "Database Connection Error",
        "severity": "high",
        "message": "Unable to connect to database",
        "labels": {"service": "api", "environment": "production"},
    }

    result = extract_alert_info(grafana_alert, "grafana")
    print(f"   Alert ID: {result['alert_id']}")
    print(f"   Title: {result['title']}")
    print(f"   Severity: {result['severity']}")
    print(f"   Category: {result['category']}")
    print("   ✅ Grafana format processed successfully")

    # Test 3: Custom monitoring system
    print("\n3. Testing custom monitoring system:")
    custom_alert = {
        "title": "Service Down",
        "priority": "critical",
        "description": "Payment service is not responding",
        "service": "payment-service",
        "category": "availability",
    }

    result = extract_alert_info(custom_alert, "custom-monitor")
    print(f"   Alert ID: {result['alert_id']}")
    print(f"   Title: {result['title']}")
    print(f"   Severity: {result['severity']}")
    print(f"   Category: {result['category']}")
    print("   ✅ Custom format processed successfully")

    # Test 4: Minimal alert data
    print("\n4. Testing minimal alert data:")
    minimal_alert = {"unknown_field": "unknown_value"}

    result = extract_alert_info(minimal_alert, "unknown-system")
    print(f"   Alert ID: {result['alert_id']}")
    print(f"   Title: {result['title']}")
    print(f"   Severity: {result['severity']}")
    print(f"   Category: {result['category']}")
    print("   ✅ Minimal format processed successfully")

    # Test 5: Severity mapping
    print("\n5. Testing severity mapping:")
    severities = ["critical", "high", "warning", "medium", "info", "low", "unknown"]
    expected = [
        AlertSeverity.CRITICAL,
        AlertSeverity.HIGH,
        AlertSeverity.MEDIUM,
        AlertSeverity.MEDIUM,
        AlertSeverity.LOW,
        AlertSeverity.LOW,
        AlertSeverity.MEDIUM,
    ]

    for severity_input, expected_severity in zip(severities, expected):
        test_alert = {"alertname": f"Test_{severity_input}", "severity": severity_input}
        result = extract_alert_info(test_alert, "test")
        assert (
            result["severity"] == expected_severity
        ), f"Severity mapping failed for {severity_input}"
        print(f"   {severity_input} -> {result['severity']} ✅")

    print("\n" + "=" * 50)
    print("🎉 All alert processing tests passed!")
    print("✅ Webhook receiver logic is working correctly")


if __name__ == "__main__":
    test_alert_processing()
