"""
Feature Store Implementation

High-performance feature storage and retrieval using Redis and PostgreSQL.
"""

import json
import logging
import pickle
import hashlib
from typing import Dict, List, Optional, Any, Union, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import pandas as pd
import numpy as np
import redis
from sqlalchemy import create_engine, text, MetaData, Table, Column, Integer, String, DateTime, Float, JSON, Boolean
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from ..config import get_feature_store_config, get_database_config
from ..utils.monitoring import MetricsCollector


@dataclass
class FeatureGroup:
    """Feature group metadata."""
    name: str
    description: str
    features: List[str]
    timestamp_column: str
    entity_columns: List[str]
    version: int = 1
    tags: Dict[str, str] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class FeatureView:
    """Feature view for model training/inference."""
    name: str
    feature_groups: List[str]
    features: List[str]
    entities: List[str]
    ttl: Optional[timedelta] = None
    version: int = 1
    created_at: datetime = field(default_factory=datetime.utcnow)


class FeatureStore:
    """
    Enterprise Feature Store with Redis and PostgreSQL backend.
    
    Features:
    - High-performance feature serving via Redis
    - Historical feature storage in PostgreSQL
    - Feature versioning and lineage
    - Point-in-time correctness
    - Feature monitoring and drift detection
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.metrics = MetricsCollector("feature_store")
        
        # Initialize connections
        self._setup_redis()
        self._setup_postgresql()
        self._setup_schemas()
        
        # Feature metadata cache
        self._feature_groups_cache: Dict[str, FeatureGroup] = {}
        self._feature_views_cache: Dict[str, FeatureView] = {}
    
    def _setup_redis(self):
        """Setup Redis connection for online feature serving."""
        redis_config = self.config['redis']
        
        self.redis_client = redis.Redis(
            host=redis_config['host'],
            port=redis_config['port'],
            db=redis_config['db'],
            password=redis_config.get('password'),
            decode_responses=False,  # Keep binary for pickled data
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
            max_connections=20
        )
        
        # Test connection
        self.redis_client.ping()
        self.logger.info("Redis connection established")
    
    def _setup_postgresql(self):
        """Setup PostgreSQL connection for offline feature storage."""
        db_config = self.config['postgresql']
        
        connection_string = (
            f"postgresql://{db_config['user']}:{db_config['password']}"
            f"@{db_config['host']}:{db_config['port']}/{db_config['database']}"
        )
        
        self.pg_engine = create_engine(
            connection_string,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=3600
        )
        
        self.SessionLocal = sessionmaker(bind=self.pg_engine)
        self.logger.info("PostgreSQL connection established")
    
    def _setup_schemas(self):
        """Setup database schemas for feature store."""
        metadata = MetaData()
        
        # Feature groups metadata table
        self.feature_groups_table = Table(
            'feature_groups',
            metadata,
            Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            Column('name', String(255), unique=True, nullable=False),
            Column('description', String(1000)),
            Column('features', JSONB),
            Column('timestamp_column', String(100)),
            Column('entity_columns', JSONB),
            Column('version', Integer, default=1),
            Column('tags', JSONB),
            Column('created_at', DateTime, default=datetime.utcnow),
            Column('updated_at', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow),
            Column('is_active', Boolean, default=True)
        )
        
        # Feature views metadata table
        self.feature_views_table = Table(
            'feature_views',
            metadata,
            Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            Column('name', String(255), unique=True, nullable=False),
            Column('feature_groups', JSONB),
            Column('features', JSONB),
            Column('entities', JSONB),
            Column('ttl_seconds', Integer),
            Column('version', Integer, default=1),
            Column('created_at', DateTime, default=datetime.utcnow),
            Column('is_active', Boolean, default=True)
        )
        
        # Feature statistics table
        self.feature_stats_table = Table(
            'feature_statistics',
            metadata,
            Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            Column('feature_group', String(255)),
            Column('feature_name', String(255)),
            Column('timestamp', DateTime),
            Column('count', Integer),
            Column('mean', Float),
            Column('std', Float),
            Column('min', Float),
            Column('max', Float),
            Column('percentiles', JSONB),
            Column('null_count', Integer),
            Column('unique_count', Integer)
        )
        
        # Create tables
        metadata.create_all(self.pg_engine)
        self.logger.info("Feature store schemas created")
    
    def create_feature_group(
        self,
        name: str,
        description: str,
        features: List[str],
        timestamp_column: str,
        entity_columns: List[str],
        tags: Optional[Dict[str, str]] = None
    ) -> FeatureGroup:
        """Create a new feature group."""
        feature_group = FeatureGroup(
            name=name,
            description=description,
            features=features,
            timestamp_column=timestamp_column,
            entity_columns=entity_columns,
            tags=tags or {}
        )
        
        # Save to database
        with self.pg_engine.connect() as conn:
            conn.execute(
                self.feature_groups_table.insert().values(
                    name=feature_group.name,
                    description=feature_group.description,
                    features=feature_group.features,
                    timestamp_column=feature_group.timestamp_column,
                    entity_columns=feature_group.entity_columns,
                    version=feature_group.version,
                    tags=feature_group.tags,
                    created_at=feature_group.created_at,
                    updated_at=feature_group.updated_at
                )
            )
            conn.commit()
        
        # Cache feature group
        self._feature_groups_cache[name] = feature_group
        
        self.logger.info(f"Created feature group: {name}")
        return feature_group
    
    def create_feature_view(
        self,
        name: str,
        feature_groups: List[str],
        features: List[str],
        entities: List[str],
        ttl: Optional[timedelta] = None
    ) -> FeatureView:
        """Create a new feature view."""
        feature_view = FeatureView(
            name=name,
            feature_groups=feature_groups,
            features=features,
            entities=entities,
            ttl=ttl
        )
        
        # Save to database
        with self.pg_engine.connect() as conn:
            conn.execute(
                self.feature_views_table.insert().values(
                    name=feature_view.name,
                    feature_groups=feature_view.feature_groups,
                    features=feature_view.features,
                    entities=feature_view.entities,
                    ttl_seconds=int(ttl.total_seconds()) if ttl else None,
                    version=feature_view.version,
                    created_at=feature_view.created_at
                )
            )
            conn.commit()
        
        # Cache feature view
        self._feature_views_cache[name] = feature_view
        
        self.logger.info(f"Created feature view: {name}")
        return feature_view
    
    def write_features(
        self,
        feature_group: str,
        data: pd.DataFrame,
        timestamp_column: str = 'timestamp',
        write_online: bool = True,
        write_offline: bool = True
    ):
        """Write features to both online and offline stores."""
        if data.empty:
            self.logger.warning(f"No data to write for feature group: {feature_group}")
            return
        
        # Get feature group metadata
        fg = self._get_feature_group(feature_group)
        if not fg:
            raise ValueError(f"Feature group not found: {feature_group}")
        
        # Validate data
        self._validate_feature_data(fg, data, timestamp_column)
        
        # Write to offline store (PostgreSQL)
        if write_offline:
            self._write_offline_features(feature_group, data, timestamp_column)
        
        # Write to online store (Redis)
        if write_online:
            self._write_online_features(feature_group, data, timestamp_column, fg.entity_columns)
        
        # Update feature statistics
        self._update_feature_statistics(feature_group, data)
        
        self.metrics.increment('features_written', tags={'feature_group': feature_group})
        self.logger.info(f"Wrote {len(data)} records to feature group: {feature_group}")
    
    def _write_offline_features(self, feature_group: str, data: pd.DataFrame, timestamp_column: str):
        """Write features to PostgreSQL for historical storage."""
        table_name = f"fg_{feature_group}"
        
        # Ensure timestamp is datetime
        if timestamp_column in data.columns:
            data[timestamp_column] = pd.to_datetime(data[timestamp_column])
        
        # Write to PostgreSQL
        data.to_sql(
            table_name,
            self.pg_engine,
            if_exists='append',
            index=False,
            method='multi',
            chunksize=1000
        )
    
    def _write_online_features(
        self,
        feature_group: str,
        data: pd.DataFrame,
        timestamp_column: str,
        entity_columns: List[str]
    ):
        """Write features to Redis for online serving."""
        if not entity_columns:
            self.logger.warning(f"No entity columns defined for feature group: {feature_group}")
            return
        
        # Create Redis pipeline for batch operations
        pipe = self.redis_client.pipeline()
        
        for _, row in data.iterrows():
            # Create entity key
            entity_values = [str(row[col]) for col in entity_columns]
            entity_key = ":".join(entity_values)
            redis_key = f"features:{feature_group}:{entity_key}"
            
            # Prepare feature data
            feature_data = row.drop(entity_columns + [timestamp_column]).to_dict()
            feature_data[timestamp_column] = row[timestamp_column].isoformat()
            
            # Serialize and store
            serialized_data = pickle.dumps(feature_data)
            pipe.set(redis_key, serialized_data, ex=86400)  # 24 hour TTL
        
        # Execute batch
        pipe.execute()
    
    def get_online_features(
        self,
        feature_view: str,
        entities: Dict[str, List[Any]]
    ) -> pd.DataFrame:
        """Get features from online store for real-time inference."""
        fv = self._get_feature_view(feature_view)
        if not fv:
            raise ValueError(f"Feature view not found: {feature_view}")
        
        results = []
        
        # Get features for each entity combination
        for i in range(len(list(entities.values())[0])):
            entity_values = [str(entities[col][i]) for col in fv.entities]
            
            entity_features = {}
            entity_features.update({col: entities[col][i] for col in fv.entities})
            
            # Get features from each feature group
            for fg_name in fv.feature_groups:
                entity_key = ":".join(entity_values)
                redis_key = f"features:{fg_name}:{entity_key}"
                
                try:
                    data = self.redis_client.get(redis_key)
                    if data:
                        feature_data = pickle.loads(data)
                        
                        # Filter to only requested features
                        fg_features = [f for f in fv.features if f in feature_data]
                        entity_features.update({f: feature_data[f] for f in fg_features})
                    
                except Exception as e:
                    self.logger.error(f"Error getting online features: {e}")
            
            results.append(entity_features)
        
        df = pd.DataFrame(results)
        self.metrics.increment('online_features_retrieved', tags={'feature_view': feature_view})
        
        return df
    
    def get_historical_features(
        self,
        feature_view: str,
        entities: pd.DataFrame,
        timestamp_column: str = 'timestamp',
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> pd.DataFrame:
        """Get historical features for training data."""
        fv = self._get_feature_view(feature_view)
        if not fv:
            raise ValueError(f"Feature view not found: {feature_view}")
        
        # Build query for point-in-time correctness
        results = []
        
        for fg_name in fv.feature_groups:
            fg = self._get_feature_group(fg_name)
            if not fg:
                continue
            
            # Build SQL query
            table_name = f"fg_{fg_name}"
            
            # Get features for this feature group
            fg_features = [f for f in fv.features if f in fg.features]
            if not fg_features:
                continue
            
            # Build point-in-time query
            query = self._build_point_in_time_query(
                table_name, fg, entities, fg_features, timestamp_column, start_time, end_time
            )
            
            # Execute query
            with self.pg_engine.connect() as conn:
                fg_result = pd.read_sql(query, conn)
                results.append(fg_result)
        
        # Merge all feature groups
        if results:
            final_result = results[0]
            for result in results[1:]:
                final_result = pd.merge(
                    final_result, result,
                    on=fv.entities + [timestamp_column],
                    how='outer'
                )
            
            self.metrics.increment('historical_features_retrieved', tags={'feature_view': feature_view})
            return final_result
        
        return pd.DataFrame()
    
    def _build_point_in_time_query(
        self,
        table_name: str,
        feature_group: FeatureGroup,
        entities: pd.DataFrame,
        features: List[str],
        timestamp_column: str,
        start_time: Optional[datetime],
        end_time: Optional[datetime]
    ) -> str:
        """Build SQL query for point-in-time feature retrieval."""
        # This is a simplified version - in production, you'd want more sophisticated point-in-time logic
        entity_conditions = []
        for entity_col in feature_group.entity_columns:
            if entity_col in entities.columns:
                values = entities[entity_col].unique()
                values_str = "','".join(str(v) for v in values)
                entity_conditions.append(f"{entity_col} IN ('{values_str}')")
        
        where_clause = " AND ".join(entity_conditions)
        
        if start_time:
            where_clause += f" AND {timestamp_column} >= '{start_time}'"
        if end_time:
            where_clause += f" AND {timestamp_column} <= '{end_time}'"
        
        feature_cols = ", ".join(features)
        entity_cols = ", ".join(feature_group.entity_columns)
        
        query = f"""
        SELECT {entity_cols}, {timestamp_column}, {feature_cols}
        FROM {table_name}
        WHERE {where_clause}
        ORDER BY {timestamp_column}
        """
        
        return query
    
    def _validate_feature_data(self, feature_group: FeatureGroup, data: pd.DataFrame, timestamp_column: str):
        """Validate feature data before writing."""
        # Check timestamp column exists
        if timestamp_column not in data.columns:
            raise ValueError(f"Timestamp column '{timestamp_column}' not found in data")
        
        # Check entity columns exist
        for entity_col in feature_group.entity_columns:
            if entity_col not in data.columns:
                raise ValueError(f"Entity column '{entity_col}' not found in data")
        
        # Check feature columns exist
        missing_features = set(feature_group.features) - set(data.columns)
        if missing_features:
            self.logger.warning(f"Missing features in data: {missing_features}")
    
    def _update_feature_statistics(self, feature_group: str, data: pd.DataFrame):
        """Update feature statistics for monitoring."""
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        
        stats_records = []
        timestamp = datetime.utcnow()
        
        for col in numeric_cols:
            col_data = data[col].dropna()
            if len(col_data) == 0:
                continue
            
            stats = {
                'feature_group': feature_group,
                'feature_name': col,
                'timestamp': timestamp,
                'count': len(col_data),
                'mean': float(col_data.mean()),
                'std': float(col_data.std()),
                'min': float(col_data.min()),
                'max': float(col_data.max()),
                'percentiles': {
                    'p25': float(col_data.quantile(0.25)),
                    'p50': float(col_data.quantile(0.50)),
                    'p75': float(col_data.quantile(0.75)),
                    'p90': float(col_data.quantile(0.90)),
                    'p95': float(col_data.quantile(0.95)),
                    'p99': float(col_data.quantile(0.99))
                },
                'null_count': int(data[col].isnull().sum()),
                'unique_count': int(data[col].nunique())
            }
            stats_records.append(stats)
        
        # Insert statistics
        if stats_records:
            with self.pg_engine.connect() as conn:
                conn.execute(self.feature_stats_table.insert(), stats_records)
                conn.commit()
    
    def _get_feature_group(self, name: str) -> Optional[FeatureGroup]:
        """Get feature group metadata."""
        if name in self._feature_groups_cache:
            return self._feature_groups_cache[name]
        
        # Load from database
        with self.pg_engine.connect() as conn:
            result = conn.execute(
                self.feature_groups_table.select().where(
                    self.feature_groups_table.c.name == name
                )
            ).fetchone()
            
            if result:
                fg = FeatureGroup(
                    name=result.name,
                    description=result.description,
                    features=result.features,
                    timestamp_column=result.timestamp_column,
                    entity_columns=result.entity_columns,
                    version=result.version,
                    tags=result.tags,
                    created_at=result.created_at,
                    updated_at=result.updated_at
                )
                self._feature_groups_cache[name] = fg
                return fg
        
        return None
    
    def _get_feature_view(self, name: str) -> Optional[FeatureView]:
        """Get feature view metadata."""
        if name in self._feature_views_cache:
            return self._feature_views_cache[name]
        
        # Load from database
        with self.pg_engine.connect() as conn:
            result = conn.execute(
                self.feature_views_table.select().where(
                    self.feature_views_table.c.name == name
                )
            ).fetchone()
            
            if result:
                ttl = timedelta(seconds=result.ttl_seconds) if result.ttl_seconds else None
                fv = FeatureView(
                    name=result.name,
                    feature_groups=result.feature_groups,
                    features=result.features,
                    entities=result.entities,
                    ttl=ttl,
                    version=result.version,
                    created_at=result.created_at
                )
                self._feature_views_cache[name] = fv
                return fv
        
        return None
    
    def get_feature_statistics(
        self,
        feature_group: str,
        feature_name: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> pd.DataFrame:
        """Get feature statistics for monitoring."""
        query = self.feature_stats_table.select().where(
            self.feature_stats_table.c.feature_group == feature_group
        )
        
        if feature_name:
            query = query.where(self.feature_stats_table.c.feature_name == feature_name)
        
        if start_time:
            query = query.where(self.feature_stats_table.c.timestamp >= start_time)
        
        if end_time:
            query = query.where(self.feature_stats_table.c.timestamp <= end_time)
        
        with self.pg_engine.connect() as conn:
            return pd.read_sql(query, conn)
    
    def delete_feature_group(self, name: str):
        """Delete a feature group and all its data."""
        # Delete from metadata
        with self.pg_engine.connect() as conn:
            conn.execute(
                self.feature_groups_table.delete().where(
                    self.feature_groups_table.c.name == name
                )
            )
            conn.commit()
        
        # Drop feature table
        try:
            with self.pg_engine.connect() as conn:
                conn.execute(text(f"DROP TABLE IF EXISTS fg_{name}"))
                conn.commit()
        except Exception as e:
            self.logger.error(f"Error dropping table fg_{name}: {e}")
        
        # Clear Redis keys
        pattern = f"features:{name}:*"
        for key in self.redis_client.scan_iter(match=pattern):
            self.redis_client.delete(key)
        
        # Remove from cache
        self._feature_groups_cache.pop(name, None)
        
        self.logger.info(f"Deleted feature group: {name}")
    
    def list_feature_groups(self) -> List[Dict[str, Any]]:
        """List all feature groups."""
        with self.pg_engine.connect() as conn:
            results = conn.execute(
                self.feature_groups_table.select().where(
                    self.feature_groups_table.c.is_active == True
                )
            ).fetchall()
            
            return [
                {
                    'name': r.name,
                    'description': r.description,
                    'features': r.features,
                    'entity_columns': r.entity_columns,
                    'version': r.version,
                    'created_at': r.created_at.isoformat(),
                    'updated_at': r.updated_at.isoformat()
                }
                for r in results
            ]
    
    def list_feature_views(self) -> List[Dict[str, Any]]:
        """List all feature views."""
        with self.pg_engine.connect() as conn:
            results = conn.execute(
                self.feature_views_table.select().where(
                    self.feature_views_table.c.is_active == True
                )
            ).fetchall()
            
            return [
                {
                    'name': r.name,
                    'feature_groups': r.feature_groups,
                    'features': r.features,
                    'entities': r.entities,
                    'version': r.version,
                    'created_at': r.created_at.isoformat()
                }
                for r in results
            ]
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get feature store health status."""
        try:
            # Test Redis connection
            redis_status = "healthy" if self.redis_client.ping() else "unhealthy"
        except:
            redis_status = "unhealthy"
        
        try:
            # Test PostgreSQL connection
            with self.pg_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
                pg_status = "healthy"
        except:
            pg_status = "unhealthy"
        
        return {
            'redis_status': redis_status,
            'postgresql_status': pg_status,
            'feature_groups_count': len(self.list_feature_groups()),
            'feature_views_count': len(self.list_feature_views()),
            'metrics': self.metrics.get_all_metrics(),
            'timestamp': datetime.utcnow().isoformat()
        }