"""
Comprehensive Anomaly Detection Framework

Multi-algorithm anomaly detection system for DevOps monitoring with:
- Traditional ML algorithms (Isolation Forest, DBSCAN, One-Class SVM)
- Deep learning models (Autoencoders)
- Time series analysis
- Statistical methods
- Model explanation and interpretability
"""

import logging
import pickle
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Any, Tuple, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import joblib

# Traditional ML algorithms
from sklearn.ensemble import IsolationForest
from sklearn.cluster import DBSCAN
from sklearn.svm import OneClassSVM
from sklearn.preprocessing import StandardScaler, RobustScaler, MinMaxScaler
from sklearn.decomposition import PCA
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
from sklearn.model_selection import train_test_split

# Deep learning
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

# Time series analysis
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.tsa.stattools import adfuller
import scipy.stats as stats

# Model explanation
import shap

# Project imports
from ..utils.monitoring import MetricsCollector
from ..config import get_model_config
from ..model_registry.model_registry import ModelRegistry
import mlflow
import mlflow.sklearn
import mlflow.tensorflow


class AnomalyAlgorithm(str, Enum):
    """Available anomaly detection algorithms."""
    ISOLATION_FOREST = "isolation_forest"
    DBSCAN = "dbscan"
    ONECLASS_SVM = "oneclass_svm"
    AUTOENCODER = "autoencoder"
    STATISTICAL = "statistical"
    ENSEMBLE = "ensemble"


class AnomalyType(str, Enum):
    """Types of detected anomalies."""
    POINT_ANOMALY = "point"
    CONTEXTUAL_ANOMALY = "contextual"
    COLLECTIVE_ANOMALY = "collective"
    UNKNOWN = "unknown"


@dataclass
class AnomalyResult:
    """Result of anomaly detection."""
    timestamp: datetime
    value: float
    is_anomaly: bool
    anomaly_score: float
    anomaly_type: AnomalyType
    confidence: float
    explanation: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ModelPerformance:
    """Model performance metrics."""
    precision: float
    recall: float
    f1_score: float
    roc_auc: Optional[float]
    false_positive_rate: float
    false_negative_rate: float
    threshold: float


class FeatureEngineering:
    """Feature engineering for anomaly detection."""
    
    def __init__(self):
        self.scalers = {}
        self.feature_stats = {}
        self.logger = logging.getLogger(__name__)
    
    def engineer_features(self, df: pd.DataFrame, feature_config: Dict[str, Any]) -> pd.DataFrame:
        """Engineer features from raw metrics data."""
        engineered_df = df.copy()
        
        # Time-based features
        if 'timestamp' in df.columns:
            engineered_df['hour'] = pd.to_datetime(df['timestamp']).dt.hour
            engineered_df['day_of_week'] = pd.to_datetime(df['timestamp']).dt.dayofweek
            engineered_df['is_weekend'] = engineered_df['day_of_week'].isin([5, 6]).astype(int)
        
        # Rolling statistics
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if col != 'timestamp':
                # Rolling mean and std
                engineered_df[f'{col}_rolling_mean_5'] = df[col].rolling(window=5, min_periods=1).mean()
                engineered_df[f'{col}_rolling_std_5'] = df[col].rolling(window=5, min_periods=1).std()
                
                # Rolling percentiles
                engineered_df[f'{col}_rolling_q25'] = df[col].rolling(window=10, min_periods=1).quantile(0.25)
                engineered_df[f'{col}_rolling_q75'] = df[col].rolling(window=10, min_periods=1).quantile(0.75)
                
                # Rate of change
                engineered_df[f'{col}_rate_of_change'] = df[col].pct_change().fillna(0)
                
                # Z-score (distance from rolling mean)
                rolling_mean = df[col].rolling(window=20, min_periods=1).mean()
                rolling_std = df[col].rolling(window=20, min_periods=1).std()
                engineered_df[f'{col}_z_score'] = ((df[col] - rolling_mean) / rolling_std).fillna(0)
        
        # Interaction features
        if len(numeric_cols) >= 2:
            for i, col1 in enumerate(numeric_cols[:3]):  # Limit to avoid explosion
                for col2 in numeric_cols[i+1:4]:
                    if col1 != col2:
                        engineered_df[f'{col1}_{col2}_ratio'] = (
                            df[col1] / (df[col2] + 1e-8)
                        ).replace([np.inf, -np.inf], 0)
        
        # Lag features
        for col in numeric_cols[:5]:  # Limit to most important metrics
            if col != 'timestamp':
                engineered_df[f'{col}_lag_1'] = df[col].shift(1).fillna(df[col].mean())
                engineered_df[f'{col}_lag_5'] = df[col].shift(5).fillna(df[col].mean())
        
        return engineered_df.fillna(0)
    
    def normalize_features(
        self, 
        df: pd.DataFrame, 
        method: str = 'standard',
        fit: bool = True
    ) -> pd.DataFrame:
        """Normalize features using specified method."""
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        if method == 'standard':
            scaler_class = StandardScaler
        elif method == 'robust':
            scaler_class = RobustScaler
        elif method == 'minmax':
            scaler_class = MinMaxScaler
        else:
            raise ValueError(f"Unknown normalization method: {method}")
        
        if fit or method not in self.scalers:
            self.scalers[method] = scaler_class()
            scaled_data = self.scalers[method].fit_transform(df[numeric_cols])
        else:
            scaled_data = self.scalers[method].transform(df[numeric_cols])
        
        result_df = df.copy()
        result_df[numeric_cols] = scaled_data
        
        return result_df
    
    def create_time_series_features(self, df: pd.DataFrame, value_col: str, timestamp_col: str) -> pd.DataFrame:
        """Create time series specific features."""
        ts_df = df.copy()
        ts_df[timestamp_col] = pd.to_datetime(ts_df[timestamp_col])
        ts_df = ts_df.sort_values(timestamp_col)
        
        # Seasonal decomposition
        try:
            if len(ts_df) >= 24:  # Need enough data points
                decomposition = seasonal_decompose(
                    ts_df[value_col], 
                    model='additive', 
                    period=min(24, len(ts_df)//2)
                )
                ts_df['trend'] = decomposition.trend
                ts_df['seasonal'] = decomposition.seasonal
                ts_df['residual'] = decomposition.resid
            else:
                ts_df['trend'] = ts_df[value_col]
                ts_df['seasonal'] = 0
                ts_df['residual'] = 0
        except Exception as e:
            self.logger.warning(f"Seasonal decomposition failed: {e}")
            ts_df['trend'] = ts_df[value_col]
            ts_df['seasonal'] = 0
            ts_df['residual'] = 0
        
        # Moving averages
        ts_df['ma_short'] = ts_df[value_col].rolling(window=5, min_periods=1).mean()
        ts_df['ma_long'] = ts_df[value_col].rolling(window=20, min_periods=1).mean()
        ts_df['ma_crossover'] = (ts_df['ma_short'] > ts_df['ma_long']).astype(int)
        
        # Volatility
        ts_df['volatility'] = ts_df[value_col].rolling(window=10, min_periods=1).std()
        
        return ts_df.fillna(method='ffill').fillna(0)


class StatisticalAnomalyDetector:
    """Statistical methods for anomaly detection."""
    
    def __init__(self, threshold_std: float = 3.0):
        self.threshold_std = threshold_std
        self.statistics = {}
    
    def fit(self, X: np.ndarray):
        """Fit statistical parameters."""
        self.statistics = {
            'mean': np.mean(X, axis=0),
            'std': np.std(X, axis=0),
            'median': np.median(X, axis=0),
            'mad': np.median(np.abs(X - np.median(X, axis=0)), axis=0),
            'q25': np.percentile(X, 25, axis=0),
            'q75': np.percentile(X, 75, axis=0)
        }
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predict anomalies using statistical methods."""
        # Z-score method
        z_scores = np.abs((X - self.statistics['mean']) / (self.statistics['std'] + 1e-8))
        z_anomalies = np.any(z_scores > self.threshold_std, axis=1)
        
        # Modified Z-score using MAD
        mad_scores = 0.6745 * (X - self.statistics['median']) / (self.statistics['mad'] + 1e-8)
        mad_anomalies = np.any(np.abs(mad_scores) > self.threshold_std, axis=1)
        
        # IQR method
        iqr = self.statistics['q75'] - self.statistics['q25']
        lower_bound = self.statistics['q25'] - 1.5 * iqr
        upper_bound = self.statistics['q75'] + 1.5 * iqr
        iqr_anomalies = np.any((X < lower_bound) | (X > upper_bound), axis=1)
        
        # Combine methods (anomaly if detected by any method)
        combined_anomalies = z_anomalies | mad_anomalies | iqr_anomalies
        
        return combined_anomalies.astype(int)
    
    def decision_function(self, X: np.ndarray) -> np.ndarray:
        """Return anomaly scores."""
        z_scores = np.abs((X - self.statistics['mean']) / (self.statistics['std'] + 1e-8))
        return np.max(z_scores, axis=1)


class AutoencoderAnomalyDetector:
    """Autoencoder-based anomaly detection."""
    
    def __init__(
        self, 
        encoding_dim: int = 10, 
        hidden_layers: List[int] = None,
        learning_rate: float = 0.001
    ):
        self.encoding_dim = encoding_dim
        self.hidden_layers = hidden_layers or [20, 15]
        self.learning_rate = learning_rate
        self.model = None
        self.threshold = None
        self.scaler = StandardScaler()
    
    def _build_autoencoder(self, input_dim: int) -> keras.Model:
        """Build autoencoder architecture."""
        # Input layer
        input_layer = keras.Input(shape=(input_dim,))
        
        # Encoder
        encoded = input_layer
        for units in self.hidden_layers:
            encoded = layers.Dense(units, activation='relu')(encoded)
            encoded = layers.Dropout(0.2)(encoded)
        
        # Bottleneck
        encoded = layers.Dense(self.encoding_dim, activation='relu')(encoded)
        
        # Decoder
        decoded = encoded
        for units in reversed(self.hidden_layers):
            decoded = layers.Dense(units, activation='relu')(decoded)
            decoded = layers.Dropout(0.2)(decoded)
        
        # Output layer
        decoded = layers.Dense(input_dim, activation='linear')(decoded)
        
        # Create model
        autoencoder = keras.Model(input_layer, decoded)
        autoencoder.compile(
            optimizer=keras.optimizers.Adam(learning_rate=self.learning_rate),
            loss='mse',
            metrics=['mae']
        )
        
        return autoencoder
    
    def fit(self, X: np.ndarray, validation_split: float = 0.2, epochs: int = 100):
        """Train the autoencoder."""
        # Normalize data
        X_scaled = self.scaler.fit_transform(X)
        
        # Build model
        self.model = self._build_autoencoder(X.shape[1])
        
        # Early stopping
        early_stopping = keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True
        )
        
        # Train model
        history = self.model.fit(
            X_scaled, X_scaled,
            epochs=epochs,
            batch_size=32,
            validation_split=validation_split,
            callbacks=[early_stopping],
            verbose=0
        )
        
        # Calculate threshold (95th percentile of reconstruction errors)
        X_pred = self.model.predict(X_scaled, verbose=0)
        reconstruction_errors = np.mean(np.square(X_scaled - X_pred), axis=1)
        self.threshold = np.percentile(reconstruction_errors, 95)
        
        return history
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predict anomalies."""
        if self.model is None:
            raise ValueError("Model not trained. Call fit() first.")
        
        X_scaled = self.scaler.transform(X)
        X_pred = self.model.predict(X_scaled, verbose=0)
        reconstruction_errors = np.mean(np.square(X_scaled - X_pred), axis=1)
        
        return (reconstruction_errors > self.threshold).astype(int)
    
    def decision_function(self, X: np.ndarray) -> np.ndarray:
        """Return reconstruction errors as anomaly scores."""
        if self.model is None:
            raise ValueError("Model not trained. Call fit() first.")
        
        X_scaled = self.scaler.transform(X)
        X_pred = self.model.predict(X_scaled, verbose=0)
        reconstruction_errors = np.mean(np.square(X_scaled - X_pred), axis=1)
        
        return reconstruction_errors


class AnomalyDetector:
    """
    Comprehensive anomaly detection system.
    
    Combines multiple algorithms and provides unified interface for
    anomaly detection in DevOps monitoring data.
    """
    
    def __init__(self, algorithm: AnomalyAlgorithm = AnomalyAlgorithm.ENSEMBLE):
        self.algorithm = algorithm
        self.models = {}
        self.feature_engineering = FeatureEngineering()
        self.logger = logging.getLogger(__name__)
        self.metrics = MetricsCollector("anomaly_detection")
        self.model_registry = ModelRegistry()
        
        # Model configuration
        self.config = get_model_config()
        
        # Performance tracking
        self.performance_metrics = {}
        self.explainer = None
    
    def _initialize_models(self, X: np.ndarray):
        """Initialize all anomaly detection models."""
        n_samples, n_features = X.shape
        
        # Isolation Forest
        self.models['isolation_forest'] = IsolationForest(
            contamination=0.1,
            random_state=42,
            n_estimators=100
        )
        
        # DBSCAN
        self.models['dbscan'] = DBSCAN(
            eps=0.5,
            min_samples=5
        )
        
        # One-Class SVM
        self.models['oneclass_svm'] = OneClassSVM(
            nu=0.1,
            kernel='rbf',
            gamma='scale'
        )
        
        # Autoencoder
        encoding_dim = max(2, min(n_features // 3, 20))
        self.models['autoencoder'] = AutoencoderAnomalyDetector(
            encoding_dim=encoding_dim,
            hidden_layers=[n_features // 2, encoding_dim * 2]
        )
        
        # Statistical detector
        self.models['statistical'] = StatisticalAnomalyDetector(threshold_std=3.0)
    
    def fit(
        self, 
        X: np.ndarray, 
        y: Optional[np.ndarray] = None,
        feature_names: Optional[List[str]] = None
    ):
        """Fit the anomaly detection models."""
        if len(X.shape) != 2:
            raise ValueError("X must be a 2D array")
        
        self.feature_names = feature_names or [f"feature_{i}" for i in range(X.shape[1])]
        
        # Initialize models
        self._initialize_models(X)
        
        # Fit models
        if self.algorithm == AnomalyAlgorithm.ENSEMBLE or self.algorithm == AnomalyAlgorithm.ISOLATION_FOREST:
            self.models['isolation_forest'].fit(X)
        
        if self.algorithm == AnomalyAlgorithm.ENSEMBLE or self.algorithm == AnomalyAlgorithm.ONECLASS_SVM:
            # Sample data for SVM if too large
            if len(X) > 5000:
                indices = np.random.choice(len(X), 5000, replace=False)
                X_sample = X[indices]
            else:
                X_sample = X
            self.models['oneclass_svm'].fit(X_sample)
        
        if self.algorithm == AnomalyAlgorithm.ENSEMBLE or self.algorithm == AnomalyAlgorithm.AUTOENCODER:
            self.models['autoencoder'].fit(X)
        
        if self.algorithm == AnomalyAlgorithm.ENSEMBLE or self.algorithm == AnomalyAlgorithm.STATISTICAL:
            self.models['statistical'].fit(X)
        
        # Initialize SHAP explainer for Isolation Forest
        try:
            if 'isolation_forest' in self.models:
                self.explainer = shap.TreeExplainer(self.models['isolation_forest'])
        except Exception as e:
            self.logger.warning(f"Could not initialize SHAP explainer: {e}")
        
        self.logger.info(f"Trained anomaly detection models with {len(X)} samples")
        self.metrics.increment('models_trained')
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predict anomalies using the selected algorithm(s)."""
        if self.algorithm == AnomalyAlgorithm.ENSEMBLE:
            return self._ensemble_predict(X)
        elif self.algorithm == AnomalyAlgorithm.ISOLATION_FOREST:
            predictions = self.models['isolation_forest'].predict(X)
            return (predictions == -1).astype(int)
        elif self.algorithm == AnomalyAlgorithm.DBSCAN:
            labels = self.models['dbscan'].fit_predict(X)
            return (labels == -1).astype(int)
        elif self.algorithm == AnomalyAlgorithm.ONECLASS_SVM:
            predictions = self.models['oneclass_svm'].predict(X)
            return (predictions == -1).astype(int)
        elif self.algorithm == AnomalyAlgorithm.AUTOENCODER:
            return self.models['autoencoder'].predict(X)
        elif self.algorithm == AnomalyAlgorithm.STATISTICAL:
            return self.models['statistical'].predict(X)
        else:
            raise ValueError(f"Unknown algorithm: {self.algorithm}")
    
    def _ensemble_predict(self, X: np.ndarray) -> np.ndarray:
        """Ensemble prediction using multiple algorithms."""
        predictions = []
        
        # Isolation Forest
        if_pred = self.models['isolation_forest'].predict(X)
        predictions.append((if_pred == -1).astype(int))
        
        # One-Class SVM
        svm_pred = self.models['oneclass_svm'].predict(X)
        predictions.append((svm_pred == -1).astype(int))
        
        # Autoencoder
        ae_pred = self.models['autoencoder'].predict(X)
        predictions.append(ae_pred)
        
        # Statistical
        stat_pred = self.models['statistical'].predict(X)
        predictions.append(stat_pred)
        
        # Combine predictions (majority vote)
        ensemble_pred = np.array(predictions).mean(axis=0)
        return (ensemble_pred >= 0.5).astype(int)
    
    def decision_function(self, X: np.ndarray) -> np.ndarray:
        """Return anomaly scores."""
        if self.algorithm == AnomalyAlgorithm.ISOLATION_FOREST:
            return -self.models['isolation_forest'].decision_function(X)
        elif self.algorithm == AnomalyAlgorithm.ONECLASS_SVM:
            return -self.models['oneclass_svm'].decision_function(X)
        elif self.algorithm == AnomalyAlgorithm.AUTOENCODER:
            return self.models['autoencoder'].decision_function(X)
        elif self.algorithm == AnomalyAlgorithm.STATISTICAL:
            return self.models['statistical'].decision_function(X)
        elif self.algorithm == AnomalyAlgorithm.ENSEMBLE:
            # Ensemble scoring
            scores = []
            scores.append(-self.models['isolation_forest'].decision_function(X))
            scores.append(-self.models['oneclass_svm'].decision_function(X))
            scores.append(self.models['autoencoder'].decision_function(X))
            scores.append(self.models['statistical'].decision_function(X))
            
            # Normalize scores to [0, 1] and average
            normalized_scores = []
            for score in scores:
                normalized = (score - score.min()) / (score.max() - score.min() + 1e-8)
                normalized_scores.append(normalized)
            
            return np.mean(normalized_scores, axis=0)
        else:
            raise ValueError(f"Unknown algorithm: {self.algorithm}")
    
    def explain_anomaly(self, X: np.ndarray, index: int) -> Dict[str, Any]:
        """Explain why a sample was classified as anomaly."""
        explanation = {
            'sample_index': index,
            'feature_contributions': {},
            'algorithm': self.algorithm.value,
            'anomaly_score': None
        }
        
        if index >= len(X):
            return explanation
        
        sample = X[index:index+1]
        
        # Get anomaly score
        explanation['anomaly_score'] = self.decision_function(sample)[0]
        
        # SHAP explanation for tree-based models
        if self.explainer is not None and self.algorithm in [AnomalyAlgorithm.ISOLATION_FOREST, AnomalyAlgorithm.ENSEMBLE]:
            try:
                shap_values = self.explainer.shap_values(sample)
                for i, feature_name in enumerate(self.feature_names):
                    explanation['feature_contributions'][feature_name] = float(shap_values[0][i])
            except Exception as e:
                self.logger.warning(f"SHAP explanation failed: {e}")
        
        # Statistical explanation
        if self.algorithm == AnomalyAlgorithm.STATISTICAL or self.algorithm == AnomalyAlgorithm.ENSEMBLE:
            stats_model = self.models['statistical']
            sample_flat = sample.flatten()
            z_scores = np.abs((sample_flat - stats_model.statistics['mean']) / (stats_model.statistics['std'] + 1e-8))
            
            for i, feature_name in enumerate(self.feature_names):
                if i < len(z_scores):
                    explanation['feature_contributions'][f'{feature_name}_z_score'] = float(z_scores[i])
        
        return explanation
    
    def evaluate_performance(
        self, 
        X_test: np.ndarray, 
        y_true: np.ndarray
    ) -> ModelPerformance:
        """Evaluate model performance on labeled test data."""
        y_pred = self.predict(X_test)
        y_scores = self.decision_function(X_test)
        
        # Calculate metrics
        precision = precision_score(y_true, y_pred, zero_division=0)
        recall = recall_score(y_true, y_pred, zero_division=0)
        f1 = f1_score(y_true, y_pred, zero_division=0)
        
        # ROC AUC (if possible)
        try:
            roc_auc = roc_auc_score(y_true, y_scores)
        except ValueError:
            roc_auc = None
        
        # Confusion matrix
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
        fnr = fn / (fn + tp) if (fn + tp) > 0 else 0
        
        # Find optimal threshold
        optimal_threshold = self._find_optimal_threshold(y_true, y_scores)
        
        performance = ModelPerformance(
            precision=precision,
            recall=recall,
            f1_score=f1,
            roc_auc=roc_auc,
            false_positive_rate=fpr,
            false_negative_rate=fnr,
            threshold=optimal_threshold
        )
        
        self.performance_metrics[self.algorithm.value] = performance
        return performance
    
    def _find_optimal_threshold(self, y_true: np.ndarray, y_scores: np.ndarray) -> float:
        """Find optimal threshold using F1 score."""
        thresholds = np.percentile(y_scores, np.arange(50, 100, 2))
        best_threshold = np.median(y_scores)
        best_f1 = 0
        
        for threshold in thresholds:
            y_pred_thresh = (y_scores >= threshold).astype(int)
            f1 = f1_score(y_true, y_pred_thresh, zero_division=0)
            if f1 > best_f1:
                best_f1 = f1
                best_threshold = threshold
        
        return best_threshold
    
    def detect_anomalies_in_timeseries(
        self, 
        df: pd.DataFrame,
        value_cols: List[str],
        timestamp_col: str = 'timestamp',
        window_size: int = 50
    ) -> List[AnomalyResult]:
        """Detect anomalies in time series data."""
        results = []
        
        # Sort by timestamp
        df_sorted = df.sort_values(timestamp_col)
        
        # Engineer features
        engineered_df = self.feature_engineering.create_time_series_features(
            df_sorted, value_cols[0], timestamp_col
        )
        
        # Prepare features for detection
        feature_cols = [col for col in engineered_df.columns 
                       if col not in [timestamp_col] and engineered_df[col].dtype in ['float64', 'int64']]
        
        X = engineered_df[feature_cols].values
        
        # Handle missing values
        X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)
        
        # Normalize features
        if hasattr(self.feature_engineering, 'scalers') and 'standard' in self.feature_engineering.scalers:
            X = self.feature_engineering.scalers['standard'].transform(X)
        else:
            normalized_df = self.feature_engineering.normalize_features(
                pd.DataFrame(X, columns=feature_cols), method='standard', fit=True
            )
            X = normalized_df.values
        
        # Predict anomalies
        predictions = self.predict(X)
        scores = self.decision_function(X)
        
        # Create results
        for i, (_, row) in enumerate(df_sorted.iterrows()):
            if i < len(predictions):
                result = AnomalyResult(
                    timestamp=pd.to_datetime(row[timestamp_col]),
                    value=row[value_cols[0]] if value_cols else 0,
                    is_anomaly=bool(predictions[i]),
                    anomaly_score=float(scores[i]),
                    anomaly_type=AnomalyType.POINT_ANOMALY,
                    confidence=min(1.0, float(scores[i]) / (np.std(scores) + 1e-8)),
                    explanation=self.explain_anomaly(X, i) if predictions[i] else {},
                    metadata={
                        'algorithm': self.algorithm.value,
                        'feature_count': len(feature_cols),
                        'window_size': window_size
                    }
                )
                results.append(result)
        
        self.logger.info(f"Detected {sum(predictions)} anomalies in {len(predictions)} data points")
        self.metrics.increment('anomalies_detected', value=sum(predictions))
        
        return results
    
    def save_model(self, model_name: str, description: str = "") -> str:
        """Save the trained model to MLflow registry."""
        with mlflow.start_run():
            # Log parameters
            mlflow.log_param("algorithm", self.algorithm.value)
            mlflow.log_param("feature_count", len(self.feature_names))
            
            # Log performance metrics
            if self.performance_metrics:
                for metric_name, performance in self.performance_metrics.items():
                    mlflow.log_metric(f"{metric_name}_precision", performance.precision)
                    mlflow.log_metric(f"{metric_name}_recall", performance.recall)
                    mlflow.log_metric(f"{metric_name}_f1_score", performance.f1_score)
                    if performance.roc_auc:
                        mlflow.log_metric(f"{metric_name}_roc_auc", performance.roc_auc)
            
            # Save model components
            model_artifacts = {
                'algorithm': self.algorithm,
                'models': {},
                'feature_engineering': self.feature_engineering,
                'feature_names': self.feature_names,
                'performance_metrics': self.performance_metrics
            }
            
            # Save sklearn models
            for name, model in self.models.items():
                if hasattr(model, 'fit') and name != 'autoencoder':
                    joblib.dump(model, f"{name}_model.pkl")
                    mlflow.log_artifact(f"{name}_model.pkl")
                    model_artifacts['models'][name] = f"{name}_model.pkl"
            
            # Save autoencoder separately
            if 'autoencoder' in self.models and self.models['autoencoder'].model:
                self.models['autoencoder'].model.save("autoencoder_model")
                mlflow.log_artifacts("autoencoder_model", "autoencoder_model")
                model_artifacts['models']['autoencoder'] = "autoencoder_model"
            
            # Save complete model
            joblib.dump(model_artifacts, "anomaly_detector.pkl")
            mlflow.log_artifact("anomaly_detector.pkl")
            
            # Register model
            model_uri = mlflow.get_artifact_uri("anomaly_detector.pkl")
            
            try:
                model_version = self.model_registry.register_model(
                    model_name=model_name,
                    run_id=mlflow.active_run().info.run_id,
                    description=description
                )
                return model_version.version
            except Exception as e:
                self.logger.error(f"Failed to register model: {e}")
                return "unknown"
    
    def load_model(self, model_name: str, version: Optional[str] = None):
        """Load a trained model from MLflow registry."""
        try:
            if version:
                model_uri = f"models:/{model_name}/{version}"
            else:
                model_uri = f"models:/{model_name}/Production"
            
            # Download and load model artifacts
            model_artifacts = mlflow.artifacts.download_artifacts(model_uri)
            loaded_data = joblib.load(f"{model_artifacts}/anomaly_detector.pkl")
            
            # Restore model state
            self.algorithm = loaded_data['algorithm']
            self.feature_names = loaded_data['feature_names']
            self.feature_engineering = loaded_data['feature_engineering']
            self.performance_metrics = loaded_data['performance_metrics']
            
            # Load individual models
            self.models = {}
            for name, path in loaded_data['models'].items():
                if name == 'autoencoder':
                    autoencoder = AutoencoderAnomalyDetector()
                    autoencoder.model = keras.models.load_model(f"{model_artifacts}/{path}")
                    self.models[name] = autoencoder
                else:
                    self.models[name] = joblib.load(f"{model_artifacts}/{path}")
            
            self.logger.info(f"Loaded anomaly detection model {model_name}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to load model: {e}")
            return False