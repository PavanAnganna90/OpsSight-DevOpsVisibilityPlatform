"""
Cost analysis API endpoints.
Placeholder implementation for future AWS cost integration.
"""

from fastapi import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_async_db

router = APIRouter()


@router.get("/")
async def get_costs():
    """Get cost analysis - placeholder endpoint."""
    return {"message": "Cost analysis endpoints - to be implemented"}
