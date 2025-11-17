"""
Supabase Client Configuration for Backend
Creates Supabase client instances for database operations
"""

import os
from typing import Optional
from supabase import create_client, Client

# Supabase configuration from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://localhost:54321")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Global Supabase client instance (lazy initialization)
_supabase_client: Optional[Client] = None
_supabase_admin_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Get Supabase client for regular operations (respects RLS).
    
    Returns:
        Client: Supabase client instance
        
    Raises:
        ValueError: If SUPABASE_ANON_KEY is not set
    """
    global _supabase_client
    
    if _supabase_client is None:
        if not SUPABASE_ANON_KEY:
            raise ValueError("SUPABASE_ANON_KEY environment variable is not set")
        
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    return _supabase_client


def get_supabase_admin_client() -> Client:
    """
    Get Supabase admin client (bypasses RLS).
    Use only for server-side operations that need to bypass Row-Level Security.
    
    Returns:
        Client: Supabase admin client instance
        
    Raises:
        ValueError: If SUPABASE_SERVICE_ROLE_KEY is not set
    """
    global _supabase_admin_client
    
    if _supabase_admin_client is None:
        if not SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable is not set")
        
        _supabase_admin_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    return _supabase_admin_client


def reset_supabase_clients():
    """
    Reset Supabase client instances.
    Useful for testing or when configuration changes.
    """
    global _supabase_client, _supabase_admin_client
    _supabase_client = None
    _supabase_admin_client = None

