#!/usr/bin/env python3
"""
OpsSight Database Setup Script - v2.0.0
Initialize PostgreSQL database with OpsSight schema and default data

Usage:
    python setup_database.py [--drop-existing] [--sample-data]

Features:
- Creates all database tables
- Sets up default organization and admin user
- Optionally creates sample data for development
- Database health checks
- Environment configuration validation
"""

import asyncio
import argparse
import logging
import os
import sys
from datetime import datetime, timedelta
import uuid
import random

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import (
    init_database, db_manager, AsyncSessionLocal,
    Organization, User, Service, Metric, Alert, Deployment,
    UserRole, AlertSeverity, AlertStatus, ServiceStatus, DeploymentStatus
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def validate_environment():
    """Validate required environment variables and dependencies"""
    logger.info("🔍 Validating environment configuration...")
    
    required_packages = [
        'sqlalchemy', 'asyncpg', 'alembic', 'fastapi', 'cryptography'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        logger.error(f"❌ Missing required packages: {', '.join(missing_packages)}")
        logger.error("Please install requirements: pip install -r requirements.txt")
        return False
    
    # Check database configuration
    db_config = {
        'DB_HOST': os.getenv('DB_HOST', 'localhost'),
        'DB_PORT': os.getenv('DB_PORT', '5432'),
        'DB_NAME': os.getenv('DB_NAME', 'opssight'),
        'DB_USER': os.getenv('DB_USER', 'opssight'),
        'DB_PASSWORD': os.getenv('DB_PASSWORD', 'opssight123'),
    }
    
    logger.info("📋 Database Configuration:")
    for key, value in db_config.items():
        if 'PASSWORD' in key:
            logger.info(f"  {key}: {'*' * len(value)}")
        else:
            logger.info(f"  {key}: {value}")
    
    # Test database connectivity
    try:
        health_check = await db_manager.health_check()
        if health_check['status'] == 'healthy':
            logger.info("✅ Database connection successful")
            logger.info(f"   Response time: {health_check['response_time_seconds']:.3f}s")
            return True
        else:
            logger.error(f"❌ Database connection failed: {health_check.get('error', 'Unknown error')}")
            return False
    except Exception as e:
        logger.error(f"❌ Database connection test failed: {e}")
        logger.info("💡 Make sure PostgreSQL is running and accessible")
        logger.info("💡 Create database if it doesn't exist: CREATE DATABASE opssight;")
        return False

async def drop_existing_tables():
    """Drop all existing tables (use with caution!)"""
    logger.warning("⚠️  Dropping all existing tables...")
    
    confirm = input("This will delete ALL data. Type 'YES' to confirm: ")
    if confirm != 'YES':
        logger.info("❌ Operation cancelled")
        return False
    
    try:
        await db_manager.drop_all_tables()
        logger.info("✅ All tables dropped successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to drop tables: {e}")
        return False

async def create_sample_data(org_id: uuid.UUID):
    """Create sample data for development and testing"""
    logger.info("📊 Creating sample data...")
    
    async with AsyncSessionLocal() as session:
        try:
            # Create sample services
            services_data = [
                {
                    'organization_id': org_id,
                    'name': 'opssight-frontend',
                    'description': 'OpsSight web frontend application',
                    'service_type': 'web',
                    'environment': 'production',
                    'status': ServiceStatus.HEALTHY,
                    'health_check_url': 'https://app.opssight.local/health',
                    'repository_url': 'https://github.com/opssight/frontend',
                    'tags': {'team': 'frontend', 'language': 'typescript'},
                    'dependencies': ['opssight-backend', 'redis']
                },
                {
                    'organization_id': org_id,
                    'name': 'opssight-backend',
                    'description': 'OpsSight API backend service',
                    'service_type': 'api',
                    'environment': 'production',
                    'status': ServiceStatus.HEALTHY,
                    'health_check_url': 'https://api.opssight.local/health',
                    'repository_url': 'https://github.com/opssight/backend',
                    'tags': {'team': 'backend', 'language': 'python'},
                    'dependencies': ['postgres', 'redis']
                },
                {
                    'organization_id': org_id,
                    'name': 'postgres',
                    'description': 'PostgreSQL database',
                    'service_type': 'database',
                    'environment': 'production',
                    'status': ServiceStatus.HEALTHY,
                    'tags': {'type': 'database', 'vendor': 'postgresql'},
                    'dependencies': []
                },
                {
                    'organization_id': org_id,
                    'name': 'redis',
                    'description': 'Redis cache and session store',
                    'service_type': 'cache',
                    'environment': 'production',
                    'status': ServiceStatus.HEALTHY,
                    'tags': {'type': 'cache', 'vendor': 'redis'},
                    'dependencies': []
                },
                {
                    'organization_id': org_id,
                    'name': 'nginx',
                    'description': 'NGINX load balancer',
                    'service_type': 'proxy',
                    'environment': 'production',
                    'status': ServiceStatus.DEGRADED,
                    'tags': {'type': 'proxy', 'vendor': 'nginx'},
                    'dependencies': ['opssight-frontend', 'opssight-backend']
                }
            ]
            
            created_services = []
            for service_data in services_data:
                service = Service(**service_data)
                session.add(service)
                created_services.append(service)
            
            await session.commit()
            
            # Create sample metrics for the last 24 hours
            metrics_data = []
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=24)
            
            metric_names = [
                ('cpu_usage', '%', 'gauge'),
                ('memory_usage', '%', 'gauge'),
                ('disk_usage', '%', 'gauge'),
                ('response_time', 'ms', 'gauge'),
                ('request_count', 'requests', 'counter'),
                ('error_rate', '%', 'gauge')
            ]
            
            current_time = start_time
            while current_time <= end_time:
                for service in created_services:
                    for metric_name, unit, metric_type in metric_names:
                        # Generate realistic sample values
                        if metric_name == 'cpu_usage':
                            value = random.uniform(20, 80)
                        elif metric_name == 'memory_usage':
                            value = random.uniform(40, 85)
                        elif metric_name == 'disk_usage':
                            value = random.uniform(30, 70)
                        elif metric_name == 'response_time':
                            value = random.uniform(50, 300)
                        elif metric_name == 'request_count':
                            value = random.randint(100, 2000)
                        elif metric_name == 'error_rate':
                            value = random.uniform(0, 5)
                        else:
                            value = random.uniform(0, 100)
                        
                        metrics_data.append({
                            'organization_id': org_id,
                            'service_id': service.id,
                            'name': metric_name,
                            'metric_type': metric_type,
                            'value': value,
                            'unit': unit,
                            'timestamp': current_time,
                            'dimensions': {'service': service.name}
                        })
                
                current_time += timedelta(minutes=5)  # 5-minute intervals
            
            # Bulk insert metrics
            for metric_data in metrics_data:
                metric = Metric(**metric_data)
                session.add(metric)
            
            await session.commit()
            
            # Create sample alerts
            alerts_data = [
                {
                    'organization_id': org_id,
                    'service_id': created_services[0].id,  # frontend
                    'alert_id': 'HIGH_CPU_FRONTEND_001',
                    'title': 'High CPU Usage - Frontend Service',
                    'description': 'CPU usage has exceeded 80% threshold for 5+ minutes',
                    'severity': AlertSeverity.HIGH,
                    'status': AlertStatus.ACTIVE,
                    'category': 'performance',
                    'source': 'prometheus',
                    'metric_name': 'cpu_usage',
                    'current_value': 87.3,
                    'threshold_value': 80.0,
                    'threshold_operator': '>',
                    'first_seen': datetime.utcnow() - timedelta(minutes=15),
                    'last_seen': datetime.utcnow(),
                    'alert_metadata': {'instance': 'frontend-01', 'cluster': 'production'}
                },
                {
                    'organization_id': org_id,
                    'service_id': created_services[4].id,  # nginx
                    'alert_id': 'SERVICE_DEGRADED_NGINX_001',
                    'title': 'Service Degraded - NGINX Load Balancer',
                    'description': 'Service health check reporting degraded status',
                    'severity': AlertSeverity.MEDIUM,
                    'status': AlertStatus.ACKNOWLEDGED,
                    'category': 'availability',
                    'source': 'health_check',
                    'first_seen': datetime.utcnow() - timedelta(hours=2),
                    'last_seen': datetime.utcnow() - timedelta(minutes=30),
                    'acknowledged_at': datetime.utcnow() - timedelta(minutes=45),
                    'alert_metadata': {'load_balancer': 'nginx-prod', 'upstream_errors': 3}
                },
                {
                    'organization_id': org_id,
                    'service_id': created_services[1].id,  # backend
                    'alert_id': 'RESPONSE_TIME_BACKEND_001',
                    'title': 'High Response Time - Backend API',
                    'description': 'API response time exceeded 500ms threshold',
                    'severity': AlertSeverity.MEDIUM,
                    'status': AlertStatus.RESOLVED,
                    'category': 'performance',
                    'source': 'application_metrics',
                    'metric_name': 'response_time',
                    'current_value': 650.0,
                    'threshold_value': 500.0,
                    'threshold_operator': '>',
                    'first_seen': datetime.utcnow() - timedelta(hours=4),
                    'last_seen': datetime.utcnow() - timedelta(hours=3),
                    'resolved_at': datetime.utcnow() - timedelta(hours=3),
                    'alert_metadata': {'endpoint': '/api/v1/metrics', 'method': 'GET'}
                }
            ]
            
            for alert_data in alerts_data:
                alert = Alert(**alert_data)
                session.add(alert)
            
            await session.commit()
            
            # Create sample deployments
            deployments_data = [
                {
                    'organization_id': org_id,
                    'service_id': created_services[0].id,  # frontend
                    'deployment_id': 'deploy-frontend-20240126-001',
                    'version': 'v2.1.0',
                    'environment': 'production',
                    'status': DeploymentStatus.SUCCESS,
                    'source_commit': 'a1b2c3d4e5f6',
                    'source_branch': 'main',
                    'source_repository': 'https://github.com/opssight/frontend',
                    'release_notes': 'Updated dashboard UI and fixed mobile responsiveness',
                    'started_at': datetime.utcnow() - timedelta(hours=6),
                    'completed_at': datetime.utcnow() - timedelta(hours=6, minutes=-15),
                    'duration_seconds': 900,  # 15 minutes
                    'configuration': {'replicas': 3, 'cpu_limit': '1000m', 'memory_limit': '2Gi'}
                },
                {
                    'organization_id': org_id,
                    'service_id': created_services[1].id,  # backend
                    'deployment_id': 'deploy-backend-20240126-001',
                    'version': 'v1.5.2',
                    'environment': 'production',
                    'status': DeploymentStatus.SUCCESS,
                    'source_commit': 'f6e5d4c3b2a1',
                    'source_branch': 'main',
                    'source_repository': 'https://github.com/opssight/backend',
                    'release_notes': 'Performance optimizations and database query improvements',
                    'started_at': datetime.utcnow() - timedelta(hours=12),
                    'completed_at': datetime.utcnow() - timedelta(hours=12, minutes=-20),
                    'duration_seconds': 1200,  # 20 minutes
                    'configuration': {'replicas': 2, 'cpu_limit': '2000m', 'memory_limit': '4Gi'}
                }
            ]
            
            for deployment_data in deployments_data:
                deployment = Deployment(**deployment_data)
                session.add(deployment)
            
            await session.commit()
            
            logger.info(f"✅ Created sample data:")
            logger.info(f"   📦 Services: {len(services_data)}")
            logger.info(f"   📊 Metrics: {len(metrics_data)} data points")
            logger.info(f"   🚨 Alerts: {len(alerts_data)}")
            logger.info(f"   🚀 Deployments: {len(deployments_data)}")
            
        except Exception as e:
            await session.rollback()
            logger.error(f"❌ Failed to create sample data: {e}")
            raise

async def setup_database(drop_existing: bool = False, create_samples: bool = False):
    """Main database setup function"""
    logger.info("🚀 Starting OpsSight database setup...")
    
    # Validate environment
    if not await validate_environment():
        logger.error("❌ Environment validation failed")
        return False
    
    # Drop existing tables if requested
    if drop_existing:
        if not await drop_existing_tables():
            return False
    
    try:
        # Initialize database (creates tables and default data)
        await init_database()
        logger.info("✅ Database tables created successfully")
        
        # Get default organization for sample data
        if create_samples:
            async with AsyncSessionLocal() as session:
                # Get default organization
                from sqlalchemy.sql import select
                result = await session.execute(
                    select(Organization).where(Organization.slug == 'default')
                )
                default_org = result.scalar_one_or_none()
                
                if default_org:
                    await create_sample_data(default_org.id)
                else:
                    logger.error("❌ Default organization not found for sample data creation")
        
        # Final health check
        health_check = await db_manager.health_check()
        if health_check['status'] == 'healthy':
            logger.info("🎉 Database setup completed successfully!")
            logger.info(f"   Database: {os.getenv('DB_NAME', 'opssight')}")
            logger.info(f"   Host: {os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5432')}")
            logger.info(f"   Health: {health_check['status']}")
            logger.info(f"   Response time: {health_check['response_time_seconds']:.3f}s")
            
            # Connection pool stats
            if 'pool_stats' in health_check:
                pool_stats = health_check['pool_stats']
                logger.info(f"   Pool size: {pool_stats['size']}")
                logger.info(f"   Active connections: {pool_stats['checked_out']}")
            
            logger.info("\n🔑 Default Admin Credentials:")
            logger.info("   Username: admin")
            logger.info("   Password: admin123")
            logger.info("   Organization: default")
            
            return True
        else:
            logger.error(f"❌ Final health check failed: {health_check.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Database setup failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='OpsSight Database Setup Script',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic setup (creates tables and default data)
  python setup_database.py
  
  # Setup with sample data for development
  python setup_database.py --sample-data
  
  # Fresh setup (drops existing tables first)
  python setup_database.py --drop-existing --sample-data
  
Environment Variables:
  DB_HOST     - Database host (default: localhost)
  DB_PORT     - Database port (default: 5432)
  DB_NAME     - Database name (default: opssight)
  DB_USER     - Database user (default: opssight)
  DB_PASSWORD - Database password (default: opssight123)
        """
    )
    
    parser.add_argument(
        '--drop-existing',
        action='store_true',
        help='Drop all existing tables before creating new ones (DESTRUCTIVE!)'
    )
    
    parser.add_argument(
        '--sample-data',
        action='store_true',
        help='Create sample data for development and testing'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Show banner
    print("=" * 60)
    print("🔧 OpsSight Database Setup - v2.0.0")
    print("   Enterprise DevOps Intelligence Platform")
    print("=" * 60)
    print()
    
    # Run setup
    try:
        success = asyncio.run(setup_database(
            drop_existing=args.drop_existing,
            create_samples=args.sample_data
        ))
        
        if success:
            print("\n" + "=" * 60)
            print("✅ Database setup completed successfully!")
            print("🚀 You can now start the OpsSight application")
            print("=" * 60)
            sys.exit(0)
        else:
            print("\n" + "=" * 60)
            print("❌ Database setup failed!")
            print("Please check the error messages above")
            print("=" * 60)
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n❌ Setup cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()