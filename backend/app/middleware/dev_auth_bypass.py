"""
Development Authentication Bypass Middleware
Only for local development - NEVER use in production!
"""
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt

from app.core.config import settings
from app.models.user import User


class DevAuthBypass:
    """Development authentication bypass"""
    
    @staticmethod
    def create_dev_token(user_id: str = "dev-user-001", email: str = "dev@opssight.local") -> str:
        """Create a development JWT token"""
        payload = {
            "sub": user_id,
            "email": email,
            "exp": datetime.utcnow() + timedelta(days=30),
            "iat": datetime.utcnow(),
            "type": "access",
            "role": "ADMIN"
        }
        return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    
    @staticmethod
    def get_dev_user() -> dict:
        """Get development user data"""
        return {
            "id": "dev-user-001",
            "email": "dev@opssight.local",
            "firstName": "Dev",
            "lastName": "User",
            "role": "ADMIN",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }


async def dev_auth_dependency(request: Request) -> Optional[dict]:
    """
    Development authentication dependency
    Automatically authenticates requests in development mode
    """
    if not settings.auth_bypass_enabled:
        return None
    
    # Check for existing auth header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return None  # Let normal auth handle it
    
    # Return dev user for all requests
    return DevAuthBypass.get_dev_user()


# Demo login endpoint for development
async def create_demo_token():
    """Create a demo token for development"""
    if not settings.demo_mode:
        raise HTTPException(status_code=403, detail="Demo mode not enabled")
    
    dev_user = DevAuthBypass.get_dev_user()
    token = DevAuthBypass.create_dev_token(dev_user["id"], dev_user["email"])
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": dev_user
    }
