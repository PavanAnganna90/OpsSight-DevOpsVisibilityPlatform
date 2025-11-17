"""
Database adapters for different backends.
"""

from app.adapters.sqlalchemy_adapter import SQLAlchemyAdapter
from app.adapters.supabase_adapter import SupabaseAdapter

__all__ = ["SQLAlchemyAdapter", "SupabaseAdapter"]

