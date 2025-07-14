"""
Cluster service for database operations.
Handles cluster creation, updates, retrieval, and health monitoring operations.
"""

from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_, desc, func
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.cluster import Cluster, ClusterStatus, NodeStatus
from app.models.project import Project
from app.schemas.cluster import (
    ClusterCreate,
    ClusterUpdate,
    ClusterMetricsUpdate,
    NodeMetrics,
    ClusterHealth,
    ClusterStats,
    KubernetesMetrics,
)

# Configure logging
logger = logging.getLogger(__name__)


class ClusterService:
    """
    Service class for cluster-related database operations.

    Provides methods for creating, updating, retrieving clusters
    with proper error handling, logging, and Kubernetes integration.
    """

    @staticmethod
    async def get_cluster_by_id(
        db: AsyncSession, cluster_id: int, user_id: Optional[int] = None
    ) -> Optional[Cluster]:
        """
        Retrieve a cluster by its ID with access control.

        Args:
            db (AsyncSession): Database session
            cluster_id (int): Cluster ID to search for
            user_id (Optional[int]): User ID for access control check

        Returns:
            Optional[Cluster]: Cluster object if found and accessible, None otherwise
        """
        try:
            cluster = await db.execute(
                select(Cluster)
                .options(selectinload(Cluster.project))
                .filter(Cluster.id == cluster_id)
            )

            cluster = cluster.scalars().first()

            # Access control check
            if cluster and user_id:
                if not cluster.project.is_accessible_by_user(user_id):
                    logger.warning(
                        f"User {user_id} denied access to cluster {cluster_id}"
                    )
                    return None

            if cluster:
                logger.info(f"Retrieved cluster by ID: {cluster_id}")
            return cluster
        except Exception as e:
            logger.error(f"Error retrieving cluster by ID {cluster_id}: {e}")
            return None

    @staticmethod
    async def get_clusters_by_project(
        db: AsyncSession,
        project_id: int,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        status: Optional[ClusterStatus] = None,
        provider: Optional[str] = None,
    ) -> List[Cluster]:
        """
        Retrieve clusters for a project.

        Args:
            db (AsyncSession): Database session
            project_id (int): Project ID
            user_id (int): User ID for access control
            skip (int): Number of records to skip
            limit (int): Maximum number of records to return
            is_active (Optional[bool]): Filter by active status
            status (Optional[ClusterStatus]): Filter by cluster status
            provider (Optional[str]): Filter by cloud provider

        Returns:
            List[Cluster]: List of clusters
        """
        try:
            # Check project access
            project = await db.execute(select(Project).filter(Project.id == project_id))
            project = project.scalars().first()
            if not project or not project.is_accessible_by_user(user_id):
                logger.warning(f"User {user_id} denied access to project {project_id}")
                return []

            query = select(Cluster).filter(Cluster.project_id == project_id)

            if is_active is not None:
                query = query.filter(Cluster.is_active == is_active)
            if status:
                query = query.filter(Cluster.status == status)
            if provider:
                query = query.filter(Cluster.provider.ilike(f"%{provider}%"))

            clusters = await db.execute(query.offset(skip).limit(limit))
            clusters = clusters.scalars().all()
            logger.info(f"Retrieved {len(clusters)} clusters for project {project_id}")
            return clusters
        except Exception as e:
            logger.error(f"Error retrieving clusters for project {project_id}: {e}")
            return []

    @staticmethod
    async def create_cluster(
        db: AsyncSession, cluster_data: ClusterCreate, user_id: int
    ) -> Optional[Cluster]:
        """
        Create a new cluster.

        Args:
            db (AsyncSession): Database session
            cluster_data (ClusterCreate): Cluster creation data
            user_id (int): User ID for access control

        Returns:
            Optional[Cluster]: Created cluster object or None if creation failed
        """
        try:
            # Check project access
            project = await db.execute(
                select(Project).filter(Project.id == cluster_data.project_id)
            )
            project = project.scalars().first()
            if not project or not project.is_accessible_by_user(user_id):
                logger.warning(
                    f"User {user_id} denied access to project {cluster_data.project_id}"
                )
                return None

            # Create cluster instance
            cluster = Cluster(
                name=cluster_data.name,
                description=cluster_data.description,
                provider=cluster_data.provider,
                region=cluster_data.region,
                version=cluster_data.version,
                endpoint=cluster_data.endpoint,
                status=ClusterStatus.PROVISIONING,
                config=cluster_data.config or {},
                is_active=cluster_data.is_active,
                project_id=cluster_data.project_id,
            )

            # Add to database
            db.add(cluster)
            await db.commit()
            await db.refresh(cluster)

            logger.info(f"Created new cluster: {cluster.name} (ID: {cluster.id})")
            return cluster

        except IntegrityError as e:
            await db.rollback()
            logger.error(f"Cluster creation failed - integrity error: {e}")
            return None
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating cluster: {e}")
            return None

    @staticmethod
    async def update_cluster(
        db: AsyncSession, cluster_id: int, cluster_data: ClusterUpdate, user_id: int
    ) -> Optional[Cluster]:
        """
        Update an existing cluster.

        Args:
            db (AsyncSession): Database session
            cluster_id (int): Cluster ID to update
            cluster_data (ClusterUpdate): Update data
            user_id (int): User ID for access control

        Returns:
            Optional[Cluster]: Updated cluster object or None if update failed
        """
        try:
            cluster = await ClusterService.get_cluster_by_id(db, cluster_id, user_id)
            if not cluster:
                return None

            # Update fields if provided
            if cluster_data.name is not None:
                cluster.name = cluster_data.name
            if cluster_data.description is not None:
                cluster.description = cluster_data.description
            if cluster_data.version is not None:
                cluster.version = cluster_data.version
            if cluster_data.status is not None:
                cluster.status = cluster_data.status
            if cluster_data.config is not None:
                cluster.config = cluster_data.config
            if cluster_data.is_active is not None:
                cluster.is_active = cluster_data.is_active

            # Save changes
            await db.commit()
            await db.refresh(cluster)

            logger.info(f"Updated cluster: {cluster.name} (ID: {cluster.id})")
            return cluster

        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating cluster {cluster_id}: {e}")
            return None

    @staticmethod
    async def update_cluster_metrics(
        db: AsyncSession,
        cluster_id: int,
        metrics_data: ClusterMetricsUpdate,
        user_id: int,
    ) -> Optional[Cluster]:
        """
        Update cluster metrics and status.

        Args:
            db (AsyncSession): Database session
            cluster_id (int): Cluster ID to update
            metrics_data (ClusterMetricsUpdate): Metrics update data
            user_id (int): User ID for access control

        Returns:
            Optional[Cluster]: Updated cluster object or None if update failed
        """
        try:
            cluster = await ClusterService.get_cluster_by_id(db, cluster_id, user_id)
            if not cluster:
                return None

            # Use model method to update from metrics
            success = cluster.update_from_metrics(metrics_data.dict())
            if not success:
                logger.warning(f"Failed to update cluster {cluster_id} metrics")
                return None

            # Save changes
            await db.commit()
            await db.refresh(cluster)

            logger.info(f"Updated cluster metrics: {cluster.name} (ID: {cluster.id})")
            return cluster

        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating cluster metrics {cluster_id}: {e}")
            return None

    @staticmethod
    async def get_cluster_health(
        db: AsyncSession, cluster_id: int, user_id: int
    ) -> Optional[ClusterHealth]:
        """
        Get cluster health assessment.

        Args:
            db (AsyncSession): Database session
            cluster_id (int): Cluster ID
            user_id (int): User ID for access control

        Returns:
            Optional[ClusterHealth]: Cluster health data or None if not accessible
        """
        try:
            cluster = await ClusterService.get_cluster_by_id(db, cluster_id, user_id)
            if not cluster:
                return None

            # Calculate health score using model method
            health_score = cluster.calculate_health_score()
            needs_attention = cluster.needs_attention()

            # Build health summary
            health = ClusterHealth(
                cluster_id=cluster.id,
                health_score=health_score,
                status=cluster.status,
                needs_attention=needs_attention,
                node_count=cluster.node_count or 0,
                healthy_nodes=len(
                    [n for n in (cluster.nodes or []) if n.get("status") == "Ready"]
                ),
                pod_count=cluster.pod_count or 0,
                running_pods=len(
                    [p for p in (cluster.pods or []) if p.get("status") == "Running"]
                ),
                cpu_usage_percent=cluster.cpu_usage_percent,
                memory_usage_percent=cluster.memory_usage_percent,
                storage_usage_percent=cluster.storage_usage_percent,
                network_rx_bytes=cluster.network_rx_bytes,
                network_tx_bytes=cluster.network_tx_bytes,
                last_check=cluster.last_health_check,
            )

            return health

        except Exception as e:
            logger.error(f"Error getting cluster health for {cluster_id}: {e}")
            return None

    @staticmethod
    async def get_cluster_stats(
        db: AsyncSession, project_id: int, user_id: int
    ) -> Optional[ClusterStats]:
        """
        Get cluster statistics for a project.

        Args:
            db (AsyncSession): Database session
            project_id (int): Project ID
            user_id (int): User ID for access control

        Returns:
            Optional[ClusterStats]: Cluster statistics or None if not accessible
        """
        try:
            # Check project access
            project = await db.execute(select(Project).filter(Project.id == project_id))
            project = project.scalars().first()
            if not project or not project.is_accessible_by_user(user_id):
                logger.warning(f"User {user_id} denied access to project {project_id}")
                return None

            # Get cluster counts by status
            total_clusters = await db.execute(
                select(func.count(Cluster.id)).filter(
                    Cluster.project_id == project_id, Cluster.is_active == True
                )
            )
            total_clusters = total_clusters.scalars().first() or 0

            healthy_clusters = await db.execute(
                select(func.count(Cluster.id)).filter(
                    Cluster.project_id == project_id,
                    Cluster.is_active == True,
                    Cluster.status == ClusterStatus.RUNNING,
                )
            )
            healthy_clusters = healthy_clusters.scalars().first() or 0

            provisioning_clusters = await db.execute(
                select(func.count(Cluster.id)).filter(
                    Cluster.project_id == project_id,
                    Cluster.is_active == True,
                    Cluster.status == ClusterStatus.PROVISIONING,
                )
            )
            provisioning_clusters = provisioning_clusters.scalars().first() or 0

            error_clusters = await db.execute(
                select(func.count(Cluster.id)).filter(
                    Cluster.project_id == project_id,
                    Cluster.is_active == True,
                    Cluster.status == ClusterStatus.ERROR,
                )
            )
            error_clusters = error_clusters.scalars().first() or 0

            # Get resource totals
            clusters = await db.execute(
                select(Cluster).filter(
                    Cluster.project_id == project_id, Cluster.is_active == True
                )
            )
            clusters = clusters.scalars().all()

            total_nodes = sum(cluster.node_count or 0 for cluster in clusters)
            total_pods = sum(cluster.pod_count or 0 for cluster in clusters)

            # Calculate average resource usage
            cpu_usage_values = [
                c.cpu_usage_percent for c in clusters if c.cpu_usage_percent is not None
            ]
            memory_usage_values = [
                c.memory_usage_percent
                for c in clusters
                if c.memory_usage_percent is not None
            ]

            avg_cpu_usage = (
                sum(cpu_usage_values) / len(cpu_usage_values) if cpu_usage_values else 0
            )
            avg_memory_usage = (
                sum(memory_usage_values) / len(memory_usage_values)
                if memory_usage_values
                else 0
            )

            return ClusterStats(
                total_clusters=total_clusters,
                healthy_clusters=healthy_clusters,
                provisioning_clusters=provisioning_clusters,
                error_clusters=error_clusters,
                total_nodes=total_nodes,
                total_pods=total_pods,
                average_cpu_usage=avg_cpu_usage,
                average_memory_usage=avg_memory_usage,
            )

        except Exception as e:
            logger.error(f"Error getting cluster stats for project {project_id}: {e}")
            return None

    @staticmethod
    async def get_clusters_needing_attention(
        db: AsyncSession, project_id: int, user_id: int
    ) -> List[Cluster]:
        """
        Get clusters that need attention based on health checks.

        Args:
            db (AsyncSession): Database session
            project_id (int): Project ID
            user_id (int): User ID for access control

        Returns:
            List[Cluster]: List of clusters needing attention
        """
        try:
            # Check project access
            project = await db.execute(select(Project).filter(Project.id == project_id))
            project = project.scalars().first()
            if not project or not project.is_accessible_by_user(user_id):
                logger.warning(f"User {user_id} denied access to project {project_id}")
                return []

            clusters = await db.execute(
                select(Cluster).filter(
                    Cluster.project_id == project_id, Cluster.is_active == True
                )
            )
            clusters = clusters.scalars().all()

            # Filter clusters that need attention using model method
            attention_clusters = [
                cluster for cluster in clusters if cluster.needs_attention()
            ]

            logger.info(
                f"Found {len(attention_clusters)} clusters needing attention for project {project_id}"
            )
            return attention_clusters

        except Exception as e:
            logger.error(
                f"Error getting clusters needing attention for project {project_id}: {e}"
            )
            return []
