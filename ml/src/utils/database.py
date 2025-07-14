"""
Database utilities for ML infrastructure.

Provides high-performance database operations for feature storage and model metadata.
"""

import logging
import pandas as pd
from typing import Dict, Any, Optional, List
from sqlalchemy import create_engine, text, MetaData
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
import psycopg2
from psycopg2.extras import execute_values
import time


class DatabaseManager:
    """
    High-performance database manager for ML infrastructure.
    
    Features:
    - Connection pooling
    - Batch operations
    - Transaction management
    - Performance monitoring
    """
    
    def __init__(self, db_config: Dict[str, Any]):
        self.db_config = db_config
        self.logger = logging.getLogger(__name__)
        
        # Create connection string
        self.connection_string = (
            f"postgresql://{db_config['user']}:{db_config['password']}"
            f"@{db_config['host']}:{db_config['port']}/{db_config['database']}"
        )
        
        # Setup SQLAlchemy engine
        self.engine = create_engine(
            self.connection_string,
            poolclass=QueuePool,
            pool_size=20,
            max_overflow=30,
            pool_pre_ping=True,
            pool_recycle=3600,
            echo=False
        )
        
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.metadata = MetaData()
        
        # Test connection
        self._test_connection()
    
    def _test_connection(self):
        """Test database connection."""
        try:
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            self.logger.info("Database connection established successfully")
        except Exception as e:
            self.logger.error(f"Database connection failed: {e}")
            raise
    
    def execute_query(self, query: str, params: Optional[Dict] = None) -> pd.DataFrame:
        """Execute a SQL query and return results as DataFrame."""
        try:
            with self.engine.connect() as conn:
                result = pd.read_sql(query, conn, params=params)
            return result
        except Exception as e:
            self.logger.error(f"Query execution failed: {e}")
            raise
    
    def execute_non_query(self, query: str, params: Optional[Dict] = None) -> int:
        """Execute a non-query SQL statement."""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text(query), params or {})
                conn.commit()
                return result.rowcount
        except Exception as e:
            self.logger.error(f"Non-query execution failed: {e}")
            raise
    
    def insert_dataframe(
        self, 
        table_name: str, 
        df: pd.DataFrame, 
        if_exists: str = 'append',
        chunk_size: int = 1000,
        method: str = 'multi'
    ) -> int:
        """Insert DataFrame into database table with optimal performance."""
        if df.empty:
            self.logger.warning(f"No data to insert into table: {table_name}")
            return 0
        
        try:
            start_time = time.time()
            
            # Use pandas to_sql for optimal performance
            rows_inserted = df.to_sql(
                table_name,
                self.engine,
                if_exists=if_exists,
                index=False,
                method=method,
                chunksize=chunk_size
            )
            
            duration = time.time() - start_time
            self.logger.info(
                f"Inserted {len(df)} rows into {table_name} in {duration:.2f} seconds"
            )
            
            return len(df)
            
        except Exception as e:
            self.logger.error(f"DataFrame insertion failed for table {table_name}: {e}")
            raise
    
    def bulk_insert(
        self, 
        table_name: str, 
        data: List[Dict[str, Any]], 
        batch_size: int = 1000
    ) -> int:
        """High-performance bulk insert using psycopg2."""
        if not data:
            self.logger.warning(f"No data to insert into table: {table_name}")
            return 0
        
        try:
            # Get connection details
            conn_params = {
                'host': self.db_config['host'],
                'port': self.db_config['port'],
                'database': self.db_config['database'],
                'user': self.db_config['user'],
                'password': self.db_config['password']
            }
            
            total_rows = 0
            start_time = time.time()
            
            with psycopg2.connect(**conn_params) as conn:
                with conn.cursor() as cursor:
                    # Get column names from first record
                    columns = list(data[0].keys())
                    column_names = ', '.join(columns)
                    placeholders = ', '.join(['%s'] * len(columns))
                    
                    query = f"INSERT INTO {table_name} ({column_names}) VALUES %s"
                    
                    # Process in batches
                    for i in range(0, len(data), batch_size):
                        batch = data[i:i + batch_size]
                        values = [[record[col] for col in columns] for record in batch]
                        
                        execute_values(
                            cursor,
                            query,
                            values,
                            template=f"({placeholders})",
                            page_size=len(batch)
                        )
                        
                        total_rows += len(batch)
                    
                    conn.commit()
            
            duration = time.time() - start_time
            self.logger.info(
                f"Bulk inserted {total_rows} rows into {table_name} in {duration:.2f} seconds"
            )
            
            return total_rows
            
        except Exception as e:
            self.logger.error(f"Bulk insert failed for table {table_name}: {e}")
            raise
    
    def create_table_from_dataframe(
        self, 
        table_name: str, 
        df: pd.DataFrame, 
        primary_key: Optional[str] = None,
        indexes: Optional[List[str]] = None
    ):
        """Create table schema from DataFrame structure."""
        if df.empty:
            raise ValueError("Cannot create table from empty DataFrame")
        
        try:
            # Create table using pandas (will infer types)
            df.head(0).to_sql(
                table_name,
                self.engine,
                if_exists='replace',
                index=False
            )
            
            # Add primary key if specified
            if primary_key:
                with self.engine.connect() as conn:
                    conn.execute(
                        text(f"ALTER TABLE {table_name} ADD PRIMARY KEY ({primary_key})")
                    )
                    conn.commit()
            
            # Add indexes if specified
            if indexes:
                with self.engine.connect() as conn:
                    for index_col in indexes:
                        index_name = f"idx_{table_name}_{index_col}"
                        conn.execute(
                            text(f"CREATE INDEX {index_name} ON {table_name} ({index_col})")
                        )
                    conn.commit()
            
            self.logger.info(f"Created table {table_name} with schema from DataFrame")
            
        except Exception as e:
            self.logger.error(f"Table creation failed for {table_name}: {e}")
            raise
    
    def table_exists(self, table_name: str) -> bool:
        """Check if table exists in database."""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(
                    text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = :table_name
                    )
                    """),
                    {'table_name': table_name}
                )
                return result.scalar()
        except Exception as e:
            self.logger.error(f"Error checking table existence: {e}")
            return False
    
    def get_table_info(self, table_name: str) -> Dict[str, Any]:
        """Get table information including size, row count, and column info."""
        try:
            with self.engine.connect() as conn:
                # Get row count
                row_count_result = conn.execute(
                    text(f"SELECT COUNT(*) FROM {table_name}")
                )
                row_count = row_count_result.scalar()
                
                # Get table size
                size_result = conn.execute(
                    text("""
                    SELECT pg_total_relation_size(:table_name) as total_size,
                           pg_relation_size(:table_name) as table_size,
                           pg_indexes_size(:table_name) as index_size
                    """),
                    {'table_name': table_name}
                )
                size_info = size_result.fetchone()
                
                # Get column information
                columns_result = conn.execute(
                    text("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = :table_name
                    ORDER BY ordinal_position
                    """),
                    {'table_name': table_name}
                )
                columns = [
                    {
                        'name': row.column_name,
                        'type': row.data_type,
                        'nullable': row.is_nullable == 'YES'
                    }
                    for row in columns_result
                ]
                
                return {
                    'table_name': table_name,
                    'row_count': row_count,
                    'total_size_bytes': size_info.total_size if size_info else 0,
                    'table_size_bytes': size_info.table_size if size_info else 0,
                    'index_size_bytes': size_info.index_size if size_info else 0,
                    'columns': columns
                }
                
        except Exception as e:
            self.logger.error(f"Error getting table info for {table_name}: {e}")
            raise
    
    def vacuum_analyze_table(self, table_name: str):
        """Vacuum and analyze table for optimal performance."""
        try:
            # Note: VACUUM cannot run inside a transaction block
            conn_params = {
                'host': self.db_config['host'],
                'port': self.db_config['port'],
                'database': self.db_config['database'],
                'user': self.db_config['user'],
                'password': self.db_config['password']
            }
            
            with psycopg2.connect(**conn_params) as conn:
                conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
                with conn.cursor() as cursor:
                    cursor.execute(f"VACUUM ANALYZE {table_name}")
            
            self.logger.info(f"Vacuumed and analyzed table: {table_name}")
            
        except Exception as e:
            self.logger.error(f"Vacuum analyze failed for {table_name}: {e}")
            raise
    
    def get_connection_info(self) -> Dict[str, Any]:
        """Get database connection information and stats."""
        try:
            with self.engine.connect() as conn:
                # Get connection stats
                stats_result = conn.execute(
                    text("""
                    SELECT 
                        count(*) as total_connections,
                        count(*) FILTER (WHERE state = 'active') as active_connections,
                        count(*) FILTER (WHERE state = 'idle') as idle_connections
                    FROM pg_stat_activity
                    WHERE datname = current_database()
                    """)
                )
                stats = stats_result.fetchone()
                
                # Get database size
                size_result = conn.execute(
                    text("SELECT pg_database_size(current_database()) as db_size")
                )
                db_size = size_result.scalar()
                
                return {
                    'database_name': self.db_config['database'],
                    'host': self.db_config['host'],
                    'port': self.db_config['port'],
                    'total_connections': stats.total_connections if stats else 0,
                    'active_connections': stats.active_connections if stats else 0,
                    'idle_connections': stats.idle_connections if stats else 0,
                    'database_size_bytes': db_size or 0,
                    'pool_size': self.engine.pool.size(),
                    'checked_in_connections': self.engine.pool.checkedin(),
                    'checked_out_connections': self.engine.pool.checkedout()
                }
                
        except Exception as e:
            self.logger.error(f"Error getting connection info: {e}")
            raise
    
    def close(self):
        """Close database connections."""
        try:
            self.engine.dispose()
            self.logger.info("Database connections closed")
        except Exception as e:
            self.logger.error(f"Error closing database connections: {e}")
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()