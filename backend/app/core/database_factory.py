"""
Database Adapter Factory

Creates appropriate database adapter based on environment variable.
Supports runtime switching between SQLAlchemy and Supabase backends.
"""

import os
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database_adapter import DatabaseAdapter
from app.adapters.sqlalchemy_adapter import SQLAlchemyAdapter
from app.adapters.supabase_adapter import SupabaseAdapter
from app.db.database import AsyncSessionLocal
from app.core.supabase import get_supabase_admin_client


# Global adapter instance (singleton pattern)
_adapter_instance: Optional[DatabaseAdapter] = None
_backend_type: Optional[str] = None


def get_database_backend() -> str:
    """
    Get the database backend type from environment variable.
    
    Returns:
        str: Backend type ('sqlalchemy' or 'supabase')
    """
    return os.getenv("DATABASE_BACKEND", "sqlalchemy").lower()


def create_sqlalchemy_adapter() -> SQLAlchemyAdapter:
    """
    Create SQLAlchemy adapter instance.
    
    Returns:
        SQLAlchemyAdapter: Configured SQLAlchemy adapter
    """
    # Create a new async session for the adapter
    session = AsyncSessionLocal()
    return SQLAlchemyAdapter(session)


def create_supabase_adapter() -> SupabaseAdapter:
    """
    Create Supabase adapter instance.
    
    Returns:
        SupabaseAdapter: Configured Supabase adapter
        
    Raises:
        ValueError: If Supabase configuration is missing
    """
    try:
        client = get_supabase_admin_client()
        return SupabaseAdapter(client)
    except ValueError as e:
        raise ValueError(
            f"Failed to create Supabase adapter: {e}. "
            "Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
        )


def get_database_adapter_factory(backend: Optional[str] = None) -> DatabaseAdapter:
    """
    Factory function to create database adapter based on backend type.
    
    Args:
        backend: Backend type ('sqlalchemy' or 'supabase'). 
                 If None, reads from DATABASE_BACKEND env var.
    
    Returns:
        DatabaseAdapter: Configured database adapter instance
        
    Raises:
        ValueError: If backend type is invalid or configuration is missing
    """
    global _adapter_instance, _backend_type
    
    # Determine backend type
    if backend is None:
        backend = get_database_backend()
    
    backend = backend.lower()
    
    # Return cached instance if backend hasn't changed
    if _adapter_instance is not None and _backend_type == backend:
        return _adapter_instance
    
    # Create new adapter based on backend type
    if backend == "sqlalchemy":
        _adapter_instance = create_sqlalchemy_adapter()
    elif backend == "supabase":
        _adapter_instance = create_supabase_adapter()
    else:
        raise ValueError(
            f"Invalid DATABASE_BACKEND: '{backend}'. "
            "Must be 'sqlalchemy' or 'supabase'."
        )
    
    _backend_type = backend
    return _adapter_instance


def reset_adapter_cache():
    """
    Reset the cached adapter instance.
    Useful for testing or when configuration changes.
    """
    global _adapter_instance, _backend_type
    _adapter_instance = None
    _backend_type = None


async def get_database_adapter() -> DatabaseAdapter:
    """
    FastAPI dependency function to get database adapter.
    
    This function is designed to be used with FastAPI's Depends().
    It creates a new adapter instance per request (for SQLAlchemy)
    or returns a singleton (for Supabase).
    
    Returns:
        DatabaseAdapter: Database adapter instance
    """
    backend = get_database_backend()
    
    if backend == "sqlalchemy":
        # For SQLAlchemy, create a new adapter with a new session per request
        session = AsyncSessionLocal()
        return SQLAlchemyAdapter(session)
    else:
        # For Supabase, use singleton pattern
        return get_database_adapter_factory(backend)

