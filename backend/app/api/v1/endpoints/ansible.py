"""
Ansible automation management API endpoints.
Handles Ansible log parsing, automation coverage analysis, and automation run management.
"""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    Query,
    status,
)
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import logging

from app.core.dependencies import get_db, get_async_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.automation_run import AutomationRun, AutomationStatus, AutomationType
from app.schemas.automation_run import (
    AutomationRun as AutomationRunSchema,
    AutomationRunCreate,
    AutomationRunUpdate,
    AutomationRunSummary,
    AutomationStats,
    AnsibleCallbackData,
    HostResult,
    TaskResult,
)
from app.services.automation_run_service import AutomationRunService
from app.utils.ansible_parser import (
    AnsibleLogParser,
    AnsibleLogFormat,
    TaskStatus,
    HostStatus,
)
from app.services.trend_analysis_service import TrendAnalysisService
from app.services.enhanced_ansible_coverage import (
    enhanced_ansible_analyzer,
    ComplianceFramework,
    CoverageLevel,
    CoverageGap,
    SecurityCoverageMetrics,
    InfrastructureCoverageMap
)
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter()


# Request/Response Models
class ParseLogRequest(BaseModel):
    """Request model for parsing Ansible logs"""

    log_content: str = Field(..., description="Ansible log content to parse")
    log_format: Optional[str] = Field(
        "auto",
        description="Log format: 'json', 'yaml', 'plain_text', 'callback_json', or 'auto'",
    )
    project_id: Optional[int] = Field(
        None, description="Optional project ID for context"
    )
    playbook_name: Optional[str] = Field(None, description="Name of the playbook")
    environment: Optional[str] = Field(None, description="Target environment")


class CoverageAnalysisRequest(BaseModel):
    """Request model for automation coverage analysis"""

    project_id: int = Field(..., description="Project ID for analysis")
    start_date: Optional[datetime] = Field(None, description="Start date for analysis")
    end_date: Optional[datetime] = Field(None, description="End date for analysis")
    host_filter: Optional[str] = Field(None, description="Filter by host name pattern")
    module_filter: Optional[str] = Field(None, description="Filter by Ansible module")


class ParsedLogResponse(BaseModel):
    """Response model for parsed Ansible logs"""

    success: bool
    format: str
    plays: List[Dict[str, Any]]
    tasks: List[Dict[str, Any]]
    hosts: Dict[str, Any]
    summary: Dict[str, Any]
    coverage_metrics: Dict[str, Any]
    metadata: Dict[str, Any]
    errors: List[str]
    warnings: List[str]


class CoverageMetricsResponse(BaseModel):
    """Response model for automation coverage metrics"""

    task_success_rate: float
    host_success_rate: float
    automation_coverage: float
    critical_coverage: float
    automation_score: float
    total_automation_tasks: int
    total_critical_tasks: int
    coverage_by_module: Dict[str, Any]
    host_coverage: Dict[str, Any]


class CallbackEventRequest(BaseModel):
    """Request model for Ansible callback events"""

    event_type: str = Field(..., description="Type of Ansible event")
    host: str = Field(..., description="Target host")
    task: Dict[str, Any] = Field(..., description="Task information")
    result: Dict[str, Any] = Field(..., description="Task execution result")
    play: Dict[str, Any] = Field(..., description="Play information")
    timestamp: datetime = Field(..., description="Event timestamp")
    automation_run_id: Optional[str] = Field(
        None, description="Automation run identifier"
    )


@router.get("/status")
async def get_ansible_status():
    """
    Get Ansible integration status and available features.
    """
    return {
        "status": "active",
        "features": {
            "log_parsing": True,
            "coverage_analysis": True,
            "trend_analysis": True,
            "callback_integration": True,
            "host_tracking": True,
            "module_analysis": True,
        },
        "supported_formats": [
            "json",
            "yaml",
            "plain_text",
            "callback_json",
            "auto_detect",
        ],
        "supported_modules": list(AnsibleLogParser.AUTOMATION_MODULES),
        "critical_modules": list(AnsibleLogParser.CRITICAL_MODULES),
        "version": "1.0.0",
    }


@router.post("/parse-log", response_model=ParsedLogResponse)
async def parse_ansible_log(
    request: ParseLogRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Parse Ansible playbook logs and extract automation coverage data.

    This endpoint accepts Ansible logs in various formats and returns
    structured data including task results, host coverage, and automation metrics.
    """
    try:
        # Initialize parser
        parser = AnsibleLogParser()

        # Determine log format
        log_format = AnsibleLogFormat.AUTO_DETECT
        if request.log_format:
            format_map = {
                "json": AnsibleLogFormat.JSON,
                "yaml": AnsibleLogFormat.YAML,
                "plain_text": AnsibleLogFormat.PLAIN_TEXT,
                "callback_json": AnsibleLogFormat.CALLBACK_JSON,
                "auto": AnsibleLogFormat.AUTO_DETECT,
            }
            log_format = format_map.get(
                request.log_format.lower(), AnsibleLogFormat.AUTO_DETECT
            )

        # Parse the log
        parsed_data = parser.parse_log(request.log_content, log_format)

        if not parsed_data.get("success", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to parse Ansible log: {parsed_data.get('error', 'Unknown error')}",
            )

        # If project_id is provided, create automation run record
        if request.project_id:
            try:
                # Create automation run record
                run_data = AutomationRunCreate(
                    name=request.playbook_name
                    or f"Ansible Run - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
                    description="Automatically created from parsed Ansible log",
                    automation_type=AutomationType.PLAYBOOK,
                    playbook_name=request.playbook_name,
                    project_id=request.project_id,
                    triggered_by_user_id=current_user.id,
                )

                automation_run = AutomationRunService.create_automation_run(
                    db=db, run_data=run_data, user_id=current_user.id
                )

                if automation_run:
                    # Update with parsed data
                    summary = parsed_data.get("summary", {})
                    coverage = parsed_data.get("coverage_metrics", {})
                    metadata = parsed_data.get("metadata", {})

                    update_data = AutomationRunUpdate(
                        status=(
                            AutomationStatus.SUCCESS
                            if summary.get("failed_tasks", 0) == 0
                            else AutomationStatus.FAILED
                        ),
                        total_hosts=summary.get("total_hosts", 0),
                        successful_hosts=summary.get("total_hosts", 0)
                        - summary.get("unreachable_hosts", 0),
                        failed_hosts=summary.get("unreachable_hosts", 0),
                        total_tasks=summary.get("total_tasks", 0),
                        successful_tasks=summary.get("successful_tasks", 0),
                        failed_tasks=summary.get("failed_tasks", 0),
                        changed_tasks=summary.get("changed_tasks", 0),
                        skipped_tasks=summary.get("skipped_tasks", 0),
                        coverage_percentage=coverage.get("automation_coverage", 0),
                        logs=request.log_content[:10000],  # Truncate if too long
                        output={
                            "parsed_data": parsed_data,
                            "coverage_metrics": coverage,
                        },
                    )

                    # Set timing if available
                    execution_time = metadata.get("execution_time")
                    if execution_time:
                        update_data.started_at = datetime.utcnow()
                        update_data.finished_at = datetime.utcnow()

                    updated_run = AutomationRunService.update_automation_run(
                        db=db,
                        run_id=automation_run.id,
                        run_data=update_data,
                        user_id=current_user.id,
                    )

                    if updated_run:
                        parsed_data["automation_run_id"] = updated_run.id
                        logger.info(
                            f"Created automation run record {updated_run.id} for parsed log"
                        )

            except Exception as e:
                logger.warning(f"Failed to create automation run record: {e}")
                # Don't fail the request if we can't save to database

        return ParsedLogResponse(**parsed_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing Ansible log: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error parsing log: {str(e)}",
        )


@router.post("/parse-log-file", response_model=ParsedLogResponse)
async def parse_ansible_log_file(
    file: UploadFile = File(..., description="Ansible log file to parse"),
    project_id: Optional[int] = Form(None, description="Optional project ID"),
    playbook_name: Optional[str] = Form(None, description="Name of the playbook"),
    environment: Optional[str] = Form(None, description="Target environment"),
    log_format: Optional[str] = Form("auto", description="Log format"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Parse Ansible log file and extract automation coverage data.

    Upload an Ansible log file for parsing. Supports various log formats
    including JSON, YAML, and plain text output.
    """
    try:
        # Read file content
        content = await file.read()

        # Decode content
        try:
            log_content = content.decode("utf-8")
        except UnicodeDecodeError:
            try:
                log_content = content.decode("latin-1")
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Unable to decode file content. Please ensure it's a text file.",
                )

        # Create request object
        request = ParseLogRequest(
            log_content=log_content,
            log_format=log_format,
            project_id=project_id,
            playbook_name=playbook_name,
            environment=environment,
        )

        # Use the existing parse_log endpoint
        return await parse_ansible_log(request, current_user, db)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing Ansible log file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error parsing log file: {str(e)}",
        )


@router.get("/automation-runs/{run_id}")
async def get_automation_run(
    run_id: int,
    include_logs: bool = Query(False, description="Include log content"),
    include_coverage: bool = Query(True, description="Include coverage analysis"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get detailed information about a specific automation run.
    """
    try:
        automation_run = AutomationRunService.get_automation_run_by_id(
            db=db, run_id=run_id, user_id=current_user.id
        )

        if not automation_run:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Automation run not found or access denied",
            )

        # Convert to dict
        run_data = automation_run.to_dict()

        # Add coverage analysis if requested
        if include_coverage:
            coverage_summary = AutomationRunService.get_automation_run_summary(
                db=db, run_id=run_id, user_id=current_user.id
            )
            if coverage_summary:
                run_data["coverage_summary"] = coverage_summary.dict()

        # Optionally exclude logs for performance
        if not include_logs:
            run_data.pop("log_output", None)
            run_data.pop("logs", None)

        return run_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving automation run {run_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error retrieving automation run: {str(e)}",
        )


@router.get("/automation-runs")
async def list_automation_runs(
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    automation_type: Optional[str] = Query(
        None, description="Filter by automation type"
    ),
    host_filter: Optional[str] = Query(None, description="Filter by host name"),
    playbook_name: Optional[str] = Query(None, description="Filter by playbook name"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(
        100, ge=1, le=1000, description="Maximum number of records to return"
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List automation runs with optional filtering.
    """
    try:
        # Convert string parameters to enums if provided
        status_filter = None
        if status:
            try:
                status_filter = AutomationStatus(status.lower())
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status: {status}",
                )

        automation_type_filter = None
        if automation_type:
            try:
                automation_type_filter = AutomationType(automation_type.lower())
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid automation type: {automation_type}",
                )

        # If no project_id specified, get all accessible projects for user
        if not project_id:
            # For now, require project_id for security
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="project_id parameter is required",
            )

        # Get automation runs
        automation_runs = AutomationRunService.get_automation_runs_by_project(
            db=db,
            project_id=project_id,
            user_id=current_user.id,
            skip=skip,
            limit=limit,
            status=status_filter,
            automation_type=automation_type_filter,
            host_filter=host_filter,
        )

        # Convert to list of dicts
        runs_data = []
        for run in automation_runs:
            run_data = run.to_dict()
            # Exclude logs for performance in list view
            run_data.pop("log_output", None)
            run_data.pop("logs", None)
            run_data.pop("output", None)
            runs_data.append(run_data)

        return {
            "automation_runs": runs_data,
            "total": len(runs_data),
            "skip": skip,
            "limit": limit,
            "filters": {
                "project_id": project_id,
                "status": status,
                "automation_type": automation_type,
                "host_filter": host_filter,
                "playbook_name": playbook_name,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing automation runs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error listing automation runs: {str(e)}",
        )


@router.get("/coverage", response_model=CoverageMetricsResponse)
async def get_automation_coverage(
    project_id: int = Query(..., description="Project ID for coverage analysis"),
    start_date: Optional[datetime] = Query(None, description="Start date for analysis"),
    end_date: Optional[datetime] = Query(None, description="End date for analysis"),
    host_filter: Optional[str] = Query(None, description="Filter by host name pattern"),
    module_filter: Optional[str] = Query(None, description="Filter by Ansible module"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get automation coverage metrics for a project.

    Calculates coverage metrics including success rates, automation coverage,
    and module-specific statistics.
    """
    try:
        # Get automation statistics
        stats = AutomationRunService.get_automation_stats(
            db=db, project_id=project_id, user_id=current_user.id
        )

        if not stats:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No automation data found for the specified project",
            )

        # TODO: Implement more sophisticated coverage analysis with date filtering
        # For now, return basic metrics from the stats

        return CoverageMetricsResponse(
            task_success_rate=stats.success_rate,
            host_success_rate=stats.success_rate,  # Simplified for now
            automation_coverage=75.0,  # Placeholder - implement actual calculation
            critical_coverage=60.0,  # Placeholder - implement actual calculation
            automation_score=stats.success_rate * 0.8,  # Simplified scoring
            total_automation_tasks=stats.total_runs * 10,  # Estimate
            total_critical_tasks=stats.total_runs * 3,  # Estimate
            coverage_by_module={},  # TODO: Implement module analysis
            host_coverage={},  # TODO: Implement host analysis
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating coverage metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error calculating coverage metrics: {str(e)}",
        )


@router.get("/stats")
async def get_automation_stats(
    project_id: int = Query(..., description="Project ID for statistics"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get automation statistics for a project.
    """
    try:
        stats = AutomationRunService.get_automation_stats(
            db=db, project_id=project_id, user_id=current_user.id
        )

        if not stats:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No automation data found for the specified project",
            )

        return stats.dict()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving automation stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error retrieving automation stats: {str(e)}",
        )


@router.post("/callback")
async def ansible_callback_webhook(
    request: CallbackEventRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Webhook endpoint for Ansible callback plugin events.

    This endpoint receives real-time events from Ansible callback plugins
    and can update automation runs in real-time.
    """
    try:
        # Convert to AnsibleCallbackData format
        callback_data = AnsibleCallbackData(
            play=request.play,
            task=request.task,
            host=request.host,
            result=request.result,
            event_type=request.event_type,
            timestamp=request.timestamp,
        )

        # If automation_run_id is provided, try to find existing run
        automation_run = None
        if request.automation_run_id:
            # TODO: Implement lookup by external automation_id
            pass

        # If no existing run found, create new one
        if not automation_run:
            # Create from callback data (this would need project_id)
            # For now, return success without creating
            pass

        # Log the callback event
        logger.info(
            f"Received Ansible callback: {request.event_type} for host {request.host}"
        )

        return {
            "success": True,
            "event_type": request.event_type,
            "host": request.host,
            "timestamp": request.timestamp,
            "message": "Callback event processed successfully",
        }

    except Exception as e:
        logger.error(f"Error processing Ansible callback: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error processing callback: {str(e)}",
        )


@router.get("/supported-modules")
async def get_supported_modules():
    """
    Get list of supported Ansible modules for automation coverage analysis.
    """
    return {
        "automation_modules": list(AnsibleLogParser.AUTOMATION_MODULES),
        "critical_modules": list(AnsibleLogParser.CRITICAL_MODULES),
        "total_supported": len(AnsibleLogParser.AUTOMATION_MODULES),
        "categories": {
            "system": ["command", "shell", "script", "raw"],
            "files": [
                "copy",
                "template",
                "file",
                "lineinfile",
                "blockinfile",
                "replace",
            ],
            "packages": ["package", "yum", "apt", "dnf", "pip", "npm"],
            "services": ["service", "systemd", "cron", "at"],
            "users": ["user", "group", "authorized_key"],
            "storage": ["mount", "filesystem", "lvg", "lvol"],
            "security": ["firewalld", "iptables", "ufw"],
            "scm": ["git", "subversion"],
            "network": ["get_url", "unarchive"],
            "containers": ["docker_container", "docker_image", "docker_compose"],
            "databases": ["mysql_user", "mysql_db", "postgresql_user", "postgresql_db"],
        },
    }


@router.get("/task-statuses")
async def get_task_statuses():
    """
    Get available task statuses for filtering and analysis.
    """
    return {
        "task_statuses": [status.value for status in TaskStatus],
        "host_statuses": [status.value for status in HostStatus],
        "automation_statuses": [status.value for status in AutomationStatus],
        "automation_types": [type_.value for type_ in AutomationType],
    }


# Trend Analysis Endpoints
@router.get("/trends/coverage")
async def get_coverage_trends(
    project_id: int = Query(..., description="Project ID for trend analysis"),
    period: str = Query(
        "daily", description="Time period: 'daily', 'weekly', 'monthly'"
    ),
    days_back: int = Query(30, description="Number of days to analyze"),
    host_filter: Optional[str] = Query(None, description="Filter by host name pattern"),
    module_filter: Optional[str] = Query(None, description="Filter by Ansible module"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get automation coverage trends over time.

    Provides time-series data showing how automation coverage has changed
    over the specified period with configurable aggregation intervals.
    """
    try:
        # Validate period parameter
        valid_periods = ["daily", "weekly", "monthly"]
        if period not in valid_periods:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid period. Must be one of: {valid_periods}",
            )

        # Validate days_back parameter
        if days_back < 1 or days_back > 365:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="days_back must be between 1 and 365",
            )

        # Get coverage trends
        trends = TrendAnalysisService.get_coverage_trends(
            db=db,
            project_id=project_id,
            period=period,
            days_back=days_back,
            host_filter=host_filter,
            module_filter=module_filter,
        )

        if not trends:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No trend data found for the specified parameters",
            )

        return trends

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting coverage trends: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error retrieving coverage trends: {str(e)}",
        )


@router.get("/trends/performance")
async def get_performance_trends(
    project_id: int = Query(..., description="Project ID for trend analysis"),
    period: str = Query(
        "daily", description="Time period: 'daily', 'weekly', 'monthly'"
    ),
    days_back: int = Query(30, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get automation performance trends including execution times and efficiency.

    Provides insights into how automation performance has changed over time,
    including execution duration, success rates, and task efficiency.
    """
    try:
        # Validate parameters
        valid_periods = ["daily", "weekly", "monthly"]
        if period not in valid_periods:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid period. Must be one of: {valid_periods}",
            )

        if days_back < 1 or days_back > 365:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="days_back must be between 1 and 365",
            )

        # Get performance trends
        trends = TrendAnalysisService.get_performance_trends(
            db=db, project_id=project_id, period=period, days_back=days_back
        )

        if not trends:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No performance trend data found for the specified parameters",
            )

        return trends

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting performance trends: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error retrieving performance trends: {str(e)}",
        )


@router.get("/trends/modules")
async def get_module_usage_trends(
    project_id: int = Query(..., description="Project ID for trend analysis"),
    days_back: int = Query(30, description="Number of days to analyze"),
    top_n: int = Query(10, description="Number of top modules to include"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get Ansible module usage trends over time.

    Shows which modules are most commonly used and how their usage
    has changed over the specified time period.
    """
    try:
        # Validate parameters
        if days_back < 1 or days_back > 365:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="days_back must be between 1 and 365",
            )

        if top_n < 1 or top_n > 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="top_n must be between 1 and 50",
            )

        # Get module usage trends
        trends = TrendAnalysisService.get_module_usage_trends(
            db=db, project_id=project_id, days_back=days_back, top_n=top_n
        )

        if not trends:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No module usage trend data found for the specified parameters",
            )

        return trends

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting module usage trends: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error retrieving module usage trends: {str(e)}",
        )


@router.get("/trends/hosts")
async def get_host_coverage_trends(
    project_id: int = Query(..., description="Project ID for trend analysis"),
    days_back: int = Query(30, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get host coverage trends and automation distribution.

    Provides insights into how automation is distributed across hosts
    and how host coverage has changed over time.
    """
    try:
        # Validate parameters
        if days_back < 1 or days_back > 365:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="days_back must be between 1 and 365",
            )

        # Get host coverage trends
        trends = TrendAnalysisService.get_host_coverage_trends(
            db=db, project_id=project_id, days_back=days_back
        )

        if not trends:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No host coverage trend data found for the specified parameters",
            )

        return trends

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting host coverage trends: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error retrieving host coverage trends: {str(e)}",
        )


@router.get("/playbook-metrics")
async def get_playbook_metrics(
    project_id: int = Query(..., description="Project ID for playbook metrics"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get playbook-specific metrics and performance statistics.
    
    Returns detailed metrics for each playbook including success rates,
    execution times, environment distribution, and recent activity.
    """
    try:
        # Get all automation runs for the project
        automation_runs = AutomationRunService.get_automation_runs(
            db=db, 
            project_id=project_id, 
            user_id=current_user.id,
            limit=1000  # Get more data for accurate metrics
        )
        
        if not automation_runs:
            return []
        
        # Group runs by playbook and calculate metrics
        playbook_stats = {}
        
        for run in automation_runs:
            playbook_name = run.playbook_name or "Unknown"
            
            if playbook_name not in playbook_stats:
                playbook_stats[playbook_name] = {
                    "name": playbook_name,
                    "total_runs": 0,
                    "successful_runs": 0,
                    "failed_runs": 0,
                    "success_rate": 0.0,
                    "average_duration": 0.0,
                    "total_duration": 0.0,
                    "environments": set(),
                    "last_run": None,
                    "hosts_managed": set()
                }
            
            stats = playbook_stats[playbook_name]
            stats["total_runs"] += 1
            
            if run.status == "success":
                stats["successful_runs"] += 1
            elif run.status == "failed":
                stats["failed_runs"] += 1
            
            if run.duration_seconds:
                stats["total_duration"] += run.duration_seconds
            
            if run.environment:
                stats["environments"].add(run.environment)
            
            if run.total_hosts:
                for i in range(run.total_hosts):
                    stats["hosts_managed"].add(f"host_{i}")
            
            if not stats["last_run"] or (run.start_time and 
                (not stats["last_run"] or run.start_time > stats["last_run"])):
                stats["last_run"] = run.start_time
        
        # Calculate final metrics
        playbook_metrics = []
        for stats in playbook_stats.values():
            stats["success_rate"] = (stats["successful_runs"] / stats["total_runs"] * 100) if stats["total_runs"] > 0 else 0
            stats["average_duration"] = (stats["total_duration"] / stats["total_runs"]) if stats["total_runs"] > 0 else 0
            stats["environments"] = list(stats["environments"])
            stats["hosts_managed_count"] = len(stats["hosts_managed"])
            
            # Remove internal tracking fields
            del stats["total_duration"]
            del stats["hosts_managed"]
            
            playbook_metrics.append(stats)
        
        # Sort by success rate descending
        playbook_metrics.sort(key=lambda x: x["success_rate"], reverse=True)
        
        return playbook_metrics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting playbook metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error retrieving playbook metrics: {str(e)}",
        )


@router.get("/host-coverage")
async def get_host_coverage(
    project_id: int = Query(..., description="Project ID for host coverage"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get host coverage statistics and automation distribution.
    
    Returns coverage information for all hosts managed by automation,
    including success rates, last execution times, and environment assignments.
    """
    try:
        # Get automation runs for analysis
        automation_runs = AutomationRunService.get_automation_runs(
            db=db, 
            project_id=project_id, 
            user_id=current_user.id,
            limit=1000
        )
        
        if not automation_runs:
            return []
        
        # Aggregate host coverage data
        host_stats = {}
        
        for run in automation_runs:
            # Extract host information from run data
            # Note: This is simplified - in production you'd parse actual host inventories
            host_count = run.total_hosts or 1
            environment = run.environment or "default"
            
            for i in range(host_count):
                host_name = f"{environment}-host-{i + 1}"
                
                if host_name not in host_stats:
                    host_stats[host_name] = {
                        "name": host_name,
                        "environment": environment,
                        "total_runs": 0,
                        "successful_runs": 0,
                        "failed_runs": 0,
                        "success_rate": 0.0,
                        "last_automation": None,
                        "coverage_percentage": 0.0,
                        "automation_types": set(),
                        "reliability_score": 0.0
                    }
                
                stats = host_stats[host_name]
                stats["total_runs"] += 1
                
                if run.status == "success":
                    stats["successful_runs"] += 1
                elif run.status == "failed":
                    stats["failed_runs"] += 1
                
                if run.playbook_name:
                    stats["automation_types"].add(run.playbook_name)
                
                if not stats["last_automation"] or (run.start_time and 
                    (not stats["last_automation"] or run.start_time > stats["last_automation"])):
                    stats["last_automation"] = run.start_time
        
        # Calculate final metrics
        host_coverage = []
        for stats in host_stats.values():
            stats["success_rate"] = (stats["successful_runs"] / stats["total_runs"] * 100) if stats["total_runs"] > 0 else 0
            stats["coverage_percentage"] = min(100.0, stats["total_runs"] * 5)  # Simplified calculation
            stats["reliability_score"] = stats["success_rate"] * 0.7 + min(100, stats["total_runs"] * 2) * 0.3
            stats["automation_types"] = list(stats["automation_types"])
            
            host_coverage.append(stats)
        
        # Sort by reliability score descending
        host_coverage.sort(key=lambda x: x["reliability_score"], reverse=True)
        
        return host_coverage
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting host coverage: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error retrieving host coverage: {str(e)}",
        )


@router.get("/environments")
async def get_environments(
    project_id: int = Query(..., description="Project ID for environment data"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get environment statistics and automation health status.
    
    Returns information about all environments where automation runs,
    including health status, host counts, and coverage metrics.
    """
    try:
        # Get automation runs for analysis
        automation_runs = AutomationRunService.get_automation_runs(
            db=db, 
            project_id=project_id, 
            user_id=current_user.id,
            limit=1000
        )
        
        if not automation_runs:
            return []
        
        # Aggregate environment data
        env_stats = {}
        
        for run in automation_runs:
            env_name = run.environment or "default"
            
            if env_name not in env_stats:
                env_stats[env_name] = {
                    "name": env_name,
                    "status": "healthy",
                    "total_runs": 0,
                    "successful_runs": 0,
                    "failed_runs": 0,
                    "success_rate": 0.0,
                    "host_count": 0,
                    "playbook_count": 0,
                    "coverage_percentage": 0.0,
                    "last_activity": None,
                    "playbooks": set(),
                    "total_hosts": set()
                }
            
            stats = env_stats[env_name]
            stats["total_runs"] += 1
            
            if run.status == "success":
                stats["successful_runs"] += 1
            elif run.status == "failed":
                stats["failed_runs"] += 1
            
            if run.playbook_name:
                stats["playbooks"].add(run.playbook_name)
            
            if run.total_hosts:
                for i in range(run.total_hosts):
                    stats["total_hosts"].add(f"{env_name}-host-{i + 1}")
            
            if not stats["last_activity"] or (run.start_time and 
                (not stats["last_activity"] or run.start_time > stats["last_activity"])):
                stats["last_activity"] = run.start_time
        
        # Calculate final metrics and determine status
        environments = []
        for stats in env_stats.values():
            stats["success_rate"] = (stats["successful_runs"] / stats["total_runs"] * 100) if stats["total_runs"] > 0 else 0
            stats["host_count"] = len(stats["total_hosts"])
            stats["playbook_count"] = len(stats["playbooks"])
            stats["coverage_percentage"] = min(100.0, stats["total_runs"] * 3)  # Simplified calculation
            
            # Determine environment health status
            if stats["success_rate"] >= 95:
                stats["status"] = "healthy"
            elif stats["success_rate"] >= 80:
                stats["status"] = "warning"
            else:
                stats["status"] = "critical"
            
            # Remove internal tracking fields
            del stats["playbooks"]
            del stats["total_hosts"]
            
            environments.append(stats)
        
        # Sort by success rate descending
        environments.sort(key=lambda x: x["success_rate"], reverse=True)
        
        return environments
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting environments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error retrieving environments: {str(e)}",
        )
