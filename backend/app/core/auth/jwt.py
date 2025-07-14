"""
JWT token utilities for authentication
"""

import jwt
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext

from app.core.config import settings

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "iss": settings.APP_NAME,
        "aud": "opssight-api"
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Dict[str, Any]:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM],
            audience="opssight-api"
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token")


def verify_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify and decode JWT token (legacy function for RBAC middleware).
    
    Args:
        token: JWT token string
        
    Returns:
        Optional[Dict[str, Any]]: Decoded payload or None if invalid
    """
    try:
        return verify_token(token)
    except Exception as e:
        logger.error(f"Error verifying JWT token: {e}")
        return None


def create_jwt_token(user_id: int, username: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT token for user (legacy function).
    
    Args:
        user_id: User ID
        username: Username
        expires_delta: Token expiration time
        
    Returns:
        str: JWT token
    """
    try:
        data = {
            "sub": str(user_id),
            "username": username
        }
        return create_access_token(data, expires_delta)
    except Exception as e:
        logger.error(f"Error creating JWT token: {e}")
        return ""


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def extract_token_claims(token: str) -> Dict[str, Any]:
    """Extract claims from JWT token without verification (for debugging)."""
    try:
        # Decode without verification to extract claims
        payload = jwt.decode(
            token,
            options={"verify_signature": False, "verify_exp": False}
        )
        return payload
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token format")


def is_token_expired(token: str) -> bool:
    """Check if token is expired without full verification."""
    try:
        payload = extract_token_claims(token)
        exp = payload.get("exp")
        if exp:
            return datetime.utcnow().timestamp() > exp
        return False
    except:
        return True