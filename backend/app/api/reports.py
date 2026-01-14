"""Reports API routes."""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db

router = APIRouter()


@router.get("/energy")
async def get_energy_report(db: AsyncSession = Depends(get_db)):
    """Get energy consumption report."""
    # TODO: Implement energy report
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/alerts")
async def get_alerts_report(db: AsyncSession = Depends(get_db)):
    """Get alert history report."""
    # TODO: Implement alerts report
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/work-orders")
async def get_work_orders_report(db: AsyncSession = Depends(get_db)):
    """Get work order completion report."""
    # TODO: Implement work orders report
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/eui")
async def get_eui_report(db: AsyncSession = Depends(get_db)):
    """Get energy use intensity (EUI) report."""
    # TODO: Implement EUI report
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/export")
async def export_report(db: AsyncSession = Depends(get_db)):
    """Generate PDF or CSV export of a report."""
    # TODO: Implement report export
    raise HTTPException(status_code=501, detail="Not implemented yet")
