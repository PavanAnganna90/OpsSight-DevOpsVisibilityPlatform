"""
Tests for Alert Ingestion Service and API Endpoints
"""

import pytest
import json
import asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.services.alert_ingestion_service import AlertIngestionService, AlertSource
from app.models.alert import Alert
from app.core.cache import CacheService
from app.core.security_monitor import SecurityMonitor


# Test Database Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_alert_ingestion.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


class TestAlertIngestionService:
    """Test cases for AlertIngestionService"""
    
    @pytest.fixture
    def mock_db(self):
        return MagicMock()
    
    @pytest.fixture
    def mock_cache(self):
        cache = AsyncMock(spec=CacheService)
        cache.get.return_value = None
        cache.set.return_value = None
        return cache
    
    @pytest.fixture
    def mock_security_monitor(self):
        monitor = AsyncMock(spec=SecurityMonitor)
        monitor.log_security_event.return_value = None
        return monitor
    
    @pytest.fixture
    async def ingestion_service(self, mock_db, mock_cache, mock_security_monitor):
        service = AlertIngestionService(mock_db, mock_cache, mock_security_monitor)
        service.http_client = AsyncMock()
        return service
    
    @pytest.mark.asyncio
    async def test_parse_slack_alert(self, ingestion_service):
        """Test parsing Slack alert payload"""
        payload = {
            "title": "Test Slack Alert",
            "text": "Critical error in production",
            "severity": "critical",
            "channel": "#alerts",
            "user": "U123456789"
        }
        
        result = ingestion_service._parse_slack_alert(payload)
        
        assert result["title"] == "Test Slack Alert"
        assert result["description"] == "Critical error in production"
        assert result["severity"] == "critical"
        assert result["source"] == "slack"
        assert result["metadata"]["channel"] == "#alerts"
    
    @pytest.mark.asyncio
    async def test_parse_github_alert(self, ingestion_service):
        """Test parsing GitHub webhook payload"""
        payload = {
            "workflow_run": {
                "id": 123456789,
                "name": "CI Pipeline",
                "conclusion": "failure",
                "head_branch": "main",
                "head_sha": "abc123def456",
                "html_url": "https://github.com/repo/actions/runs/123456789",
                "created_at": "2024-01-16T10:00:00Z"
            },
            "repository": {
                "full_name": "company/repo"
            }
        }
        
        result = ingestion_service._parse_github_alert(payload)
        
        assert "GitHub Actions" in result["title"]
        assert result["severity"] == "high"
        assert result["source"] == "github"
        assert result["category"] == "ci_cd"
        assert result["metadata"]["workflow_run_id"] == 123456789
    
    @pytest.mark.asyncio
    async def test_parse_prometheus_alert(self, ingestion_service):
        """Test parsing Prometheus alert payload"""
        payload = {
            "alerts": [
                {
                    "labels": {
                        "alertname": "HighCPUUsage",
                        "severity": "warning",
                        "instance": "server1:9100"
                    },
                    "annotations": {
                        "description": "CPU usage is above 80%",
                        "summary": "High CPU usage detected"
                    },
                    "startsAt": "2024-01-16T10:00:00Z",
                    "status": "firing",
                    "generatorURL": "http://prometheus:9090/graph"
                }
            ]
        }
        
        result = ingestion_service._parse_prometheus_alert(payload)
        
        assert result["title"] == "HighCPUUsage"
        assert result["description"] == "CPU usage is above 80%"
        assert result["severity"] == "medium"  # warning maps to medium
        assert result["source"] == "prometheus"
        assert result["category"] == "monitoring"
    
    @pytest.mark.asyncio
    async def test_severity_normalization(self, ingestion_service):
        """Test severity normalization"""
        test_cases = [
            ("critical", "critical"),
            ("fatal", "critical"),
            ("emergency", "critical"),
            ("high", "high"),
            ("error", "high"),
            ("major", "high"),
            ("warning", "medium"),
            ("warn", "medium"),
            ("minor", "medium"),
            ("info", "low"),
            ("informational", "low"),
            ("unknown_severity", "medium")  # default
        ]
        
        for input_severity, expected_severity in test_cases:
            result = ingestion_service._normalize_severity(input_severity)
            assert result == expected_severity
    
    @pytest.mark.asyncio
    async def test_alert_fingerprint_generation(self, ingestion_service):
        """Test alert fingerprint generation for deduplication"""
        alert_data = {
            "title": "Test Alert",
            "source": "test",
            "category": "general"
        }
        
        fingerprint1 = ingestion_service._generate_alert_fingerprint(alert_data)
        fingerprint2 = ingestion_service._generate_alert_fingerprint(alert_data)
        
        # Same data should produce same fingerprint
        assert fingerprint1 == fingerprint2
        
        # Different data should produce different fingerprint
        alert_data["title"] = "Different Alert"
        fingerprint3 = ingestion_service._generate_alert_fingerprint(alert_data)
        assert fingerprint1 != fingerprint3
    
    @pytest.mark.asyncio
    async def test_duplicate_detection(self, ingestion_service):
        """Test duplicate alert detection"""
        alert_data = {
            "title": "Test Alert",
            "source": "test",
            "category": "general",
            "metadata": {"fingerprint": "test_fingerprint"}
        }
        
        # First call should not be duplicate
        ingestion_service.cache.get.return_value = None
        is_duplicate = await ingestion_service._is_duplicate_alert(alert_data)
        assert not is_duplicate
        
        # Second call should be duplicate (fingerprint exists in cache)
        ingestion_service.cache.get.return_value = True
        is_duplicate = await ingestion_service._is_duplicate_alert(alert_data)
        assert is_duplicate
    
    @pytest.mark.asyncio
    async def test_category_inference(self, ingestion_service):
        """Test automatic category inference from content"""
        test_cases = [
            ({"title": "CI pipeline failed", "description": ""}, "ci_cd"),
            ({"title": "Database connection error", "description": ""}, "database"),
            ({"title": "Network timeout", "description": ""}, "network"),
            ({"title": "Authentication failed", "description": ""}, "security"),
            ({"title": "High CPU usage", "description": ""}, "performance"),
            ({"title": "Random alert", "description": ""}, "general")
        ]
        
        for alert_data, expected_category in test_cases:
            result = ingestion_service._infer_category_from_content(alert_data)
            assert result == expected_category


class TestAlertIngestionAPI:
    """Test cases for Alert Ingestion API endpoints"""
    
    def test_webhook_endpoint_generic(self):
        """Test generic webhook endpoint"""
        payload = {
            "title": "Test Webhook Alert",
            "description": "Test alert from webhook",
            "severity": "medium",
            "source": "test_webhook"
        }
        
        with patch('app.services.alert_ingestion_service.AlertIngestionService') as mock_service:
            mock_instance = AsyncMock()
            mock_service.return_value.__aenter__.return_value = mock_instance
            mock_instance.process_webhook_alert.return_value = {
                "status": "processed",
                "alert_id": "alert_123",
                "source": "webhook"
            }
            
            response = client.post("/api/v1/alerts/webhook/test_webhook", json=payload)
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "processed"
            assert data["alert_id"] == "alert_123"
    
    def test_slack_events_endpoint(self):
        """Test Slack events endpoint"""
        # Test URL verification challenge
        payload = {
            "type": "url_verification",
            "challenge": "test_challenge_123"
        }
        
        response = client.post("/api/v1/alerts/slack/events", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["challenge"] == "test_challenge_123"
    
    def test_github_webhook_endpoint(self):
        """Test GitHub webhook endpoint"""
        payload = {
            "action": "completed",
            "workflow_run": {
                "id": 123456789,
                "name": "CI",
                "conclusion": "failure",
                "head_branch": "main",
                "head_sha": "abc123",
                "html_url": "https://github.com/repo/actions/runs/123456789"
            },
            "repository": {
                "full_name": "company/repo"
            }
        }
        
        headers = {
            "X-GitHub-Event": "workflow_run",
            "X-Hub-Signature-256": "sha256=test_signature"
        }
        
        with patch('app.services.alert_ingestion_service.AlertIngestionService') as mock_service:
            mock_instance = AsyncMock()
            mock_service.return_value.__aenter__.return_value = mock_instance
            mock_instance.process_incoming_alert.return_value = {
                "status": "processed",
                "alert_id": "alert_456",
                "source": "github"
            }
            
            response = client.post(
                "/api/v1/alerts/github/webhook", 
                json=payload,
                headers=headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "processed"
    
    def test_prometheus_webhook_endpoint(self):
        """Test Prometheus webhook endpoint"""
        payload = {
            "alerts": [
                {
                    "labels": {
                        "alertname": "HighMemoryUsage",
                        "severity": "critical"
                    },
                    "annotations": {
                        "description": "Memory usage is above 90%"
                    },
                    "startsAt": "2024-01-16T10:00:00Z"
                }
            ]
        }
        
        with patch('app.services.alert_ingestion_service.AlertIngestionService') as mock_service:
            mock_instance = AsyncMock()
            mock_service.return_value.__aenter__.return_value = mock_instance
            mock_instance.process_incoming_alert.return_value = {
                "status": "processed",
                "alert_id": "alert_789",
                "source": "prometheus"
            }
            
            response = client.post("/api/v1/alerts/prometheus/webhook", json=payload)
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "processed"
    
    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = client.get("/api/v1/alerts/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
    
    def test_supported_sources_endpoint(self):
        """Test supported sources endpoint"""
        response = client.get("/api/v1/alerts/sources")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert "slack" in data
        assert "webhook" in data
        assert "github" in data
    
    def test_invalid_webhook_payload(self):
        """Test handling of invalid webhook payload"""
        payload = {}  # Empty payload
        
        response = client.post("/api/v1/alerts/webhook/invalid", json=payload)
        assert response.status_code in [400, 500]  # Should handle gracefully
    
    def test_webhook_signature_validation(self):
        """Test webhook signature validation"""
        payload = {"test": "data"}
        
        # Test with invalid signature
        headers = {"X-Hub-Signature-256": "invalid_signature"}
        
        with patch('app.services.alert_ingestion_service.AlertIngestionService') as mock_service:
            mock_instance = AsyncMock()
            mock_service.return_value.__aenter__.return_value = mock_instance
            mock_instance.process_webhook_alert.side_effect = ValueError("Invalid payload signature")
            
            response = client.post(
                "/api/v1/alerts/webhook/test", 
                json=payload,
                headers=headers
            )
            
            assert response.status_code == 400


class TestAlertIngestionIntegration:
    """Integration tests for complete alert ingestion flow"""
    
    def setup_method(self):
        """Set up test database"""
        Base.metadata.create_all(bind=engine)
    
    def teardown_method(self):
        """Clean up test database"""
        Base.metadata.drop_all(bind=engine)
    
    @pytest.mark.asyncio
    async def test_complete_alert_flow(self):
        """Test complete alert ingestion and storage flow"""
        db = TestingSessionLocal()
        cache = AsyncMock(spec=CacheService)
        security_monitor = AsyncMock(spec=SecurityMonitor)
        
        cache.get.return_value = None  # No duplicates
        cache.set.return_value = None
        
        async with AlertIngestionService(db, cache, security_monitor) as service:
            service.webhook_service = AsyncMock()
            service.webhook_service.send_alert_notification.return_value = {
                "sent": [],
                "failed": []
            }
            
            payload = {
                "title": "Integration Test Alert",
                "description": "Test alert for integration testing",
                "severity": "high",
                "source": "test"
            }
            
            result = await service.process_incoming_alert(
                source=AlertSource.WEBHOOK,
                payload=payload,
                headers={},
                user_id="test_user"
            )
            
            assert result["status"] == "processed"
            assert "alert_id" in result
            
            # Verify alert was stored in database
            alert = db.query(Alert).filter(Alert.title == "Integration Test Alert").first()
            assert alert is not None
            assert alert.severity == "high"
            assert alert.source == "test"
        
        db.close()
    
    @pytest.mark.asyncio
    async def test_slack_event_processing(self):
        """Test Slack event processing integration"""
        db = TestingSessionLocal()
        cache = AsyncMock(spec=CacheService)
        security_monitor = AsyncMock(spec=SecurityMonitor)
        
        cache.get.return_value = None
        cache.set.return_value = None
        
        async with AlertIngestionService(db, cache, security_monitor) as service:
            service.webhook_service = AsyncMock()
            service.webhook_service.send_alert_notification.return_value = {
                "sent": [],
                "failed": []
            }
            
            # Simulate Slack message event with alert keywords
            slack_payload = {
                "type": "event_callback",
                "event": {
                    "type": "message",
                    "text": "CRITICAL: Database server is down!",
                    "channel": "C1234567890",
                    "user": "U1234567890",
                    "ts": "1642334400.000000"
                }
            }
            
            result = await service.process_slack_alert(
                payload=slack_payload,
                headers={}
            )
            
            assert result["status"] == "processed"
            
            # Verify alert was created
            alert = db.query(Alert).filter(Alert.source == "slack").first()
            assert alert is not None
            assert "Database server is down" in alert.description
        
        db.close()


if __name__ == "__main__":
    pytest.main([__file__])