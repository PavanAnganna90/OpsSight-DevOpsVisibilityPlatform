"""
FastAPI Inference Service

High-performance model serving API for real-time predictions.
"""

import logging
import asyncio
import time
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field, validator
import pandas as pd
import numpy as np
import joblib
import mlflow.sklearn
import mlflow.tensorflow
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response

from ..model_registry.model_registry import ModelRegistry
from ..feature_store.feature_store import FeatureStore
from ..config import get_inference_config, get_feature_store_config
from ..utils.monitoring import MetricsCollector


# Pydantic models for API
class PredictionRequest(BaseModel):
    """Request model for predictions."""
    features: Dict[str, Union[float, int, str, bool]]
    model_name: Optional[str] = None
    model_version: Optional[str] = None
    explain: bool = False
    
    class Config:
        schema_extra = {
            "example": {
                "features": {
                    "cpu_usage": 75.5,
                    "memory_usage": 60.2,
                    "error_rate": 0.01,
                    "response_time": 250.0
                },
                "model_name": "anomaly_detection",
                "explain": False
            }
        }


class BatchPredictionRequest(BaseModel):
    """Request model for batch predictions."""
    instances: List[Dict[str, Union[float, int, str, bool]]]
    model_name: Optional[str] = None
    model_version: Optional[str] = None
    explain: bool = False
    
    @validator('instances')
    def validate_instances(cls, v):
        if len(v) > 1000:
            raise ValueError("Batch size cannot exceed 1000 instances")
        return v


class PredictionResponse(BaseModel):
    """Response model for predictions."""
    prediction: Union[float, int, List[float], List[int]]
    probability: Optional[Union[float, List[float]]] = None
    explanation: Optional[Dict[str, float]] = None
    model_info: Dict[str, str]
    latency_ms: float
    timestamp: datetime


class BatchPredictionResponse(BaseModel):
    """Response model for batch predictions."""
    predictions: List[Union[float, int]]
    probabilities: Optional[List[Union[float, List[float]]]] = None
    explanations: Optional[List[Dict[str, float]]] = None
    model_info: Dict[str, str]
    total_latency_ms: float
    avg_latency_ms: float
    timestamp: datetime


class ModelStatus(BaseModel):
    """Model status information."""
    name: str
    version: str
    stage: str
    status: str
    loaded_at: datetime
    prediction_count: int
    avg_latency_ms: float
    error_count: int


# Prometheus metrics
prediction_counter = Counter('ml_predictions_total', 'Total number of predictions', ['model_name', 'status'])
prediction_latency = Histogram('ml_prediction_duration_seconds', 'Prediction latency', ['model_name'])
model_load_counter = Counter('ml_model_loads_total', 'Total number of model loads', ['model_name'])


class ModelCache:
    """In-memory model cache for fast inference."""
    
    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.model_metadata: Dict[str, Dict[str, Any]] = {}
        self.model_stats: Dict[str, Dict[str, Union[int, float]]] = {}
        self.logger = logging.getLogger(__name__)
    
    async def load_model(self, model_name: str, model_version: Optional[str] = None) -> bool:
        """Load model into cache."""
        try:
            cache_key = f"{model_name}:{model_version or 'latest'}"
            
            if cache_key in self.models:
                return True
            
            # Load model from MLflow
            if model_version:
                model_uri = f"models:/{model_name}/{model_version}"
            else:
                model_uri = f"models:/{model_name}/Production"
            
            # Try loading as sklearn model first, then tensorflow
            try:
                model = mlflow.sklearn.load_model(model_uri)
            except:
                try:
                    model = mlflow.tensorflow.load_model(model_uri)
                except Exception as e:
                    self.logger.error(f"Failed to load model {model_uri}: {e}")
                    return False
            
            # Store model and metadata
            self.models[cache_key] = model
            self.model_metadata[cache_key] = {
                'name': model_name,
                'version': model_version or 'latest',
                'loaded_at': datetime.utcnow(),
                'model_uri': model_uri
            }
            self.model_stats[cache_key] = {
                'prediction_count': 0,
                'total_latency': 0.0,
                'error_count': 0
            }
            
            model_load_counter.labels(model_name=model_name).inc()
            self.logger.info(f"Loaded model {cache_key}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error loading model {model_name}: {e}")
            return False
    
    def get_model(self, model_name: str, model_version: Optional[str] = None) -> Optional[Any]:
        """Get model from cache."""
        cache_key = f"{model_name}:{model_version or 'latest'}"
        return self.models.get(cache_key)
    
    def get_model_metadata(self, model_name: str, model_version: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get model metadata."""
        cache_key = f"{model_name}:{model_version or 'latest'}"
        return self.model_metadata.get(cache_key)
    
    def update_stats(self, model_name: str, model_version: Optional[str], latency: float, error: bool = False):
        """Update model statistics."""
        cache_key = f"{model_name}:{model_version or 'latest'}"
        if cache_key in self.model_stats:
            stats = self.model_stats[cache_key]
            stats['prediction_count'] += 1
            stats['total_latency'] += latency
            if error:
                stats['error_count'] += 1
    
    def get_stats(self, model_name: str, model_version: Optional[str] = None) -> Dict[str, Union[int, float]]:
        """Get model statistics."""
        cache_key = f"{model_name}:{model_version or 'latest'}"
        stats = self.model_stats.get(cache_key, {})
        if stats.get('prediction_count', 0) > 0:
            stats['avg_latency'] = stats['total_latency'] / stats['prediction_count']
        return stats
    
    def list_models(self) -> List[Dict[str, Any]]:
        """List all cached models."""
        models = []
        for cache_key, metadata in self.model_metadata.items():
            stats = self.get_stats(metadata['name'], metadata['version'])
            models.append({
                **metadata,
                **stats
            })
        return models
    
    def unload_model(self, model_name: str, model_version: Optional[str] = None):
        """Unload model from cache."""
        cache_key = f"{model_name}:{model_version or 'latest'}"
        self.models.pop(cache_key, None)
        self.model_metadata.pop(cache_key, None)
        self.model_stats.pop(cache_key, None)
        self.logger.info(f"Unloaded model {cache_key}")


# Global instances
model_cache = ModelCache()
model_registry = ModelRegistry()
feature_store = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    global feature_store
    
    try:
        # Initialize feature store
        fs_config = get_feature_store_config()
        feature_store = FeatureStore(fs_config)
        
        # Load default models
        config = get_inference_config()
        default_models = config.get('default_models', [])
        
        for model_info in default_models:
            model_name = model_info['name']
            model_version = model_info.get('version')
            await model_cache.load_model(model_name, model_version)
        
        logging.info("Inference API started successfully")
        
    except Exception as e:
        logging.error(f"Failed to initialize inference API: {e}")
    
    yield
    
    # Shutdown
    logging.info("Inference API shutting down")


# Create FastAPI app
app = FastAPI(
    title="OpsSight ML Inference API",
    description="High-performance machine learning inference API for DevOps monitoring",
    version="1.0.0",
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "OpsSight ML Inference API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Check model registry
        registry_health = model_registry.health_check()
        
        # Check feature store
        fs_health = feature_store.get_health_status() if feature_store else {"status": "not_configured"}
        
        # Check cached models
        cached_models = model_cache.list_models()
        
        status = "healthy"
        if registry_health['status'] != 'healthy' or fs_health.get('redis_status') != 'healthy':
            status = "degraded"
        
        return {
            "status": status,
            "model_registry": registry_health,
            "feature_store": fs_health,
            "cached_models": len(cached_models),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest, background_tasks: BackgroundTasks):
    """Make a single prediction."""
    start_time = time.time()
    model_name = request.model_name or "default"
    
    try:
        # Load model if not cached
        if not model_cache.get_model(model_name, request.model_version):
            success = await model_cache.load_model(model_name, request.model_version)
            if not success:
                raise HTTPException(
                    status_code=404,
                    detail=f"Model {model_name} not found or failed to load"
                )
        
        # Get model and metadata
        model = model_cache.get_model(model_name, request.model_version)
        metadata = model_cache.get_model_metadata(model_name, request.model_version)
        
        # Prepare features
        feature_df = pd.DataFrame([request.features])
        
        # Make prediction
        if hasattr(model, 'predict_proba'):
            prediction = model.predict(feature_df)[0]
            probability = model.predict_proba(feature_df)[0].tolist()
        else:
            prediction = model.predict(feature_df)[0]
            probability = None
        
        # Feature importance (explanation)
        explanation = None
        if request.explain and hasattr(model, 'feature_importances_'):
            importance = model.feature_importances_
            feature_names = list(request.features.keys())
            explanation = dict(zip(feature_names, importance.tolist()))
        
        latency = (time.time() - start_time) * 1000
        
        # Update stats
        background_tasks.add_task(
            model_cache.update_stats,
            model_name,
            request.model_version,
            latency
        )
        
        # Update metrics
        prediction_counter.labels(model_name=model_name, status="success").inc()
        prediction_latency.labels(model_name=model_name).observe(latency / 1000)
        
        return PredictionResponse(
            prediction=prediction,
            probability=probability,
            explanation=explanation,
            model_info={
                "name": metadata['name'],
                "version": metadata['version'],
                "model_uri": metadata['model_uri']
            },
            latency_ms=latency,
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        latency = (time.time() - start_time) * 1000
        
        # Update error stats
        background_tasks.add_task(
            model_cache.update_stats,
            model_name,
            request.model_version,
            latency,
            error=True
        )
        
        prediction_counter.labels(model_name=model_name, status="error").inc()
        
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(request: BatchPredictionRequest, background_tasks: BackgroundTasks):
    """Make batch predictions."""
    start_time = time.time()
    model_name = request.model_name or "default"
    
    try:
        # Load model if not cached
        if not model_cache.get_model(model_name, request.model_version):
            success = await model_cache.load_model(model_name, request.model_version)
            if not success:
                raise HTTPException(
                    status_code=404,
                    detail=f"Model {model_name} not found or failed to load"
                )
        
        # Get model and metadata
        model = model_cache.get_model(model_name, request.model_version)
        metadata = model_cache.get_model_metadata(model_name, request.model_version)
        
        # Prepare features
        feature_df = pd.DataFrame(request.instances)
        
        # Make predictions
        predictions = model.predict(feature_df).tolist()
        
        probabilities = None
        if hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(feature_df).tolist()
        
        # Feature importance (explanations)
        explanations = None
        if request.explain and hasattr(model, 'feature_importances_'):
            importance = model.feature_importances_
            feature_names = list(request.instances[0].keys())
            explanation = dict(zip(feature_names, importance.tolist()))
            explanations = [explanation] * len(predictions)
        
        total_latency = (time.time() - start_time) * 1000
        avg_latency = total_latency / len(predictions)
        
        # Update stats
        background_tasks.add_task(
            model_cache.update_stats,
            model_name,
            request.model_version,
            total_latency
        )
        
        # Update metrics
        prediction_counter.labels(model_name=model_name, status="success").inc(len(predictions))
        prediction_latency.labels(model_name=model_name).observe(total_latency / 1000)
        
        return BatchPredictionResponse(
            predictions=predictions,
            probabilities=probabilities,
            explanations=explanations,
            model_info={
                "name": metadata['name'],
                "version": metadata['version'],
                "model_uri": metadata['model_uri']
            },
            total_latency_ms=total_latency,
            avg_latency_ms=avg_latency,
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        total_latency = (time.time() - start_time) * 1000
        
        # Update error stats
        background_tasks.add_task(
            model_cache.update_stats,
            model_name,
            request.model_version,
            total_latency,
            error=True
        )
        
        prediction_counter.labels(model_name=model_name, status="error").inc()
        
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")


@app.post("/models/{model_name}/load")
async def load_model(model_name: str, model_version: Optional[str] = None):
    """Load a model into cache."""
    try:
        success = await model_cache.load_model(model_name, model_version)
        if success:
            return {
                "message": f"Model {model_name} loaded successfully",
                "model_name": model_name,
                "model_version": model_version,
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Failed to load model {model_name}"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading model: {str(e)}")


@app.delete("/models/{model_name}/unload")
async def unload_model(model_name: str, model_version: Optional[str] = None):
    """Unload a model from cache."""
    try:
        model_cache.unload_model(model_name, model_version)
        return {
            "message": f"Model {model_name} unloaded successfully",
            "model_name": model_name,
            "model_version": model_version,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error unloading model: {str(e)}")


@app.get("/models", response_model=List[ModelStatus])
async def list_models():
    """List all cached models with their status."""
    try:
        cached_models = model_cache.list_models()
        
        model_statuses = []
        for model in cached_models:
            status = ModelStatus(
                name=model['name'],
                version=model['version'],
                stage="unknown",  # Would need to query model registry
                status="loaded",
                loaded_at=model['loaded_at'],
                prediction_count=model.get('prediction_count', 0),
                avg_latency_ms=model.get('avg_latency', 0.0),
                error_count=model.get('error_count', 0)
            )
            model_statuses.append(status)
        
        return model_statuses
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing models: {str(e)}")


@app.get("/models/{model_name}/status")
async def get_model_status(model_name: str, model_version: Optional[str] = None):
    """Get status for a specific model."""
    try:
        metadata = model_cache.get_model_metadata(model_name, model_version)
        if not metadata:
            raise HTTPException(status_code=404, detail=f"Model {model_name} not found in cache")
        
        stats = model_cache.get_stats(model_name, model_version)
        
        return {
            **metadata,
            **stats,
            "status": "loaded"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting model status: {str(e)}")


@app.get("/metrics")
async def get_metrics():
    """Get Prometheus metrics."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/models/{model_name}/explain/{feature_name}")
async def explain_feature(model_name: str, feature_name: str, model_version: Optional[str] = None):
    """Get feature importance for a specific feature."""
    try:
        model = model_cache.get_model(model_name, model_version)
        if not model:
            raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
        
        if not hasattr(model, 'feature_importances_'):
            raise HTTPException(
                status_code=400,
                detail="Model does not support feature importance"
            )
        
        # This is a simplified example - you'd need feature names mapping
        return {
            "model_name": model_name,
            "feature_name": feature_name,
            "importance": "Feature importance explanation would go here",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error explaining feature: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "inference_api:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )