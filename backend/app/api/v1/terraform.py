"""
Terraform Logs Parser API Routes

This module provides API endpoints for parsing and analyzing Terraform logs,
plan files, and execution outputs.
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any, List
import json
import logging
from io import StringIO

from app.services.terraform_service import terraform_service
from app.models.terraform import (
    TerraformLogAnalysisResponse,
    TerraformPlanAnalysisResponse,
    TerraformLogUploadResponse,
    TerraformLogRequest,
    TerraformPlanRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/terraform",
    tags=["terraform"],
    responses={404: {"description": "Not found"}},
)


@router.post("/parse-logs")
async def parse_terraform_logs(log_content: str, log_format: str = "json"):
    """
    Parse Terraform logs from raw text input

    Supports both JSON and plain text log formats from Terraform operations.
    """
    try:
        # Validate input
        if not log_content.strip():
            raise HTTPException(status_code=400, detail="Log content cannot be empty")

        # Parse logs using the service
        analysis = await terraform_service.parse_terraform_logs(
            log_content=log_content, log_format=log_format
        )

        return {
            "success": True,
            "message": "Terraform logs parsed successfully",
            "data": analysis,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing Terraform logs: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to parse Terraform logs: {str(e)}"
        )


@router.post("/parse-plan", response_model=TerraformPlanAnalysisResponse)
async def parse_terraform_plan(request: TerraformPlanRequest):
    """
    Parse Terraform plan JSON output

    Analyzes the output from 'terraform show -json plan_file' command.
    """
    try:
        # Validate input
        if not request.plan_content.strip():
            raise HTTPException(status_code=400, detail="Plan content cannot be empty")

        # Validate JSON format
        try:
            json.loads(request.plan_content)
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid JSON format in plan content: {str(e)}"
            )

        # Parse plan using the service
        analysis = await terraform_service.parse_terraform_plan(
            plan_content=request.plan_content
        )

        return TerraformPlanAnalysisResponse(
            success=True, message="Terraform plan parsed successfully", data=analysis
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing Terraform plan: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to parse Terraform plan: {str(e)}"
        )


@router.post("/upload-logs")
async def upload_terraform_logs(
    log_file: UploadFile = File(...),
    log_format: str = Form("auto"),
    operation_type: Optional[str] = Form(None),
):
    """
    Upload and parse Terraform log files

    Supports uploading log files from Terraform operations for analysis.
    """
    try:
        # Validate file type
        if not log_file.filename:
            raise HTTPException(status_code=400, detail="No file provided")

        # Check file extension
        allowed_extensions = [".log", ".txt", ".json", ".out"]
        file_ext = (
            "." + log_file.filename.split(".")[-1] if "." in log_file.filename else ""
        )

        if file_ext.lower() not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}",
            )

        # Check file size (limit to 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        content = await log_file.read()

        if len(content) > max_size:
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

        # Decode content
        try:
            log_content = content.decode("utf-8")
        except UnicodeDecodeError:
            try:
                log_content = content.decode("latin-1")
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail="Unable to decode file content. Please ensure it's a text file.",
                )

        # Auto-detect format if requested
        detected_format = log_format
        if log_format == "auto":
            detected_format = _detect_log_format(log_content)

        # Parse logs using the service
        analysis = await terraform_service.parse_terraform_logs(
            log_content=log_content, log_format=detected_format
        )

        # Add file metadata to response
        analysis["file_metadata"] = {
            "filename": log_file.filename,
            "size_bytes": len(content),
            "detected_format": detected_format,
            "operation_type": operation_type,
        }

        return {
            "success": True,
            "message": f"Log file '{log_file.filename}' parsed successfully",
            "data": analysis,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading Terraform logs: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to process uploaded file: {str(e)}"
        )


@router.post("/upload-plan", response_model=TerraformPlanAnalysisResponse)
async def upload_terraform_plan(
    plan_file: UploadFile = File(...), operation_type: Optional[str] = Form(None)
):
    """
    Upload and parse Terraform plan files

    Supports uploading JSON plan files from 'terraform show -json' output.
    """
    try:
        # Validate file
        if not plan_file.filename:
            raise HTTPException(status_code=400, detail="No file provided")

        # Check file extension
        allowed_extensions = [".json", ".plan", ".tfplan"]
        file_ext = (
            "." + plan_file.filename.split(".")[-1] if "." in plan_file.filename else ""
        )

        if file_ext.lower() not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}",
            )

        # Check file size (limit to 50MB for plan files)
        max_size = 50 * 1024 * 1024  # 50MB
        content = await plan_file.read()

        if len(content) > max_size:
            raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")

        # Decode content
        try:
            plan_content = content.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=400,
                detail="Unable to decode file content. Please ensure it's a UTF-8 text file.",
            )

        # Validate JSON format
        try:
            json.loads(plan_content)
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid JSON format in plan file: {str(e)}"
            )

        # Parse plan using the service
        analysis = await terraform_service.parse_terraform_plan(
            plan_content=plan_content
        )

        # Add file metadata to response
        analysis["file_metadata"] = {
            "filename": plan_file.filename,
            "size_bytes": len(content),
            "operation_type": operation_type,
        }

        return TerraformPlanAnalysisResponse(
            success=True,
            message=f"Plan file '{plan_file.filename}' parsed successfully",
            data=analysis,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading Terraform plan: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to process uploaded plan file: {str(e)}"
        )


@router.get("/supported-formats")
async def get_supported_formats():
    """
    Get information about supported Terraform log and plan formats
    """
    return {
        "log_formats": {
            "json": {
                "description": "JSON-formatted logs from 'terraform apply -json'",
                "example_command": "terraform apply -json > apply.log",
            },
            "text": {
                "description": "Plain text logs from Terraform operations",
                "example_command": "terraform apply > apply.log 2>&1",
            },
            "auto": {
                "description": "Auto-detect format based on content",
                "note": "Will attempt JSON parsing first, then fallback to text",
            },
        },
        "plan_formats": {
            "json": {
                "description": "JSON output from 'terraform show -json'",
                "example_command": "terraform show -json plan_file > plan.json",
            }
        },
        "supported_file_extensions": {
            "logs": [".log", ".txt", ".json", ".out"],
            "plans": [".json", ".plan", ".tfplan"],
        },
        "file_size_limits": {"logs": "10MB", "plans": "50MB"},
    }


@router.get("/examples")
async def get_parsing_examples():
    """
    Get example log entries and plan snippets for testing
    """
    return {
        "example_json_log": """{
  "@level": "info",
  "@message": "Apply complete! Resources: 1 added, 0 changed, 0 destroyed.",
  "@module": "terraform.ui",
  "@timestamp": "2024-01-20T10:30:45.123456Z",
  "type": "apply_complete",
  "changes": {
    "add": 1,
    "change": 0,
    "remove": 0,
    "operation": "apply"
  }
}""",
        "example_plan_change": """{
  "address": "aws_instance.web_server",
  "module_address": "",
  "mode": "managed",
  "type": "aws_instance",
  "name": "web_server",
  "provider_name": "registry.terraform.io/hashicorp/aws",
  "change": {
    "actions": ["create"],
    "before": null,
    "after": {
      "instance_type": "t2.micro",
      "ami": "ami-0c02fb55956c7d316"
    },
    "after_unknown": {
      "id": true,
      "public_ip": true
    }
  }
}""",
        "usage_tips": [
            "Use 'terraform apply -json' to generate JSON logs for better parsing",
            "Use 'terraform show -json plan_file' to convert binary plans to JSON",
            "Include TF_LOG=INFO environment variable for more detailed logs",
            "Filter logs by resource type or module for focused analysis",
        ],
    }


def _detect_log_format(content: str) -> str:
    """
    Auto-detect the format of Terraform logs

    Args:
        content: Raw log content

    Returns:
        Detected format ("json" or "text")
    """
    # Check if content looks like JSON logs
    lines = content.strip().split("\n")
    json_line_count = 0

    for line in lines[:10]:  # Check first 10 lines
        line = line.strip()
        if line:
            try:
                json.loads(line)
                json_line_count += 1
            except json.JSONDecodeError:
                pass

    # If more than 50% of lines are valid JSON, assume JSON format
    if json_line_count > len([l for l in lines[:10] if l.strip()]) * 0.5:
        return "json"
    else:
        return "text"
