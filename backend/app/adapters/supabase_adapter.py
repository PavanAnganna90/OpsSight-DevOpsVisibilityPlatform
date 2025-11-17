"""
Supabase Database Adapter

Implements the DatabaseAdapter interface using Supabase Python client.
Maps Supabase queries to match SQLAlchemy behavior for seamless switching.
"""

from typing import Any, Optional, List, Dict, Type, TypeVar
from supabase import Client
from app.core.database_adapter import DatabaseAdapter
from app.core.supabase import get_supabase_admin_client

ModelType = TypeVar("ModelType")


class SupabaseAdapter(DatabaseAdapter):
    """
    Supabase implementation of DatabaseAdapter.
    
    Uses Supabase Python client for all database operations.
    Maps Supabase queries to match SQLAlchemy behavior.
    """

    def __init__(self, client: Optional[Client] = None):
        """
        Initialize Supabase adapter.
        
        Args:
            client: Supabase client instance (uses admin client if not provided)
        """
        self._client = client or get_supabase_admin_client()
        self._pending_changes: List[Dict[str, Any]] = []

    @property
    def backend_name(self) -> str:
        """Return backend name."""
        return "supabase"

    def _get_table_name(self, model: Type[ModelType]) -> str:
        """
        Get table name from model class.
        
        Args:
            model: Model class
            
        Returns:
            Table name
        """
        # Try to get table name from model's __tablename__ attribute
        if hasattr(model, "__tablename__"):
            return model.__tablename__
        
        # Fallback to lowercase class name with 's' appended
        return model.__name__.lower() + "s"

    def _model_to_dict(self, model_instance: ModelType) -> Dict[str, Any]:
        """
        Convert model instance to dictionary.
        
        Args:
            model_instance: Model instance
            
        Returns:
            Dictionary representation
        """
        if hasattr(model_instance, "__dict__"):
            return {
                k: v for k, v in model_instance.__dict__.items()
                if not k.startswith("_")
            }
        elif hasattr(model_instance, "model_dump"):
            return model_instance.model_dump()
        else:
            return dict(model_instance)

    def _dict_to_model(self, model: Type[ModelType], data: Dict[str, Any]) -> ModelType:
        """
        Convert dictionary to model instance.
        
        Args:
            model: Model class
            data: Dictionary data
            
        Returns:
            Model instance
        """
        # Filter out None values and convert to model
        filtered_data = {k: v for k, v in data.items() if v is not None}
        return model(**filtered_data)

    async def get_by_id(
        self,
        model: Type[ModelType],
        id: Any,
        options: Optional[List[Any]] = None
    ) -> Optional[ModelType]:
        """Get entity by ID."""
        table_name = self._get_table_name(model)
        
        try:
            response = self._client.table(table_name).select("*").eq("id", id).execute()
            
            if response.data and len(response.data) > 0:
                return self._dict_to_model(model, response.data[0])
            return None
        except Exception as e:
            # Log error and return None
            print(f"Supabase get_by_id error: {e}")
            return None

    async def get_all(
        self,
        model: Type[ModelType],
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[Any] = None,
        options: Optional[List[Any]] = None,
    ) -> List[ModelType]:
        """Get all entities with filtering and pagination."""
        table_name = self._get_table_name(model)
        
        try:
            query = self._client.table(table_name).select("*")
            
            # Apply filters
            if filters:
                for key, value in filters.items():
                    if isinstance(value, (list, tuple)):
                        query = query.in_(key, value)
                    else:
                        query = query.eq(key, value)
            
            # Apply ordering
            if order_by is not None:
                # If order_by is a string, use it directly
                if isinstance(order_by, str):
                    query = query.order(order_by)
                # If it's a SQLAlchemy expression, extract column name
                elif hasattr(order_by, "key"):
                    query = query.order(order_by.key)
            else:
                # Default ordering by id
                query = query.order("id")
            
            # Apply pagination
            query = query.range(skip, skip + limit - 1)
            
            response = query.execute()
            
            return [
                self._dict_to_model(model, item)
                for item in response.data
            ]
        except Exception as e:
            print(f"Supabase get_all error: {e}")
            return []

    async def create(
        self,
        model: Type[ModelType],
        obj_data: Dict[str, Any]
    ) -> ModelType:
        """Create new entity."""
        table_name = self._get_table_name(model)
        
        try:
            response = self._client.table(table_name).insert(obj_data).execute()
            
            if response.data and len(response.data) > 0:
                return self._dict_to_model(model, response.data[0])
            raise Exception("No data returned from insert")
        except Exception as e:
            print(f"Supabase create error: {e}")
            raise

    async def update(
        self,
        model: Type[ModelType],
        id: Any,
        obj_data: Dict[str, Any]
    ) -> Optional[ModelType]:
        """Update existing entity."""
        table_name = self._get_table_name(model)
        
        try:
            response = (
                self._client.table(table_name)
                .update(obj_data)
                .eq("id", id)
                .execute()
            )
            
            if response.data and len(response.data) > 0:
                return self._dict_to_model(model, response.data[0])
            return None
        except Exception as e:
            print(f"Supabase update error: {e}")
            return None

    async def delete(
        self,
        model: Type[ModelType],
        id: Any
    ) -> bool:
        """Delete entity by ID."""
        table_name = self._get_table_name(model)
        
        try:
            response = (
                self._client.table(table_name)
                .delete()
                .eq("id", id)
                .execute()
            )
            
            # Supabase returns deleted rows in response.data
            return response.data is not None and len(response.data) > 0
        except Exception as e:
            print(f"Supabase delete error: {e}")
            return False

    async def execute_query(
        self,
        query: Any
    ) -> Any:
        """
        Execute a database query.
        
        Note: Supabase doesn't support raw SQL queries directly.
        This method is a placeholder for compatibility.
        """
        # For Supabase, we'd need to use RPC calls for complex queries
        # For now, return the query object itself
        return query

    async def commit(self) -> None:
        """
        Commit the current transaction.
        
        Note: Supabase operations are auto-committed.
        This is a no-op for compatibility.
        """
        # Supabase operations are auto-committed
        self._pending_changes.clear()

    async def rollback(self) -> None:
        """
        Rollback the current transaction.
        
        Note: Supabase operations are auto-committed.
        This clears pending changes for compatibility.
        """
        self._pending_changes.clear()

    async def flush(self) -> None:
        """
        Flush pending changes to the database.
        
        Note: Supabase operations are auto-committed.
        This is a no-op for compatibility.
        """
        # Supabase operations are auto-committed
        pass

    async def refresh(self, obj: ModelType) -> None:
        """
        Refresh entity from database.
        
        Args:
            obj: Entity to refresh
        """
        if not hasattr(obj, "id"):
            return
        
        table_name = self._get_table_name(type(obj))
        
        try:
            response = (
                self._client.table(table_name)
                .select("*")
                .eq("id", obj.id)
                .execute()
            )
            
            if response.data and len(response.data) > 0:
                # Update object attributes
                for key, value in response.data[0].items():
                    if hasattr(obj, key):
                        setattr(obj, key, value)
        except Exception as e:
            print(f"Supabase refresh error: {e}")

    async def get_count(
        self,
        model: Type[ModelType],
        filters: Optional[Dict[str, Any]] = None
    ) -> int:
        """Get total count of entities matching filters."""
        table_name = self._get_table_name(model)
        
        try:
            query = self._client.table(table_name).select("id", count="exact")
            
            # Apply filters
            if filters:
                for key, value in filters.items():
                    if isinstance(value, (list, tuple)):
                        query = query.in_(key, value)
                    else:
                        query = query.eq(key, value)
            
            response = query.execute()
            
            # Supabase returns count in response.count
            return response.count if hasattr(response, "count") else len(response.data)
        except Exception as e:
            print(f"Supabase get_count error: {e}")
            return 0

    async def exists(
        self,
        model: Type[ModelType],
        id: Any
    ) -> bool:
        """Check if entity exists by ID."""
        table_name = self._get_table_name(model)
        
        try:
            response = (
                self._client.table(table_name)
                .select("id")
                .eq("id", id)
                .limit(1)
                .execute()
            )
            
            return response.data is not None and len(response.data) > 0
        except Exception as e:
            print(f"Supabase exists error: {e}")
            return False

    async def bulk_create(
        self,
        model: Type[ModelType],
        objs_data: List[Dict[str, Any]]
    ) -> List[ModelType]:
        """Create multiple entities in bulk."""
        table_name = self._get_table_name(model)
        
        try:
            response = self._client.table(table_name).insert(objs_data).execute()
            
            return [
                self._dict_to_model(model, item)
                for item in response.data
            ]
        except Exception as e:
            print(f"Supabase bulk_create error: {e}")
            raise

    def get_client(self) -> Optional[Client]:
        """Get Supabase client."""
        return self._client

