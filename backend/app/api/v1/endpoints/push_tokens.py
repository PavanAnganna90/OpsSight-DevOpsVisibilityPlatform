"""
API endpoints for managing push notification tokens.
"""

from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from app.core.auth import get_current_user
from app.db.database import get_async_session
from app.models.user import User
from app.models.push_token import PushToken
from app.services.push_notification_service import push_notification_service
from app.schemas.push_token import (
    PushTokenCreate,
    PushTokenResponse,
    PushTokenList,
    TestNotificationRequest,
    TestNotificationResponse
)

router = APIRouter()


@router.post("/", response_model=PushTokenResponse, status_code=status.HTTP_201_CREATED)
async def register_push_token(
    token_data: PushTokenCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> PushTokenResponse:
    """
    Register a new push notification token for the current user.
    
    If the token already exists, it will be updated with the new information.
    """
    try:
        success = await push_notification_service.register_push_token(
            db=db,
            user_id=current_user.id,
            token=token_data.token,
            platform=token_data.platform,
            device_id=token_data.device_id,
            app_version=token_data.app_version
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to register push token"
            )
        
        # Retrieve the created/updated token
        push_token = (
            await db.execute(
                select(PushToken).filter(PushToken.token == token_data.token)
            )
        ).scalars().first()
        
        if not push_token:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Token registered but not found"
            )
        
        return PushTokenResponse.from_orm(push_token)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register push token: {str(e)}"
        )


@router.get("/", response_model=PushTokenList)
async def get_user_push_tokens(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> PushTokenList:
    """Get all push tokens for the current user."""
    try:
        push_tokens = (
            await db.execute(
                select(PushToken).filter(
                    PushToken.user_id == current_user.id
                ).order_by(PushToken.created_at.desc())
            )
        ).scalars().all()
        
        return PushTokenList(
            tokens=[PushTokenResponse.from_orm(token) for token in push_tokens],
            total=len(push_tokens)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve push tokens: {str(e)}"
        )


@router.delete("/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_push_token(
    token_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> None:
    """Delete a specific push token."""
    try:
        push_token = (
            await db.execute(
                select(PushToken).filter(
                    and_(
                        PushToken.id == token_id,
                        PushToken.user_id == current_user.id
                    )
                )
            )
        ).scalars().first()
        
        if not push_token:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Push token not found"
            )
        
        await db.delete(push_token)
        await db.commit()
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete push token: {str(e)}"
        )


@router.post("/{token_id}/deactivate", response_model=PushTokenResponse)
async def deactivate_push_token(
    token_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> PushTokenResponse:
    """Deactivate a specific push token."""
    try:
        push_token = (
            await db.execute(
                select(PushToken).filter(
                    and_(
                        PushToken.id == token_id,
                        PushToken.user_id == current_user.id
                    )
                )
            )
        ).scalars().first()
        
        if not push_token:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Push token not found"
            )
        
        push_token.deactivate()
        await db.commit()
        
        return PushTokenResponse.from_orm(push_token)
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to deactivate push token: {str(e)}"
        )


@router.post("/{token_id}/reactivate", response_model=PushTokenResponse)
async def reactivate_push_token(
    token_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> PushTokenResponse:
    """Reactivate a specific push token."""
    try:
        push_token = (
            await db.execute(
                select(PushToken).filter(
                    and_(
                        PushToken.id == token_id,
                        PushToken.user_id == current_user.id
                    )
                )
            )
        ).scalars().first()
        
        if not push_token:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Push token not found"
            )
        
        push_token.reactivate()
        await db.commit()
        
        return PushTokenResponse.from_orm(push_token)
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reactivate push token: {str(e)}"
        )


@router.post("/test", response_model=TestNotificationResponse)
async def send_test_notification(
    test_request: TestNotificationRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> TestNotificationResponse:
    """Send a test push notification to the current user's devices."""
    from app.services.push_notification_service import PushNotificationData
    
    try:
        # Create test notification
        notification = PushNotificationData(
            title=test_request.title or "🧪 Test Notification",
            body=test_request.message or "This is a test notification from OpsSight!",
            data={
                "type": "test",
                "timestamp": str(int(datetime.utcnow().timestamp())),
                "test_id": test_request.test_id or "manual_test"
            },
            category="TEAM_UPDATE",
            priority="normal"
        )
        
        # Send notification
        result = await push_notification_service.send_to_user(
            db=db,
            user_id=current_user.id,
            notification=notification
        )
        
        return TestNotificationResponse(
            success=result.get("status") == "sent",
            message=f"Test notification sent to {result.get('sent_count', 0)} devices",
            details=result
        )
        
    except Exception as e:
        return TestNotificationResponse(
            success=False,
            message=f"Failed to send test notification: {str(e)}",
            details={"error": str(e)}
        )


@router.get("/stats", response_model=Dict[str, Any])
async def get_push_token_stats(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get push token statistics for the current user."""
    try:
        push_tokens = (
            await db.execute(
                select(PushToken).filter(PushToken.user_id == current_user.id)
            )
        ).scalars().all()
        
        total_tokens = len(push_tokens)
        active_tokens = len([t for t in push_tokens if t.is_active])
        ios_tokens = len([t for t in push_tokens if t.platform == "ios"])
        android_tokens = len([t for t in push_tokens if t.platform == "android"])
        
        total_success = sum(t.success_count for t in push_tokens)
        total_failures = sum(t.failure_count for t in push_tokens)
        total_attempts = total_success + total_failures
        
        success_rate = (total_success / total_attempts) if total_attempts > 0 else 0.0
        
        return {
            "total_tokens": total_tokens,
            "active_tokens": active_tokens,
            "inactive_tokens": total_tokens - active_tokens,
            "platforms": {
                "ios": ios_tokens,
                "android": android_tokens
            },
            "delivery_stats": {
                "total_attempts": total_attempts,
                "successful_deliveries": total_success,
                "failed_deliveries": total_failures,
                "success_rate": round(success_rate, 3)
            },
            "healthy_tokens": len([t for t in push_tokens if t.is_healthy])
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get push token stats: {str(e)}"
        )