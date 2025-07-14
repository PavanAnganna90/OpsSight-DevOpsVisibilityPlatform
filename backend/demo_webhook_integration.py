#!/usr/bin/env python3
"""
Demo script for Webhook and Slack Integration
Shows how to use the webhook notification service
"""

import asyncio
import json
from datetime import datetime
from typing import Dict, Any

# This would normally be imported from your app
class MockCache:
    def __init__(self):
        self._data = {}
    
    async def get(self, key: str):
        return self._data.get(key)
    
    async def set(self, key: str, value: Any, ttl: int = 0):
        self._data[key] = value
    
    async def delete(self, key: str):
        self._data.pop(key, None)

class MockSecurityMonitor:
    async def log_security_event(self, event_type: str, user_id: str, details: Dict[str, Any]):
        print(f"Security Event: {event_type} for user {user_id}: {details}")

# Mock the service for demonstration
class DemoWebhookNotificationService:
    def __init__(self):
        self.cache = MockCache()
        self.security_monitor = MockSecurityMonitor()
    
    async def demo_webhook_integration(self):
        """Demonstrate webhook integration functionality"""
        print("🔗 Webhook and Slack Integration Demo")
        print("=" * 50)
        
        user_id = "demo_user_123"
        
        # 1. Create a webhook endpoint
        print("\n1. Creating webhook endpoint...")
        webhook_data = {
            "name": "Production Alerts",
            "url": "https://hooks.slack.com/services/example",
            "method": "POST",
            "headers": {"Content-Type": "application/json"},
            "enabled": True,
            "alert_types": ["error", "critical"],
            "threshold": "high",
            "retry_config": {
                "enabled": True,
                "max_retries": 3,
                "retry_delay": 1000
            },
            "auth_config": {
                "type": "bearer",
                "token": "your_api_token_here"
            }
        }
        
        webhook = await self.create_webhook_endpoint(user_id, webhook_data)
        print(f"✅ Created webhook: {webhook['name']} ({webhook['id']})")
        
        # 2. Connect Slack workspace
        print("\n2. Connecting Slack workspace...")
        slack_data = {
            "team_name": "DevOps Team",
            "access_token": "xoxb-mock-token-for-demo"
        }
        
        workspace = await self.connect_slack_workspace(user_id, slack_data)
        print(f"✅ Connected Slack workspace: {workspace['team_name']} ({workspace['id']})")
        
        # 3. Create Slack notification config
        print("\n3. Creating Slack notification configuration...")
        slack_config_data = {
            "workspace_id": workspace["id"],
            "channel_id": "C1234567890",
            "enabled": True,
            "alert_types": ["error", "warning", "critical"],
            "threshold": "medium",
            "mention_users": ["@channel"],
            "custom_message": "🚨 OpsSight Alert: {alert_type} - {message}"
        }
        
        slack_config = await self.create_slack_notification_config(user_id, slack_config_data)
        print(f"✅ Created Slack config: {slack_config['id']}")
        
        # 4. Send test alert
        print("\n4. Sending test alert...")
        test_alert = {
            "type": "error",
            "severity": "high",
            "message": "Database connection failed - high error rate detected",
            "source": "database_monitor",
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": {
                "host": "db-prod-01",
                "error_rate": "15%",
                "affected_services": ["api", "web"]
            }
        }
        
        result = await self.send_alert_notification(test_alert, user_id=user_id)
        print(f"✅ Alert sent to {result['total']} channels:")
        for sent in result['sent']:
            print(f"   📤 {sent['type']}: {sent.get('name', sent.get('workspace_id', 'unknown'))}")
        for failed in result['failed']:
            print(f"   ❌ {failed['type']}: {failed.get('error', 'unknown error')}")
        
        # 5. Test webhook endpoint
        print("\n5. Testing webhook endpoint...")
        test_result = await self.test_webhook_endpoint(webhook['id'], user_id)
        print(f"✅ Webhook test {'succeeded' if test_result['success'] else 'failed'}")
        print(f"   Duration: {test_result['duration']:.2f}ms")
        
        # 6. Get user's integrations
        print("\n6. Listing user integrations...")
        webhooks = await self.get_user_webhooks(user_id)
        slack_workspaces = await self.get_user_slack_workspaces(user_id)
        slack_configs = await self.get_user_slack_configs(user_id)
        
        print(f"   📌 Webhooks: {len(webhooks)}")
        print(f"   📌 Slack workspaces: {len(slack_workspaces)}")
        print(f"   📌 Slack configs: {len(slack_configs)}")
        
        # 7. Update webhook configuration
        print("\n7. Updating webhook configuration...")
        updated_webhook = await self.update_webhook_endpoint(
            webhook['id'], 
            user_id, 
            {"enabled": False, "threshold": "critical"}
        )
        print(f"✅ Updated webhook: enabled={updated_webhook['enabled']}, threshold={updated_webhook['threshold']}")
        
        # 8. Clean up
        print("\n8. Cleaning up demo data...")
        await self.delete_webhook_endpoint(webhook['id'], user_id)
        await self.disconnect_slack_workspace(workspace['id'], user_id)
        print("✅ Demo data cleaned up")
        
        print("\n🎉 Demo completed successfully!")
        print("\nThis demo showed:")
        print("  • Creating and managing webhook endpoints")
        print("  • Connecting Slack workspaces")
        print("  • Configuring notification rules")
        print("  • Sending alerts to multiple channels")
        print("  • Testing and monitoring integrations")
    
    async def create_webhook_endpoint(self, user_id: str, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        webhook_id = f"webhook_{datetime.utcnow().timestamp()}"
        webhook = {
            "id": webhook_id,
            "user_id": user_id,
            **webhook_data,
            "created_at": datetime.utcnow().isoformat(),
            "success_count": 0,
            "error_count": 0
        }
        await self.cache.set(f"webhook:{webhook_id}", webhook)
        
        user_webhooks = await self.cache.get(f"user_webhooks:{user_id}") or []
        user_webhooks.append(webhook_id)
        await self.cache.set(f"user_webhooks:{user_id}", user_webhooks)
        
        await self.security_monitor.log_security_event(
            "webhook_created", user_id, {"webhook_id": webhook_id}
        )
        
        return webhook
    
    async def connect_slack_workspace(self, user_id: str, slack_data: Dict[str, Any]) -> Dict[str, Any]:
        workspace_id = f"slack_team_123"
        workspace = {
            "id": workspace_id,
            "user_id": user_id,
            "team_id": "T1234567890",
            "team_name": slack_data["team_name"],
            "access_token": slack_data["access_token"],
            "connected": True,
            "connected_at": datetime.utcnow().isoformat(),
            "channels": [
                {
                    "id": "C1234567890",
                    "name": "alerts",
                    "is_private": False,
                    "member_count": 25,
                    "purpose": "System alerts and notifications"
                },
                {
                    "id": "C0987654321",
                    "name": "devops",
                    "is_private": False,
                    "member_count": 15,
                    "purpose": "DevOps discussions"
                }
            ]
        }
        await self.cache.set(f"slack_workspace:{workspace_id}", workspace)
        
        user_workspaces = await self.cache.get(f"user_slack_workspaces:{user_id}") or []
        user_workspaces.append(workspace_id)
        await self.cache.set(f"user_slack_workspaces:{user_id}", user_workspaces)
        
        await self.security_monitor.log_security_event(
            "slack_connected", user_id, {"workspace_id": workspace_id}
        )
        
        return workspace
    
    async def create_slack_notification_config(self, user_id: str, config_data: Dict[str, Any]) -> Dict[str, Any]:
        config_id = f"slack_config_{datetime.utcnow().timestamp()}"
        config = {
            "id": config_id,
            "user_id": user_id,
            **config_data,
            "created_at": datetime.utcnow().isoformat()
        }
        
        user_configs = await self.cache.get(f"user_slack_configs:{user_id}") or []
        user_configs.append(config)
        await self.cache.set(f"user_slack_configs:{user_id}", user_configs)
        
        return config
    
    async def send_alert_notification(self, alert: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        results = {"sent": [], "failed": [], "total": 0}
        
        # Mock sending to webhook
        webhooks = await self.get_user_webhooks(user_id)
        for webhook in webhooks:
            if webhook.get("enabled") and alert.get("type") in webhook.get("alert_types", []):
                results["sent"].append({
                    "type": "webhook",
                    "webhook_id": webhook["id"],
                    "name": webhook["name"]
                })
        
        # Mock sending to Slack
        slack_configs = await self.get_user_slack_configs(user_id)
        for config in slack_configs:
            if config.get("enabled") and alert.get("type") in config.get("alert_types", []):
                results["sent"].append({
                    "type": "slack",
                    "config_id": config["id"],
                    "workspace_id": config["workspace_id"]
                })
        
        results["total"] = len(results["sent"]) + len(results["failed"])
        return results
    
    async def test_webhook_endpoint(self, webhook_id: str, user_id: str) -> Dict[str, Any]:
        webhook = await self.cache.get(f"webhook:{webhook_id}")
        if webhook and webhook.get("user_id") == user_id:
            return {
                "success": True,
                "duration": 125.5,
                "response": {"status": 200, "body": "OK"},
                "timestamp": datetime.utcnow().isoformat()
            }
        return {"success": False, "duration": 0, "response": {}, "timestamp": datetime.utcnow().isoformat()}
    
    async def update_webhook_endpoint(self, webhook_id: str, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        webhook = await self.cache.get(f"webhook:{webhook_id}")
        if webhook and webhook.get("user_id") == user_id:
            webhook.update(updates)
            webhook["updated_at"] = datetime.utcnow().isoformat()
            await self.cache.set(f"webhook:{webhook_id}", webhook)
            return webhook
        raise ValueError("Webhook not found")
    
    async def delete_webhook_endpoint(self, webhook_id: str, user_id: str) -> bool:
        webhook = await self.cache.get(f"webhook:{webhook_id}")
        if webhook and webhook.get("user_id") == user_id:
            await self.cache.delete(f"webhook:{webhook_id}")
            user_webhooks = await self.cache.get(f"user_webhooks:{user_id}") or []
            if webhook_id in user_webhooks:
                user_webhooks.remove(webhook_id)
                await self.cache.set(f"user_webhooks:{user_id}", user_webhooks)
            await self.security_monitor.log_security_event(
                "webhook_deleted", user_id, {"webhook_id": webhook_id}
            )
            return True
        return False
    
    async def disconnect_slack_workspace(self, workspace_id: str, user_id: str) -> bool:
        workspace = await self.cache.get(f"slack_workspace:{workspace_id}")
        if workspace and workspace.get("user_id") == user_id:
            await self.cache.delete(f"slack_workspace:{workspace_id}")
            user_workspaces = await self.cache.get(f"user_slack_workspaces:{user_id}") or []
            if workspace_id in user_workspaces:
                user_workspaces.remove(workspace_id)
                await self.cache.set(f"user_slack_workspaces:{user_id}", user_workspaces)
            await self.security_monitor.log_security_event(
                "slack_disconnected", user_id, {"workspace_id": workspace_id}
            )
            return True
        return False
    
    async def get_user_webhooks(self, user_id: str) -> list:
        webhook_ids = await self.cache.get(f"user_webhooks:{user_id}") or []
        webhooks = []
        for webhook_id in webhook_ids:
            webhook = await self.cache.get(f"webhook:{webhook_id}")
            if webhook:
                webhooks.append(webhook)
        return webhooks
    
    async def get_user_slack_workspaces(self, user_id: str) -> list:
        workspace_ids = await self.cache.get(f"user_slack_workspaces:{user_id}") or []
        workspaces = []
        for workspace_id in workspace_ids:
            workspace = await self.cache.get(f"slack_workspace:{workspace_id}")
            if workspace:
                safe_workspace = workspace.copy()
                safe_workspace.pop("access_token", None)
                workspaces.append(safe_workspace)
        return workspaces
    
    async def get_user_slack_configs(self, user_id: str) -> list:
        return await self.cache.get(f"user_slack_configs:{user_id}") or []

async def main():
    """Run the webhook integration demo"""
    service = DemoWebhookNotificationService()
    await service.demo_webhook_integration()

if __name__ == "__main__":
    asyncio.run(main())