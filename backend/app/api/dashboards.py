"""Dashboard API routes. Updated: 2026-01-13T16:09:22.008Z"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.api.auth import get_current_user_from_token
from app.models import User, Asset, Alert, WorkOrder

router = APIRouter()


@router.get("/kpis")
async def get_kpi_summary(
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Get KPI summary for current user's tenant."""
    tenant_id = current_user.tenant_id

    # Count total assets
    total_assets_query = select(func.count(Asset.id)).where(Asset.tenant_id == tenant_id)
    total_assets_result = await db.execute(total_assets_query)
    total_assets = total_assets_result.scalar() or 0

    # Count active alerts (not resolved or closed)
    active_alerts_query = select(func.count(Alert.id)).where(
        Alert.tenant_id == tenant_id,
        Alert.status.in_(["open", "acknowledged", "in_progress"])
    )
    active_alerts_result = await db.execute(active_alerts_query)
    active_alerts = active_alerts_result.scalar() or 0

    # Count open work orders (not completed, closed, or cancelled)
    open_work_orders_query = select(func.count(WorkOrder.id)).where(
        WorkOrder.tenant_id == tenant_id,
        WorkOrder.status.in_(["open", "assigned", "in_progress", "on_hold"])
    )
    open_work_orders_result = await db.execute(open_work_orders_query)
    open_work_orders = open_work_orders_result.scalar() or 0

    # Calculate asset health (percentage of active assets)
    active_assets_query = select(func.count(Asset.id)).where(
        Asset.tenant_id == tenant_id,
        Asset.status == "active"
    )
    active_assets_result = await db.execute(active_assets_query)
    active_assets = active_assets_result.scalar() or 0

    asset_health = round((active_assets / total_assets * 100), 1) if total_assets > 0 else 100

    return {
        "total_assets": total_assets,
        "active_alerts": active_alerts,
        "open_work_orders": open_work_orders,
        "asset_health": asset_health
    }


@router.get("/facility/{site_id}")
async def get_facility_dashboard(site_id: str, db: AsyncSession = Depends(get_db)):
    """Get facility dashboard data for a specific site."""
    # TODO: Implement facility dashboard
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/portfolio")
async def get_portfolio_dashboard(db: AsyncSession = Depends(get_db)):
    """Get executive/portfolio dashboard data."""
    # TODO: Implement portfolio dashboard
    raise HTTPException(status_code=501, detail="Not implemented yet")
