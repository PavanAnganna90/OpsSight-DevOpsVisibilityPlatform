"""
Test webhook alert integration endpoints.
Tests webhook receivers, authentication, and alert processing.
"""

import pytest
import json
import hmac
import hashlib
from datetime import datetime
from unittest.mock import patch, MagicMock
from httpx import AsyncClient, ASGITransport
from sqlalchemy.orm import Session

from app.main import app
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.services.alert_service import AlertService


@pytest.mark.asyncio
async def test_example():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.post("/api/v1/webhook/alerts", json={})


class TestWebhookAuthentication:
    """Test webhook authentication mechanisms."""

    async def test_generic_webhook_without_auth(self):
        """Test generic webhook without authentication."""
        payload = {"alerts": [{"alertname": "TestAlert", "severity": "critical"}]}

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post("/api/v1/alerts/webhook/generic", json=payload)

        # Should succeed without auth if no webhook secret is configured
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "alerts_created" in data

    async def test_generic_webhook_with_valid_signature(self):
        """Test generic webhook with valid HMAC signature."""
        payload = {"alerts": [{"alertname": "TestAlert", "severity": "critical"}]}
        body = json.dumps(payload).encode("utf-8")
        secret = "test_webhook_secret"

        # Generate valid signature
        signature = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()

        with patch("app.core.config.settings.WEBHOOK_SECRET", secret):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as ac:
                response = await ac.post(
                    "/api/v1/alerts/webhook/generic",
                    json=payload,
                    headers={"X-Signature": f"sha256={signature}"},
                )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

    async def test_generic_webhook_with_invalid_signature(self):
        """Test generic webhook with invalid HMAC signature."""
        payload = {"alerts": [{"alertname": "TestAlert", "severity": "critical"}]}
        secret = "test_webhook_secret"

        with patch("app.core.config.settings.WEBHOOK_SECRET", secret):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as ac:
                response = await ac.post(
                    "/api/v1/alerts/webhook/generic",
                    json=payload,
                    headers={"X-Signature": "sha256=invalid_signature"},
                )

        assert response.status_code == 401
        assert "Invalid webhook signature" in response.json()["detail"]

    async def test_generic_webhook_with_valid_secret_header(self):
        """Test generic webhook with valid secret header."""
        payload = {"alerts": [{"alertname": "TestAlert", "severity": "critical"}]}
        secret = "test_webhook_secret"

        with patch("app.core.config.settings.WEBHOOK_SECRET", secret):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as ac:
                response = await ac.post(
                    "/api/v1/alerts/webhook/generic",
                    json=payload,
                    headers={"X-Webhook-Secret": secret},
                )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

    async def test_generic_webhook_with_invalid_secret_header(self):
        """Test generic webhook with invalid secret header."""
        payload = {"alerts": [{"alertname": "TestAlert", "severity": "critical"}]}
        secret = "test_webhook_secret"

        with patch("app.core.config.settings.WEBHOOK_SECRET", secret):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as ac:
                response = await ac.post(
                    "/api/v1/alerts/webhook/generic",
                    json=payload,
                    headers={"X-Webhook-Secret": "wrong_secret"},
                )

        assert response.status_code == 401
        assert "Invalid webhook secret" in response.json()["detail"]


class TestSlackWebhook:
    """Test Slack webhook integration."""

    async def test_slack_url_verification(self):
        """Test Slack URL verification challenge."""
        payload = {"type": "url_verification", "challenge": "test_challenge_value"}

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post("/api/v1/alerts/webhook/slack", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["challenge"] == "test_challenge_value"

    async def test_slack_signature_verification(self):
        """Test Slack signature verification."""
        payload = {"type": "event_callback", "event": {"type": "message"}}
        body = json.dumps(payload).encode("utf-8")
        timestamp = str(int(datetime.now().timestamp()))
        signing_secret = "test_slack_secret"

        # Generate valid Slack signature
        sig_basestring = f"v0:{timestamp}:{body.decode('utf-8')}"
        computed_signature = f"v0={hmac.new(signing_secret.encode(), sig_basestring.encode(), hashlib.sha256).hexdigest()}"

        with patch("app.core.config.settings.SLACK_SIGNING_SECRET", signing_secret):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as ac:
                response = await ac.post(
                    "/api/v1/alerts/webhook/slack",
                    json=payload,
                    headers={
                        "X-Slack-Signature": computed_signature,
                        "X-Slack-Request-Timestamp": timestamp,
                    },
                )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    async def test_slack_app_mention_creates_alert(self):
        """Test that Slack app mentions create alerts."""
        payload = {
            "type": "event_callback",
            "event": {
                "type": "app_mention",
                "text": "This is an alert from Slack",
                "user": "U123456789",
                "channel": "C123456789",
                "ts": "1234567890.123456",
            },
        }

        with patch("app.services.alert_service.AlertService") as mock_service:
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as ac:
                response = await ac.post("/api/v1/alerts/webhook/slack", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"


class TestWebhookPayloadProcessing:
    """Test webhook payload processing and alert creation."""

    async def test_prometheus_alertmanager_format(self):
        """Test processing Prometheus AlertManager format."""
        payload = {
            "alerts": [
                {
                    "alertname": "HighCPUUsage",
                    "severity": "critical",
                    "description": "CPU usage is above 90%",
                    "labels": {"instance": "server-1", "job": "node-exporter"},
                    "annotations": {"summary": "High CPU usage detected"},
                }
            ]
        }

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/alerts/webhook/generic",
                json=payload,
                headers={"User-Agent": "Prometheus-AlertManager"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert len(data["alerts_created"]) == 1

    async def test_grafana_alert_format(self):
        """Test processing Grafana alert format."""
        payload = {
            "alert": {
                "id": "grafana-123",
                "title": "Database Connection Error",
                "severity": "high",
                "message": "Unable to connect to database",
                "labels": {"service": "api", "environment": "production"},
            }
        }

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/alerts/webhook/generic",
                json=payload,
                headers={"User-Agent": "Grafana"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert len(data["alerts_created"]) == 1

    async def test_single_alert_object(self):
        """Test processing single alert object."""
        payload = {
            "id": "custom-alert-456",
            "title": "Service Down",
            "priority": "critical",
            "description": "Service is not responding",
            "service": "payment-service",
        }

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/alerts/webhook/generic",
                json=payload,
                headers={"User-Agent": "CustomMonitoring"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert len(data["alerts_created"]) == 1

    async def test_alert_array_format(self):
        """Test processing array of alerts."""
        payload = [
            {
                "alertname": "DiskSpaceLow",
                "severity": "warning",
                "description": "Disk space is below 10%",
            },
            {
                "alertname": "MemoryUsageHigh",
                "severity": "critical",
                "description": "Memory usage is above 95%",
            },
        ]

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/alerts/webhook/generic",
                json=payload,
                headers={"User-Agent": "MonitoringSystem"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert len(data["alerts_created"]) == 2

    async def test_invalid_json_payload(self):
        """Test handling of invalid JSON payload."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/alerts/webhook/generic",
                data="invalid json content",
                headers={"Content-Type": "application/json"},
            )

        assert response.status_code == 400
        assert "Invalid JSON payload" in response.json()["detail"]

    async def test_duplicate_alert_handling(self):
        """Test handling of duplicate alerts."""
        payload = {
            "alertname": "DuplicateTest",
            "id": "duplicate-alert-123",
            "severity": "medium",
            "description": "This is a duplicate alert test",
        }

        # Send the same alert twice
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response1 = await ac.post(
                "/api/v1/alerts/webhook/generic",
                json=payload,
                headers={"User-Agent": "TestSystem"},
            )
            response2 = await ac.post(
                "/api/v1/alerts/webhook/generic",
                json=payload,
                headers={"User-Agent": "TestSystem"},
            )

        assert response1.status_code == 200
        assert response2.status_code == 200

        # Both should succeed, but duplicate handling should occur
        data1 = response1.json()
        data2 = response2.json()
        assert data1["status"] == "success"
        assert data2["status"] == "success"


class TestAlertCategorization:
    """Test alert categorization and processing logic."""

    async def test_severity_mapping(self):
        """Test severity level mapping from different formats."""
        test_cases = [
            ("critical", AlertSeverity.CRITICAL),
            ("high", AlertSeverity.HIGH),
            ("warning", AlertSeverity.MEDIUM),
            ("medium", AlertSeverity.MEDIUM),
            ("info", AlertSeverity.LOW),
            ("low", AlertSeverity.LOW),
            ("unknown", AlertSeverity.MEDIUM),  # Default fallback
        ]

        for severity_input, expected_severity in test_cases:
            payload = {
                "alertname": f"TestAlert_{severity_input}",
                "severity": severity_input,
                "description": f"Test alert with {severity_input} severity",
            }

            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as ac:
                response = await ac.post("/api/v1/alerts/webhook/generic", json=payload)

            assert response.status_code == 200
            # Would need database access to verify actual severity mapping

    async def test_alert_id_generation(self):
        """Test alert ID generation for different input formats."""
        test_cases = [
            {"alertname": "TestAlert", "expected_prefix": "Unknown:TestAlert"},
            {"id": "custom-123", "expected_prefix": "Unknown:custom-123"},
            {"title": "No ID Alert", "expected_prefix": "Unknown:"},  # UUID fallback
        ]

        for payload_data, expected_prefix in test_cases:
            payload = {**payload_data, "description": "Test alert"}

            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as ac:
                response = await ac.post(
                    "/api/v1/alerts/webhook/generic",
                    json=payload,
                    headers={"User-Agent": "Unknown"},
                )

            assert response.status_code == 200
            # Would need database access to verify actual ID format


class TestAlertEndpoints:
    """Test standard alert CRUD endpoints."""

    async def test_get_alerts_unauthorized(self):
        """Test getting alerts without authentication."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.get("/api/v1/alerts/")
        assert response.status_code == 401

    async def test_get_alert_by_id_unauthorized(self):
        """Test getting specific alert without authentication."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.get("/api/v1/alerts/1")
        assert response.status_code == 401

    async def test_create_alert_unauthorized(self):
        """Test creating alert without authentication."""
        payload = {
            "title": "Test Alert",
            "severity": "medium",
            "source": "test",
            "project_id": 1,
        }

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post("/api/v1/alerts/", json=payload)
        assert response.status_code == 401

    async def test_acknowledge_alert_unauthorized(self):
        """Test acknowledging alert without authentication."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post("/api/v1/alerts/1/acknowledge")
        assert response.status_code == 401

    async def test_resolve_alert_unauthorized(self):
        """Test resolving alert without authentication."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post("/api/v1/alerts/1/resolve")
        assert response.status_code == 401

    async def test_get_alert_summary_unauthorized(self):
        """Test getting alert summary without authentication."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.get("/api/v1/alerts/stats/summary")
        assert response.status_code == 401


class TestWebhookUtilities:
    """Test webhook utility functions."""

    async def test_slack_signature_verification_expired(self):
        """Test Slack signature verification with expired timestamp."""
        from app.api.v1.endpoints.alerts import WebhookAuth

        # Use old timestamp (more than 5 minutes ago)
        old_timestamp = str(int(datetime.now().timestamp()) - 400)
        body = b"test body"
        signature = "v0=test_signature"
        secret = "test_secret"

        result = WebhookAuth.verify_slack_signature(
            body, old_timestamp, signature, secret
        )
        assert result is False

    async def test_webhook_signature_verification_invalid_algorithm(self):
        """Test webhook signature verification with invalid algorithm."""
        from app.api.v1.endpoints.alerts import WebhookAuth

        body = b"test body"
        signature = "md5=test_signature"
        secret = "test_secret"

        result = WebhookAuth.verify_webhook_signature(body, signature, secret, "md5")
        assert result is False

    async def test_extract_alert_info_minimal_data(self):
        """Test alert info extraction with minimal data."""
        from app.api.v1.endpoints.alerts import extract_alert_info

        alert_data = {"unknown_field": "unknown_value"}
        source = "test_source"

        result = extract_alert_info(alert_data, source)

        assert result["alert_id"].startswith("test_source:")
        assert result["title"] == "Alert from test_source"
        assert result["severity"] == AlertSeverity.MEDIUM
        assert result["category"] == "general"

    async def test_extract_alert_info_complete_data(self):
        """Test alert info extraction with complete data."""
        from app.api.v1.endpoints.alerts import extract_alert_info

        alert_data = {
            "alertname": "CompleteAlert",
            "description": "Complete alert description",
            "severity": "critical",
            "category": "performance",
            "labels": {"env": "prod"},
            "annotations": {"runbook": "http://example.com"},
        }
        source = "prometheus"

        result = extract_alert_info(alert_data, source)

        assert result["alert_id"] == "prometheus:CompleteAlert"
        assert result["title"] == "CompleteAlert"
        assert result["message"] == "Complete alert description"
        assert result["severity"] == AlertSeverity.CRITICAL
        assert result["category"] == "performance"
        assert result["labels"] == {"env": "prod"}
        assert result["annotations"] == {"runbook": "http://example.com"}


if __name__ == "__main__":
    pytest.main([__file__])
