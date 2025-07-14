"""
MLflow Model Registry Implementation

Centralized model versioning, staging, and deployment management.
"""

import logging
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
import pandas as pd

import mlflow
from mlflow.tracking import MlflowClient
from mlflow.entities import ModelVersion
from mlflow.exceptions import MlflowException

from ..config import get_mlflow_config
from ..utils.monitoring import MetricsCollector


class ModelStage(str, Enum):
    """Model lifecycle stages."""
    STAGING = "Staging"
    PRODUCTION = "Production"
    ARCHIVED = "Archived"
    NONE = "None"


@dataclass
class ModelInfo:
    """Model information structure."""
    name: str
    version: str
    stage: ModelStage
    description: str
    tags: Dict[str, str]
    metrics: Dict[str, float]
    created_at: datetime
    updated_at: datetime
    run_id: str
    model_uri: str
    source: str


@dataclass
class ModelApprovalRequest:
    """Model approval request structure."""
    model_name: str
    version: str
    target_stage: ModelStage
    description: str
    requester: str
    created_at: datetime
    metadata: Dict[str, Any]


class ModelRegistry:
    """
    MLflow-based model registry for centralized model management.
    
    Features:
    - Model versioning and lineage tracking
    - Stage-based model lifecycle management
    - Model approval workflows
    - Performance monitoring and comparison
    - Automated model deployment
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.metrics = MetricsCollector("model_registry")
        
        # Setup MLflow
        self.mlflow_config = get_mlflow_config()
        mlflow.set_tracking_uri(self.mlflow_config['tracking_uri'])
        self.client = MlflowClient()
        
        # Model approval tracking (in production, use a database)
        self.approval_requests: List[ModelApprovalRequest] = []
        
        self.logger.info("Model registry initialized")
    
    def register_model(
        self,
        model_name: str,
        run_id: str,
        description: str = "",
        tags: Optional[Dict[str, str]] = None
    ) -> ModelVersion:
        """Register a model from an MLflow run."""
        try:
            # Get model URI from run
            model_uri = f"runs:/{run_id}/model"
            
            # Register model
            model_version = mlflow.register_model(
                model_uri=model_uri,
                name=model_name,
                tags=tags or {}
            )
            
            # Update model description
            if description:
                self.client.update_model_version(
                    name=model_name,
                    version=model_version.version,
                    description=description
                )
            
            self.logger.info(f"Registered model {model_name} version {model_version.version}")
            self.metrics.increment('models_registered')
            
            return model_version
            
        except MlflowException as e:
            self.logger.error(f"Failed to register model: {e}")
            raise
    
    def create_model(
        self,
        model_name: str,
        description: str = "",
        tags: Optional[Dict[str, str]] = None
    ):
        """Create a new registered model."""
        try:
            self.client.create_registered_model(
                name=model_name,
                tags=tags or {},
                description=description
            )
            
            self.logger.info(f"Created registered model: {model_name}")
            self.metrics.increment('models_created')
            
        except MlflowException as e:
            if "RESOURCE_ALREADY_EXISTS" in str(e):
                self.logger.warning(f"Model {model_name} already exists")
            else:
                self.logger.error(f"Failed to create model: {e}")
                raise
    
    def list_models(self, filter_string: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all registered models."""
        try:
            models = self.client.search_registered_models(filter_string=filter_string)
            
            model_list = []
            for model in models:
                latest_versions = self.client.get_latest_versions(
                    model.name,
                    stages=[ModelStage.STAGING.value, ModelStage.PRODUCTION.value]
                )
                
                model_info = {
                    'name': model.name,
                    'description': model.description,
                    'tags': model.tags,
                    'creation_timestamp': model.creation_timestamp,
                    'last_updated_timestamp': model.last_updated_timestamp,
                    'latest_versions': [
                        {
                            'version': v.version,
                            'stage': v.current_stage,
                            'creation_timestamp': v.creation_timestamp,
                            'last_updated_timestamp': v.last_updated_timestamp
                        }
                        for v in latest_versions
                    ]
                }
                model_list.append(model_info)
            
            return model_list
            
        except MlflowException as e:
            self.logger.error(f"Failed to list models: {e}")
            raise
    
    def get_model_info(self, model_name: str, version: Optional[str] = None) -> ModelInfo:
        """Get detailed information about a model version."""
        try:
            if version:
                model_version = self.client.get_model_version(model_name, version)
            else:
                # Get latest version
                latest_versions = self.client.get_latest_versions(model_name)
                if not latest_versions:
                    raise ValueError(f"No versions found for model {model_name}")
                model_version = latest_versions[0]
            
            # Get run info for metrics
            run = self.client.get_run(model_version.run_id)
            
            return ModelInfo(
                name=model_version.name,
                version=model_version.version,
                stage=ModelStage(model_version.current_stage),
                description=model_version.description or "",
                tags=model_version.tags,
                metrics=run.data.metrics,
                created_at=datetime.fromtimestamp(model_version.creation_timestamp / 1000),
                updated_at=datetime.fromtimestamp(model_version.last_updated_timestamp / 1000),
                run_id=model_version.run_id,
                model_uri=model_version.source,
                source=model_version.source
            )
            
        except MlflowException as e:
            self.logger.error(f"Failed to get model info: {e}")
            raise
    
    def transition_model_stage(
        self,
        model_name: str,
        version: str,
        stage: ModelStage,
        archive_existing_versions: bool = False
    ) -> ModelVersion:
        """Transition a model version to a new stage."""
        try:
            model_version = self.client.transition_model_version_stage(
                name=model_name,
                version=version,
                stage=stage.value,
                archive_existing_versions=archive_existing_versions
            )
            
            self.logger.info(f"Transitioned {model_name} v{version} to {stage.value}")
            self.metrics.increment('stage_transitions')
            
            return model_version
            
        except MlflowException as e:
            self.logger.error(f"Failed to transition model stage: {e}")
            raise
    
    def compare_models(
        self,
        model_versions: List[Tuple[str, str]],
        metrics: Optional[List[str]] = None
    ) -> pd.DataFrame:
        """Compare performance metrics across model versions."""
        comparison_data = []
        
        for model_name, version in model_versions:
            try:
                model_info = self.get_model_info(model_name, version)
                
                row_data = {
                    'model_name': model_name,
                    'version': version,
                    'stage': model_info.stage.value,
                    'created_at': model_info.created_at,
                    'run_id': model_info.run_id
                }
                
                # Add metrics
                if metrics:
                    for metric in metrics:
                        row_data[metric] = model_info.metrics.get(metric, None)
                else:
                    row_data.update(model_info.metrics)
                
                comparison_data.append(row_data)
                
            except Exception as e:
                self.logger.error(f"Failed to get info for {model_name} v{version}: {e}")
        
        return pd.DataFrame(comparison_data)
    
    def get_model_lineage(self, model_name: str, version: str) -> Dict[str, Any]:
        """Get model lineage and experiment information."""
        try:
            model_version = self.client.get_model_version(model_name, version)
            run = self.client.get_run(model_version.run_id)
            experiment = self.client.get_experiment(run.info.experiment_id)
            
            # Get parent run if exists
            parent_run_id = run.data.tags.get('mlflow.parentRunId')
            parent_run = None
            if parent_run_id:
                try:
                    parent_run = self.client.get_run(parent_run_id)
                except:
                    pass
            
            lineage = {
                'model_name': model_name,
                'version': version,
                'run_id': model_version.run_id,
                'experiment': {
                    'id': experiment.experiment_id,
                    'name': experiment.name
                },
                'run_info': {
                    'start_time': datetime.fromtimestamp(run.info.start_time / 1000),
                    'end_time': datetime.fromtimestamp(run.info.end_time / 1000) if run.info.end_time else None,
                    'status': run.info.status,
                    'user_id': run.info.user_id
                },
                'parameters': run.data.params,
                'metrics': run.data.metrics,
                'tags': run.data.tags,
                'parent_run': {
                    'run_id': parent_run.info.run_id,
                    'experiment_id': parent_run.info.experiment_id
                } if parent_run else None,
                'artifacts': self.client.list_artifacts(run.info.run_id)
            }
            
            return lineage
            
        except MlflowException as e:
            self.logger.error(f"Failed to get model lineage: {e}")
            raise
    
    def delete_model_version(self, model_name: str, version: str):
        """Delete a specific model version."""
        try:
            self.client.delete_model_version(model_name, version)
            self.logger.info(f"Deleted {model_name} version {version}")
            self.metrics.increment('versions_deleted')
            
        except MlflowException as e:
            self.logger.error(f"Failed to delete model version: {e}")
            raise
    
    def delete_model(self, model_name: str):
        """Delete an entire registered model."""
        try:
            self.client.delete_registered_model(model_name)
            self.logger.info(f"Deleted registered model: {model_name}")
            self.metrics.increment('models_deleted')
            
        except MlflowException as e:
            self.logger.error(f"Failed to delete model: {e}")
            raise
    
    def create_approval_request(
        self,
        model_name: str,
        version: str,
        target_stage: ModelStage,
        description: str,
        requester: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ModelApprovalRequest:
        """Create a model approval request."""
        request = ModelApprovalRequest(
            model_name=model_name,
            version=version,
            target_stage=target_stage,
            description=description,
            requester=requester,
            created_at=datetime.utcnow(),
            metadata=metadata or {}
        )
        
        self.approval_requests.append(request)
        self.logger.info(f"Created approval request for {model_name} v{version} -> {target_stage.value}")
        
        return request
    
    def approve_model(
        self,
        model_name: str,
        version: str,
        approver: str,
        archive_existing: bool = True
    ) -> ModelVersion:
        """Approve a model for production deployment."""
        # Find approval request
        request = None
        for req in self.approval_requests:
            if req.model_name == model_name and req.version == version:
                request = req
                break
        
        if not request:
            raise ValueError(f"No approval request found for {model_name} v{version}")
        
        # Validate model performance (simplified example)
        model_info = self.get_model_info(model_name, version)
        if not self._validate_model_for_production(model_info):
            raise ValueError("Model does not meet production requirements")
        
        # Transition to target stage
        model_version = self.transition_model_stage(
            model_name=model_name,
            version=version,
            stage=request.target_stage,
            archive_existing_versions=archive_existing
        )
        
        # Add approval metadata
        self.client.set_model_version_tag(
            name=model_name,
            version=version,
            key="approved_by",
            value=approver
        )
        
        self.client.set_model_version_tag(
            name=model_name,
            version=version,
            key="approved_at",
            value=datetime.utcnow().isoformat()
        )
        
        # Remove from approval requests
        self.approval_requests.remove(request)
        
        self.logger.info(f"Approved {model_name} v{version} by {approver}")
        self.metrics.increment('models_approved')
        
        return model_version
    
    def _validate_model_for_production(self, model_info: ModelInfo) -> bool:
        """Validate if a model meets production requirements."""
        # Example validation rules
        required_metrics = ['accuracy', 'precision', 'recall']
        min_thresholds = {'accuracy': 0.85, 'precision': 0.80, 'recall': 0.80}
        
        for metric in required_metrics:
            if metric in model_info.metrics:
                value = model_info.metrics[metric]
                threshold = min_thresholds.get(metric, 0.0)
                if value < threshold:
                    self.logger.warning(f"Model {metric} ({value}) below threshold ({threshold})")
                    return False
        
        return True
    
    def get_model_performance_history(
        self,
        model_name: str,
        metric: str,
        limit: int = 10
    ) -> pd.DataFrame:
        """Get performance history for a model across versions."""
        try:
            # Get all versions of the model
            registered_model = self.client.get_registered_model(model_name)
            versions = self.client.search_model_versions(f"name='{model_name}'")
            
            performance_data = []
            
            for version in versions[:limit]:
                try:
                    run = self.client.get_run(version.run_id)
                    
                    if metric in run.data.metrics:
                        performance_data.append({
                            'version': version.version,
                            'metric': metric,
                            'value': run.data.metrics[metric],
                            'timestamp': datetime.fromtimestamp(version.creation_timestamp / 1000),
                            'stage': version.current_stage,
                            'run_id': version.run_id
                        })
                
                except Exception as e:
                    self.logger.error(f"Error getting performance for version {version.version}: {e}")
            
            return pd.DataFrame(performance_data).sort_values('timestamp')
            
        except MlflowException as e:
            self.logger.error(f"Failed to get performance history: {e}")
            return pd.DataFrame()
    
    def search_models(
        self,
        filter_string: Optional[str] = None,
        max_results: int = 100
    ) -> List[Dict[str, Any]]:
        """Search models based on filters."""
        try:
            models = self.client.search_registered_models(
                filter_string=filter_string,
                max_results=max_results
            )
            
            results = []
            for model in models:
                model_dict = {
                    'name': model.name,
                    'description': model.description,
                    'tags': model.tags,
                    'creation_timestamp': model.creation_timestamp,
                    'last_updated_timestamp': model.last_updated_timestamp
                }
                results.append(model_dict)
            
            return results
            
        except MlflowException as e:
            self.logger.error(f"Failed to search models: {e}")
            raise
    
    def get_production_models(self) -> List[ModelInfo]:
        """Get all models currently in production."""
        production_models = []
        
        try:
            all_models = self.client.search_registered_models()
            
            for model in all_models:
                production_versions = self.client.get_latest_versions(
                    model.name,
                    stages=[ModelStage.PRODUCTION.value]
                )
                
                for version in production_versions:
                    model_info = self.get_model_info(model.name, version.version)
                    production_models.append(model_info)
            
            return production_models
            
        except MlflowException as e:
            self.logger.error(f"Failed to get production models: {e}")
            return []
    
    def update_model_description(self, model_name: str, description: str):
        """Update model description."""
        try:
            self.client.update_registered_model(
                name=model_name,
                description=description
            )
            self.logger.info(f"Updated description for model {model_name}")
            
        except MlflowException as e:
            self.logger.error(f"Failed to update model description: {e}")
            raise
    
    def add_model_tags(self, model_name: str, tags: Dict[str, str]):
        """Add tags to a registered model."""
        try:
            for key, value in tags.items():
                self.client.set_registered_model_tag(model_name, key, value)
            
            self.logger.info(f"Added tags to model {model_name}: {tags}")
            
        except MlflowException as e:
            self.logger.error(f"Failed to add model tags: {e}")
            raise
    
    def get_model_tags(self, model_name: str) -> Dict[str, str]:
        """Get tags for a registered model."""
        try:
            model = self.client.get_registered_model(model_name)
            return model.tags
            
        except MlflowException as e:
            self.logger.error(f"Failed to get model tags: {e}")
            return {}
    
    def get_registry_stats(self) -> Dict[str, Any]:
        """Get registry statistics."""
        try:
            all_models = self.client.search_registered_models()
            
            stats = {
                'total_models': len(all_models),
                'models_by_stage': {
                    'staging': 0,
                    'production': 0,
                    'archived': 0,
                    'none': 0
                },
                'total_versions': 0,
                'pending_approvals': len(self.approval_requests),
                'metrics': self.metrics.get_all_metrics()
            }
            
            for model in all_models:
                versions = self.client.search_model_versions(f"name='{model.name}'")
                stats['total_versions'] += len(versions)
                
                for version in versions:
                    stage = version.current_stage.lower()
                    if stage in stats['models_by_stage']:
                        stats['models_by_stage'][stage] += 1
            
            return stats
            
        except MlflowException as e:
            self.logger.error(f"Failed to get registry stats: {e}")
            return {}
    
    def health_check(self) -> Dict[str, Any]:
        """Check registry health status."""
        try:
            # Test basic connectivity
            self.client.search_registered_models(max_results=1)
            
            return {
                'status': 'healthy',
                'tracking_uri': self.mlflow_config['tracking_uri'],
                'timestamp': datetime.utcnow().isoformat(),
                'stats': self.get_registry_stats()
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }