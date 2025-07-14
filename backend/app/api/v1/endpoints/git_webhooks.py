"""
Git Webhook API Endpoints

API endpoints for receiving and processing Git provider webhooks.
Handles GitHub and GitLab webhook events with signature verification.
"""

import logging
from typing import Dict, Any, Optional

from fastapi import APIRouter, Request, HTTPException, status, Header, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_async_db

from app.services.git_webhook_service import (
    GitWebhookService,
    GitProvider,
    git_webhook_service,
)
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


class WebhookResponse(BaseModel):
    """Webhook processing response model."""

    status: str
    provider: str
    event_type: Optional[str] = None
    repository: Optional[str] = None
    processed_at: Optional[str] = None
    action: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None


@router.post("/github", response_model=WebhookResponse)
async def handle_github_webhook(
    request: Request,
    x_github_event: str = Header(..., alias="x-github-event"),
    x_github_delivery: str = Header(..., alias="x-github-delivery"),
    x_hub_signature_256: Optional[str] = Header(None, alias="x-hub-signature-256"),
    user_agent: str = Header(..., alias="user-agent"),
) -> WebhookResponse:
    """
    Handle GitHub webhook events.

    Args:
        request: FastAPI request object
        x_github_event: GitHub event type
        x_github_delivery: GitHub delivery ID
        x_hub_signature_256: GitHub signature for verification
        user_agent: User agent header

    Returns:
        WebhookResponse: Processing result
    """
    try:
        # Get raw payload
        payload_bytes = await request.body()

        # Verify signature if secret is configured
        github_secret = getattr(settings, "GITHUB_WEBHOOK_SECRET", None)
        if github_secret and x_hub_signature_256:
            if not git_webhook_service.verify_github_signature(
                payload_bytes, x_hub_signature_256, github_secret
            ):
                logger.warning(
                    f"Invalid GitHub webhook signature for delivery {x_github_delivery}"
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid webhook signature",
                )
        elif github_secret and not x_hub_signature_256:
            logger.warning(
                f"Missing GitHub webhook signature for delivery {x_github_delivery}"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing webhook signature",
            )

        # Parse JSON payload
        try:
            payload = await request.json()
        except Exception as e:
            logger.error(f"Failed to parse GitHub webhook payload: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload"
            )

        # Prepare headers
        headers = {
            "x-github-event": x_github_event,
            "x-github-delivery": x_github_delivery,
            "user-agent": user_agent,
        }

        logger.info(
            f"GitHub webhook received: {x_github_event} "
            f"(delivery: {x_github_delivery})"
        )

        # Process webhook
        result = await git_webhook_service.process_webhook(
            GitProvider.GITHUB,
            headers,
            payload,
            verify_signature=False,  # Already verified above
        )

        return WebhookResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GitHub webhook processing failed: {e}")
        return WebhookResponse(status="error", provider="github", error=str(e))


@router.post("/gitlab", response_model=WebhookResponse)
async def handle_gitlab_webhook(
    request: Request,
    x_gitlab_event: str = Header(..., alias="x-gitlab-event"),
    x_gitlab_token: Optional[str] = Header(None, alias="x-gitlab-token"),
    user_agent: str = Header(..., alias="user-agent"),
) -> WebhookResponse:
    """
    Handle GitLab webhook events.

    Args:
        request: FastAPI request object
        x_gitlab_event: GitLab event type
        x_gitlab_token: GitLab secret token for verification
        user_agent: User agent header

    Returns:
        WebhookResponse: Processing result
    """
    try:
        # Get raw payload
        payload_bytes = await request.body()

        # Verify token if secret is configured
        gitlab_secret = getattr(settings, "GITLAB_WEBHOOK_SECRET", None)
        if gitlab_secret and x_gitlab_token:
            if not git_webhook_service.verify_gitlab_signature(
                payload_bytes, x_gitlab_token, gitlab_secret
            ):
                logger.warning(
                    f"Invalid GitLab webhook token for event {x_gitlab_event}"
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid webhook token",
                )
        elif gitlab_secret and not x_gitlab_token:
            logger.warning(f"Missing GitLab webhook token for event {x_gitlab_event}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing webhook token"
            )

        # Parse JSON payload
        try:
            payload = await request.json()
        except Exception as e:
            logger.error(f"Failed to parse GitLab webhook payload: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload"
            )

        # Prepare headers
        headers = {"x-gitlab-event": x_gitlab_event, "user-agent": user_agent}

        logger.info(f"GitLab webhook received: {x_gitlab_event}")

        # Process webhook
        result = await git_webhook_service.process_webhook(
            GitProvider.GITLAB,
            headers,
            payload,
            verify_signature=False,  # Already verified above
        )

        return WebhookResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GitLab webhook processing failed: {e}")
        return WebhookResponse(status="error", provider="gitlab", error=str(e))


@router.get("/stats")
async def get_webhook_stats() -> Dict[str, Any]:
    """
    Get webhook service statistics.

    Returns:
        Webhook processing statistics and configuration
    """
    try:
        stats = await git_webhook_service.get_webhook_stats()
        return stats
    except Exception as e:
        logger.error(f"Failed to get webhook stats: {e}")
        return {"webhook_service": "error", "error": str(e)}


@router.get("/config/{provider}")
async def get_webhook_config(provider: str) -> Dict[str, Any]:
    """
    Get webhook configuration for a provider.

    Args:
        provider: Git provider (github or gitlab)

    Returns:
        Webhook configuration status
    """
    try:
        if provider.lower() == "github":
            git_provider = GitProvider.GITHUB
        elif provider.lower() == "gitlab":
            git_provider = GitProvider.GITLAB
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported provider: {provider}",
            )

        config = git_webhook_service.validate_webhook_config(git_provider)
        return config

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get webhook config for {provider}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get webhook configuration: {str(e)}",
        )


@router.post("/test/{provider}")
async def test_webhook_endpoint(
    provider: str, test_payload: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Test webhook endpoint with a sample payload.

    Args:
        provider: Git provider (github or gitlab)
        test_payload: Test webhook payload

    Returns:
        Test processing result
    """
    try:
        if provider.lower() == "github":
            git_provider = GitProvider.GITHUB
            headers = {
                "x-github-event": test_payload.get("event_type", "ping"),
                "x-github-delivery": "test-delivery-123",
            }
        elif provider.lower() == "gitlab":
            git_provider = GitProvider.GITLAB
            headers = {"x-gitlab-event": test_payload.get("event_type", "ping")}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported provider: {provider}",
            )

        # Process test webhook (without signature verification)
        result = await git_webhook_service.process_webhook(
            git_provider, headers, test_payload, verify_signature=False
        )

        return {"test_status": "success", "provider": provider, "result": result}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webhook test failed for {provider}: {e}")
        return {"test_status": "error", "provider": provider, "error": str(e)}


@router.get("/health")
async def webhook_health_check() -> Dict[str, Any]:
    """
    Health check for webhook service.

    Returns:
        Service health status
    """
    try:
        # Check cache connectivity
        cache_healthy = False
        try:
            await git_webhook_service.cache.initialize()
            cache_healthy = True
        except Exception as e:
            logger.warning(f"Cache health check failed: {e}")

        return {
            "status": "healthy",
            "webhook_service": "active",
            "cache_healthy": cache_healthy,
            "supported_providers": ["github", "gitlab"],
            "timestamp": "2023-01-01T00:00:00Z",  # Would use actual timestamp
        }

    except Exception as e:
        logger.error(f"Webhook health check failed: {e}")
        return {"status": "unhealthy", "error": str(e)}
