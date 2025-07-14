"""
API endpoints for webhook and Slack integrations
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_async_db
from app.core.cache import get_cache
from app.core.security_monitor import get_security_monitor
from app.core.auth.token_manager import get_current_user_from_token
from app.core.config import settings
from app.models.user import User
from app.schemas.webhook import (
    ExternalWebhookCreate,
    ExternalWebhookUpdate,
    ExternalWebhookResponse,
    ExternalWebhookTestResponse,
    SlackWorkspaceCreate,
    SlackWorkspaceResponse,
    SlackConfigCreate,
    SlackConfigResponse,
    AlertNotification
)
from app.services.webhook_notification_service import WebhookNotificationService

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


async def get_current_user(
    db: AsyncSession = Depends(get_async_db), token: str = Depends(oauth2_scheme)
) -> User:
    """
    Get the current authenticated user from JWT token.
    
    Args:
        db: Database session
        token: JWT access token
        
    Returns:
        User: The authenticated user object
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    return await get_current_user_from_token(token, db)


@router.post("/endpoints", response_model=ExternalWebhookResponse)
async def create_webhook_endpoint(
    webhook_data: ExternalWebhookCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    cache = Depends(get_cache),
    security_monitor = Depends(get_security_monitor)
):
    """Create a new webhook endpoint"""
    async with WebhookNotificationService(db, cache, security_monitor) as service:
        webhook = await service.create_webhook_endpoint(
            user_id=str(current_user.id),
            webhook_data=webhook_data.dict()
        )
        return ExternalWebhookResponse(**webhook)


@router.get("/endpoints", response_model=List[ExternalWebhookResponse])
async def get_webhook_endpoints(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    cache = Depends(get_cache),
    security_monitor = Depends(get_security_monitor)
):
    """Get all webhook endpoints for current user"""
    async with WebhookNotificationService(db, cache, security_monitor) as service:
        webhooks = await service.get_user_webhooks(str(current_user.id))
        return [ExternalWebhookResponse(**webhook) for webhook in webhooks]


@router.put("/endpoints/{webhook_id}", response_model=ExternalWebhookResponse)
async def update_webhook_endpoint(
    webhook_id: str,
    webhook_data: ExternalWebhookUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    cache = Depends(get_cache),
    security_monitor = Depends(get_security_monitor)
):
    """Update a webhook endpoint"""
    async with WebhookNotificationService(db, cache, security_monitor) as service:
        webhook = await service.update_webhook_endpoint(
            webhook_id=webhook_id,
            user_id=str(current_user.id),
            webhook_data=webhook_data.dict(exclude_unset=True)
        )
        return ExternalWebhookResponse(**webhook)


@router.delete("/endpoints/{webhook_id}")
async def delete_webhook_endpoint(
    webhook_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    cache = Depends(get_cache),
    security_monitor = Depends(get_security_monitor)
):
    """Delete a webhook endpoint"""
    async with WebhookNotificationService(db, cache, security_monitor) as service:
        success = await service.delete_webhook_endpoint(
            webhook_id=webhook_id,
            user_id=str(current_user.id)
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Webhook endpoint not found"
            )
        return {"detail": "Webhook endpoint deleted successfully"}


@router.post("/endpoints/{webhook_id}/test", response_model=ExternalWebhookTestResponse)
async def test_webhook_endpoint(
    webhook_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    cache = Depends(get_cache),
    security_monitor = Depends(get_security_monitor)
):
    """Test a webhook endpoint"""
    async with WebhookNotificationService(db, cache, security_monitor) as service:
        result = await service.test_webhook_endpoint(
            webhook_id=webhook_id,
            user_id=str(current_user.id)
        )
        return ExternalWebhookTestResponse(**result)


# Slack endpoints
@router.post("/slack/connect", response_model=SlackWorkspaceResponse)
async def connect_slack_workspace(
    slack_data: SlackWorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    cache = Depends(get_cache),
    security_monitor = Depends(get_security_monitor)
):
    """Connect a Slack workspace"""
    async with WebhookNotificationService(db, cache, security_monitor) as service:
        workspace = await service.connect_slack_workspace(
            user_id=str(current_user.id),
            slack_data=slack_data.dict()
        )
        return SlackWorkspaceResponse(**workspace)


@router.get("/slack/workspaces", response_model=List[SlackWorkspaceResponse])
async def get_slack_workspaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    cache = Depends(get_cache),
    security_monitor = Depends(get_security_monitor)
):
    """Get all connected Slack workspaces"""
    async with WebhookNotificationService(db, cache, security_monitor) as service:
        workspaces = await service.get_user_slack_workspaces(str(current_user.id))
        return [SlackWorkspaceResponse(**workspace) for workspace in workspaces]


@router.delete("/slack/workspaces/{workspace_id}")
async def disconnect_slack_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    cache = Depends(get_cache),
    security_monitor = Depends(get_security_monitor)
):
    """Disconnect a Slack workspace"""
    async with WebhookNotificationService(db, cache, security_monitor) as service:
        success = await service.disconnect_slack_workspace(
            workspace_id=workspace_id,
            user_id=str(current_user.id)
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Slack workspace not found"
            )
        return {"detail": "Slack workspace disconnected successfully"}


@router.post("/slack/configs", response_model=SlackConfigResponse)
async def create_slack_config(
    config_data: SlackConfigCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    cache = Depends(get_cache),
    security_monitor = Depends(get_security_monitor)
):
    """Create a Slack notification configuration"""
    async with WebhookNotificationService(db, cache, security_monitor) as service:
        config = await service.create_slack_notification_config(
            user_id=str(current_user.id),
            config_data=config_data.dict()
        )
        return SlackConfigResponse(**config)


@router.get("/slack/configs", response_model=List[SlackConfigResponse])
async def get_slack_configs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    cache = Depends(get_cache),
    security_monitor = Depends(get_security_monitor)
):
    """Get all Slack notification configurations"""
    async with WebhookNotificationService(db, cache, security_monitor) as service:
        configs = await service.get_user_slack_configs(str(current_user.id))
        return [SlackConfigResponse(**config) for config in configs]


# OAuth callback endpoint for Slack
@router.get("/slack/oauth/callback")
async def slack_oauth_callback(
    code: str,
    state: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db),
    cache = Depends(get_cache),
    security_monitor = Depends(get_security_monitor)
):
    """Handle Slack OAuth callback"""
    # In a real implementation, this would:
    # 1. Exchange the code for an access token
    # 2. Verify the state parameter for security
    # 3. Store the access token securely
    # 4. Return a success page or redirect
    
    # For now, we'll return a simple response
    return {
        "detail": "Slack OAuth callback received",
        "code": code,
        "state": state
    }


# Send test alert
@router.post("/test-alert")
async def send_test_alert(
    alert: AlertNotification,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    cache = Depends(get_cache),
    security_monitor = Depends(get_security_monitor)
):
    """Send a test alert to all configured channels"""
    async with WebhookNotificationService(db, cache, security_monitor) as service:
        result = await service.send_alert_notification(
            alert=alert.dict(),
            user_id=str(current_user.id)
        )
        return result