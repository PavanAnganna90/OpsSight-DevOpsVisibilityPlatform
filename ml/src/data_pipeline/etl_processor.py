"""
ETL Processor for Data Pipeline

Handles Extract, Transform, Load operations for ML feature engineering.
"""

import logging
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor, as_completed
import asyncio
from sqlalchemy import text
import polars as pl

from ..config import get_database_config, get_feature_store_config
from ..utils.database import DatabaseManager
from ..utils.feature_store import FeatureStore
from ..utils.data_validation import DataValidator
from ..utils.monitoring import MetricsCollector


@dataclass
class ETLJob:
    """Configuration for an ETL job."""
    name: str
    source_table: str
    target_feature_group: str
    transform_function: str
    schedule: str  # cron expression
    window_size: str  # e.g., '1h', '24h', '7d'
    dependencies: List[str] = field(default_factory=list)
    enabled: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


class ETLProcessor:
    """
    High-performance ETL processor for ML feature engineering.
    
    Handles data extraction, transformation, and loading into feature store.
    """
    
    def __init__(self, max_workers: int = 8):
        self.max_workers = max_workers
        self.db_config = get_database_config()
        self.fs_config = get_feature_store_config()
        
        self.logger = logging.getLogger(__name__)
        self.metrics = MetricsCollector("etl_processor")
        
        self.db_manager = DatabaseManager(self.db_config)
        self.feature_store = FeatureStore(self.fs_config)
        self.validator = DataValidator()
        
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.transform_functions: Dict[str, Callable] = {}
        
        self._register_transforms()
    
    def _register_transforms(self):
        """Register all available transform functions."""
        self.transform_functions = {
            'infrastructure_features': self._transform_infrastructure_features,
            'deployment_features': self._transform_deployment_features,
            'alert_features': self._transform_alert_features,
            'performance_features': self._transform_performance_features,
            'cost_features': self._transform_cost_features,
            'security_features': self._transform_security_features,
            'aggregated_metrics': self._transform_aggregated_metrics,
            'time_series_features': self._transform_time_series_features,
        }
    
    async def process_jobs(self, jobs: List[ETLJob]) -> Dict[str, Any]:
        """Process multiple ETL jobs concurrently."""
        self.logger.info(f"Processing {len(jobs)} ETL jobs")
        
        results = {}
        futures = []
        
        # Submit jobs for execution
        for job in jobs:
            if job.enabled:
                future = self.executor.submit(self._process_single_job, job)
                futures.append((job.name, future))
        
        # Collect results
        for job_name, future in futures:
            try:
                result = future.result(timeout=3600)  # 1 hour timeout
                results[job_name] = result
                self.metrics.increment('jobs_completed')
            except Exception as e:
                self.logger.error(f"Job {job_name} failed: {e}")
                results[job_name] = {'status': 'failed', 'error': str(e)}
                self.metrics.increment('jobs_failed')
        
        return results
    
    def _process_single_job(self, job: ETLJob) -> Dict[str, Any]:
        """Process a single ETL job."""
        start_time = datetime.utcnow()
        self.logger.info(f"Starting ETL job: {job.name}")
        
        try:
            # Extract data
            raw_data = self._extract_data(job)
            if raw_data.empty:
                return {
                    'status': 'completed',
                    'message': 'No data to process',
                    'records_processed': 0,
                    'duration': 0
                }
            
            # Transform data
            transformed_data = self._transform_data(job, raw_data)
            
            # Validate data
            validation_result = self.validator.validate_features(transformed_data)
            if not validation_result.is_valid:
                raise ValueError(f"Data validation failed: {validation_result.errors}")
            
            # Load data to feature store
            self._load_data(job, transformed_data)
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                'status': 'completed',
                'records_processed': len(transformed_data),
                'duration': duration,
                'validation_summary': validation_result.summary,
                'timestamp': start_time.isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"ETL job {job.name} failed: {e}")
            raise
    
    def _extract_data(self, job: ETLJob) -> pd.DataFrame:
        """Extract data from source table."""
        # Calculate time window
        end_time = datetime.utcnow()
        window_delta = self._parse_window_size(job.window_size)
        start_time = end_time - window_delta
        
        # Build query based on source table
        query = self._build_extraction_query(job, start_time, end_time)
        
        # Execute query
        with self.db_manager.get_connection() as conn:
            df = pd.read_sql(query, conn)
        
        self.logger.info(f"Extracted {len(df)} records from {job.source_table}")
        return df
    
    def _build_extraction_query(self, job: ETLJob, start_time: datetime, end_time: datetime) -> str:
        """Build SQL query for data extraction."""
        base_queries = {
            'infrastructure_metrics': f"""
                SELECT 
                    timestamp,
                    source,
                    host,
                    service,
                    metric_name,
                    metric_value,
                    unit,
                    labels
                FROM infrastructure_metrics
                WHERE timestamp >= '{start_time}' AND timestamp < '{end_time}'
                ORDER BY timestamp
            """,
            
            'deployment_events': f"""
                SELECT 
                    timestamp,
                    source,
                    deployment_id,
                    service,
                    version,
                    environment,
                    status,
                    duration,
                    commit_hash,
                    user
                FROM deployment_events
                WHERE timestamp >= '{start_time}' AND timestamp < '{end_time}'
                ORDER BY timestamp
            """,
            
            'alert_events': f"""
                SELECT 
                    timestamp,
                    source,
                    alert_id,
                    alert_name,
                    severity,
                    status,
                    service,
                    description,
                    labels,
                    annotations
                FROM alert_events
                WHERE timestamp >= '{start_time}' AND timestamp < '{end_time}'
                ORDER BY timestamp
            """,
            
            'performance_metrics': f"""
                SELECT 
                    timestamp,
                    source,
                    service,
                    endpoint,
                    method,
                    response_time,
                    status_code,
                    error_rate,
                    throughput,
                    cpu_usage,
                    memory_usage
                FROM performance_metrics
                WHERE timestamp >= '{start_time}' AND timestamp < '{end_time}'
                ORDER BY timestamp
            """,
            
            'cost_metrics': f"""
                SELECT 
                    timestamp,
                    source,
                    resource_type,
                    resource_id,
                    service,
                    cost,
                    currency,
                    usage_quantity,
                    usage_unit,
                    tags
                FROM cost_metrics
                WHERE timestamp >= '{start_time}' AND timestamp < '{end_time}'
                ORDER BY timestamp
            """,
            
            'security_events': f"""
                SELECT 
                    timestamp,
                    source,
                    event_type,
                    user,
                    action,
                    resource,
                    ip_address,
                    user_agent,
                    status,
                    risk_score
                FROM security_events
                WHERE timestamp >= '{start_time}' AND timestamp < '{end_time}'
                ORDER BY timestamp
            """
        }
        
        return base_queries.get(job.source_table, f"""
            SELECT * FROM {job.source_table}
            WHERE timestamp >= '{start_time}' AND timestamp < '{end_time}'
            ORDER BY timestamp
        """)
    
    def _transform_data(self, job: ETLJob, data: pd.DataFrame) -> pd.DataFrame:
        """Transform data using the specified transform function."""
        transform_func = self.transform_functions.get(job.transform_function)
        if not transform_func:
            raise ValueError(f"Unknown transform function: {job.transform_function}")
        
        return transform_func(data, job.metadata)
    
    def _load_data(self, job: ETLJob, data: pd.DataFrame):
        """Load transformed data into feature store."""
        self.feature_store.write_features(
            feature_group=job.target_feature_group,
            data=data,
            timestamp_column='timestamp'
        )
    
    def _parse_window_size(self, window_size: str) -> timedelta:
        """Parse window size string into timedelta."""
        unit = window_size[-1].lower()
        value = int(window_size[:-1])
        
        if unit == 'h':
            return timedelta(hours=value)
        elif unit == 'd':
            return timedelta(days=value)
        elif unit == 'w':
            return timedelta(weeks=value)
        elif unit == 'm':
            return timedelta(minutes=value)
        else:
            raise ValueError(f"Unknown time unit: {unit}")
    
    # Transform functions
    
    def _transform_infrastructure_features(self, data: pd.DataFrame, metadata: Dict) -> pd.DataFrame:
        """Transform infrastructure metrics into ML features."""
        if data.empty:
            return pd.DataFrame()
        
        # Convert timestamp to datetime
        data['timestamp'] = pd.to_datetime(data['timestamp'])
        
        # Pivot metrics to columns
        pivot_data = data.pivot_table(
            index=['timestamp', 'host', 'service'],
            columns='metric_name',
            values='metric_value',
            aggfunc='mean'
        ).reset_index()
        
        # Add time-based features
        pivot_data['hour'] = pivot_data['timestamp'].dt.hour
        pivot_data['day_of_week'] = pivot_data['timestamp'].dt.dayofweek
        pivot_data['is_weekend'] = pivot_data['day_of_week'].isin([5, 6])
        
        # Calculate rolling statistics
        for col in pivot_data.select_dtypes(include=[np.number]).columns:
            if col not in ['hour', 'day_of_week', 'is_weekend']:
                pivot_data[f'{col}_rolling_mean_1h'] = pivot_data[col].rolling('1H', on='timestamp').mean()
                pivot_data[f'{col}_rolling_std_1h'] = pivot_data[col].rolling('1H', on='timestamp').std()
        
        # Add anomaly indicators
        numeric_cols = pivot_data.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if 'rolling' not in col:
                mean = pivot_data[col].mean()
                std = pivot_data[col].std()
                pivot_data[f'{col}_anomaly'] = np.abs(pivot_data[col] - mean) > (2 * std)
        
        return pivot_data.fillna(0)
    
    def _transform_deployment_features(self, data: pd.DataFrame, metadata: Dict) -> pd.DataFrame:
        """Transform deployment events into ML features."""
        if data.empty:
            return pd.DataFrame()
        
        data['timestamp'] = pd.to_datetime(data['timestamp'])
        
        # Aggregate by service and time window
        features = []
        
        for service in data['service'].unique():
            service_data = data[data['service'] == service].copy()
            
            # Resample to hourly buckets
            service_data = service_data.set_index('timestamp')
            hourly = service_data.resample('1H').agg({
                'deployment_id': 'count',
                'duration': ['mean', 'std', 'max'],
                'status': lambda x: (x == 'success').sum() / len(x) if len(x) > 0 else 0
            })
            
            hourly.columns = ['deployment_count', 'avg_duration', 'duration_std', 'max_duration', 'success_rate']
            hourly['service'] = service
            hourly = hourly.reset_index()
            
            # Add deployment frequency features
            hourly['deployments_last_24h'] = hourly['deployment_count'].rolling(24).sum()
            hourly['avg_time_between_deployments'] = 3600 / hourly['deployment_count'].replace(0, np.inf)
            
            features.append(hourly)
        
        if features:
            result = pd.concat(features, ignore_index=True)
            return result.fillna(0)
        
        return pd.DataFrame()
    
    def _transform_alert_features(self, data: pd.DataFrame, metadata: Dict) -> pd.DataFrame:
        """Transform alert events into ML features."""
        if data.empty:
            return pd.DataFrame()
        
        data['timestamp'] = pd.to_datetime(data['timestamp'])
        
        # Create severity mapping
        severity_map = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4}
        data['severity_score'] = data['severity'].map(severity_map).fillna(1)
        
        # Aggregate by service and time
        features = []
        
        for service in data['service'].unique():
            service_data = data[data['service'] == service].copy()
            service_data = service_data.set_index('timestamp')
            
            hourly = service_data.resample('1H').agg({
                'alert_id': 'count',
                'severity_score': ['mean', 'max', 'sum'],
                'status': lambda x: (x == 'firing').sum()
            })
            
            hourly.columns = ['alert_count', 'avg_severity', 'max_severity', 'total_severity', 'active_alerts']
            hourly['service'] = service
            hourly = hourly.reset_index()
            
            # Add alert patterns
            hourly['alerts_last_24h'] = hourly['alert_count'].rolling(24).sum()
            hourly['alert_escalation_rate'] = hourly['total_severity'] / hourly['alert_count'].replace(0, 1)
            
            features.append(hourly)
        
        if features:
            result = pd.concat(features, ignore_index=True)
            return result.fillna(0)
        
        return pd.DataFrame()
    
    def _transform_performance_features(self, data: pd.DataFrame, metadata: Dict) -> pd.DataFrame:
        """Transform performance metrics into ML features."""
        if data.empty:
            return pd.DataFrame()
        
        data['timestamp'] = pd.to_datetime(data['timestamp'])
        
        # Group by service and endpoint
        features = []
        
        for service in data['service'].unique():
            service_data = data[data['service'] == service].copy()
            service_data = service_data.set_index('timestamp')
            
            # Aggregate performance metrics
            hourly = service_data.resample('1H').agg({
                'response_time': ['mean', 'median', 'std', 'max', 'quantile'],
                'error_rate': ['mean', 'max'],
                'throughput': ['mean', 'sum'],
                'cpu_usage': ['mean', 'max'],
                'memory_usage': ['mean', 'max'],
                'status_code': lambda x: (x >= 500).sum() / len(x) if len(x) > 0 else 0
            })
            
            # Flatten column names
            hourly.columns = [f'{col[0]}_{col[1]}' for col in hourly.columns]
            hourly['service'] = service
            hourly = hourly.reset_index()
            
            # Add performance degradation indicators
            hourly['response_time_trend'] = hourly['response_time_mean'].rolling(6).apply(
                lambda x: np.polyfit(range(len(x)), x, 1)[0] if len(x) > 1 else 0
            )
            
            hourly['error_rate_spike'] = hourly['error_rate_mean'] > hourly['error_rate_mean'].rolling(24).mean() + 2 * hourly['error_rate_mean'].rolling(24).std()
            
            features.append(hourly)
        
        if features:
            result = pd.concat(features, ignore_index=True)
            return result.fillna(0)
        
        return pd.DataFrame()
    
    def _transform_cost_features(self, data: pd.DataFrame, metadata: Dict) -> pd.DataFrame:
        """Transform cost metrics into ML features."""
        if data.empty:
            return pd.DataFrame()
        
        data['timestamp'] = pd.to_datetime(data['timestamp'])
        
        # Group by service and resource type
        features = []
        
        for service in data['service'].unique():
            service_data = data[data['service'] == service].copy()
            service_data = service_data.set_index('timestamp')
            
            daily = service_data.resample('1D').agg({
                'cost': ['sum', 'mean'],
                'usage_quantity': ['sum', 'mean', 'max']
            })
            
            daily.columns = ['total_cost', 'avg_cost', 'total_usage', 'avg_usage', 'peak_usage']
            daily['service'] = service
            daily = daily.reset_index()
            
            # Add cost trends
            daily['cost_trend_7d'] = daily['total_cost'].rolling(7).apply(
                lambda x: np.polyfit(range(len(x)), x, 1)[0] if len(x) > 1 else 0
            )
            
            daily['cost_efficiency'] = daily['total_cost'] / daily['total_usage'].replace(0, 1)
            
            features.append(daily)
        
        if features:
            result = pd.concat(features, ignore_index=True)
            return result.fillna(0)
        
        return pd.DataFrame()
    
    def _transform_security_features(self, data: pd.DataFrame, metadata: Dict) -> pd.DataFrame:
        """Transform security events into ML features."""
        if data.empty:
            return pd.DataFrame()
        
        data['timestamp'] = pd.to_datetime(data['timestamp'])
        
        # Aggregate security events
        features = []
        
        # Group by time windows
        data_indexed = data.set_index('timestamp')
        
        hourly = data_indexed.resample('1H').agg({
            'event_type': 'count',
            'risk_score': ['mean', 'max', 'sum'],
            'status': lambda x: (x == 'blocked').sum(),
            'user': 'nunique',
            'ip_address': 'nunique'
        })
        
        hourly.columns = ['event_count', 'avg_risk', 'max_risk', 'total_risk', 'blocked_events', 'unique_users', 'unique_ips']
        hourly = hourly.reset_index()
        
        # Add security indicators
        hourly['high_risk_events'] = hourly['max_risk'] > 7
        hourly['suspicious_activity'] = hourly['event_count'] > hourly['event_count'].rolling(24).mean() + 2 * hourly['event_count'].rolling(24).std()
        
        return hourly.fillna(0)
    
    def _transform_aggregated_metrics(self, data: pd.DataFrame, metadata: Dict) -> pd.DataFrame:
        """Create aggregated metrics across all data sources."""
        # This would combine features from multiple sources
        # Implementation depends on specific requirements
        return data
    
    def _transform_time_series_features(self, data: pd.DataFrame, metadata: Dict) -> pd.DataFrame:
        """Create time series features for forecasting models."""
        if data.empty:
            return pd.DataFrame()
        
        data['timestamp'] = pd.to_datetime(data['timestamp'])
        
        # Add time-based features
        data['hour'] = data['timestamp'].dt.hour
        data['day_of_week'] = data['timestamp'].dt.dayofweek
        data['day_of_month'] = data['timestamp'].dt.day
        data['month'] = data['timestamp'].dt.month
        data['quarter'] = data['timestamp'].dt.quarter
        data['is_weekend'] = data['day_of_week'].isin([5, 6])
        data['is_business_hour'] = data['hour'].between(9, 17)
        
        # Add lag features
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if col not in ['hour', 'day_of_week', 'day_of_month', 'month', 'quarter']:
                data[f'{col}_lag_1h'] = data[col].shift(1)
                data[f'{col}_lag_24h'] = data[col].shift(24)
                data[f'{col}_lag_7d'] = data[col].shift(24*7)
        
        return data.fillna(0)
    
    def get_job_status(self, job_name: str) -> Dict[str, Any]:
        """Get status of a specific ETL job."""
        # Implementation would track job status
        return {
            'name': job_name,
            'status': 'unknown',
            'last_run': None,
            'next_run': None,
            'metrics': {}
        }