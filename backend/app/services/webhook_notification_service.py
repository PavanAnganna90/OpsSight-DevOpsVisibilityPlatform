"""
Webhook and Slack Integration Service
Handles external notification integrations including webhooks and Slack
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from enum import Enum
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.core.logger import logger
from app.core.cache import CacheService
from app.core.security_monitor import SecurityMonitor


class NotificationType(str, Enum):
    SLACK = "slack"
    WEBHOOK = "webhook"
    EMAIL = "email"


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertType(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class WebhookNotificationService:
    """Service for managing webhook and Slack notifications"""
    
    def __init__(self, db: Session, cache: CacheService, security_monitor: SecurityMonitor):
        self.db = db
        self.cache = cache
        self.security_monitor = security_monitor
        self.http_client = httpx.AsyncClient(timeout=30.0)
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.http_client.aclose()
    
    # Webhook Management
    async def create_webhook_endpoint(
        self, 
        user_id: str, 
        webhook_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a new webhook endpoint"""
        try:
            # Validate URL
            self._validate_webhook_url(webhook_data.get("url", ""))
            
            # Create webhook endpoint record
            webhook_id = f"webhook_{datetime.utcnow().timestamp()}"
            webhook = {
                "id": webhook_id,
                "user_id": user_id,
                "name": webhook_data.get("name"),
                "url": webhook_data.get("url"),
                "method": webhook_data.get("method", "POST"),
                "headers": webhook_data.get("headers", {}),
                "enabled": webhook_data.get("enabled", True),
                "alert_types": webhook_data.get("alert_types", ["error", "warning"]),
                "threshold": webhook_data.get("threshold", "medium"),
                "retry_config": webhook_data.get("retry_config", {
                    "enabled": True,
                    "max_retries": 3,
                    "retry_delay": 1000
                }),
                "auth_config": webhook_data.get("auth_config", {"type": "none"}),
                "created_at": datetime.utcnow().isoformat(),
                "success_count": 0,
                "error_count": 0
            }
            
            # Store in cache (in production, this would be stored in database)
            await self.cache.set(f"webhook:{webhook_id}", webhook, ttl=0)
            
            # Store user's webhook list
            user_webhooks = await self.cache.get(f"user_webhooks:{user_id}") or []
            user_webhooks.append(webhook_id)
            await self.cache.set(f"user_webhooks:{user_id}", user_webhooks, ttl=0)
            
            # Log security event
            await self.security_monitor.log_security_event(
                event_type="webhook_created",
                user_id=user_id,
                details={"webhook_id": webhook_id, "url": webhook["url"]}
            )
            
            logger.info(f"Created webhook endpoint {webhook_id} for user {user_id}")
            return webhook
            
        except Exception as e:
            logger.error(f"Failed to create webhook endpoint: {str(e)}")
            raise
    
    async def update_webhook_endpoint(
        self, 
        webhook_id: str, 
        user_id: str,
        webhook_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update an existing webhook endpoint"""
        try:
            # Get existing webhook
            webhook = await self.cache.get(f"webhook:{webhook_id}")
            if not webhook or webhook.get("user_id") != user_id:
                raise ValueError("Webhook endpoint not found")
            
            # Update fields
            for field, value in webhook_data.items():
                if field not in ["id", "user_id", "created_at", "success_count", "error_count"]:
                    webhook[field] = value
            
            webhook["updated_at"] = datetime.utcnow().isoformat()
            
            # Save updated webhook
            await self.cache.set(f"webhook:{webhook_id}", webhook, ttl=0)
            
            logger.info(f"Updated webhook endpoint {webhook_id}")
            return webhook
            
        except Exception as e:
            logger.error(f"Failed to update webhook endpoint: {str(e)}")
            raise
    
    async def delete_webhook_endpoint(self, webhook_id: str, user_id: str) -> bool:
        """Delete a webhook endpoint"""
        try:
            # Get webhook to verify ownership
            webhook = await self.cache.get(f"webhook:{webhook_id}")
            if not webhook or webhook.get("user_id") != user_id:
                return False
            
            # Remove from cache
            await self.cache.delete(f"webhook:{webhook_id}")
            
            # Update user's webhook list
            user_webhooks = await self.cache.get(f"user_webhooks:{user_id}") or []
            if webhook_id in user_webhooks:
                user_webhooks.remove(webhook_id)
                await self.cache.set(f"user_webhooks:{user_id}", user_webhooks, ttl=0)
            
            # Log security event
            await self.security_monitor.log_security_event(
                event_type="webhook_deleted",
                user_id=user_id,
                details={"webhook_id": webhook_id}
            )
            
            logger.info(f"Deleted webhook endpoint {webhook_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete webhook endpoint: {str(e)}")
            raise
    
    async def get_user_webhooks(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all webhooks for a user"""
        try:
            webhook_ids = await self.cache.get(f"user_webhooks:{user_id}") or []
            webhooks = []
            
            for webhook_id in webhook_ids:
                webhook = await self.cache.get(f"webhook:{webhook_id}")
                if webhook:
                    webhooks.append(webhook)
            
            return webhooks
            
        except Exception as e:
            logger.error(f"Failed to get user webhooks: {str(e)}")
            return []
    
    async def test_webhook_endpoint(
        self, 
        webhook_id: str, 
        user_id: str
    ) -> Dict[str, Any]:
        """Test a webhook endpoint"""
        try:
            webhook = await self.cache.get(f"webhook:{webhook_id}")
            if not webhook or webhook.get("user_id") != user_id:
                raise ValueError("Webhook endpoint not found")
            
            # Create test payload
            test_payload = {
                "event": "test_notification",
                "timestamp": datetime.utcnow().isoformat(),
                "alert": {
                    "type": "info",
                    "message": "This is a test notification from OpsSight",
                    "severity": "low",
                    "source": "webhook_test"
                },
                "metadata": {
                    "test": True,
                    "webhook_id": webhook_id,
                    "webhook_name": webhook.get("name")
                }
            }
            
            # Send test request
            start_time = datetime.utcnow()
            success, response_data = await self._send_webhook_notification(
                webhook, 
                test_payload
            )
            duration = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            # Update webhook stats
            if success:
                webhook["success_count"] = webhook.get("success_count", 0) + 1
                webhook["last_used_at"] = datetime.utcnow().isoformat()
            else:
                webhook["error_count"] = webhook.get("error_count", 0) + 1
            
            await self.cache.set(f"webhook:{webhook_id}", webhook, ttl=0)
            
            result = {
                "success": success,
                "duration": duration,
                "response": response_data,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info(f"Tested webhook endpoint {webhook_id}: {'success' if success else 'failed'}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to test webhook endpoint: {str(e)}")
            raise
    
    # Slack Management
    async def connect_slack_workspace(
        self, 
        user_id: str, 
        slack_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Connect a Slack workspace"""
        try:
            # Verify Slack OAuth token
            workspace_info = await self._verify_slack_token(slack_data.get("access_token"))
            
            workspace_id = f"slack_{workspace_info['team_id']}"
            
            # Create workspace record
            workspace = {
                "id": workspace_id,
                "user_id": user_id,
                "team_id": workspace_info["team_id"],
                "team_name": workspace_info["team_name"],
                "access_token": slack_data.get("access_token"),
                "bot_user_id": workspace_info.get("bot_id"),
                "connected": True,
                "connected_at": datetime.utcnow().isoformat(),
                "channels": []
            }
            
            # Store in cache
            await self.cache.set(f"slack_workspace:{workspace_id}", workspace, ttl=0)
            
            # Update user's workspace list
            user_workspaces = await self.cache.get(f"user_slack_workspaces:{user_id}") or []
            if workspace_id not in user_workspaces:
                user_workspaces.append(workspace_id)
                await self.cache.set(f"user_slack_workspaces:{user_id}", user_workspaces, ttl=0)
            
            # Fetch channels
            await self._fetch_slack_channels(workspace)
            
            # Log security event
            await self.security_monitor.log_security_event(
                event_type="slack_connected",
                user_id=user_id,
                details={"workspace_id": workspace_id, "team_name": workspace["team_name"]}
            )
            
            logger.info(f"Connected Slack workspace {workspace_id} for user {user_id}")
            return workspace
            
        except Exception as e:
            logger.error(f"Failed to connect Slack workspace: {str(e)}")
            raise
    
    async def disconnect_slack_workspace(
        self, 
        workspace_id: str, 
        user_id: str
    ) -> bool:
        """Disconnect a Slack workspace"""
        try:
            workspace = await self.cache.get(f"slack_workspace:{workspace_id}")
            if not workspace or workspace.get("user_id") != user_id:
                return False
            
            # Revoke Slack token
            if workspace.get("access_token"):
                await self._revoke_slack_token(workspace["access_token"])
            
            # Remove from cache
            await self.cache.delete(f"slack_workspace:{workspace_id}")
            
            # Update user's workspace list
            user_workspaces = await self.cache.get(f"user_slack_workspaces:{user_id}") or []
            if workspace_id in user_workspaces:
                user_workspaces.remove(workspace_id)
                await self.cache.set(f"user_slack_workspaces:{user_id}", user_workspaces, ttl=0)
            
            # Remove associated notification configs
            user_slack_configs = await self.cache.get(f"user_slack_configs:{user_id}") or []
            configs_to_remove = [c for c in user_slack_configs if c.get("workspace_id") == workspace_id]
            for config in configs_to_remove:
                user_slack_configs.remove(config)
            await self.cache.set(f"user_slack_configs:{user_id}", user_slack_configs, ttl=0)
            
            # Log security event
            await self.security_monitor.log_security_event(
                event_type="slack_disconnected",
                user_id=user_id,
                details={"workspace_id": workspace_id}
            )
            
            logger.info(f"Disconnected Slack workspace {workspace_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to disconnect Slack workspace: {str(e)}")
            raise
    
    async def get_user_slack_workspaces(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all Slack workspaces for a user"""
        try:
            workspace_ids = await self.cache.get(f"user_slack_workspaces:{user_id}") or []
            workspaces = []
            
            for workspace_id in workspace_ids:
                workspace = await self.cache.get(f"slack_workspace:{workspace_id}")
                if workspace:
                    # Remove sensitive data
                    safe_workspace = workspace.copy()
                    safe_workspace.pop("access_token", None)
                    workspaces.append(safe_workspace)
            
            return workspaces
            
        except Exception as e:
            logger.error(f"Failed to get user Slack workspaces: {str(e)}")
            return []
    
    async def create_slack_notification_config(
        self,
        user_id: str,
        config_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a Slack notification configuration"""
        try:
            # Verify workspace ownership
            workspace_id = config_data.get("workspace_id")
            workspace = await self.cache.get(f"slack_workspace:{workspace_id}")
            if not workspace or workspace.get("user_id") != user_id:
                raise ValueError("Workspace not found or access denied")
            
            # Create config
            config = {
                "id": f"slack_config_{datetime.utcnow().timestamp()}",
                "user_id": user_id,
                "workspace_id": workspace_id,
                "channel_id": config_data.get("channel_id"),
                "enabled": config_data.get("enabled", True),
                "alert_types": config_data.get("alert_types", ["error", "warning"]),
                "threshold": config_data.get("threshold", "medium"),
                "mention_users": config_data.get("mention_users", []),
                "custom_message": config_data.get("custom_message", ""),
                "created_at": datetime.utcnow().isoformat()
            }
            
            # Store config
            user_slack_configs = await self.cache.get(f"user_slack_configs:{user_id}") or []
            user_slack_configs.append(config)
            await self.cache.set(f"user_slack_configs:{user_id}", user_slack_configs, ttl=0)
            
            logger.info(f"Created Slack notification config for user {user_id}")
            return config
            
        except Exception as e:
            logger.error(f"Failed to create Slack notification config: {str(e)}")
            raise
    
    async def get_user_slack_configs(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all Slack notification configs for a user"""
        try:
            return await self.cache.get(f"user_slack_configs:{user_id}") or []
        except Exception as e:
            logger.error(f"Failed to get user Slack configs: {str(e)}")
            return []
    
    # Notification Sending
    async def send_alert_notification(
        self, 
        alert: Dict[str, Any],
        user_id: Optional[str] = None,
        team_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send an alert notification to all configured channels"""
        try:
            results = {
                "sent": [],
                "failed": [],
                "total": 0
            }
            
            if user_id:
                # Send to user's webhooks
                webhooks = await self.get_user_webhooks(user_id)
                for webhook in webhooks:
                    if not webhook.get("enabled"):
                        continue
                    
                    if alert.get("type") in webhook.get("alert_types", []) and \
                       self._meets_threshold(alert.get("severity"), webhook.get("threshold")):
                        try:
                            success, response = await self._send_webhook_notification(webhook, alert)
                            if success:
                                results["sent"].append({
                                    "type": "webhook",
                                    "webhook_id": webhook["id"],
                                    "name": webhook["name"]
                                })
                            else:
                                results["failed"].append({
                                    "type": "webhook",
                                    "webhook_id": webhook["id"],
                                    "error": response.get("error")
                                })
                        except Exception as e:
                            results["failed"].append({
                                "type": "webhook",
                                "webhook_id": webhook["id"],
                                "error": str(e)
                            })
                
                # Send to user's Slack channels
                slack_configs = await self.get_user_slack_configs(user_id)
                for config in slack_configs:
                    if not config.get("enabled"):
                        continue
                    
                    if alert.get("type") in config.get("alert_types", []) and \
                       self._meets_threshold(alert.get("severity"), config.get("threshold")):
                        try:
                            success = await self._send_slack_alert(config, alert)
                            if success:
                                results["sent"].append({
                                    "type": "slack",
                                    "config_id": config["id"],
                                    "workspace_id": config["workspace_id"]
                                })
                            else:
                                results["failed"].append({
                                    "type": "slack",
                                    "config_id": config["id"],
                                    "error": "Failed to send Slack message"
                                })
                        except Exception as e:
                            results["failed"].append({
                                "type": "slack",
                                "config_id": config["id"],
                                "error": str(e)
                            })
            
            results["total"] = len(results["sent"]) + len(results["failed"])
            
            logger.info(
                f"Sent alert notification: {len(results['sent'])} successful, "
                f"{len(results['failed'])} failed"
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to send alert notification: {str(e)}")
            raise
    
    # Helper Methods
    async def _send_webhook_notification(
        self, 
        webhook: Dict[str, Any], 
        payload: Dict[str, Any]
    ) -> tuple[bool, Dict[str, Any]]:
        """Send a notification to a webhook endpoint"""
        try:
            # Prepare headers
            headers = webhook.get("headers", {}).copy()
            
            # Add authentication
            auth_config = webhook.get("auth_config", {})
            auth_type = auth_config.get("type", "none")
            auth = None
            
            if auth_type == "bearer" and auth_config.get("token"):
                headers["Authorization"] = f"Bearer {auth_config['token']}"
            elif auth_type == "basic":
                username = auth_config.get("username", "")
                password = auth_config.get("password", "")
                auth = httpx.BasicAuth(username, password)
            elif auth_type == "api_key":
                header_name = auth_config.get("api_key_header", "X-API-Key")
                api_key = auth_config.get("api_key", "")
                headers[header_name] = api_key
            
            # Send request with retry logic
            retry_config = webhook.get("retry_config", {})
            max_retries = retry_config.get("max_retries", 3) if retry_config.get("enabled", True) else 1
            retry_delay = retry_config.get("retry_delay", 1000) / 1000  # Convert to seconds
            
            last_error = None
            for attempt in range(max_retries):
                try:
                    response = await self.http_client.request(
                        method=webhook.get("method", "POST"),
                        url=webhook.get("url"),
                        json=payload,
                        headers=headers,
                        auth=auth
                    )
                    
                    if response.status_code < 400:
                        return True, {
                            "status": response.status_code,
                            "body": response.text
                        }
                    else:
                        last_error = f"HTTP {response.status_code}: {response.text}"
                        
                except Exception as e:
                    last_error = str(e)
                
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay)
            
            return False, {"error": last_error}
            
        except Exception as e:
            logger.error(f"Failed to send webhook notification: {str(e)}")
            return False, {"error": str(e)}
    
    async def _send_slack_alert(
        self, 
        config: Dict[str, Any], 
        alert: Dict[str, Any]
    ) -> bool:
        """Send an alert to Slack"""
        try:
            workspace = await self.cache.get(f"slack_workspace:{config['workspace_id']}")
            if not workspace or not workspace.get("connected"):
                raise ValueError("Slack workspace not connected")
            
            # Prepare Slack message
            color = {
                "low": "#36a64f",
                "medium": "#ff9900",
                "high": "#ff6600",
                "critical": "#ff0000"
            }.get(alert.get("severity", "low"), "#808080")
            
            message = {
                "channel": config.get("channel_id"),
                "attachments": [{
                    "color": color,
                    "title": f"OpsSight Alert: {alert.get('type', 'Unknown').upper()}",
                    "text": alert.get("message", "No message provided"),
                    "fields": [
                        {
                            "title": "Severity",
                            "value": alert.get("severity", "unknown").upper(),
                            "short": True
                        },
                        {
                            "title": "Source",
                            "value": alert.get("source", "Unknown"),
                            "short": True
                        }
                    ],
                    "footer": "OpsSight",
                    "ts": int(datetime.utcnow().timestamp())
                }]
            }
            
            # Add custom message if configured
            if config.get("custom_message"):
                message["text"] = config["custom_message"].format(
                    alert_type=alert.get("type", "unknown"),
                    message=alert.get("message", ""),
                    severity=alert.get("severity", "unknown"),
                    timestamp=datetime.utcnow().isoformat()
                )
            
            # Send to Slack
            response = await self.http_client.post(
                "https://slack.com/api/chat.postMessage",
                headers={
                    "Authorization": f"Bearer {workspace['access_token']}",
                    "Content-Type": "application/json"
                },
                json=message
            )
            
            result = response.json()
            return result.get("ok", False)
            
        except Exception as e:
            logger.error(f"Failed to send Slack alert: {str(e)}")
            return False
    
    async def _verify_slack_token(self, access_token: str) -> Dict[str, Any]:
        """Verify Slack OAuth token and get workspace info"""
        try:
            response = await self.http_client.post(
                "https://slack.com/api/auth.test",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )
            
            result = response.json()
            if not result.get("ok"):
                raise ValueError(f"Invalid Slack token: {result.get('error', 'Unknown error')}")
            
            return {
                "team_id": result["team_id"],
                "team_name": result["team"],
                "bot_id": result.get("bot_id")
            }
            
        except Exception as e:
            logger.error(f"Failed to verify Slack token: {str(e)}")
            raise
    
    async def _fetch_slack_channels(self, workspace: Dict[str, Any]) -> None:
        """Fetch available Slack channels"""
        try:
            response = await self.http_client.get(
                "https://slack.com/api/conversations.list",
                headers={
                    "Authorization": f"Bearer {workspace['access_token']}",
                    "Content-Type": "application/json"
                },
                params={
                    "types": "public_channel,private_channel",
                    "exclude_archived": True,
                    "limit": 200
                }
            )
            
            result = response.json()
            if result.get("ok"):
                channels = []
                for channel in result.get("channels", []):
                    channels.append({
                        "id": channel["id"],
                        "name": channel["name"],
                        "is_private": channel.get("is_private", False),
                        "member_count": channel.get("num_members", 0),
                        "purpose": channel.get("purpose", {}).get("value", "")
                    })
                
                workspace["channels"] = channels
                await self.cache.set(f"slack_workspace:{workspace['id']}", workspace, ttl=0)
                
        except Exception as e:
            logger.error(f"Failed to fetch Slack channels: {str(e)}")
    
    async def _revoke_slack_token(self, access_token: str) -> None:
        """Revoke Slack OAuth token"""
        try:
            await self.http_client.post(
                "https://slack.com/api/auth.revoke",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )
        except Exception as e:
            logger.error(f"Failed to revoke Slack token: {str(e)}")
    
    def _validate_webhook_url(self, url: str) -> None:
        """Validate webhook URL"""
        if not url:
            raise ValueError("Webhook URL is required")
        
        if not url.startswith(("http://", "https://")):
            raise ValueError("Webhook URL must start with http:// or https://")
        
        # Additional validation can be added here
        # e.g., check against blocklist, validate domain, etc.
    
    def _meets_threshold(self, severity: str, threshold: str) -> bool:
        """Check if alert severity meets notification threshold"""
        severity_levels = {
            "low": 1,
            "medium": 2,
            "high": 3,
            "critical": 4
        }
        
        alert_level = severity_levels.get(severity, 1)
        threshold_level = severity_levels.get(threshold, 1)
        
        return alert_level >= threshold_level