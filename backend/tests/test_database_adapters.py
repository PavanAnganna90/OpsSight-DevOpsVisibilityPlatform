"""
Tests for database adapters and factory.

Tests the adapter pattern implementation and feature flag switching.
"""

import pytest
import os
from unittest.mock import Mock, patch, AsyncMock
from app.core.database_adapter import DatabaseAdapter
from app.adapters.sqlalchemy_adapter import SQLAlchemyAdapter
from app.adapters.supabase_adapter import SupabaseAdapter
from app.core.database_factory import (
    get_database_backend,
    get_database_adapter_factory,
    reset_adapter_cache,
)


class TestDatabaseBackendSelection:
    """Test database backend selection from environment variable."""

    def test_default_backend_is_sqlalchemy(self):
        """Test that default backend is sqlalchemy when not set."""
        with patch.dict(os.environ, {}, clear=True):
            backend = get_database_backend()
            assert backend == "sqlalchemy"

    def test_backend_from_environment(self):
        """Test that backend is read from environment variable."""
        with patch.dict(os.environ, {"DATABASE_BACKEND": "supabase"}):
            backend = get_database_backend()
            assert backend == "supabase"

    def test_backend_case_insensitive(self):
        """Test that backend selection is case-insensitive."""
        with patch.dict(os.environ, {"DATABASE_BACKEND": "SUPABASE"}):
            backend = get_database_backend()
            assert backend == "supabase"


class TestSQLAlchemyAdapter:
    """Test SQLAlchemy adapter implementation."""

    def test_backend_name(self):
        """Test that SQLAlchemy adapter returns correct backend name."""
        mock_session = AsyncMock()
        adapter = SQLAlchemyAdapter(mock_session)
        assert adapter.backend_name == "sqlalchemy"

    def test_get_async_session(self):
        """Test that SQLAlchemy adapter returns async session."""
        mock_session = AsyncMock()
        adapter = SQLAlchemyAdapter(mock_session)
        assert adapter.get_async_session() == mock_session

    def test_get_client_returns_none(self):
        """Test that SQLAlchemy adapter returns None for Supabase client."""
        mock_session = AsyncMock()
        adapter = SQLAlchemyAdapter(mock_session)
        assert adapter.get_client() is None


class TestSupabaseAdapter:
    """Test Supabase adapter implementation."""

    def test_backend_name(self):
        """Test that Supabase adapter returns correct backend name."""
        mock_client = Mock()
        adapter = SupabaseAdapter(mock_client)
        assert adapter.backend_name == "supabase"

    def test_get_client(self):
        """Test that Supabase adapter returns client."""
        mock_client = Mock()
        adapter = SupabaseAdapter(mock_client)
        assert adapter.get_client() == mock_client

    def test_get_async_session_returns_none(self):
        """Test that Supabase adapter returns None for SQLAlchemy session."""
        mock_client = Mock()
        adapter = SupabaseAdapter(mock_client)
        assert adapter.get_async_session() is None


class TestDatabaseFactory:
    """Test database adapter factory."""

    def test_factory_creates_sqlalchemy_adapter(self):
        """Test that factory creates SQLAlchemy adapter."""
        with patch.dict(os.environ, {"DATABASE_BACKEND": "sqlalchemy"}):
            with patch("app.core.database_factory.create_sqlalchemy_adapter") as mock_create:
                mock_adapter = Mock(spec=SQLAlchemyAdapter)
                mock_create.return_value = mock_adapter
                
                adapter = get_database_adapter_factory("sqlalchemy")
                
                assert adapter == mock_adapter
                mock_create.assert_called_once()

    def test_factory_creates_supabase_adapter(self):
        """Test that factory creates Supabase adapter."""
        with patch.dict(os.environ, {"DATABASE_BACKEND": "supabase"}):
            with patch("app.core.database_factory.create_supabase_adapter") as mock_create:
                mock_adapter = Mock(spec=SupabaseAdapter)
                mock_create.return_value = mock_adapter
                
                adapter = get_database_adapter_factory("supabase")
                
                assert adapter == mock_adapter
                mock_create.assert_called_once()

    def test_factory_invalid_backend(self):
        """Test that factory raises error for invalid backend."""
        with pytest.raises(ValueError, match="Invalid DATABASE_BACKEND"):
            get_database_adapter_factory("invalid_backend")

    def test_factory_caching(self):
        """Test that factory caches adapter instances."""
        reset_adapter_cache()
        
        with patch.dict(os.environ, {"DATABASE_BACKEND": "sqlalchemy"}):
            with patch("app.core.database_factory.create_sqlalchemy_adapter") as mock_create:
                mock_adapter = Mock(spec=SQLAlchemyAdapter)
                mock_create.return_value = mock_adapter
                
                # First call
                adapter1 = get_database_adapter_factory()
                # Second call (should use cache)
                adapter2 = get_database_adapter_factory()
                
                assert adapter1 == adapter2
                # Should only create once
                assert mock_create.call_count == 1

    def test_reset_cache(self):
        """Test that cache reset works."""
        reset_adapter_cache()
        
        with patch.dict(os.environ, {"DATABASE_BACKEND": "sqlalchemy"}):
            with patch("app.core.database_factory.create_sqlalchemy_adapter") as mock_create:
                mock_adapter = Mock(spec=SQLAlchemyAdapter)
                mock_create.return_value = mock_adapter
                
                # Create adapter
                get_database_adapter_factory()
                
                # Reset cache
                reset_adapter_cache()
                
                # Create again (should create new instance)
                get_database_adapter_factory()
                
                # Should create twice
                assert mock_create.call_count == 2


class TestAdapterInterface:
    """Test that adapters implement the DatabaseAdapter interface."""

    def test_sqlalchemy_adapter_implements_interface(self):
        """Test that SQLAlchemyAdapter implements DatabaseAdapter interface."""
        mock_session = AsyncMock()
        adapter = SQLAlchemyAdapter(mock_session)
        
        # Check that adapter has required methods
        assert hasattr(adapter, "backend_name")
        assert hasattr(adapter, "get_by_id")
        assert hasattr(adapter, "get_all")
        assert hasattr(adapter, "create")
        assert hasattr(adapter, "update")
        assert hasattr(adapter, "delete")
        assert hasattr(adapter, "commit")
        assert hasattr(adapter, "rollback")

    def test_supabase_adapter_implements_interface(self):
        """Test that SupabaseAdapter implements DatabaseAdapter interface."""
        mock_client = Mock()
        adapter = SupabaseAdapter(mock_client)
        
        # Check that adapter has required methods
        assert hasattr(adapter, "backend_name")
        assert hasattr(adapter, "get_by_id")
        assert hasattr(adapter, "get_all")
        assert hasattr(adapter, "create")
        assert hasattr(adapter, "update")
        assert hasattr(adapter, "delete")
        assert hasattr(adapter, "commit")
        assert hasattr(adapter, "rollback")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

