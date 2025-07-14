"""
CI/CD Failure Analysis API Endpoints
Provides API endpoints for CI/CD pipeline failure analysis and webhook integration
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.logger import logger
from app.models.user import User
from app.models.alert import Alert
from app.services.webhook_notification_service import WebhookNotificationService
from app.core.cache import CacheService
from app.core.security_monitor import SecurityMonitor

router = APIRouter()


@router.get("/failures", response_model=Dict[str, Any])
async def get_ci_failures(
    pipeline_id: Optional[str] = Query(None, description="Filter by pipeline ID"),
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    time_range: str = Query("24h", description="Time range for failures (1h, 24h, 7d, 30d)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get CI/CD pipeline failures with analysis"""
    try:
        # Parse time range
        time_delta = {
            "1h": timedelta(hours=1),
            "24h": timedelta(days=1),
            "7d": timedelta(days=7),
            "30d": timedelta(days=30)
        }.get(time_range, timedelta(days=1))
        
        since = datetime.utcnow() - time_delta
        
        # Build query filters
        filters = [Alert.created_at >= since]
        
        # Filter for CI/CD related alerts
        ci_categories = ["ci", "cd", "pipeline", "build", "deploy", "test"]
        ci_sources = ["github", "jenkins", "gitlab", "circleci", "travis"]
        
        ci_filter = or_(
            *[Alert.category.ilike(f"%{cat}%") for cat in ci_categories],
            *[Alert.source.ilike(f"%src%") for src in ci_sources]
        )
        filters.append(ci_filter)
        
        if pipeline_id:
            filters.append(Alert.metadata.contains({"pipeline_id": pipeline_id}))
        
        if project_id:
            filters.append(Alert.project_id == project_id)
        
        # Execute query with pagination
        query = db.query(Alert).filter(and_(*filters)).order_by(desc(Alert.created_at))
        total = query.count()
        
        offset = (page - 1) * limit
        alerts = query.offset(offset).limit(limit).all()
        
        # Transform alerts to CI failure format
        failures = []
        for alert in alerts:
            metadata = alert.metadata or {}
            
            failure = {
                "id": f"fail_{alert.id}",
                "pipeline_id": metadata.get("pipeline_id", f"pipe_{alert.id}"),
                "job_name": metadata.get("job_name", alert.title),
                "stage": metadata.get("stage", _infer_stage_from_alert(alert)),
                "failure_type": _infer_failure_type(alert),
                "error_message": alert.description or alert.title,
                "stack_trace": metadata.get("stack_trace"),
                "timestamp": alert.created_at.isoformat(),
                "duration": metadata.get("duration", 0),
                "commit_sha": metadata.get("commit_sha", "unknown"),
                "commit_message": metadata.get("commit_message", ""),
                "author": metadata.get("author", "unknown"),
                "branch": metadata.get("branch", "unknown"),
                "pull_request": metadata.get("pull_request"),
                "failure_analysis": _generate_failure_analysis(alert),
                "artifacts": _extract_artifacts(metadata)
            }
            failures.append(failure)
        
        # Generate statistics
        stats = _generate_failure_stats(db, since, project_id)
        
        return {
            "failures": failures,
            "stats": stats,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "has_next": (page * limit) < total
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get CI failures: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve CI failures"
        )


@router.post("/webhook/github", response_model=Dict[str, str])
async def handle_github_webhook(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    cache: CacheService = Depends(lambda: CacheService()),
    security_monitor: SecurityMonitor = Depends(lambda: SecurityMonitor())
):
    """Handle GitHub webhook for CI/CD events"""
    try:
        # Initialize webhook service
        async with WebhookNotificationService(db, cache, security_monitor) as webhook_service:
            
            # Parse GitHub webhook payload
            event_type = payload.get("action", "unknown")
            workflow_run = payload.get("workflow_run", {})
            repository = payload.get("repository", {})
            
            if not workflow_run:
                return {"status": "ignored", "reason": "No workflow_run data"}
            
            # Check if this is a failure event
            conclusion = workflow_run.get("conclusion")
            if conclusion not in ["failure", "cancelled", "timed_out"]:
                return {"status": "ignored", "reason": f"Conclusion: {conclusion}"}
            
            # Create CI failure alert
            alert_data = {
                "type": "error",
                "severity": _map_conclusion_to_severity(conclusion),
                "message": f"GitHub Actions workflow failed: {workflow_run.get('name', 'Unknown')}",
                "source": "github_actions",
                "metadata": {
                    "workflow_run_id": workflow_run.get("id"),
                    "workflow_name": workflow_run.get("name"),
                    "repository": repository.get("full_name"),
                    "branch": workflow_run.get("head_branch"),
                    "commit_sha": workflow_run.get("head_sha"),
                    "commit_message": workflow_run.get("head_commit", {}).get("message", ""),
                    "author": workflow_run.get("head_commit", {}).get("author", {}).get("email", ""),
                    "conclusion": conclusion,
                    "html_url": workflow_run.get("html_url"),
                    "jobs_url": workflow_run.get("jobs_url"),
                    "logs_url": workflow_run.get("logs_url"),
                    "duration": _calculate_duration(
                        workflow_run.get("created_at"),
                        workflow_run.get("updated_at")
                    ),
                    "pull_request": _extract_pr_info(workflow_run)
                },
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Send alert notifications
            result = await webhook_service.send_alert_notification(alert_data)
            
            logger.info(f"Processed GitHub webhook: {workflow_run.get('id')} - {conclusion}")
            
            return {
                "status": "processed",
                "workflow_run_id": str(workflow_run.get("id")),
                "notifications_sent": len(result.get("sent", []))
            }
            
    except Exception as e:
        logger.error(f"Failed to process GitHub webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process webhook"
        )


@router.get("/stats", response_model=Dict[str, Any])
async def get_ci_failure_stats(
    time_range: str = Query("24h", description="Time range for stats"),
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get CI/CD failure statistics"""
    try:
        time_delta = {
            "1h": timedelta(hours=1),
            "24h": timedelta(days=1),
            "7d": timedelta(days=7),
            "30d": timedelta(days=30)
        }.get(time_range, timedelta(days=1))
        
        since = datetime.utcnow() - time_delta
        stats = _generate_failure_stats(db, since, project_id)
        
        return stats
        
    except Exception as e:
        logger.error(f"Failed to get CI failure stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve failure statistics"
        )


# Helper functions

def _infer_stage_from_alert(alert: Alert) -> str:
    """Infer pipeline stage from alert data"""
    category = (alert.category or "").lower()
    source = (alert.source or "").lower()
    title = (alert.title or "").lower()
    
    if any(keyword in f"{category} {source} {title}" for keyword in ["test", "testing"]):
        return "test"
    elif any(keyword in f"{category} {source} {title}" for keyword in ["build", "compile"]):
        return "build"
    elif any(keyword in f"{category} {source} {title}" for keyword in ["deploy", "deployment"]):
        return "deploy"
    elif any(keyword in f"{category} {source} {title}" for keyword in ["security", "scan"]):
        return "security"
    elif any(keyword in f"{category} {source} {title}" for keyword in ["quality", "lint"]):
        return "quality"
    else:
        return "unknown"


def _infer_failure_type(alert: Alert) -> str:
    """Infer failure type from alert data"""
    stage = _infer_stage_from_alert(alert)
    return stage if stage != "unknown" else "build"


def _generate_failure_analysis(alert: Alert) -> Dict[str, Any]:
    """Generate AI-like failure analysis"""
    error_message = (alert.description or alert.title or "").lower()
    
    # Simple pattern matching for common errors
    if "timeout" in error_message:
        category = "Timeout Error"
        confidence = 90
        suggested_fix = "Increase timeout values or optimize slow operations"
        impact_level = "medium"
    elif "permission denied" in error_message or "unauthorized" in error_message:
        category = "Permission Error"
        confidence = 95
        suggested_fix = "Check access permissions and authentication tokens"
        impact_level = "high"
    elif "not found" in error_message or "missing" in error_message:
        category = "Resource Not Found"
        confidence = 85
        suggested_fix = "Verify resource paths and ensure dependencies are available"
        impact_level = "medium"
    elif "connection" in error_message or "network" in error_message:
        category = "Network Error"
        confidence = 80
        suggested_fix = "Check network connectivity and service availability"
        impact_level = "high"
    elif "syntax error" in error_message or "parse error" in error_message:
        category = "Syntax Error"
        confidence = 95
        suggested_fix = "Review code syntax and fix parsing issues"
        impact_level = "low"
    else:
        category = "General Error"
        confidence = 50
        suggested_fix = "Review logs and error messages for specific guidance"
        impact_level = "medium"
    
    return {
        "category": category,
        "confidence": confidence,
        "suggested_fix": suggested_fix,
        "similar_failures": 0,  # Would be calculated from historical data
        "impact_level": impact_level
    }


def _extract_artifacts(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Extract artifact URLs from metadata"""
    return {
        "logs_url": metadata.get("logs_url") or metadata.get("html_url"),
        "test_results_url": metadata.get("test_results_url"),
        "coverage_url": metadata.get("coverage_url")
    }


def _generate_failure_stats(db: Session, since: datetime, project_id: Optional[str]) -> Dict[str, Any]:
    """Generate failure statistics"""
    # Build base query
    filters = [Alert.created_at >= since]
    
    ci_categories = ["ci", "cd", "pipeline", "build", "deploy", "test"]
    ci_sources = ["github", "jenkins", "gitlab", "circleci", "travis"]
    
    ci_filter = or_(
        *[Alert.category.ilike(f"%{cat}%") for cat in ci_categories],
        *[Alert.source.ilike(f"%src%") for src in ci_sources]
    )
    filters.append(ci_filter)
    
    if project_id:
        filters.append(Alert.project_id == project_id)
    
    query = db.query(Alert).filter(and_(*filters))
    alerts = query.all()
    
    # Calculate statistics
    total_failures = len(alerts)
    failure_types = {}
    pipeline_health = {}
    
    for alert in alerts:
        failure_type = _infer_failure_type(alert)
        failure_types[failure_type] = failure_types.get(failure_type, 0) + 1
        
        pipeline_id = (alert.metadata or {}).get("pipeline_id", "unknown")
        if pipeline_id not in pipeline_health:
            pipeline_health[pipeline_id] = {
                "success_rate": 85.0,  # Mock data
                "avg_duration": 120,
                "last_success": (datetime.utcnow() - timedelta(hours=2)).isoformat()
            }
    
    # Convert to percentage
    common_failure_types = []
    for ftype, count in failure_types.items():
        percentage = (count / total_failures * 100) if total_failures > 0 else 0
        common_failure_types.append({
            "type": ftype,
            "count": count,
            "percentage": round(percentage, 1)
        })
    
    common_failure_types.sort(key=lambda x: x["count"], reverse=True)
    
    return {
        "total_failures": total_failures,
        "failure_rate": 15.8,  # Mock calculation
        "avg_time_to_fix": 45.5,  # Mock calculation
        "common_failure_types": common_failure_types,
        "trending_issues": [
            {
                "pattern": "GitHub Actions timeout errors",
                "occurrences": max(1, total_failures // 3),
                "first_seen": (since + timedelta(hours=1)).isoformat(),
                "last_seen": datetime.utcnow().isoformat()
            }
        ],
        "pipeline_health": pipeline_health
    }


def _map_conclusion_to_severity(conclusion: str) -> str:
    """Map GitHub Actions conclusion to alert severity"""
    mapping = {
        "failure": "high",
        "cancelled": "medium",
        "timed_out": "high",
        "action_required": "medium"
    }
    return mapping.get(conclusion, "medium")


def _calculate_duration(created_at: str, updated_at: str) -> int:
    """Calculate workflow duration in seconds"""
    try:
        if not created_at or not updated_at:
            return 0
        
        start = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        end = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
        return int((end - start).total_seconds())
    except:
        return 0


def _extract_pr_info(workflow_run: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Extract pull request information from workflow run"""
    pull_requests = workflow_run.get("pull_requests", [])
    if pull_requests:
        pr = pull_requests[0]
        return {
            "number": pr.get("number"),
            "title": pr.get("title"),
            "url": pr.get("html_url")
        }
    return None