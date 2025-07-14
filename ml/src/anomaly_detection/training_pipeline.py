"""
Anomaly Detection Training Pipeline

Automated training pipeline for anomaly detection models with:
- Data preparation and feature engineering
- Model training and validation
- Hyperparameter tuning
- Model evaluation and comparison
- Automated model deployment
"""

import logging
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
import mlflow
import mlflow.sklearn
import mlflow.tensorflow
from sklearn.model_selection import train_test_split, TimeSeriesSplit
from sklearn.metrics import classification_report
import optuna

from .anomaly_detector import AnomalyDetector, AnomalyAlgorithm, ModelPerformance
from .time_series_anomaly import TimeSeriesAnomalyDetector
from ..feature_store.feature_store import FeatureStore
from ..config import get_feature_store_config, get_model_config
from ..utils.monitoring import MetricsCollector
from ..model_registry.model_registry import ModelRegistry


class AnomalyDetectionTrainingPipeline:
    """
    Comprehensive training pipeline for anomaly detection models.
    
    Handles the entire ML lifecycle from data preparation to model deployment.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.metrics = MetricsCollector("anomaly_training")
        self.model_registry = ModelRegistry()
        
        # Initialize feature store
        fs_config = get_feature_store_config()
        self.feature_store = FeatureStore(fs_config)
        
        # Model configuration
        self.config = get_model_config()
        
        # Training state
        self.trained_models = {}
        self.evaluation_results = {}
        self.best_model = None
    
    def prepare_training_data(
        self,
        feature_view: str,
        start_date: datetime,
        end_date: datetime,
        entity_columns: List[str],
        target_column: Optional[str] = None,
        anomaly_ratio: float = 0.1
    ) -> Tuple[pd.DataFrame, pd.DataFrame, Optional[pd.Series]]:
        """Prepare training data from feature store."""
        
        self.logger.info(f"Preparing training data from {start_date} to {end_date}")
        
        # Create entity DataFrame for historical features
        entities_df = pd.DataFrame()
        
        # Generate time series of entities (simplified - in practice, this would come from your data)
        date_range = pd.date_range(start=start_date, end=end_date, freq='H')
        
        # For demo purposes, create sample entities
        sample_entities = [f"server_{i}" for i in range(1, 11)]
        
        entity_data = []
        for timestamp in date_range:
            for entity in sample_entities:
                entity_data.append({
                    'timestamp': timestamp,
                    'entity_id': entity
                })
        
        entities_df = pd.DataFrame(entity_data)
        
        # Get historical features
        try:
            features_df = self.feature_store.get_historical_features(
                feature_view=feature_view,
                entities=entities_df,
                timestamp_column='timestamp',
                start_time=start_date,
                end_time=end_date
            )
        except Exception as e:
            self.logger.warning(f"Feature store query failed: {e}")
            # Generate synthetic data for demo
            features_df = self._generate_synthetic_data(entities_df, anomaly_ratio)
        
        # Prepare features and labels
        X = features_df.drop(columns=['timestamp'] + entity_columns + ([target_column] if target_column else []))
        
        # Handle missing values
        X = X.fillna(X.mean())
        
        # Generate labels if not provided
        if target_column and target_column in features_df.columns:
            y = features_df[target_column]
        else:
            y = self._generate_synthetic_labels(X, anomaly_ratio)
        
        self.logger.info(f"Prepared training data: {len(X)} samples, {X.shape[1]} features")
        self.metrics.increment('datasets_prepared')
        
        return X, features_df[['timestamp'] + entity_columns], y
    
    def _generate_synthetic_data(self, entities_df: pd.DataFrame, anomaly_ratio: float) -> pd.DataFrame:
        """Generate synthetic DevOps metrics data for training."""
        np.random.seed(42)
        
        synthetic_data = []
        
        for _, row in entities_df.iterrows():
            timestamp = row['timestamp']
            entity_id = row['entity_id']
            
            # Generate normal patterns with some seasonality
            hour = timestamp.hour
            day_of_week = timestamp.weekday()
            
            # Base metrics with daily and weekly patterns
            cpu_base = 30 + 20 * np.sin(2 * np.pi * hour / 24) + 10 * np.sin(2 * np.pi * day_of_week / 7)
            memory_base = 50 + 15 * np.sin(2 * np.pi * hour / 24) + 5 * np.sin(2 * np.pi * day_of_week / 7)
            
            # Add noise
            cpu_usage = max(0, min(100, cpu_base + np.random.normal(0, 5)))
            memory_usage = max(0, min(100, memory_base + np.random.normal(0, 3)))
            
            # Network and disk metrics
            network_in = max(0, 1000 + 500 * np.sin(2 * np.pi * hour / 24) + np.random.normal(0, 100))
            network_out = max(0, 800 + 400 * np.sin(2 * np.pi * hour / 24) + np.random.normal(0, 80))
            disk_io = max(0, 200 + 100 * np.sin(2 * np.pi * hour / 24) + np.random.normal(0, 20))
            
            # Response time and error rate
            response_time = max(0, 100 + 50 * np.sin(2 * np.pi * hour / 24) + np.random.normal(0, 10))
            error_rate = max(0, min(1, 0.01 + 0.005 * np.sin(2 * np.pi * hour / 24) + np.random.normal(0, 0.002)))
            
            # Inject anomalies
            is_anomaly = np.random.random() < anomaly_ratio
            if is_anomaly:
                # Different types of anomalies
                anomaly_type = np.random.choice(['spike', 'dip', 'shift'])
                if anomaly_type == 'spike':
                    cpu_usage = min(100, cpu_usage * np.random.uniform(1.5, 3.0))
                    memory_usage = min(100, memory_usage * np.random.uniform(1.3, 2.0))
                    response_time *= np.random.uniform(2.0, 5.0)
                elif anomaly_type == 'dip':
                    cpu_usage *= np.random.uniform(0.1, 0.5)
                    network_in *= np.random.uniform(0.2, 0.6)
                elif anomaly_type == 'shift':
                    cpu_usage += np.random.uniform(20, 40)
                    memory_usage += np.random.uniform(15, 30)
            
            data_point = {
                'timestamp': timestamp,
                'entity_id': entity_id,
                'cpu_usage': cpu_usage,
                'memory_usage': memory_usage,
                'network_in': network_in,
                'network_out': network_out,
                'disk_io': disk_io,
                'response_time': response_time,
                'error_rate': error_rate,
                'is_anomaly': is_anomaly
            }
            
            synthetic_data.append(data_point)
        
        return pd.DataFrame(synthetic_data)
    
    def _generate_synthetic_labels(self, X: pd.DataFrame, anomaly_ratio: float) -> pd.Series:
        """Generate synthetic anomaly labels."""
        np.random.seed(42)
        n_anomalies = int(len(X) * anomaly_ratio)
        
        labels = [0] * len(X)
        anomaly_indices = np.random.choice(len(X), n_anomalies, replace=False)
        
        for idx in anomaly_indices:
            labels[idx] = 1
        
        return pd.Series(labels)
    
    def train_single_model(
        self,
        algorithm: AnomalyAlgorithm,
        X_train: pd.DataFrame,
        y_train: Optional[pd.Series] = None,
        hyperparams: Optional[Dict[str, Any]] = None
    ) -> AnomalyDetector:
        """Train a single anomaly detection model."""
        
        self.logger.info(f"Training {algorithm.value} model")
        
        # Initialize detector
        detector = AnomalyDetector(algorithm=algorithm)
        
        # Apply hyperparameters if provided
        if hyperparams:
            self._apply_hyperparameters(detector, hyperparams)
        
        # Train model
        feature_names = list(X_train.columns)
        detector.fit(X_train.values, y_train.values if y_train is not None else None, feature_names)
        
        self.logger.info(f"Successfully trained {algorithm.value} model")
        self.metrics.increment('models_trained', tags={'algorithm': algorithm.value})
        
        return detector
    
    def _apply_hyperparameters(self, detector: AnomalyDetector, hyperparams: Dict[str, Any]):
        """Apply hyperparameters to model."""
        if detector.algorithm == AnomalyAlgorithm.ISOLATION_FOREST:
            if 'contamination' in hyperparams:
                detector.models['isolation_forest'].contamination = hyperparams['contamination']
            if 'n_estimators' in hyperparams:
                detector.models['isolation_forest'].n_estimators = hyperparams['n_estimators']
        
        elif detector.algorithm == AnomalyAlgorithm.ONECLASS_SVM:
            if 'nu' in hyperparams:
                detector.models['oneclass_svm'].nu = hyperparams['nu']
            if 'gamma' in hyperparams:
                detector.models['oneclass_svm'].gamma = hyperparams['gamma']
        
        elif detector.algorithm == AnomalyAlgorithm.AUTOENCODER:
            if 'encoding_dim' in hyperparams:
                detector.models['autoencoder'].encoding_dim = hyperparams['encoding_dim']
            if 'learning_rate' in hyperparams:
                detector.models['autoencoder'].learning_rate = hyperparams['learning_rate']
    
    def evaluate_model(
        self,
        detector: AnomalyDetector,
        X_test: pd.DataFrame,
        y_test: pd.Series,
        algorithm_name: str
    ) -> ModelPerformance:
        """Evaluate model performance."""
        
        self.logger.info(f"Evaluating {algorithm_name} model")
        
        # Get predictions
        predictions = detector.predict(X_test.values)
        
        # Calculate performance metrics
        performance = detector.evaluate_performance(X_test.values, y_test.values)
        
        # Log detailed results
        self.logger.info(f"{algorithm_name} Performance:")
        self.logger.info(f"  Precision: {performance.precision:.4f}")
        self.logger.info(f"  Recall: {performance.recall:.4f}")
        self.logger.info(f"  F1-Score: {performance.f1_score:.4f}")
        self.logger.info(f"  False Positive Rate: {performance.false_positive_rate:.4f}")
        
        # Store results
        self.evaluation_results[algorithm_name] = performance
        
        # Log metrics to MLflow
        with mlflow.start_run(nested=True):
            mlflow.log_param("algorithm", algorithm_name)
            mlflow.log_metric("precision", performance.precision)
            mlflow.log_metric("recall", performance.recall)
            mlflow.log_metric("f1_score", performance.f1_score)
            mlflow.log_metric("false_positive_rate", performance.false_positive_rate)
            if performance.roc_auc:
                mlflow.log_metric("roc_auc", performance.roc_auc)
        
        self.metrics.increment('models_evaluated', tags={'algorithm': algorithm_name})
        
        return performance
    
    def hyperparameter_optimization(
        self,
        algorithm: AnomalyAlgorithm,
        X_train: pd.DataFrame,
        X_val: pd.DataFrame,
        y_train: pd.Series,
        y_val: pd.Series,
        n_trials: int = 50
    ) -> Dict[str, Any]:
        """Optimize hyperparameters using Optuna."""
        
        self.logger.info(f"Starting hyperparameter optimization for {algorithm.value}")
        
        def objective(trial):
            # Define hyperparameter search space based on algorithm
            if algorithm == AnomalyAlgorithm.ISOLATION_FOREST:
                hyperparams = {
                    'contamination': trial.suggest_float('contamination', 0.05, 0.2),
                    'n_estimators': trial.suggest_int('n_estimators', 50, 200)
                }
            elif algorithm == AnomalyAlgorithm.ONECLASS_SVM:
                hyperparams = {
                    'nu': trial.suggest_float('nu', 0.05, 0.3),
                    'gamma': trial.suggest_categorical('gamma', ['scale', 'auto'])
                }
            elif algorithm == AnomalyAlgorithm.AUTOENCODER:
                hyperparams = {
                    'encoding_dim': trial.suggest_int('encoding_dim', 5, 20),
                    'learning_rate': trial.suggest_float('learning_rate', 1e-4, 1e-2, log=True)
                }
            else:
                return 0.0
            
            # Train model with hyperparameters
            try:
                detector = self.train_single_model(algorithm, X_train, y_train, hyperparams)
                performance = self.evaluate_model(detector, X_val, y_val, f"{algorithm.value}_trial")
                return performance.f1_score
            except Exception as e:
                self.logger.warning(f"Trial failed: {e}")
                return 0.0
        
        # Run optimization
        study = optuna.create_study(direction='maximize')
        study.optimize(objective, n_trials=n_trials)
        
        best_params = study.best_params
        best_score = study.best_value
        
        self.logger.info(f"Best hyperparameters for {algorithm.value}: {best_params}")
        self.logger.info(f"Best F1-score: {best_score:.4f}")
        
        self.metrics.increment('hyperparameter_optimizations')
        
        return best_params
    
    def train_all_models(
        self,
        X_train: pd.DataFrame,
        X_val: pd.DataFrame,
        X_test: pd.DataFrame,
        y_train: pd.Series,
        y_val: pd.Series,
        y_test: pd.Series,
        optimize_hyperparams: bool = True
    ) -> Dict[str, AnomalyDetector]:
        """Train and evaluate all anomaly detection algorithms."""
        
        self.logger.info("Starting training for all anomaly detection models")
        
        algorithms = [
            AnomalyAlgorithm.ISOLATION_FOREST,
            AnomalyAlgorithm.ONECLASS_SVM,
            AnomalyAlgorithm.AUTOENCODER,
            AnomalyAlgorithm.STATISTICAL,
            AnomalyAlgorithm.ENSEMBLE
        ]
        
        trained_models = {}
        
        for algorithm in algorithms:
            try:
                self.logger.info(f"Training {algorithm.value} model")
                
                # Hyperparameter optimization
                best_params = {}
                if optimize_hyperparams and algorithm in [
                    AnomalyAlgorithm.ISOLATION_FOREST,
                    AnomalyAlgorithm.ONECLASS_SVM,
                    AnomalyAlgorithm.AUTOENCODER
                ]:
                    best_params = self.hyperparameter_optimization(
                        algorithm, X_train, X_val, y_train, y_val, n_trials=20
                    )
                
                # Train final model
                detector = self.train_single_model(algorithm, X_train, y_train, best_params)
                
                # Evaluate on test set
                performance = self.evaluate_model(detector, X_test, y_test, algorithm.value)
                
                trained_models[algorithm.value] = detector
                
            except Exception as e:
                self.logger.error(f"Failed to train {algorithm.value}: {e}")
                continue
        
        self.trained_models = trained_models
        
        # Select best model
        self._select_best_model()
        
        return trained_models
    
    def _select_best_model(self):
        """Select the best performing model."""
        if not self.evaluation_results:
            return
        
        # Find model with best F1 score
        best_algorithm = max(
            self.evaluation_results.keys(),
            key=lambda alg: self.evaluation_results[alg].f1_score
        )
        
        self.best_model = {
            'algorithm': best_algorithm,
            'detector': self.trained_models[best_algorithm],
            'performance': self.evaluation_results[best_algorithm]
        }
        
        self.logger.info(f"Best model: {best_algorithm} (F1: {self.best_model['performance'].f1_score:.4f})")
    
    def train_time_series_models(
        self,
        df: pd.DataFrame,
        value_col: str,
        timestamp_col: str,
        entity_col: Optional[str] = None
    ) -> TimeSeriesAnomalyDetector:
        """Train time series specific anomaly detection models."""
        
        self.logger.info("Training time series anomaly detection models")
        
        # Initialize time series detector
        ts_detector = TimeSeriesAnomalyDetector(
            enable_seasonal=True,
            enable_changepoint=True,
            enable_forecasting=True,
            enable_trend=True
        )
        
        # Detect anomalies (this also trains the internal models)
        anomaly_results = ts_detector.detect_anomalies(
            df, value_col, timestamp_col, entity_col
        )
        
        self.logger.info(f"Time series training completed. Detected {len(anomaly_results)} potential anomalies")
        
        return ts_detector
    
    def deploy_best_model(self, model_name: str, description: str = "") -> str:
        """Deploy the best performing model to the model registry."""
        
        if not self.best_model:
            raise ValueError("No trained models available for deployment")
        
        self.logger.info(f"Deploying best model ({self.best_model['algorithm']}) to registry")
        
        # Save model to MLflow
        detector = self.best_model['detector']
        model_version = detector.save_model(model_name, description)
        
        # Transition to staging
        try:
            self.model_registry.transition_model_stage(
                model_name=model_name,
                version=model_version,
                stage=self.model_registry.ModelStage.STAGING
            )
            
            self.logger.info(f"Model {model_name} v{model_version} deployed to staging")
            
        except Exception as e:
            self.logger.error(f"Failed to transition model to staging: {e}")
        
        self.metrics.increment('models_deployed')
        
        return model_version
    
    def run_complete_pipeline(
        self,
        feature_view: str,
        start_date: datetime,
        end_date: datetime,
        entity_columns: List[str],
        model_name: str,
        target_column: Optional[str] = None,
        test_size: float = 0.2,
        val_size: float = 0.1
    ) -> Dict[str, Any]:
        """Run the complete anomaly detection training pipeline."""
        
        self.logger.info("Starting complete anomaly detection training pipeline")
        
        with mlflow.start_run():
            # Log pipeline parameters
            mlflow.log_param("feature_view", feature_view)
            mlflow.log_param("start_date", start_date.isoformat())
            mlflow.log_param("end_date", end_date.isoformat())
            mlflow.log_param("model_name", model_name)
            
            # 1. Prepare data
            X, metadata_df, y = self.prepare_training_data(
                feature_view, start_date, end_date, entity_columns, target_column
            )
            
            # 2. Split data
            X_temp, X_test, y_temp, y_test = train_test_split(
                X, y, test_size=test_size, random_state=42, stratify=y
            )
            
            X_train, X_val, y_train, y_val = train_test_split(
                X_temp, y_temp, test_size=val_size/(1-test_size), random_state=42, stratify=y_temp
            )
            
            self.logger.info(f"Data split - Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}")
            
            # 3. Train all models
            trained_models = self.train_all_models(
                X_train, X_val, X_test, y_train, y_val, y_test
            )
            
            # 4. Train time series models if we have time series data
            if 'timestamp' in metadata_df.columns:
                full_df = pd.concat([metadata_df, X], axis=1)
                full_df['is_anomaly'] = y
                
                ts_detector = self.train_time_series_models(
                    full_df, 'cpu_usage', 'timestamp', 'entity_id'
                )
            
            # 5. Deploy best model
            if self.best_model:
                model_version = self.deploy_best_model(
                    model_name, 
                    f"Anomaly detection model trained on {len(X)} samples"
                )
                
                # Log final results
                mlflow.log_metric("best_f1_score", self.best_model['performance'].f1_score)
                mlflow.log_param("best_algorithm", self.best_model['algorithm'])
                mlflow.log_param("model_version", model_version)
            
            # 6. Generate summary
            summary = {
                'training_samples': len(X_train),
                'validation_samples': len(X_val),
                'test_samples': len(X_test),
                'features_count': X.shape[1],
                'models_trained': len(trained_models),
                'best_model': self.best_model['algorithm'] if self.best_model else None,
                'best_f1_score': self.best_model['performance'].f1_score if self.best_model else None,
                'evaluation_results': {
                    alg: {
                        'precision': perf.precision,
                        'recall': perf.recall,
                        'f1_score': perf.f1_score,
                        'false_positive_rate': perf.false_positive_rate
                    }
                    for alg, perf in self.evaluation_results.items()
                }
            }
            
            self.logger.info("Anomaly detection training pipeline completed successfully")
            self.metrics.increment('pipelines_completed')
            
            return summary


def main():
    """Main function to run the anomaly detection training pipeline."""
    
    # Initialize pipeline
    pipeline = AnomalyDetectionTrainingPipeline()
    
    # Set training parameters
    start_date = datetime.now() - timedelta(days=30)
    end_date = datetime.now()
    feature_view = "system_metrics_view"
    entity_columns = ['entity_id']
    model_name = "anomaly_detection_v1"
    
    # Run pipeline
    try:
        summary = pipeline.run_complete_pipeline(
            feature_view=feature_view,
            start_date=start_date,
            end_date=end_date,
            entity_columns=entity_columns,
            model_name=model_name
        )
        
        print("Training Pipeline Summary:")
        print(f"- Training samples: {summary['training_samples']}")
        print(f"- Features: {summary['features_count']}")
        print(f"- Models trained: {summary['models_trained']}")
        print(f"- Best model: {summary['best_model']}")
        print(f"- Best F1-score: {summary['best_f1_score']:.4f}")
        
    except Exception as e:
        logging.error(f"Training pipeline failed: {e}")
        raise


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()