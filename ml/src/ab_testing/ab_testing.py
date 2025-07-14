"""
A/B Testing Framework for ML Models

Enables controlled experiments between different model versions,
statistical significance testing, and automated traffic routing.
"""

import logging
import random
import time
import hashlib
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import pandas as pd
import numpy as np
from scipy import stats
import json

from ..model_registry.model_registry import ModelRegistry
from ..utils.monitoring import MetricsCollector
from ..config import get_database_config
from ..utils.database import DatabaseManager


class ExperimentStatus(str, Enum):
    """Experiment status values."""
    DRAFT = "draft"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class ExperimentArm:
    """Single arm of an A/B test experiment."""
    name: str
    model_name: str
    model_version: str
    traffic_percentage: float
    description: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ExperimentConfig:
    """A/B test experiment configuration."""
    experiment_id: str
    name: str
    description: str
    arms: List[ExperimentArm]
    success_metrics: List[str]
    minimum_sample_size: int
    confidence_level: float
    test_duration_days: int
    created_by: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    status: ExperimentStatus = ExperimentStatus.DRAFT


@dataclass
class ExperimentResult:
    """Individual experiment result record."""
    experiment_id: str
    arm_name: str
    user_id: str
    timestamp: datetime
    prediction: Any
    actual_outcome: Optional[Any] = None
    metrics: Dict[str, float] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ExperimentSummary:
    """Experiment summary with statistical analysis."""
    experiment_id: str
    status: ExperimentStatus
    start_time: datetime
    end_time: Optional[datetime]
    total_samples: int
    arm_statistics: Dict[str, Dict[str, float]]
    significance_tests: Dict[str, Dict[str, float]]
    winner: Optional[str]
    confidence_interval: Dict[str, Tuple[float, float]]


class ABTestingFramework:
    """
    Comprehensive A/B testing framework for ML models.
    
    Features:
    - Multi-arm experiments
    - Statistical significance testing
    - Automated traffic routing
    - Performance monitoring
    - Early stopping mechanisms
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.metrics = MetricsCollector("ab_testing")
        self.model_registry = ModelRegistry()
        
        # Database setup
        db_config = get_database_config()
        self.db_manager = DatabaseManager(db_config)
        
        # Active experiments cache
        self.active_experiments: Dict[str, ExperimentConfig] = {}
        self.experiment_results: Dict[str, List[ExperimentResult]] = {}
        
        self._setup_database_schema()
        self._load_active_experiments()
    
    def _setup_database_schema(self):
        """Setup database tables for A/B testing."""
        schema_sql = """
        CREATE TABLE IF NOT EXISTS ab_experiments (
            experiment_id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            config JSONB NOT NULL,
            status VARCHAR(50) NOT NULL,
            created_by VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS ab_experiment_results (
            id SERIAL PRIMARY KEY,
            experiment_id VARCHAR(255) NOT NULL,
            arm_name VARCHAR(255) NOT NULL,
            user_id VARCHAR(255) NOT NULL,
            timestamp TIMESTAMP NOT NULL,
            prediction JSONB,
            actual_outcome JSONB,
            metrics JSONB,
            metadata JSONB,
            FOREIGN KEY (experiment_id) REFERENCES ab_experiments(experiment_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_ab_results_experiment_id ON ab_experiment_results(experiment_id);
        CREATE INDEX IF NOT EXISTS idx_ab_results_timestamp ON ab_experiment_results(timestamp);
        CREATE INDEX IF NOT EXISTS idx_ab_results_arm_name ON ab_experiment_results(arm_name);
        """
        
        self.db_manager.execute_non_query(schema_sql)
        self.logger.info("A/B testing database schema created")
    
    def _load_active_experiments(self):
        """Load active experiments from database."""
        try:
            query = """
            SELECT experiment_id, name, description, config, status, created_by, created_at
            FROM ab_experiments
            WHERE status IN ('running', 'paused')
            """
            
            results = self.db_manager.execute_query(query)
            
            for _, row in results.iterrows():
                config_data = row['config']
                
                # Reconstruct experiment config
                arms = [
                    ExperimentArm(**arm_data) 
                    for arm_data in config_data['arms']
                ]
                
                experiment = ExperimentConfig(
                    experiment_id=row['experiment_id'],
                    name=row['name'],
                    description=row['description'],
                    arms=arms,
                    success_metrics=config_data['success_metrics'],
                    minimum_sample_size=config_data['minimum_sample_size'],
                    confidence_level=config_data['confidence_level'],
                    test_duration_days=config_data['test_duration_days'],
                    created_by=row['created_by'],
                    created_at=row['created_at'],
                    status=ExperimentStatus(row['status'])
                )
                
                self.active_experiments[experiment.experiment_id] = experiment
            
            self.logger.info(f"Loaded {len(self.active_experiments)} active experiments")
            
        except Exception as e:
            self.logger.error(f"Failed to load active experiments: {e}")
    
    def create_experiment(
        self,
        name: str,
        description: str,
        arms: List[ExperimentArm],
        success_metrics: List[str],
        minimum_sample_size: int = 1000,
        confidence_level: float = 0.95,
        test_duration_days: int = 14,
        created_by: str = "system"
    ) -> ExperimentConfig:
        """Create a new A/B test experiment."""
        
        # Validate arms
        total_traffic = sum(arm.traffic_percentage for arm in arms)
        if abs(total_traffic - 100.0) > 0.01:
            raise ValueError(f"Traffic percentages must sum to 100%, got {total_traffic}")
        
        # Validate models exist
        for arm in arms:
            try:
                self.model_registry.get_model_info(arm.model_name, arm.model_version)
            except Exception as e:
                raise ValueError(f"Model {arm.model_name} v{arm.model_version} not found: {e}")
        
        # Generate experiment ID
        experiment_id = f"exp_{int(time.time())}_{random.randint(1000, 9999)}"
        
        experiment = ExperimentConfig(
            experiment_id=experiment_id,
            name=name,
            description=description,
            arms=arms,
            success_metrics=success_metrics,
            minimum_sample_size=minimum_sample_size,
            confidence_level=confidence_level,
            test_duration_days=test_duration_days,
            created_by=created_by
        )
        
        # Save to database
        config_data = {
            'arms': [
                {
                    'name': arm.name,
                    'model_name': arm.model_name,
                    'model_version': arm.model_version,
                    'traffic_percentage': arm.traffic_percentage,
                    'description': arm.description,
                    'metadata': arm.metadata
                }
                for arm in arms
            ],
            'success_metrics': success_metrics,
            'minimum_sample_size': minimum_sample_size,
            'confidence_level': confidence_level,
            'test_duration_days': test_duration_days
        }
        
        insert_query = """
        INSERT INTO ab_experiments (experiment_id, name, description, config, status, created_by)
        VALUES (%(experiment_id)s, %(name)s, %(description)s, %(config)s, %(status)s, %(created_by)s)
        """
        
        self.db_manager.execute_non_query(
            insert_query,
            {
                'experiment_id': experiment_id,
                'name': name,
                'description': description,
                'config': json.dumps(config_data),
                'status': experiment.status.value,
                'created_by': created_by
            }
        )
        
        self.logger.info(f"Created experiment {experiment_id}: {name}")
        self.metrics.increment('experiments_created')
        
        return experiment
    
    def start_experiment(self, experiment_id: str) -> bool:
        """Start an experiment."""
        try:
            # Update database
            update_query = """
            UPDATE ab_experiments 
            SET status = 'running', updated_at = CURRENT_TIMESTAMP
            WHERE experiment_id = %s
            """
            
            self.db_manager.execute_non_query(update_query, (experiment_id,))
            
            # Load into active experiments
            self._load_active_experiments()
            
            self.logger.info(f"Started experiment {experiment_id}")
            self.metrics.increment('experiments_started')
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to start experiment {experiment_id}: {e}")
            return False
    
    def pause_experiment(self, experiment_id: str) -> bool:
        """Pause a running experiment."""
        try:
            update_query = """
            UPDATE ab_experiments 
            SET status = 'paused', updated_at = CURRENT_TIMESTAMP
            WHERE experiment_id = %s
            """
            
            self.db_manager.execute_non_query(update_query, (experiment_id,))
            
            # Update local cache
            if experiment_id in self.active_experiments:
                self.active_experiments[experiment_id].status = ExperimentStatus.PAUSED
            
            self.logger.info(f"Paused experiment {experiment_id}")
            self.metrics.increment('experiments_paused')
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to pause experiment {experiment_id}: {e}")
            return False
    
    def stop_experiment(self, experiment_id: str, reason: str = "manual") -> bool:
        """Stop an experiment."""
        try:
            update_query = """
            UPDATE ab_experiments 
            SET status = 'completed', updated_at = CURRENT_TIMESTAMP
            WHERE experiment_id = %s
            """
            
            self.db_manager.execute_non_query(update_query, (experiment_id,))
            
            # Remove from active experiments
            self.active_experiments.pop(experiment_id, None)
            
            self.logger.info(f"Stopped experiment {experiment_id}: {reason}")
            self.metrics.increment('experiments_stopped')
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to stop experiment {experiment_id}: {e}")
            return False
    
    def assign_user_to_arm(self, experiment_id: str, user_id: str) -> Optional[ExperimentArm]:
        """Assign a user to an experiment arm using consistent hashing."""
        experiment = self.active_experiments.get(experiment_id)
        if not experiment or experiment.status != ExperimentStatus.RUNNING:
            return None
        
        # Create deterministic hash from experiment_id + user_id
        hash_input = f"{experiment_id}:{user_id}"
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
        percentage = (hash_value % 10000) / 100.0  # 0-99.99%
        
        # Find appropriate arm based on traffic allocation
        cumulative_percentage = 0.0
        for arm in experiment.arms:
            cumulative_percentage += arm.traffic_percentage
            if percentage < cumulative_percentage:
                return arm
        
        # Fallback to last arm
        return experiment.arms[-1] if experiment.arms else None
    
    def get_model_for_user(
        self, 
        experiment_id: str, 
        user_id: str
    ) -> Optional[Tuple[str, str]]:
        """Get the model (name, version) for a specific user in an experiment."""
        arm = self.assign_user_to_arm(experiment_id, user_id)
        if arm:
            return (arm.model_name, arm.model_version)
        return None
    
    def record_result(
        self,
        experiment_id: str,
        user_id: str,
        prediction: Any,
        actual_outcome: Optional[Any] = None,
        metrics: Optional[Dict[str, float]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Record an experiment result."""
        experiment = self.active_experiments.get(experiment_id)
        if not experiment:
            self.logger.warning(f"Experiment {experiment_id} not found or not active")
            return
        
        arm = self.assign_user_to_arm(experiment_id, user_id)
        if not arm:
            self.logger.warning(f"Could not assign user {user_id} to arm in experiment {experiment_id}")
            return
        
        result = ExperimentResult(
            experiment_id=experiment_id,
            arm_name=arm.name,
            user_id=user_id,
            timestamp=datetime.utcnow(),
            prediction=prediction,
            actual_outcome=actual_outcome,
            metrics=metrics or {},
            metadata=metadata or {}
        )
        
        # Store in database
        insert_query = """
        INSERT INTO ab_experiment_results 
        (experiment_id, arm_name, user_id, timestamp, prediction, actual_outcome, metrics, metadata)
        VALUES (%(experiment_id)s, %(arm_name)s, %(user_id)s, %(timestamp)s, %(prediction)s, %(actual_outcome)s, %(metrics)s, %(metadata)s)
        """
        
        self.db_manager.execute_non_query(
            insert_query,
            {
                'experiment_id': experiment_id,
                'arm_name': arm.name,
                'user_id': user_id,
                'timestamp': result.timestamp,
                'prediction': json.dumps(prediction),
                'actual_outcome': json.dumps(actual_outcome),
                'metrics': json.dumps(metrics or {}),
                'metadata': json.dumps(metadata or {})
            }
        )
        
        self.metrics.increment('results_recorded', tags={'experiment_id': experiment_id})
    
    def analyze_experiment(self, experiment_id: str) -> ExperimentSummary:
        """Perform statistical analysis of experiment results."""
        experiment = self.active_experiments.get(experiment_id)
        if not experiment:
            raise ValueError(f"Experiment {experiment_id} not found")
        
        # Get results from database
        query = """
        SELECT arm_name, user_id, timestamp, prediction, actual_outcome, metrics
        FROM ab_experiment_results
        WHERE experiment_id = %s
        ORDER BY timestamp
        """
        
        results_df = self.db_manager.execute_query(query, (experiment_id,))
        
        if results_df.empty:
            return ExperimentSummary(
                experiment_id=experiment_id,
                status=experiment.status,
                start_time=experiment.created_at,
                end_time=None,
                total_samples=0,
                arm_statistics={},
                significance_tests={},
                winner=None,
                confidence_interval={}
            )
        
        # Calculate statistics for each arm
        arm_stats = {}
        significance_tests = {}
        
        for arm in experiment.arms:
            arm_data = results_df[results_df['arm_name'] == arm.name]
            
            if len(arm_data) > 0:
                # Parse metrics
                metrics_data = []
                for _, row in arm_data.iterrows():
                    if row['metrics']:
                        metrics_dict = json.loads(row['metrics']) if isinstance(row['metrics'], str) else row['metrics']
                        metrics_data.append(metrics_dict)
                
                # Calculate basic statistics
                arm_stats[arm.name] = {
                    'sample_size': len(arm_data),
                    'conversion_rate': len([m for m in metrics_data if m.get('conversion', False)]) / len(arm_data) if metrics_data else 0,
                    'avg_metrics': self._calculate_average_metrics(metrics_data)
                }
        
        # Perform significance tests between arms
        if len(arm_stats) >= 2:
            significance_tests = self._perform_significance_tests(experiment_id, arm_stats)
        
        # Determine winner
        winner = self._determine_winner(arm_stats, significance_tests, experiment.success_metrics)
        
        # Calculate confidence intervals
        confidence_interval = self._calculate_confidence_intervals(arm_stats, experiment.confidence_level)
        
        return ExperimentSummary(
            experiment_id=experiment_id,
            status=experiment.status,
            start_time=experiment.created_at,
            end_time=None,  # Would need to track this
            total_samples=len(results_df),
            arm_statistics=arm_stats,
            significance_tests=significance_tests,
            winner=winner,
            confidence_interval=confidence_interval
        )
    
    def _calculate_average_metrics(self, metrics_data: List[Dict[str, Any]]) -> Dict[str, float]:
        """Calculate average metrics across samples."""
        if not metrics_data:
            return {}
        
        avg_metrics = {}
        for metric_name in metrics_data[0].keys():
            values = [m.get(metric_name, 0) for m in metrics_data if isinstance(m.get(metric_name), (int, float))]
            if values:
                avg_metrics[metric_name] = np.mean(values)
        
        return avg_metrics
    
    def _perform_significance_tests(
        self, 
        experiment_id: str, 
        arm_stats: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Dict[str, float]]:
        """Perform statistical significance tests between arms."""
        significance_tests = {}
        
        arm_names = list(arm_stats.keys())
        
        # Compare each pair of arms
        for i in range(len(arm_names)):
            for j in range(i + 1, len(arm_names)):
                arm_a = arm_names[i]
                arm_b = arm_names[j]
                
                # Get conversion rates
                conv_a = arm_stats[arm_a]['conversion_rate']
                conv_b = arm_stats[arm_b]['conversion_rate']
                n_a = arm_stats[arm_a]['sample_size']
                n_b = arm_stats[arm_b]['sample_size']
                
                # Perform two-proportion z-test
                if n_a > 0 and n_b > 0:
                    # Calculate pooled proportion
                    p_pool = (conv_a * n_a + conv_b * n_b) / (n_a + n_b)
                    
                    # Calculate standard error
                    se = np.sqrt(p_pool * (1 - p_pool) * (1/n_a + 1/n_b))
                    
                    # Calculate z-score
                    if se > 0:
                        z_score = (conv_a - conv_b) / se
                        p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))
                    else:
                        z_score = 0
                        p_value = 1.0
                    
                    test_key = f"{arm_a}_vs_{arm_b}"
                    significance_tests[test_key] = {
                        'z_score': z_score,
                        'p_value': p_value,
                        'is_significant': p_value < 0.05,
                        'effect_size': conv_a - conv_b
                    }
        
        return significance_tests
    
    def _determine_winner(
        self, 
        arm_stats: Dict[str, Dict[str, Any]], 
        significance_tests: Dict[str, Dict[str, float]],
        success_metrics: List[str]
    ) -> Optional[str]:
        """Determine the winning arm based on statistical significance."""
        if not arm_stats or len(arm_stats) < 2:
            return None
        
        # Find arm with highest conversion rate
        best_arm = max(arm_stats.keys(), key=lambda arm: arm_stats[arm]['conversion_rate'])
        
        # Check if the best arm is significantly better than others
        for test_key, test_result in significance_tests.items():
            if best_arm in test_key and test_result['is_significant'] and test_result['effect_size'] > 0:
                return best_arm
        
        # No significant winner
        return None
    
    def _calculate_confidence_intervals(
        self, 
        arm_stats: Dict[str, Dict[str, Any]], 
        confidence_level: float
    ) -> Dict[str, Tuple[float, float]]:
        """Calculate confidence intervals for conversion rates."""
        confidence_intervals = {}
        z_score = stats.norm.ppf((1 + confidence_level) / 2)
        
        for arm_name, stats_data in arm_stats.items():
            p = stats_data['conversion_rate']
            n = stats_data['sample_size']
            
            if n > 0:
                se = np.sqrt(p * (1 - p) / n)
                margin_error = z_score * se
                
                lower_bound = max(0, p - margin_error)
                upper_bound = min(1, p + margin_error)
                
                confidence_intervals[arm_name] = (lower_bound, upper_bound)
            else:
                confidence_intervals[arm_name] = (0.0, 0.0)
        
        return confidence_intervals
    
    def check_early_stopping(self, experiment_id: str) -> bool:
        """Check if experiment should be stopped early due to significance."""
        summary = self.analyze_experiment(experiment_id)
        experiment = self.active_experiments.get(experiment_id)
        
        if not experiment or summary.total_samples < experiment.minimum_sample_size:
            return False
        
        # Check if we have a significant winner
        if summary.winner and any(
            test['is_significant'] for test in summary.significance_tests.values()
        ):
            self.logger.info(f"Early stopping experiment {experiment_id}: significant results found")
            return True
        
        # Check if experiment has run for maximum duration
        if experiment.created_at + timedelta(days=experiment.test_duration_days) < datetime.utcnow():
            self.logger.info(f"Stopping experiment {experiment_id}: maximum duration reached")
            return True
        
        return False
    
    def get_experiment_status(self, experiment_id: str) -> Dict[str, Any]:
        """Get current status of an experiment."""
        experiment = self.active_experiments.get(experiment_id)
        if not experiment:
            return {'error': 'Experiment not found'}
        
        try:
            summary = self.analyze_experiment(experiment_id)
            
            return {
                'experiment_id': experiment_id,
                'name': experiment.name,
                'status': experiment.status.value,
                'created_at': experiment.created_at.isoformat(),
                'total_samples': summary.total_samples,
                'arms': [
                    {
                        'name': arm.name,
                        'model_name': arm.model_name,
                        'model_version': arm.model_version,
                        'traffic_percentage': arm.traffic_percentage,
                        'statistics': summary.arm_statistics.get(arm.name, {})
                    }
                    for arm in experiment.arms
                ],
                'winner': summary.winner,
                'significance_tests': summary.significance_tests,
                'should_stop_early': self.check_early_stopping(experiment_id)
            }
            
        except Exception as e:
            self.logger.error(f"Error getting experiment status: {e}")
            return {'error': str(e)}
    
    def list_experiments(self, status: Optional[ExperimentStatus] = None) -> List[Dict[str, Any]]:
        """List all experiments, optionally filtered by status."""
        try:
            query = "SELECT experiment_id, name, description, status, created_by, created_at FROM ab_experiments"
            params = []
            
            if status:
                query += " WHERE status = %s"
                params.append(status.value)
            
            query += " ORDER BY created_at DESC"
            
            results = self.db_manager.execute_query(query, params)
            
            experiments = []
            for _, row in results.iterrows():
                experiments.append({
                    'experiment_id': row['experiment_id'],
                    'name': row['name'],
                    'description': row['description'],
                    'status': row['status'],
                    'created_by': row['created_by'],
                    'created_at': row['created_at'].isoformat()
                })
            
            return experiments
            
        except Exception as e:
            self.logger.error(f"Error listing experiments: {e}")
            return []
    
    def get_experiment_metrics(self) -> Dict[str, Any]:
        """Get overall A/B testing metrics."""
        try:
            # Get experiment counts by status
            status_query = """
            SELECT status, COUNT(*) as count
            FROM ab_experiments
            GROUP BY status
            """
            
            status_counts = self.db_manager.execute_query(status_query)
            status_dict = dict(zip(status_counts['status'], status_counts['count']))
            
            # Get total results count
            results_query = "SELECT COUNT(*) as total_results FROM ab_experiment_results"
            total_results = self.db_manager.execute_query(results_query)['total_results'].iloc[0]
            
            return {
                'total_experiments': sum(status_dict.values()),
                'experiments_by_status': status_dict,
                'total_results': int(total_results),
                'active_experiments': len(self.active_experiments),
                'metrics': self.metrics.get_all_metrics()
            }
            
        except Exception as e:
            self.logger.error(f"Error getting experiment metrics: {e}")
            return {}