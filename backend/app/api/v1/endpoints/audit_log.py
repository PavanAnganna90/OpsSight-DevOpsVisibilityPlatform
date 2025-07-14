from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse

router = APIRouter()


@router.post("/api/audit-log", status_code=status.HTTP_201_CREATED)
async def create_audit_log(request: Request):
    """
    Log a critical user or system action for audit/compliance purposes.
    Expects JSON: {"action": str, "user": str, "details": dict}
    """
    data = await request.json()
    # For now, just print to console
    print("[AUDIT LOG]", data)
    return JSONResponse({"message": "Audit log recorded"}, status_code=201)
