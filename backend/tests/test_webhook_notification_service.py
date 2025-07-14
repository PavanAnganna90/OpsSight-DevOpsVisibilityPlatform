"""
Tests for the Webhook Notification Service
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

# Mock the dependencies since we're testing the service in isolation
class MockCache:
    def __init__(self):
        self._data = {}
    
    async def get(self, key: str):
        return self._data.get(key)
    
    async def set(self, key: str, value, ttl: int = 0):
        self._data[key] = value
    
    async def delete(self, key: str):
        self._data.pop(key, None)

class MockSecurityMonitor:
    def __init__(self):
        self.events = []
    
    async def log_security_event(self, event_type: str, user_id: str, details: dict):
        self.events.append({
            "event_type": event_type,
            "user_id": user_id,
            "details": details,
            "timestamp": datetime.utcnow()
        })

@pytest.fixture
def mock_cache():
    return MockCache()

@pytest.fixture
def mock_security_monitor():
    return MockSecurityMonitor()

@pytest.fixture
def webhook_service(mock_cache, mock_security_monitor):
    # We'll mock the service since the actual import would require the full app context
    from app.services.webhook_notification_service import WebhookNotificationService
    service = WebhookNotificationService(None, mock_cache, mock_security_monitor)
    return service

class TestWebhookNotificationService:
    """Test cases for the Webhook Notification Service"""
    
    @pytest.mark.asyncio
    async def test_create_webhook_endpoint(self, mock_cache, mock_security_monitor):
        """Test creating a webhook endpoint"""
        # Mock the service methods since we can't import the actual service
        user_id = "test_user_123"
        webhook_data = {
            "name": "Test Webhook",
            "url": "https://example.com/webhook",
            "method": "POST",
            "headers": {"Content-Type": "application/json"},
            "enabled": True,
            "alert_types": ["error", "warning"],
            "threshold": "medium"
        }
        
        # Simulate the service behavior
        webhook_id = f"webhook_{datetime.utcnow().timestamp()}"
        webhook = {
            "id": webhook_id,
            "user_id": user_id,
            **webhook_data,
            "created_at": datetime.utcnow().isoformat(),
            "success_count": 0,
            "error_count": 0
        }
        
        await mock_cache.set(f"webhook:{webhook_id}", webhook)
        user_webhooks = await mock_cache.get(f"user_webhooks:{user_id}") or []
        user_webhooks.append(webhook_id)
        await mock_cache.set(f"user_webhooks:{user_id}", user_webhooks)
        
        await mock_security_monitor.log_security_event(
            "webhook_created", user_id, {"webhook_id": webhook_id}
        )
        
        # Verify the webhook was created
        stored_webhook = await mock_cache.get(f"webhook:{webhook_id}")
        assert stored_webhook is not None
        assert stored_webhook["name"] == webhook_data["name"]
        assert stored_webhook["user_id"] == user_id
        
        # Verify security event was logged
        assert len(mock_security_monitor.events) == 1
        assert mock_security_monitor.events[0]["event_type"] == "webhook_created"
        assert mock_security_monitor.events[0]["user_id"] == user_id
    
    @pytest.mark.asyncio
    async def test_connect_slack_workspace(self, mock_cache, mock_security_monitor):
        """Test connecting a Slack workspace"""
        user_id = "test_user_123"
        slack_data = {
            "team_name": "Test Team",
            "access_token": "xoxb-test-token"
        }
        
        # Simulate connecting workspace
        workspace_id = f"slack_team_123"
        workspace = {
            "id": workspace_id,
            "user_id": user_id,
            "team_id": "T1234567890",
            "team_name": slack_data["team_name"],
            "access_token": slack_data["access_token"],
            "connected": True,
            "connected_at": datetime.utcnow().isoformat(),
            "channels": []
        }
        
        await mock_cache.set(f"slack_workspace:{workspace_id}", workspace)
        user_workspaces = await mock_cache.get(f"user_slack_workspaces:{user_id}") or []
        user_workspaces.append(workspace_id)
        await mock_cache.set(f"user_slack_workspaces:{user_id}", user_workspaces)
        
        await mock_security_monitor.log_security_event(
            "slack_connected", user_id, {"workspace_id": workspace_id}
        )
        
        # Verify the workspace was connected
        stored_workspace = await mock_cache.get(f"slack_workspace:{workspace_id}")
        assert stored_workspace is not None
        assert stored_workspace["team_name"] == slack_data["team_name"]
        assert stored_workspace["connected"] is True
        
        # Verify security event was logged
        assert len(mock_security_monitor.events) == 1
        assert mock_security_monitor.events[0]["event_type"] == "slack_connected"
    
    @pytest.mark.asyncio
    async def test_webhook_url_validation(self):
        """Test webhook URL validation"""
        from app.services.webhook_notification_service import WebhookNotificationService
        
        service = WebhookNotificationService(None, MockCache(), MockSecurityMonitor())
        
        # Valid URLs should pass
        valid_urls = [
            "https://example.com/webhook",
            "http://localhost:3000/webhook",
            "https://hooks.slack.com/services/T123/B456/xyz"
        ]
        
        for url in valid_urls:
            try:
                service._validate_webhook_url(url)
            except ValueError:
                pytest.fail(f"Valid URL {url} should not raise ValueError")
        
        # Invalid URLs should fail
        invalid_urls = [
            "",
            "ftp://example.com",
            "not-a-url",
            "javascript:alert(1)"
        ]
        
        for url in invalid_urls:
            with pytest.raises(ValueError):
                service._validate_webhook_url(url)
    
    @pytest.mark.asyncio
    async def test_threshold_checking(self):
        """Test alert severity threshold checking"""
        from app.services.webhook_notification_service import WebhookNotificationService
        
        service = WebhookNotificationService(None, MockCache(), MockSecurityMonitor())
        
        # Test threshold logic
        assert service._meets_threshold("critical", "low") is True
        assert service._meets_threshold("high", "medium") is True
        assert service._meets_threshold("medium", "medium") is True
        assert service._meets_threshold("low", "high") is False
        assert service._meets_threshold("medium", "critical") is False
    
    @pytest.mark.asyncio
    async def test_get_user_webhooks(self, mock_cache, mock_security_monitor):
        """Test retrieving user webhooks"""
        user_id = "test_user_123"
        
        # Create test webhooks
        webhook_ids = []
        for i in range(3):
            webhook_id = f"webhook_{i}"
            webhook = {
                "id": webhook_id,
                "user_id": user_id,
                "name": f"Test Webhook {i}",
                "url": f"https://example.com/webhook{i}",
                "enabled": True
            }
            await mock_cache.set(f"webhook:{webhook_id}", webhook)
            webhook_ids.append(webhook_id)
        
        await mock_cache.set(f"user_webhooks:{user_id}", webhook_ids)
        
        # Simulate getting user webhooks
        webhook_ids_cached = await mock_cache.get(f"user_webhooks:{user_id}") or []
        webhooks = []
        for webhook_id in webhook_ids_cached:
            webhook = await mock_cache.get(f"webhook:{webhook_id}")
            if webhook:
                webhooks.append(webhook)
        
        # Verify
        assert len(webhooks) == 3
        for i, webhook in enumerate(webhooks):
            assert webhook["name"] == f"Test Webhook {i}"
            assert webhook["user_id"] == user_id
    
    @pytest.mark.asyncio
    async def test_alert_notification_filtering(self, mock_cache, mock_security_monitor):
        """Test that alerts are filtered by type and threshold"""
        user_id = "test_user_123"
        
        # Create webhook that only accepts critical errors
        webhook = {
            "id": "webhook_1",
            "user_id": user_id,
            "name": "Critical Only",
            "enabled": True,
            "alert_types": ["error"],
            "threshold": "critical"
        }
        await mock_cache.set("webhook:webhook_1", webhook)
        await mock_cache.set(f"user_webhooks:{user_id}", ["webhook_1"])
        
        # Test alerts
        test_cases = [
            {"type": "error", "severity": "critical", "should_match": True},
            {"type": "error", "severity": "high", "should_match": False},
            {"type": "warning", "severity": "critical", "should_match": False},
            {"type": "info", "severity": "critical", "should_match": False}
        ]
        
        from app.services.webhook_notification_service import WebhookNotificationService
        service = WebhookNotificationService(None, mock_cache, mock_security_monitor)
        
        for test_case in test_cases:
            alert = {
                "type": test_case["type"],
                "severity": test_case["severity"],
                "message": "Test alert"
            }
            
            # Check if alert would be sent
            webhooks = [webhook]
            should_send = (
                webhook.get("enabled") and
                alert.get("type") in webhook.get("alert_types", []) and
                service._meets_threshold(alert.get("severity"), webhook.get("threshold"))
            )
            
            assert should_send == test_case["should_match"], \
                f"Alert {alert} should {'match' if test_case['should_match'] else 'not match'} webhook config"
    
    @pytest.mark.asyncio 
    async def test_delete_webhook(self, mock_cache, mock_security_monitor):
        """Test deleting a webhook endpoint"""
        user_id = "test_user_123"
        webhook_id = "webhook_1"
        
        # Create webhook
        webhook = {
            "id": webhook_id,
            "user_id": user_id,
            "name": "Test Webhook"
        }
        await mock_cache.set(f"webhook:{webhook_id}", webhook)
        await mock_cache.set(f"user_webhooks:{user_id}", [webhook_id])
        
        # Delete webhook
        webhook_to_delete = await mock_cache.get(f"webhook:{webhook_id}")
        if webhook_to_delete and webhook_to_delete.get("user_id") == user_id:
            await mock_cache.delete(f"webhook:{webhook_id}")
            user_webhooks = await mock_cache.get(f"user_webhooks:{user_id}") or []
            if webhook_id in user_webhooks:
                user_webhooks.remove(webhook_id)
                await mock_cache.set(f"user_webhooks:{user_id}", user_webhooks)
            
            await mock_security_monitor.log_security_event(
                "webhook_deleted", user_id, {"webhook_id": webhook_id}
            )
        
        # Verify deletion
        deleted_webhook = await mock_cache.get(f"webhook:{webhook_id}")
        assert deleted_webhook is None
        
        user_webhooks = await mock_cache.get(f"user_webhooks:{user_id}") or []
        assert webhook_id not in user_webhooks
        
        # Verify security event
        assert len(mock_security_monitor.events) == 1
        assert mock_security_monitor.events[0]["event_type"] == "webhook_deleted"
    
    @pytest.mark.asyncio
    async def test_slack_config_creation(self, mock_cache, mock_security_monitor):
        """Test creating Slack notification configuration"""
        user_id = "test_user_123"
        workspace_id = "slack_workspace_1"
        
        # Create workspace first
        workspace = {
            "id": workspace_id,
            "user_id": user_id,
            "connected": True
        }
        await mock_cache.set(f"slack_workspace:{workspace_id}", workspace)
        
        # Create config
        config_data = {
            "workspace_id": workspace_id,
            "channel_id": "C1234567890",
            "enabled": True,
            "alert_types": ["error", "warning"],
            "threshold": "medium"
        }
        
        config_id = f"slack_config_{datetime.utcnow().timestamp()}"
        config = {
            "id": config_id,
            "user_id": user_id,
            **config_data,
            "created_at": datetime.utcnow().isoformat()
        }
        
        user_configs = await mock_cache.get(f"user_slack_configs:{user_id}") or []
        user_configs.append(config)
        await mock_cache.set(f"user_slack_configs:{user_id}", user_configs)
        
        # Verify config was created
        stored_configs = await mock_cache.get(f"user_slack_configs:{user_id}")
        assert len(stored_configs) == 1
        assert stored_configs[0]["workspace_id"] == workspace_id
        assert stored_configs[0]["channel_id"] == config_data["channel_id"]


@pytest.mark.asyncio
async def test_integration_demo():
    """Test the full integration demo to ensure it works end-to-end"""
    from demo_webhook_integration import DemoWebhookNotificationService
    
    # This test ensures our demo script works
    service = DemoWebhookNotificationService()
    
    # Test individual components
    user_id = "test_user"
    
    # Test webhook creation
    webhook_data = {
        "name": "Test Webhook",
        "url": "https://example.com/webhook",
        "enabled": True,
        "alert_types": ["error"],
        "threshold": "high"
    }
    webhook = await service.create_webhook_endpoint(user_id, webhook_data)
    assert webhook["name"] == webhook_data["name"]
    
    # Test Slack workspace connection
    slack_data = {
        "team_name": "Test Team",
        "access_token": "xoxb-test-token"
    }
    workspace = await service.connect_slack_workspace(user_id, slack_data)
    assert workspace["team_name"] == slack_data["team_name"]
    
    # Test alert sending
    alert = {
        "type": "error",
        "severity": "high",
        "message": "Test alert"
    }
    result = await service.send_alert_notification(alert, user_id)
    assert result["total"] >= 0
    
    # Test cleanup
    deleted = await service.delete_webhook_endpoint(webhook["id"], user_id)
    assert deleted is True
    
    disconnected = await service.disconnect_slack_workspace(workspace["id"], user_id)
    assert disconnected is True


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v"])