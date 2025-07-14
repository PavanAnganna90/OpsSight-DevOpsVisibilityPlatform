"""
ML Training Pipeline

Comprehensive training pipeline with experiment tracking, hyperparameter optimization,
and model evaluation for DevOps monitoring use cases.
"""

import logging
import joblib
import pickle
import json
from typing import Dict, List, Optional, Any, Tuple, Union
from datetime import datetime
from dataclasses import dataclass, field
from pathlib import Path
import pandas as pd
import numpy as np

# Scikit-learn
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV, RandomizedSearchCV
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge, Lasso
from sklearn.svm import SVC, SVR
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer

# TensorFlow
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, LSTM, Conv1D, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam, RMSprop
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau

# MLflow
import mlflow
import mlflow.sklearn
import mlflow.tensorflow
from mlflow.tracking import MlflowClient

# Optuna for hyperparameter optimization
import optuna
from optuna.integration import MLflowCallback

from ..config import get_training_config, get_mlflow_config
from ..feature_store.feature_store import FeatureStore
from ..utils.monitoring import MetricsCollector


@dataclass
class TrainingConfig:
    """Training configuration."""
    model_type: str
    problem_type: str  # 'classification' or 'regression'
    target_column: str
    feature_columns: List[str]
    test_size: float = 0.2
    random_state: int = 42
    cross_validation_folds: int = 5
    hyperparameter_optimization: bool = True
    optimization_trials: int = 100
    early_stopping_patience: int = 10
    model_params: Dict[str, Any] = field(default_factory=dict)
    preprocessing_params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ExperimentResult:
    """Training experiment result."""
    experiment_id: str
    run_id: str
    model_type: str
    metrics: Dict[str, float]
    parameters: Dict[str, Any]
    model_path: str
    feature_importance: Optional[Dict[str, float]] = None
    training_time: float = 0.0
    dataset_info: Dict[str, Any] = field(default_factory=dict)


class ModelTrainingPipeline:
    """
    Comprehensive ML training pipeline for DevOps monitoring.
    
    Supports:
    - Multiple model types (scikit-learn, TensorFlow)
    - Hyperparameter optimization with Optuna
    - Experiment tracking with MLflow
    - Feature importance analysis
    - Model validation and evaluation
    """
    
    def __init__(self, config: TrainingConfig):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.metrics_collector = MetricsCollector("training_pipeline")
        
        # Setup MLflow
        self.mlflow_config = get_mlflow_config()
        mlflow.set_tracking_uri(self.mlflow_config['tracking_uri'])
        self.mlflow_client = MlflowClient()
        
        # Initialize components
        self.feature_store = None
        self.preprocessor = None
        self.model = None
        
        # Model registry
        self.model_registry = {
            'random_forest_classifier': RandomForestClassifier,
            'random_forest_regressor': RandomForestRegressor,
            'gradient_boosting_classifier': GradientBoostingClassifier,
            'gradient_boosting_regressor': GradientBoostingRegressor,
            'logistic_regression': LogisticRegression,
            'linear_regression': LinearRegression,
            'ridge_regression': Ridge,
            'lasso_regression': Lasso,
            'svm_classifier': SVC,
            'svm_regressor': SVR,
            'neural_network': self._create_neural_network,
            'lstm_network': self._create_lstm_network,
        }
    
    def train_model(
        self,
        data: pd.DataFrame,
        experiment_name: str = "opssight_ml_experiment"
    ) -> ExperimentResult:
        """Train a model with the given data."""
        start_time = datetime.utcnow()
        
        # Set up MLflow experiment
        mlflow.set_experiment(experiment_name)
        
        with mlflow.start_run() as run:
            try:
                # Log parameters
                mlflow.log_params(self.config.model_params)
                mlflow.log_param("model_type", self.config.model_type)
                mlflow.log_param("problem_type", self.config.problem_type)
                
                # Prepare data
                X, y = self._prepare_data(data)
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, 
                    test_size=self.config.test_size,
                    random_state=self.config.random_state,
                    stratify=y if self.config.problem_type == 'classification' else None
                )
                
                # Log dataset info
                dataset_info = {
                    'total_samples': len(data),
                    'training_samples': len(X_train),
                    'test_samples': len(X_test),
                    'features_count': X.shape[1],
                    'target_column': self.config.target_column
                }
                mlflow.log_params(dataset_info)
                
                # Preprocess data
                X_train_processed, X_test_processed = self._preprocess_data(X_train, X_test)
                
                # Train model
                if self.config.hyperparameter_optimization:
                    model, best_params = self._train_with_optimization(
                        X_train_processed, y_train, X_test_processed, y_test
                    )
                    mlflow.log_params(best_params)
                else:
                    model = self._train_model(X_train_processed, y_train)
                
                # Evaluate model
                metrics = self._evaluate_model(model, X_test_processed, y_test)
                mlflow.log_metrics(metrics)
                
                # Feature importance
                feature_importance = self._get_feature_importance(model, X.columns)
                if feature_importance:
                    mlflow.log_dict(feature_importance, "feature_importance.json")
                
                # Save model
                model_path = self._save_model(model, run.info.run_id)
                mlflow.log_artifact(model_path)
                
                # Cross-validation
                cv_scores = self._cross_validate(model, X_train_processed, y_train)
                mlflow.log_metrics({f"cv_{k}": v for k, v in cv_scores.items()})
                
                training_time = (datetime.utcnow() - start_time).total_seconds()
                mlflow.log_metric("training_time_seconds", training_time)
                
                # Create result
                result = ExperimentResult(
                    experiment_id=run.info.experiment_id,
                    run_id=run.info.run_id,
                    model_type=self.config.model_type,
                    metrics=metrics,
                    parameters=self.config.model_params,
                    model_path=model_path,
                    feature_importance=feature_importance,
                    training_time=training_time,
                    dataset_info=dataset_info
                )
                
                self.logger.info(f"Training completed. Run ID: {run.info.run_id}")
                self.metrics_collector.increment('models_trained')
                
                return result
                
            except Exception as e:
                self.logger.error(f"Training failed: {e}")
                mlflow.log_param("status", "failed")
                mlflow.log_param("error", str(e))
                raise
    
    def _prepare_data(self, data: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """Prepare features and target from data."""
        # Handle missing target
        if self.config.target_column not in data.columns:
            raise ValueError(f"Target column '{self.config.target_column}' not found")
        
        # Select features
        if self.config.feature_columns:
            available_features = [col for col in self.config.feature_columns if col in data.columns]
            if not available_features:
                raise ValueError("No specified feature columns found in data")
            X = data[available_features]
        else:
            # Use all columns except target
            X = data.drop(columns=[self.config.target_column])
        
        y = data[self.config.target_column]
        
        # Handle missing values
        X = X.fillna(X.mean() if X.select_dtypes(include=[np.number]).shape[1] > 0 else 0)
        y = y.fillna(y.mode()[0] if not y.mode().empty else 0)
        
        self.logger.info(f"Prepared data: {X.shape[0]} samples, {X.shape[1]} features")
        return X, y
    
    def _preprocess_data(self, X_train: pd.DataFrame, X_test: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Preprocess training and test data."""
        # Identify numeric and categorical columns
        numeric_features = X_train.select_dtypes(include=[np.number]).columns.tolist()
        categorical_features = X_train.select_dtypes(include=['object', 'category']).columns.tolist()
        
        # Create preprocessing pipeline
        preprocessors = []
        
        if numeric_features:
            scaler_type = self.config.preprocessing_params.get('scaler', 'standard')
            if scaler_type == 'standard':
                numeric_transformer = StandardScaler()
            elif scaler_type == 'minmax':
                numeric_transformer = MinMaxScaler()
            else:
                numeric_transformer = StandardScaler()
            
            preprocessors.append(('num', numeric_transformer, numeric_features))
        
        if categorical_features:
            # Simple label encoding for categorical features
            # In production, you might want more sophisticated encoding
            categorical_transformer = Pipeline([
                ('label', LabelEncoder())
            ])
            preprocessors.append(('cat', categorical_transformer, categorical_features))
        
        if preprocessors:
            self.preprocessor = ColumnTransformer(
                transformers=preprocessors,
                remainder='passthrough'
            )
            
            X_train_processed = self.preprocessor.fit_transform(X_train)
            X_test_processed = self.preprocessor.transform(X_test)
        else:
            X_train_processed = X_train.values
            X_test_processed = X_test.values
        
        return X_train_processed, X_test_processed
    
    def _train_model(self, X_train: np.ndarray, y_train: np.ndarray):
        """Train a single model."""
        model_class = self.model_registry.get(self.config.model_type)
        if not model_class:
            raise ValueError(f"Unknown model type: {self.config.model_type}")
        
        if callable(model_class):
            if self.config.model_type in ['neural_network', 'lstm_network']:
                # TensorFlow models
                model = model_class(X_train.shape[1])
                self._train_neural_network(model, X_train, y_train)
            else:
                # Scikit-learn models
                model = model_class(**self.config.model_params)
                model.fit(X_train, y_train)
        else:
            raise ValueError(f"Invalid model class for {self.config.model_type}")
        
        return model
    
    def _train_with_optimization(
        self, 
        X_train: np.ndarray, 
        y_train: np.ndarray,
        X_test: np.ndarray,
        y_test: np.ndarray
    ) -> Tuple[Any, Dict[str, Any]]:
        """Train model with hyperparameter optimization."""
        def objective(trial):
            # Get hyperparameters based on model type
            params = self._get_hyperparameter_space(trial)
            
            try:
                model_class = self.model_registry[self.config.model_type]
                
                if self.config.model_type in ['neural_network', 'lstm_network']:
                    model = model_class(X_train.shape[1], **params)
                    self._train_neural_network(model, X_train, y_train)
                    predictions = model.predict(X_test)
                    
                    if self.config.problem_type == 'classification':
                        predictions = (predictions > 0.5).astype(int)
                        score = accuracy_score(y_test, predictions)
                    else:
                        score = -mean_squared_error(y_test, predictions)
                else:
                    model = model_class(**params)
                    model.fit(X_train, y_train)
                    
                    if self.config.problem_type == 'classification':
                        score = model.score(X_test, y_test)
                    else:
                        predictions = model.predict(X_test)
                        score = -mean_squared_error(y_test, predictions)
                
                return score
            except Exception as e:
                self.logger.error(f"Optimization trial failed: {e}")
                return float('-inf')
        
        # Run optimization
        study = optuna.create_study(
            direction='maximize',
            callbacks=[MLflowCallback(metric_name="optimization_score")]
        )
        
        study.optimize(objective, n_trials=self.config.optimization_trials)
        
        # Train best model
        best_params = study.best_params
        model_class = self.model_registry[self.config.model_type]
        
        if self.config.model_type in ['neural_network', 'lstm_network']:
            best_model = model_class(X_train.shape[1], **best_params)
            self._train_neural_network(best_model, X_train, y_train)
        else:
            best_model = model_class(**best_params)
            best_model.fit(X_train, y_train)
        
        self.logger.info(f"Best hyperparameters: {best_params}")
        return best_model, best_params
    
    def _get_hyperparameter_space(self, trial) -> Dict[str, Any]:
        """Get hyperparameter search space for different models."""
        if self.config.model_type == 'random_forest_classifier':
            return {
                'n_estimators': trial.suggest_int('n_estimators', 10, 200),
                'max_depth': trial.suggest_int('max_depth', 3, 20),
                'min_samples_split': trial.suggest_int('min_samples_split', 2, 20),
                'min_samples_leaf': trial.suggest_int('min_samples_leaf', 1, 10),
                'random_state': self.config.random_state
            }
        elif self.config.model_type == 'gradient_boosting_classifier':
            return {
                'n_estimators': trial.suggest_int('n_estimators', 50, 200),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                'max_depth': trial.suggest_int('max_depth', 3, 10),
                'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                'random_state': self.config.random_state
            }
        elif self.config.model_type == 'neural_network':
            return {
                'hidden_units': trial.suggest_categorical('hidden_units', [64, 128, 256]),
                'dropout_rate': trial.suggest_float('dropout_rate', 0.1, 0.5),
                'learning_rate': trial.suggest_float('learning_rate', 0.0001, 0.01, log=True)
            }
        else:
            # Default parameters for other models
            return {}
    
    def _create_neural_network(self, input_dim: int, **kwargs) -> tf.keras.Model:
        """Create a neural network model."""
        hidden_units = kwargs.get('hidden_units', 128)
        dropout_rate = kwargs.get('dropout_rate', 0.3)
        
        model = Sequential([
            Dense(hidden_units, activation='relu', input_dim=input_dim),
            BatchNormalization(),
            Dropout(dropout_rate),
            Dense(hidden_units // 2, activation='relu'),
            BatchNormalization(),
            Dropout(dropout_rate),
            Dense(hidden_units // 4, activation='relu'),
            Dropout(dropout_rate),
        ])
        
        if self.config.problem_type == 'classification':
            model.add(Dense(1, activation='sigmoid'))
            model.compile(
                optimizer=Adam(learning_rate=kwargs.get('learning_rate', 0.001)),
                loss='binary_crossentropy',
                metrics=['accuracy']
            )
        else:
            model.add(Dense(1))
            model.compile(
                optimizer=Adam(learning_rate=kwargs.get('learning_rate', 0.001)),
                loss='mse',
                metrics=['mae']
            )
        
        return model
    
    def _create_lstm_network(self, input_dim: int, **kwargs) -> tf.keras.Model:
        """Create an LSTM network for time series data."""
        lstm_units = kwargs.get('lstm_units', 64)
        dropout_rate = kwargs.get('dropout_rate', 0.3)
        
        model = Sequential([
            LSTM(lstm_units, return_sequences=True, input_shape=(None, input_dim)),
            Dropout(dropout_rate),
            LSTM(lstm_units // 2, return_sequences=False),
            Dropout(dropout_rate),
            Dense(32, activation='relu'),
            Dropout(dropout_rate),
        ])
        
        if self.config.problem_type == 'classification':
            model.add(Dense(1, activation='sigmoid'))
            model.compile(
                optimizer=Adam(learning_rate=kwargs.get('learning_rate', 0.001)),
                loss='binary_crossentropy',
                metrics=['accuracy']
            )
        else:
            model.add(Dense(1))
            model.compile(
                optimizer=Adam(learning_rate=kwargs.get('learning_rate', 0.001)),
                loss='mse',
                metrics=['mae']
            )
        
        return model
    
    def _train_neural_network(self, model: tf.keras.Model, X_train: np.ndarray, y_train: np.ndarray):
        """Train a TensorFlow model."""
        callbacks = [
            EarlyStopping(
                monitor='val_loss',
                patience=self.config.early_stopping_patience,
                restore_best_weights=True
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=5,
                min_lr=1e-7
            )
        ]
        
        history = model.fit(
            X_train, y_train,
            validation_split=0.2,
            epochs=100,
            batch_size=32,
            callbacks=callbacks,
            verbose=0
        )
        
        return history
    
    def _evaluate_model(self, model, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, float]:
        """Evaluate model performance."""
        if hasattr(model, 'predict_proba'):
            # Scikit-learn classifier with probability prediction
            y_pred_proba = model.predict_proba(X_test)[:, 1]
            y_pred = model.predict(X_test)
        elif hasattr(model, 'predict') and self.config.model_type in ['neural_network', 'lstm_network']:
            # TensorFlow model
            y_pred_proba = model.predict(X_test).flatten()
            y_pred = (y_pred_proba > 0.5).astype(int) if self.config.problem_type == 'classification' else y_pred_proba
        else:
            # Scikit-learn regressor or classifier without probability
            y_pred = model.predict(X_test)
            y_pred_proba = None
        
        metrics = {}
        
        if self.config.problem_type == 'classification':
            metrics['accuracy'] = accuracy_score(y_test, y_pred)
            metrics['precision'] = precision_score(y_test, y_pred, average='weighted', zero_division=0)
            metrics['recall'] = recall_score(y_test, y_pred, average='weighted', zero_division=0)
            metrics['f1_score'] = f1_score(y_test, y_pred, average='weighted', zero_division=0)
            
            if y_pred_proba is not None:
                try:
                    metrics['roc_auc'] = roc_auc_score(y_test, y_pred_proba)
                except ValueError:
                    # Handle case where only one class is present
                    pass
        else:
            metrics['mse'] = mean_squared_error(y_test, y_pred)
            metrics['mae'] = mean_absolute_error(y_test, y_pred)
            metrics['r2_score'] = r2_score(y_test, y_pred)
            metrics['rmse'] = np.sqrt(metrics['mse'])
        
        return metrics
    
    def _cross_validate(self, model, X: np.ndarray, y: np.ndarray) -> Dict[str, float]:
        """Perform cross-validation."""
        scoring = 'accuracy' if self.config.problem_type == 'classification' else 'neg_mean_squared_error'
        
        try:
            cv_scores = cross_val_score(
                model, X, y,
                cv=self.config.cross_validation_folds,
                scoring=scoring
            )
            
            return {
                'mean_score': cv_scores.mean(),
                'std_score': cv_scores.std(),
                'min_score': cv_scores.min(),
                'max_score': cv_scores.max()
            }
        except Exception as e:
            self.logger.error(f"Cross-validation failed: {e}")
            return {}
    
    def _get_feature_importance(self, model, feature_names: List[str]) -> Optional[Dict[str, float]]:
        """Get feature importance if available."""
        try:
            if hasattr(model, 'feature_importances_'):
                importance = model.feature_importances_
                return dict(zip(feature_names, importance.tolist()))
            elif hasattr(model, 'coef_'):
                importance = np.abs(model.coef_).flatten()
                return dict(zip(feature_names, importance.tolist()))
        except Exception as e:
            self.logger.error(f"Could not extract feature importance: {e}")
        
        return None
    
    def _save_model(self, model, run_id: str) -> str:
        """Save model to disk."""
        model_dir = Path(f"models/{run_id}")
        model_dir.mkdir(parents=True, exist_ok=True)
        
        if self.config.model_type in ['neural_network', 'lstm_network']:
            # Save TensorFlow model
            model_path = model_dir / "model.h5"
            model.save(str(model_path))
        else:
            # Save scikit-learn model
            model_path = model_dir / "model.pkl"
            joblib.dump(model, model_path)
        
        # Save preprocessor if exists
        if self.preprocessor:
            preprocessor_path = model_dir / "preprocessor.pkl"
            joblib.dump(self.preprocessor, preprocessor_path)
        
        # Save configuration
        config_path = model_dir / "config.json"
        with open(config_path, 'w') as f:
            json.dump({
                'model_type': self.config.model_type,
                'problem_type': self.config.problem_type,
                'target_column': self.config.target_column,
                'feature_columns': self.config.feature_columns,
                'model_params': self.config.model_params
            }, f, indent=2)
        
        return str(model_path)
    
    def load_model(self, model_path: str):
        """Load a trained model."""
        model_path = Path(model_path)
        
        if model_path.suffix == '.h5':
            # TensorFlow model
            self.model = tf.keras.models.load_model(model_path)
        else:
            # Scikit-learn model
            self.model = joblib.load(model_path)
        
        # Load preprocessor if exists
        preprocessor_path = model_path.parent / "preprocessor.pkl"
        if preprocessor_path.exists():
            self.preprocessor = joblib.load(preprocessor_path)
        
        self.logger.info(f"Model loaded from {model_path}")
    
    def predict(self, data: pd.DataFrame) -> np.ndarray:
        """Make predictions with loaded model."""
        if self.model is None:
            raise ValueError("No model loaded. Call load_model() first.")
        
        # Preprocess data if preprocessor exists
        if self.preprocessor:
            X_processed = self.preprocessor.transform(data)
        else:
            X_processed = data.values
        
        # Make predictions
        if hasattr(self.model, 'predict_proba') and self.config.problem_type == 'classification':
            predictions = self.model.predict_proba(X_processed)[:, 1]
        else:
            predictions = self.model.predict(X_processed)
        
        return predictions
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model."""
        if self.model is None:
            return {"status": "no_model_loaded"}
        
        info = {
            "model_type": self.config.model_type,
            "problem_type": self.config.problem_type,
            "has_preprocessor": self.preprocessor is not None
        }
        
        if hasattr(self.model, 'get_params'):
            info["parameters"] = self.model.get_params()
        
        return info