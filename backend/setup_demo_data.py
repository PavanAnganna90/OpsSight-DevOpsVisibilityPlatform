"""
Demo Data Setup for OpsSight Platform
Creates sample data for all features
"""
import asyncio
from datetime import datetime, timedelta
import random
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_database_manager
from app.models.user import User
from app.models.project import Project
from app.models.pipeline import Pipeline, PipelineRun, PipelineStage
from app.models.metrics import MetricSnapshot
from app.models.alert import Alert
from app.utils.security import get_password_hash


async def create_demo_data():
    """Create comprehensive demo data"""
    db_manager = get_database_manager()
    
    async with db_manager.get_session() as session:
        # Create demo users
        demo_users = [
            {
                "email": "dev@opssight.local",
                "password": get_password_hash("dev-password"),
                "first_name": "Dev",
                "last_name": "User",
                "role": "ADMIN",
                "is_active": True
            },
            {
                "email": "admin@opssight.local",
                "password": get_password_hash("admin-password"),
                "first_name": "Admin",
                "last_name": "User",
                "role": "ADMIN",
                "is_active": True
            },
            {
                "email": "user@opssight.local",
                "password": get_password_hash("user-password"),
                "first_name": "Regular",
                "last_name": "User",
                "role": "USER",
                "is_active": True
            }
        ]
        
        for user_data in demo_users:
            user = User(**user_data)
            session.add(user)
        
        await session.commit()
        
        # Create demo projects
        projects = [
            Project(
                name="OpsSight Platform",
                description="Main DevOps visibility platform",
                repository_url="https://github.com/opssight/platform",
                is_active=True
            ),
            Project(
                name="Microservices API",
                description="Backend microservices architecture",
                repository_url="https://github.com/opssight/api",
                is_active=True
            ),
            Project(
                name="Mobile App",
                description="React Native mobile application",
                repository_url="https://github.com/opssight/mobile",
                is_active=True
            )
        ]
        
        for project in projects:
            session.add(project)
        
        await session.commit()
        
        # Create demo pipelines with runs
        for project in projects:
            pipeline = Pipeline(
                project_id=project.id,
                name=f"{project.name} CI/CD",
                description=f"Automated pipeline for {project.name}",
                config={
                    "stages": ["build", "test", "security", "deploy"],
                    "triggers": ["push", "pull_request"]
                }
            )
            session.add(pipeline)
            await session.commit()
            
            # Create pipeline runs
            for i in range(20):
                run_time = datetime.utcnow() - timedelta(hours=random.randint(1, 168))
                status = random.choice(["SUCCESS", "FAILED", "RUNNING", "SUCCESS", "SUCCESS"])
                
                run = PipelineRun(
                    pipeline_id=pipeline.id,
                    run_number=i + 1,
                    status=status,
                    started_at=run_time,
                    finished_at=run_time + timedelta(minutes=random.randint(5, 30)) if status != "RUNNING" else None,
                    commit_sha=f"abc{random.randint(1000, 9999)}def",
                    branch="main" if i % 3 == 0 else "develop",
                    triggered_by="GitHub Actions"
                )
                session.add(run)
            
        await session.commit()
        
        # Create demo metrics
        metric_types = [
            ("cpu_usage", "percent"),
            ("memory_usage", "percent"),
            ("response_time", "milliseconds"),
            ("error_rate", "percent"),
            ("requests_per_second", "count"),
            ("active_users", "count")
        ]
        
        for metric_name, unit in metric_types:
            for i in range(100):
                timestamp = datetime.utcnow() - timedelta(minutes=i * 15)
                value = random.uniform(10, 90) if "percent" in unit else random.uniform(50, 500)
                
                metric = MetricSnapshot(
                    metric_name=metric_name,
                    metric_value=value,
                    unit=unit,
                    timestamp=timestamp,
                    labels={
                        "service": random.choice(["backend", "frontend", "api"]),
                        "environment": "production"
                    }
                )
                session.add(metric)
        
        await session.commit()
        
        # Create demo alerts
        alert_types = [
            ("High CPU Usage", "CPU usage above 80%", "warning"),
            ("Service Down", "Backend service is not responding", "critical"),
            ("High Error Rate", "Error rate exceeds 5%", "warning"),
            ("SSL Certificate Expiry", "SSL certificate expires in 7 days", "info"),
            ("Database Connection Pool", "Connection pool usage above 90%", "warning")
        ]
        
        for title, description, severity in alert_types:
            alert = Alert(
                title=title,
                description=description,
                severity=severity,
                status="active" if random.choice([True, False]) else "resolved",
                created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 72)),
                resolved_at=datetime.utcnow() if severity == "resolved" else None,
                metadata={
                    "service": random.choice(["backend", "frontend", "database"]),
                    "threshold": random.randint(70, 95)
                }
            )
            session.add(alert)
        
        await session.commit()
        
    print("✅ Demo data created successfully!")


if __name__ == "__main__":
    asyncio.run(create_demo_data())
