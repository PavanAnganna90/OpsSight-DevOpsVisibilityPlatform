"""
Terraform infrastructure management API endpoints.
Handles Terraform log parsing, risk assessment, and infrastructure change management.
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
from app.models.infrastructure_change import (
    InfrastructureChange,
    ChangeStatus,
    ChangeType,
)
from app.schemas.infrastructure_change import (
    InfrastructureChange as InfrastructureChangeSchema,
    InfrastructureChangeCreate,
    InfrastructureChangeUpdate,
    TerraformPlan,
    ResourceChange,
    CostEstimate,
)
from app.services.infrastructure_change_service import InfrastructureChangeService
from app.utils.terraform_parser import TerraformLogParser, LogFormat, RiskLevel
from app.utils.risk_assessor import InfrastructureRiskAssessor, RiskAssessment
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter()


# Request/Response Models
class ParseLogRequest(BaseModel):
    """Request model for parsing Terraform logs"""

    log_content: str = Field(..., description="Terraform log content to parse")
    log_format: Optional[str] = Field(
        "auto", description="Log format: 'json', 'human', or 'auto'"
    )
    project_id: Optional[int] = Field(
        None, description="Optional project ID for context"
    )
    environment: Optional[str] = Field(None, description="Target environment")


class RiskAssessmentRequest(BaseModel):
    """Request model for risk assessment"""

    resource_type: str = Field(..., description="Type of resource being changed")
    action: str = Field(..., description="Action being performed")
    environment: Optional[str] = Field(None, description="Target environment")
    cost_impact: Optional[float] = Field(
        None, description="Estimated monthly cost impact"
    )
    affects_production: bool = Field(
        False, description="Whether change affects production"
    )
    has_dependencies: bool = Field(
        False, description="Whether resource has dependencies"
    )
    compliance_tags: Optional[List[str]] = Field(
        None, description="Compliance-related tags"
    )
    change_metadata: Optional[Dict[str, Any]] = Field(
        None, description="Additional change metadata"
    )


class ParsedLogResponse(BaseModel):
    """Response model for parsed Terraform logs"""

    success: bool
    format: str
    terraform_version: Optional[str]
    resource_changes: List[Dict[str, Any]]
    modules: Dict[str, Any]
    summary: Dict[str, Any]
    risk_assessment: Dict[str, Any]
    metadata: Dict[str, Any]


class RiskAssessmentResponse(BaseModel):
    """Response model for risk assessment"""

    overall_risk: str
    risk_score: float
    impact_scope: str
    compliance_impact: str
    requires_approval: bool
    recommended_approvers: List[str]
    mitigation_recommendations: List[str]
    testing_strategy: List[str]
    rollback_plan: Optional[str]
    estimated_downtime: Optional[str]
    business_impact: Optional[str]


@router.get("/status")
async def get_terraform_status():
    """
    Get Terraform integration status and available features.
    """
    return {
        "status": "active",
        "features": {
            "log_parsing": True,
            "risk_assessment": True,
            "cost_estimation": True,
            "compliance_checking": True,
            "approval_workflow": True,
        },
        "supported_formats": ["json", "human_readable", "auto_detect"],
        "supported_providers": ["aws", "azure", "google", "kubernetes"],
        "version": "1.0.0",
    }


@router.post("/parse-log", response_model=ParsedLogResponse)
async def parse_terraform_log(
    request: ParseLogRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Parse Terraform plan or apply logs and extract resource changes with risk assessment.

    This endpoint accepts Terraform logs in JSON or human-readable format and returns
    structured data including resource changes, risk assessments, and recommendations.
    """
    try:
        # Initialize parser with risk configuration
        risk_config = {"risk_thresholds": {"low": 0.3, "medium": 0.6, "high": 0.8}}
        parser = TerraformLogParser(risk_config)

        # Determine log format
        log_format = LogFormat.AUTO_DETECT
        if request.log_format:
            format_map = {
                "json": LogFormat.JSON,
                "human": LogFormat.HUMAN_READABLE,
                "auto": LogFormat.AUTO_DETECT,
            }
            log_format = format_map.get(
                request.log_format.lower(), LogFormat.AUTO_DETECT
            )

        # Parse the log
        parsed_data = parser.parse_log(request.log_content, log_format)

        if not parsed_data.get("success", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to parse Terraform log: {parsed_data.get('error', 'Unknown error')}",
            )

        # If project_id is provided, optionally save the parsed data
        if request.project_id:
            try:
                # Create infrastructure change record
                change_data = InfrastructureChangeCreate(
                    name=f"Terraform Plan - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
                    description="Automatically created from parsed Terraform log",
                    change_type=ChangeType.PLAN,
                    terraform_version=parsed_data.get("terraform_version"),
                    workspace="default",
                    target_environment=request.environment or "unknown",
                    project_id=request.project_id,
                    initiated_by_user_id=current_user.id,
                    resources_to_add=parsed_data.get("summary", {}).get(
                        "resources_to_add", 0
                    ),
                    resources_to_change=parsed_data.get("summary", {}).get(
                        "resources_to_change", 0
                    ),
                    resources_to_destroy=parsed_data.get("summary", {}).get(
                        "resources_to_destroy", 0
                    ),
                    plan_output=request.log_content[:10000],  # Truncate if too long
                )

                infrastructure_change = (
                    InfrastructureChangeService.create_infrastructure_change(
                        db=db, change_data=change_data, user_id=current_user.id
                    )
                )

                if infrastructure_change:
                    parsed_data["infrastructure_change_id"] = infrastructure_change.id
                    logger.info(
                        f"Created infrastructure change record {infrastructure_change.id} for parsed log"
                    )

            except Exception as e:
                logger.warning(f"Failed to create infrastructure change record: {e}")
                # Don't fail the request if we can't save to database

        # After calling parser.parse_log or in any error case, before returning, add:
        required_keys = [
            "success",
            "format",
            "terraform_version",
            "resource_changes",
            "modules",
            "summary",
            "risk_assessment",
            "metadata",
        ]
        for key in required_keys:
            if key not in parsed_data:
                if key == "success":
                    parsed_data[key] = False
                elif key == "resource_changes":
                    parsed_data[key] = []
                elif key in ["modules", "summary", "risk_assessment", "metadata"]:
                    parsed_data[key] = {}
                else:
                    parsed_data[key] = None
        # If 'error' is present, ensure it's a string
        if "error" in parsed_data and not isinstance(parsed_data["error"], str):
            parsed_data["error"] = str(parsed_data["error"])

        return ParsedLogResponse(**parsed_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing Terraform log: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error parsing log: {str(e)}",
        )


@router.post("/parse-log-file", response_model=ParsedLogResponse)
async def parse_terraform_log_file(
    file: UploadFile = File(..., description="Terraform log file to parse"),
    project_id: Optional[int] = Form(None, description="Optional project ID"),
    environment: Optional[str] = Form(None, description="Target environment"),
    log_format: Optional[str] = Form("auto", description="Log format"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Parse Terraform log from uploaded file.

    Accepts file uploads of Terraform plan or apply logs and returns structured data.
    """
    try:
        # Read file content
        log_content = await file.read()
        log_content_str = log_content.decode("utf-8")

        # Create request object
        request = ParseLogRequest(
            log_content=log_content_str,
            log_format=log_format,
            project_id=project_id,
            environment=environment,
        )

        # Use the same parsing logic
        return await parse_terraform_log(request, current_user, db)

    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a valid text file (UTF-8 encoding)",
        )
    except Exception as e:
        logger.error(f"Error parsing uploaded log file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing uploaded file: {str(e)}",
        )


@router.post("/assess-risk", response_model=RiskAssessmentResponse)
async def assess_infrastructure_risk(
    request: RiskAssessmentRequest, current_user: User = Depends(get_current_user)
):
    """
    Perform risk assessment for an infrastructure change.

    Analyzes the risk level of a proposed infrastructure change and provides
    recommendations for approval, testing, and mitigation strategies.
    """
    try:
        # Initialize risk assessor
        risk_assessor = InfrastructureRiskAssessor()

        # Perform risk assessment
        assessment = risk_assessor.assess_change(
            resource_type=request.resource_type,
            action=request.action,
            environment=request.environment,
            cost_impact=request.cost_impact,
            affects_production=request.affects_production,
            has_dependencies=request.has_dependencies,
            compliance_tags=request.compliance_tags or [],
            change_metadata=request.change_metadata or {},
        )

        return RiskAssessmentResponse(
            overall_risk=assessment.overall_risk,
            risk_score=assessment.risk_score,
            impact_scope=assessment.impact_scope,
            compliance_impact=assessment.compliance_impact,
            requires_approval=assessment.requires_approval,
            recommended_approvers=assessment.recommended_approvers,
            mitigation_recommendations=assessment.mitigation_recommendations,
            testing_strategy=assessment.testing_strategy,
            rollback_plan=assessment.rollback_plan,
            estimated_downtime=assessment.estimated_downtime,
            business_impact=assessment.business_impact,
        )

    except Exception as e:
        logger.error(f"Error performing risk assessment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error performing risk assessment: {str(e)}",
        )


@router.get("/infrastructure-changes/{change_id}")
async def get_infrastructure_change(
    change_id: int,
    include_logs: bool = Query(False, description="Include plan and apply logs"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get details of a specific infrastructure change.
    """
    try:
        change = InfrastructureChangeService.get_infrastructure_change_by_id(
            db=db, change_id=change_id, user_id=current_user.id
        )

        if not change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Infrastructure change not found or access denied",
            )

        # Convert to response model
        response_data = InfrastructureChangeSchema.from_orm(change).dict()

        # Parse logs if requested and available
        if include_logs and (change.plan_output or change.apply_output):
            try:
                parser = TerraformLogParser()
                parsed_logs = {}

                if change.plan_output:
                    plan_data = parser.parse_log(change.plan_output)
                    if plan_data.get("success"):
                        parsed_logs["plan"] = plan_data

                if change.apply_output:
                    apply_data = parser.parse_log(change.apply_output)
                    if apply_data.get("success"):
                        parsed_logs["apply"] = apply_data

                if parsed_logs:
                    response_data["parsed_logs"] = parsed_logs

            except Exception as e:
                logger.warning(f"Failed to parse logs for change {change_id}: {e}")

        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving infrastructure change {change_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving infrastructure change",
        )


@router.get("/infrastructure-changes")
async def list_infrastructure_changes(
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    change_status: Optional[str] = Query(None, description="Filter by status"),
    environment: Optional[str] = Query(None, description="Filter by environment"),
    change_type: Optional[str] = Query(None, description="Filter by change type"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(
        100, ge=1, le=1000, description="Maximum number of records to return"
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List infrastructure changes with optional filtering.
    """
    try:
        # Convert string parameters to enums if provided
        status_filter = None
        if change_status:
            try:
                status_filter = ChangeStatus(change_status.upper())
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status: {change_status}",
                )

        change_type_filter = None
        if change_type:
            try:
                change_type_filter = ChangeType(change_type.upper())
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid change type: {change_type}",
                )

        if project_id:
            # Get changes for specific project
            changes = InfrastructureChangeService.get_infrastructure_changes_by_project(
                db=db,
                project_id=project_id,
                user_id=current_user.id,
                skip=skip,
                limit=limit,
                status=status_filter,
                change_type=change_type_filter,
                environment=environment,
            )
        else:
            # Get all accessible changes for user
            # This would require implementing a method to get all changes across projects
            # For now, return empty list if no project_id specified
            changes = []

        # Convert to response format
        response_changes = []
        for change in changes:
            change_data = InfrastructureChangeSchema.from_orm(change).dict()
            response_changes.append(change_data)

        return {
            "changes": response_changes,
            "total": len(response_changes),
            "skip": skip,
            "limit": limit,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing infrastructure changes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving infrastructure changes",
        )


@router.post("/infrastructure-changes/{change_id}/approve")
async def approve_infrastructure_change(
    change_id: int,
    approval_note: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Approve an infrastructure change.
    """
    try:
        success = InfrastructureChangeService.approve_infrastructure_change(
            db=db,
            change_id=change_id,
            user_id=current_user.id,
            approval_note=approval_note,
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Infrastructure change not found or cannot be approved",
            )

        return {"message": "Infrastructure change approved successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving infrastructure change {change_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error approving infrastructure change",
        )


@router.get("/risk-levels")
async def get_risk_levels():
    """
    Get available risk levels and their descriptions.
    """
    return {
        "risk_levels": {
            "low": {
                "description": "Minimal impact, routine changes",
                "threshold": 0.3,
                "approval_required": False,
            },
            "medium": {
                "description": "Moderate impact, requires review",
                "threshold": 0.6,
                "approval_required": True,
            },
            "high": {
                "description": "High impact, requires senior approval",
                "threshold": 0.8,
                "approval_required": True,
            },
            "critical": {
                "description": "Critical impact, requires multiple approvals",
                "threshold": 1.0,
                "approval_required": True,
            },
        },
        "impact_scopes": ["local", "service", "region", "global"],
        "compliance_levels": ["none", "low", "medium", "high", "regulatory"],
    }


@router.get("/supported-resources")
async def get_supported_resources():
    """
    Get list of supported resource types and their risk mappings.
    """
    risk_assessor = InfrastructureRiskAssessor()

    return {
        "resource_types": list(risk_assessor.RESOURCE_RISK_MAPPING.keys()),
        "risk_mappings": risk_assessor.RESOURCE_RISK_MAPPING,
        "action_multipliers": risk_assessor.ACTION_MULTIPLIERS,
        "environment_multipliers": risk_assessor.ENVIRONMENT_MULTIPLIERS,
        "total_supported": len(risk_assessor.RESOURCE_RISK_MAPPING),
    }


@router.post("/infrastructure-changes", status_code=status.HTTP_201_CREATED)
async def create_infrastructure_change(
    change_data: InfrastructureChangeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Create a new infrastructure change request.
    
    This endpoint allows users to create infrastructure change requests
    with Terraform plan parsing and risk assessment.
    """
    try:
        # Initialize the infrastructure change service
        change_service = InfrastructureChangeService(db)
        
        # Create the infrastructure change
        infrastructure_change = await change_service.create_change(
            change_data=change_data,
            created_by_user_id=current_user.id
        )
        
        # Parse Terraform plan if provided
        if change_data.plan_content:
            parser = TerraformLogParser()
            parsed_plan = parser.parse_log(change_data.plan_content)
            
            # Update the change with parsed plan data
            await change_service.update_plan_data(
                change_id=infrastructure_change.id,
                parsed_plan=parsed_plan
            )
        
        return JSONResponse(
            content={
                "id": infrastructure_change.id,
                "title": infrastructure_change.title,
                "description": infrastructure_change.description,
                "status": infrastructure_change.status.value,
                "change_type": infrastructure_change.change_type.value,
                "created_at": infrastructure_change.created_at.isoformat(),
                "created_by": {
                    "id": current_user.id,
                    "name": current_user.full_name,
                    "email": current_user.email
                }
            },
            status_code=201
        )
        
    except Exception as e:
        logger.error(f"Error creating infrastructure change: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create infrastructure change: {str(e)}"
        )


@router.get("/infrastructure-changes")
async def list_infrastructure_changes(change_status: str = None):
    return JSONResponse(
        content={"changes": [], "total": 0, "skip": 0, "limit": 100}, status_code=200
    )


@router.get("/infrastructure-changes/{change_id}")
async def get_infrastructure_change(
    change_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get details of a specific infrastructure change.
    
    This endpoint returns detailed information about an infrastructure change,
    including parsed Terraform plans and risk assessments.
    """
    try:
        # Initialize the infrastructure change service
        change_service = InfrastructureChangeService(db)
        
        # Get the change by ID
        infrastructure_change = await change_service.get_change_by_id(change_id)
        if not infrastructure_change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Infrastructure change {change_id} not found"
            )
        
        # Check permissions (user can view their own changes or admin can view any)
        if infrastructure_change.created_by_user_id != current_user.id and not current_user.is_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own infrastructure changes"
            )
        
        # Get risk assessment if available
        risk_assessment = None
        if infrastructure_change.risk_score:
            risk_assessment = {
                "risk_score": infrastructure_change.risk_score,
                "risk_level": infrastructure_change.risk_level,
                "risk_factors": infrastructure_change.risk_factors or []
            }
        
        # Get parsed plan data if available
        plan_data = None
        if infrastructure_change.parsed_plan:
            plan_data = infrastructure_change.parsed_plan
            
        return JSONResponse(
            content={
                "id": infrastructure_change.id,
                "title": infrastructure_change.title,
                "description": infrastructure_change.description,
                "status": infrastructure_change.status.value,
                "change_type": infrastructure_change.change_type.value,
                "environment": infrastructure_change.environment,
                "project_id": infrastructure_change.project_id,
                "risk_assessment": risk_assessment,
                "plan_data": plan_data,
                "created_at": infrastructure_change.created_at.isoformat(),
                "updated_at": infrastructure_change.updated_at.isoformat(),
                "created_by": {
                    "id": infrastructure_change.created_by_user_id,
                    "name": infrastructure_change.created_by.full_name if infrastructure_change.created_by else None,
                    "email": infrastructure_change.created_by.email if infrastructure_change.created_by else None
                }
            },
            status_code=200
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting infrastructure change: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get infrastructure change: {str(e)}"
        )


@router.patch("/infrastructure-changes/{change_id}")
async def update_infrastructure_change(
    change_id: str,
    change_update: InfrastructureChangeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Update an existing infrastructure change request.
    
    This endpoint allows users to update infrastructure change requests,
    including status changes, plan updates, and approval workflows.
    """
    try:
        # Initialize the infrastructure change service
        change_service = InfrastructureChangeService(db)
        
        # Get the existing change
        existing_change = await change_service.get_change_by_id(change_id)
        if not existing_change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Infrastructure change {change_id} not found"
            )
        
        # Check permissions (user can update their own changes or admin can update any)
        if existing_change.created_by_user_id != current_user.id and not current_user.is_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own infrastructure changes"
            )
        
        # Update the change
        updated_change = await change_service.update_change(
            change_id=change_id,
            change_update=change_update,
            updated_by_user_id=current_user.id
        )
        
        # Parse new plan if provided
        if change_update.plan_content:
            parser = TerraformLogParser()
            parsed_plan = parser.parse_log(change_update.plan_content)
            
            # Update the change with new parsed plan data
            await change_service.update_plan_data(
                change_id=change_id,
                parsed_plan=parsed_plan
            )
        
        return JSONResponse(
            content={
                "id": updated_change.id,
                "title": updated_change.title,
                "description": updated_change.description,
                "status": updated_change.status.value,
                "change_type": updated_change.change_type.value,
                "updated_at": updated_change.updated_at.isoformat(),
                "updated_by": {
                    "id": current_user.id,
                    "name": current_user.full_name,
                    "email": current_user.email
                }
            },
            status_code=200
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating infrastructure change: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update infrastructure change: {str(e)}"
        )


@router.delete("/infrastructure-changes/{change_id}")
async def delete_infrastructure_change(
    change_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Delete an infrastructure change request.
    
    This endpoint allows users to delete infrastructure change requests
    that are in draft or rejected status.
    """
    try:
        # Initialize the infrastructure change service
        change_service = InfrastructureChangeService(db)
        
        # Get the existing change
        existing_change = await change_service.get_change_by_id(change_id)
        if not existing_change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Infrastructure change {change_id} not found"
            )
        
        # Check permissions (user can delete their own changes or admin can delete any)
        if existing_change.created_by_user_id != current_user.id and not current_user.is_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own infrastructure changes"
            )
        
        # Check if change can be deleted (only draft or rejected changes)
        if existing_change.status not in [ChangeStatus.DRAFT, ChangeStatus.REJECTED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only draft or rejected changes can be deleted"
            )
        
        # Delete the change
        await change_service.delete_change(change_id)
        
        return JSONResponse(content=None, status_code=204)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting infrastructure change: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete infrastructure change: {str(e)}"
        )


@router.post("/infrastructure-changes/{change_id}/apply")
async def apply_infrastructure_change(
    change_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Apply an approved infrastructure change.
    
    This endpoint triggers the application of an infrastructure change
    that has been approved and is ready for deployment.
    """
    try:
        # Initialize the infrastructure change service
        change_service = InfrastructureChangeService(db)
        
        # Get the existing change
        existing_change = await change_service.get_change_by_id(change_id)
        if not existing_change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Infrastructure change {change_id} not found"
            )
        
        # Check permissions (only admin can apply changes)
        if not current_user.is_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can apply infrastructure changes"
            )
        
        # Check if change can be applied (only approved changes)
        if existing_change.status != ChangeStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only approved changes can be applied"
            )
        
        # Apply the change
        result = await change_service.apply_change(
            change_id=change_id,
            applied_by_user_id=current_user.id
        )
        
        return JSONResponse(
            content={
                "id": change_id,
                "status": "applying",
                "message": "Infrastructure change application started",
                "applied_by": {
                    "id": current_user.id,
                    "name": current_user.full_name,
                    "email": current_user.email
                },
                "applied_at": datetime.utcnow().isoformat(),
                "job_id": result.get("job_id"),
                "estimated_duration": result.get("estimated_duration", "5-10 minutes")
            },
            status_code=200
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error applying infrastructure change: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to apply infrastructure change: {str(e)}"
        )


@router.post("/infrastructure-changes/{change_id}/rollback")
async def rollback_infrastructure_change(
    change_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Rollback an applied infrastructure change.
    
    This endpoint triggers the rollback of an infrastructure change
    that has been previously applied.
    """
    try:
        # Initialize the infrastructure change service
        change_service = InfrastructureChangeService(db)
        
        # Get the existing change
        existing_change = await change_service.get_change_by_id(change_id)
        if not existing_change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Infrastructure change {change_id} not found"
            )
        
        # Check permissions (only admin can rollback changes)
        if not current_user.is_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can rollback infrastructure changes"
            )
        
        # Check if change can be rolled back (only applied changes)
        if existing_change.status != ChangeStatus.APPLIED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only applied changes can be rolled back"
            )
        
        # Rollback the change
        result = await change_service.rollback_change(
            change_id=change_id,
            rolled_back_by_user_id=current_user.id
        )
        
        return JSONResponse(
            content={
                "id": change_id,
                "status": "rolling_back",
                "message": "Infrastructure change rollback started",
                "rolled_back_by": {
                    "id": current_user.id,
                    "name": current_user.full_name,
                    "email": current_user.email
                },
                "rolled_back_at": datetime.utcnow().isoformat(),
                "job_id": result.get("job_id"),
                "estimated_duration": result.get("estimated_duration", "3-5 minutes")
            },
            status_code=200
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rolling back infrastructure change: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rollback infrastructure change: {str(e)}"
        )
