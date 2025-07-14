"""
Ansible Automation Coverage API Routes

This module provides API endpoints for analyzing Ansible playbook executions,
tracking automation coverage, and providing insights into infrastructure automation patterns.
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any, List
import json
import logging
from io import StringIO

from app.services.ansible_service import ansible_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ansible", tags=["ansible"], responses={404: {"description": "Not found"}}
)


@router.post("/parse-logs")
async def parse_ansible_logs(log_content: str, log_format: str = "auto"):
    """
    Parse Ansible playbook execution logs

    Supports both JSON output (ansible-playbook with callback plugins)
    and standard text output formats.

    Args:
        log_content: Raw Ansible log content
        log_format: "json", "standard", or "auto" for format detection

    Returns:
        Comprehensive automation coverage analysis
    """
    try:
        if not log_content.strip():
            raise HTTPException(status_code=400, detail="Log content cannot be empty")

        logger.info(f"Parsing Ansible logs with format: {log_format}")
        analysis = ansible_service.analyze_playbook_execution(log_content, log_format)

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Ansible logs parsed successfully",
                "data": analysis,
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to parse Ansible logs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")


@router.post("/upload-logs")
async def upload_ansible_logs(
    log_file: UploadFile = File(...), log_format: str = Form("auto")
):
    """
    Upload and analyze Ansible playbook log file

    Accepts log files from various sources:
    - ansible-playbook standard output
    - ansible-playbook with JSON callbacks
    - AWX/Tower execution logs

    Args:
        log_file: Uploaded log file
        log_format: Expected log format ("json", "standard", "auto")

    Returns:
        Automation coverage analysis results
    """
    try:
        # Validate file
        if not log_file.filename:
            raise HTTPException(status_code=400, detail="No file uploaded")

        # Check file size (limit to 50MB)
        max_size = 50 * 1024 * 1024  # 50MB
        if log_file.size and log_file.size > max_size:
            raise HTTPException(status_code=413, detail="File too large (max 50MB)")

        # Read file content
        content = await log_file.read()

        # Decode content
        try:
            log_content = content.decode("utf-8")
        except UnicodeDecodeError:
            try:
                log_content = content.decode("latin-1")
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=400, detail="Unable to decode file content"
                )

        # Parse logs
        analysis = ansible_service.analyze_playbook_execution(log_content, log_format)

        # Add file metadata
        analysis["file_metadata"] = {
            "filename": log_file.filename,
            "size_bytes": len(content),
            "detected_format": log_format,
        }

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": f"Successfully analyzed {log_file.filename}",
                "data": analysis,
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process uploaded file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"File processing failed: {str(e)}")


@router.get("/coverage-report/{execution_id}")
async def get_automation_coverage_report(execution_id: str):
    """
    Get detailed automation coverage report for a specific execution

    Args:
        execution_id: Unique execution identifier

    Returns:
        Detailed coverage analysis with metrics and recommendations
    """
    try:
        # In a real implementation, this would fetch from database
        # For now, return a template response
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": f"Coverage report for execution {execution_id}",
                "data": {
                    "execution_id": execution_id,
                    "coverage_metrics": {
                        "total_hosts": 0,
                        "total_modules": 0,
                        "automation_score": 0.0,
                    },
                    "recommendations": [],
                },
            },
        )

    except Exception as e:
        logger.error(f"Failed to generate coverage report: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Report generation failed: {str(e)}"
        )


@router.post("/analyze-trends")
async def analyze_automation_trends(executions: List[Dict[str, Any]]):
    """
    Analyze automation trends across multiple playbook executions

    Args:
        executions: List of execution analysis results

    Returns:
        Trend analysis with patterns, success rates, and recommendations
    """
    try:
        if not executions:
            raise HTTPException(status_code=400, detail="No execution data provided")

        trends = ansible_service.calculate_automation_trends(executions)

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": f"Analyzed trends for {len(executions)} executions",
                "data": trends,
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to analyze automation trends: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Trend analysis failed: {str(e)}")


@router.get("/modules/popular")
async def get_popular_modules():
    """
    Get list of most commonly used Ansible modules with success rates

    Returns:
        Module popularity and reliability statistics
    """
    try:
        # In a real implementation, this would query database for statistics
        popular_modules = {
            "setup": {"usage_count": 1250, "success_rate": 99.2},
            "copy": {"usage_count": 890, "success_rate": 97.8},
            "template": {"usage_count": 720, "success_rate": 96.5},
            "service": {"usage_count": 650, "success_rate": 94.3},
            "package": {"usage_count": 580, "success_rate": 92.1},
            "file": {"usage_count": 520, "success_rate": 98.7},
            "command": {"usage_count": 480, "success_rate": 89.4},
            "shell": {"usage_count": 380, "success_rate": 87.2},
            "user": {"usage_count": 290, "success_rate": 95.8},
            "group": {"usage_count": 210, "success_rate": 97.1},
        }

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Popular modules retrieved successfully",
                "data": {
                    "modules": popular_modules,
                    "total_modules_tracked": len(popular_modules),
                    "average_success_rate": sum(
                        m["success_rate"] for m in popular_modules.values()
                    )
                    / len(popular_modules),
                },
            },
        )

    except Exception as e:
        logger.error(f"Failed to get popular modules: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve module statistics: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """
    Health check endpoint for Ansible automation service

    Returns:
        Service health status and capabilities
    """
    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "message": "Ansible automation service is healthy",
            "data": {
                "service": "ansible-automation-coverage",
                "version": "1.0.0",
                "capabilities": [
                    "ansible-playbook log parsing",
                    "JSON format support",
                    "Standard output parsing",
                    "Automation coverage analysis",
                    "Module usage tracking",
                    "Host reliability metrics",
                    "Trend analysis",
                ],
                "supported_formats": ["json", "standard", "auto-detect"],
            },
        },
    )


@router.post("/validate-playbook")
async def validate_playbook_syntax(
    playbook_content: str, inventory_content: Optional[str] = None
):
    """
    Validate Ansible playbook syntax and structure

    Args:
        playbook_content: YAML playbook content
        inventory_content: Optional inventory content

    Returns:
        Validation results with syntax errors and warnings
    """
    try:
        # Basic YAML validation
        import yaml

        try:
            playbook_data = yaml.safe_load(playbook_content)
        except yaml.YAMLError as e:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "YAML syntax error",
                    "data": {"valid": False, "errors": [str(e)], "warnings": []},
                },
            )

        # Basic structure validation
        errors = []
        warnings = []

        if not isinstance(playbook_data, list):
            errors.append("Playbook must be a list of plays")
        else:
            for i, play in enumerate(playbook_data):
                if not isinstance(play, dict):
                    errors.append(f"Play {i+1} must be a dictionary")
                    continue

                if "hosts" not in play:
                    errors.append(f"Play {i+1} missing required 'hosts' field")

                if "tasks" not in play and "roles" not in play:
                    warnings.append(f"Play {i+1} has no tasks or roles defined")

        is_valid = len(errors) == 0

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Playbook validation completed",
                "data": {
                    "valid": is_valid,
                    "errors": errors,
                    "warnings": warnings,
                    "play_count": (
                        len(playbook_data) if isinstance(playbook_data, list) else 0
                    ),
                },
            },
        )

    except Exception as e:
        logger.error(f"Failed to validate playbook: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@router.get("/documentation/log-formats")
async def get_log_format_documentation():
    """
    Get documentation about supported Ansible log formats

    Returns:
        Documentation with examples and format specifications
    """
    documentation = {
        "formats": {
            "json": {
                "description": "JSON callback plugin output from ansible-playbook",
                "command_example": "ansible-playbook playbook.yml -v",
                "requires": "Callback plugin configuration",
                "advantages": [
                    "Structured data",
                    "Machine parseable",
                    "Complete event information",
                    "Precise timestamps",
                ],
                "example_line": '{"event_type": "runner_on_ok", "host": "server1", "event_data": {...}}',
            },
            "standard": {
                "description": "Default ansible-playbook console output",
                "command_example": "ansible-playbook playbook.yml",
                "requires": "No additional configuration",
                "advantages": [
                    "Human readable",
                    "Widely available",
                    "No setup required",
                    "Compatible with all versions",
                ],
                "example_line": 'server1 | SUCCESS => {"changed": false, "ping": "pong"}',
            },
            "auto": {
                "description": "Automatic format detection",
                "advantages": [
                    "No manual format specification",
                    "Handles mixed formats",
                    "Fallback to best guess",
                ],
            },
        },
        "parsing_capabilities": {
            "task_results": "Individual task execution status and output",
            "module_tracking": "Which Ansible modules were used",
            "host_coverage": "Which hosts were managed",
            "execution_timing": "Duration and performance metrics",
            "error_analysis": "Failed tasks and error messages",
            "change_tracking": "What changed during execution",
        },
        "best_practices": [
            "Use JSON format for automated analysis",
            "Include timestamps with -v flag or higher",
            "Save logs for trend analysis",
            "Monitor success rates over time",
            "Track module usage patterns",
        ],
    }

    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "message": "Ansible log format documentation",
            "data": documentation,
        },
    )
