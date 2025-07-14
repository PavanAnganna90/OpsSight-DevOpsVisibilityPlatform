from fastapi import APIRouter, Path
from fastapi.responses import JSONResponse
from datetime import datetime

router = APIRouter()


@router.get("/api/infrastructure")
async def get_infrastructure():
    """
    Get all infrastructure resources for the Infrastructure panel.
    Returns: list of {id, type, name, status, region, cost, last_updated}
    """
    return [
        {
            "id": 1,
            "type": "EC2",
            "name": "web-server-1",
            "status": "running",
            "region": "us-east-1",
            "cost": 24.5,
            "last_updated": datetime.utcnow().isoformat(),
        },
        {
            "id": 2,
            "type": "RDS",
            "name": "db-prod",
            "status": "stopped",
            "region": "us-east-1",
            "cost": 120.0,
            "last_updated": datetime.utcnow().isoformat(),
        },
        {
            "id": 3,
            "type": "S3",
            "name": "logs-bucket",
            "status": "available",
            "region": "us-west-2",
            "cost": 5.2,
            "last_updated": datetime.utcnow().isoformat(),
        },
    ]


@router.post("/api/infrastructure/{resource_id}/restart")
async def restart_resource(resource_id: int = Path(...)):
    """
    Restart an infrastructure resource by ID.
    Returns: success message
    """
    return JSONResponse(
        {"message": f"Resource {resource_id} restarted"}, status_code=200
    )


@router.post("/api/infrastructure/{resource_id}/delete")
async def delete_resource(resource_id: int = Path(...)):
    """
    Delete an infrastructure resource by ID.
    Returns: success message
    """
    return JSONResponse({"message": f"Resource {resource_id} deleted"}, status_code=200)
