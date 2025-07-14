"""
Configuration Management for ML Infrastructure

Centralized configuration for all ML components including Kafka, Redis, PostgreSQL,
MLflow, and other services.
"""

import os
import yaml
from typing import Dict, Any, Optional
from pathlib import Path
from dataclasses import dataclass, field


@dataclass
class KafkaConfig:
    """Kafka configuration."""
    bootstrap_servers: str = "localhost:9092"
    security_protocol: Optional[str] = None
    sasl_mechanism: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    
    @classmethod
    def from_env(cls) -> 'KafkaConfig':
        return cls(
            bootstrap_servers=os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092'),
            security_protocol=os.getenv('KAFKA_SECURITY_PROTOCOL'),
            sasl_mechanism=os.getenv('KAFKA_SASL_MECHANISM'),
            username=os.getenv('KAFKA_USERNAME'),
            password=os.getenv('KAFKA_PASSWORD')
        )


@dataclass
class RedisConfig:
    """Redis configuration."""
    host: str = "localhost"
    port: int = 6379
    db: int = 0
    password: Optional[str] = None
    ssl: bool = False
    
    @classmethod
    def from_env(cls) -> 'RedisConfig':
        return cls(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', '6379')),
            db=int(os.getenv('REDIS_DB', '0')),
            password=os.getenv('REDIS_PASSWORD'),
            ssl=os.getenv('REDIS_SSL', 'false').lower() == 'true'
        )


@dataclass
class PostgreSQLConfig:
    """PostgreSQL configuration."""
    host: str = "localhost"
    port: int = 5432
    database: str = "opssight_ml"
    user: str = "postgres"
    password: str = "postgres"
    
    @classmethod
    def from_env(cls) -> 'PostgreSQLConfig':
        return cls(
            host=os.getenv('POSTGRES_HOST', 'localhost'),
            port=int(os.getenv('POSTGRES_PORT', '5432')),
            database=os.getenv('POSTGRES_DATABASE', 'opssight_ml'),
            user=os.getenv('POSTGRES_USER', 'postgres'),
            password=os.getenv('POSTGRES_PASSWORD', 'postgres')
        )


@dataclass
class MLflowConfig:
    """MLflow configuration."""
    tracking_uri: str = "sqlite:///mlflow.db"
    artifact_root: str = "./mlruns"
    backend_store_uri: Optional[str] = None
    registry_uri: Optional[str] = None
    experiment_name: str = "opssight_ml"
    
    @classmethod
    def from_env(cls) -> 'MLflowConfig':
        return cls(
            tracking_uri=os.getenv('MLFLOW_TRACKING_URI', 'sqlite:///mlflow.db'),
            artifact_root=os.getenv('MLFLOW_ARTIFACT_ROOT', './mlruns'),
            backend_store_uri=os.getenv('MLFLOW_BACKEND_STORE_URI'),
            registry_uri=os.getenv('MLFLOW_REGISTRY_URI'),
            experiment_name=os.getenv('MLFLOW_EXPERIMENT_NAME', 'opssight_ml')
        )


@dataclass
class S3Config:
    """S3/MinIO configuration for artifact storage."""
    endpoint_url: Optional[str] = None
    access_key_id: Optional[str] = None
    secret_access_key: Optional[str] = None
    bucket_name: str = "opssight-ml-artifacts"
    region: str = "us-east-1"
    
    @classmethod
    def from_env(cls) -> 'S3Config':
        return cls(
            endpoint_url=os.getenv('S3_ENDPOINT_URL'),
            access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            bucket_name=os.getenv('S3_BUCKET_NAME', 'opssight-ml-artifacts'),
            region=os.getenv('AWS_DEFAULT_REGION', 'us-east-1')
        )


@dataclass
class ModelConfig:
    """Model training and inference configuration."""
    max_training_time: int = 3600  # seconds
    early_stopping_patience: int = 10
    validation_split: float = 0.2
    test_split: float = 0.1
    random_seed: int = 42
    model_registry_stage: str = "staging"
    auto_deploy_threshold: float = 0.95  # deploy if accuracy > 95%
    
    @classmethod
    def from_env(cls) -> 'ModelConfig':
        return cls(
            max_training_time=int(os.getenv('ML_MAX_TRAINING_TIME', '3600')),
            early_stopping_patience=int(os.getenv('ML_EARLY_STOPPING_PATIENCE', '10')),
            validation_split=float(os.getenv('ML_VALIDATION_SPLIT', '0.2')),
            test_split=float(os.getenv('ML_TEST_SPLIT', '0.1')),
            random_seed=int(os.getenv('ML_RANDOM_SEED', '42')),
            model_registry_stage=os.getenv('ML_MODEL_STAGE', 'staging'),
            auto_deploy_threshold=float(os.getenv('ML_AUTO_DEPLOY_THRESHOLD', '0.95'))
        )


@dataclass
class InferenceConfig:
    """Model inference configuration."""
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 4
    max_batch_size: int = 32
    timeout: int = 30
    cache_size: int = 1000
    enable_metrics: bool = True
    
    @classmethod
    def from_env(cls) -> 'InferenceConfig':
        return cls(
            host=os.getenv('INFERENCE_HOST', '0.0.0.0'),
            port=int(os.getenv('INFERENCE_PORT', '8000')),
            workers=int(os.getenv('INFERENCE_WORKERS', '4')),
            max_batch_size=int(os.getenv('INFERENCE_MAX_BATCH_SIZE', '32')),
            timeout=int(os.getenv('INFERENCE_TIMEOUT', '30')),
            cache_size=int(os.getenv('INFERENCE_CACHE_SIZE', '1000')),
            enable_metrics=os.getenv('INFERENCE_ENABLE_METRICS', 'true').lower() == 'true'
        )


@dataclass
class MLConfig:
    """Complete ML infrastructure configuration."""
    kafka: KafkaConfig = field(default_factory=KafkaConfig.from_env)
    redis: RedisConfig = field(default_factory=RedisConfig.from_env)
    postgresql: PostgreSQLConfig = field(default_factory=PostgreSQLConfig.from_env)
    mlflow: MLflowConfig = field(default_factory=MLflowConfig.from_env)
    s3: S3Config = field(default_factory=S3Config.from_env)
    model: ModelConfig = field(default_factory=ModelConfig.from_env)
    inference: InferenceConfig = field(default_factory=InferenceConfig.from_env)
    
    @classmethod
    def from_file(cls, config_path: str) -> 'MLConfig':
        """Load configuration from YAML file."""
        with open(config_path, 'r') as f:
            config_data = yaml.safe_load(f)
        
        return cls(
            kafka=KafkaConfig(**config_data.get('kafka', {})),
            redis=RedisConfig(**config_data.get('redis', {})),
            postgresql=PostgreSQLConfig(**config_data.get('postgresql', {})),
            mlflow=MLflowConfig(**config_data.get('mlflow', {})),
            s3=S3Config(**config_data.get('s3', {})),
            model=ModelConfig(**config_data.get('model', {})),
            inference=InferenceConfig(**config_data.get('inference', {}))
        )


# Global configuration instance
_config: Optional[MLConfig] = None


def get_config() -> MLConfig:
    """Get global configuration instance."""
    global _config
    if _config is None:
        config_file = os.getenv('ML_CONFIG_FILE')
        if config_file and Path(config_file).exists():
            _config = MLConfig.from_file(config_file)
        else:
            _config = MLConfig()
    return _config


def get_kafka_config() -> Dict[str, Any]:
    """Get Kafka configuration as dictionary."""
    config = get_config()
    return {
        'bootstrap_servers': config.kafka.bootstrap_servers,
        'security_protocol': config.kafka.security_protocol,
        'sasl_mechanism': config.kafka.sasl_mechanism,
        'username': config.kafka.username,
        'password': config.kafka.password
    }


def get_database_config() -> Dict[str, Any]:
    """Get database configuration as dictionary."""
    config = get_config()
    return {
        'host': config.postgresql.host,
        'port': config.postgresql.port,
        'database': config.postgresql.database,
        'user': config.postgresql.user,
        'password': config.postgresql.password
    }


def get_feature_store_config() -> Dict[str, Any]:
    """Get feature store configuration."""
    config = get_config()
    return {
        'redis': {
            'host': config.redis.host,
            'port': config.redis.port,
            'db': config.redis.db,
            'password': config.redis.password,
            'ssl': config.redis.ssl
        },
        'postgresql': {
            'host': config.postgresql.host,
            'port': config.postgresql.port,
            'database': config.postgresql.database,
            'user': config.postgresql.user,
            'password': config.postgresql.password
        }
    }


def get_mlflow_config() -> Dict[str, Any]:
    """Get MLflow configuration as dictionary."""
    config = get_config()
    return {
        'tracking_uri': config.mlflow.tracking_uri,
        'artifact_root': config.mlflow.artifact_root,
        'backend_store_uri': config.mlflow.backend_store_uri,
        'registry_uri': config.mlflow.registry_uri,
        'experiment_name': config.mlflow.experiment_name
    }


def get_model_config() -> Dict[str, Any]:
    """Get model configuration as dictionary."""
    config = get_config()
    return {
        'max_training_time': config.model.max_training_time,
        'early_stopping_patience': config.model.early_stopping_patience,
        'validation_split': config.model.validation_split,
        'test_split': config.model.test_split,
        'random_seed': config.model.random_seed,
        'model_registry_stage': config.model.model_registry_stage,
        'auto_deploy_threshold': config.model.auto_deploy_threshold
    }


def get_inference_config() -> Dict[str, Any]:
    """Get inference configuration as dictionary."""
    config = get_config()
    return {
        'host': config.inference.host,
        'port': config.inference.port,
        'workers': config.inference.workers,
        'max_batch_size': config.inference.max_batch_size,
        'timeout': config.inference.timeout,
        'cache_size': config.inference.cache_size,
        'enable_metrics': config.inference.enable_metrics
    }


# Environment-specific configurations
DEVELOPMENT_CONFIG = {
    'kafka': {
        'bootstrap_servers': 'localhost:9092'
    },
    'redis': {
        'host': 'localhost',
        'port': 6379,
        'db': 0
    },
    'postgresql': {
        'host': 'localhost',
        'port': 5432,
        'database': 'opssight_ml_dev',
        'user': 'postgres',
        'password': 'postgres'
    },
    'mlflow': {
        'tracking_uri': 'sqlite:///mlflow_dev.db',
        'experiment_name': 'opssight_ml_dev'
    }
}

PRODUCTION_CONFIG = {
    'kafka': {
        'bootstrap_servers': 'kafka-cluster:9092',
        'security_protocol': 'SASL_SSL',
        'sasl_mechanism': 'PLAIN'
    },
    'redis': {
        'host': 'redis-cluster',
        'port': 6379,
        'ssl': True
    },
    'postgresql': {
        'host': 'postgres-cluster',
        'port': 5432,
        'database': 'opssight_ml_prod'
    },
    'mlflow': {
        'tracking_uri': 'postgresql://mlflow_user:password@postgres-cluster:5432/mlflow',
        'artifact_root': 's3://opssight-ml-artifacts/',
        'experiment_name': 'opssight_ml_prod'
    }
}