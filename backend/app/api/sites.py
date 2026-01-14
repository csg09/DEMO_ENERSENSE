"""Site management API routes with cascade delete support."""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from app.core.database import get_db
from app.api.auth import get_current_user_from_token
from app.models import User, Site, Portfolio, Asset

router = APIRouter()


class SiteCreate(BaseModel):
    name: str
    address: Optional[str] = None
    timezone: Optional[str] = "America/Chicago"
    facility_type: Optional[str] = "data_center"
    square_footage: Optional[int] = None
    utility_rate: Optional[float] = None


class SiteUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    timezone: Optional[str] = None
    facility_type: Optional[str] = None
    square_footage: Optional[int] = None
    utility_rate: Optional[float] = None


@router.get("")
async def list_sites(
    search: Optional[str] = Query(None),
    facility_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """List all sites for the tenant."""
    query = select(Site).where(Site.tenant_id == current_user.tenant_id)

    if search:
        query = query.where(Site.name.ilike(f"%{search}%"))
    if facility_type:
        query = query.where(Site.facility_type == facility_type)

    query = query.order_by(Site.name)

    result = await db.execute(query)
    sites = result.scalars().all()

    response = []
    for site in sites:
        count_result = await db.execute(
            select(func.count()).select_from(Asset).where(Asset.site_id == site.id)
        )
        asset_count = count_result.scalar() or 0

        response.append({
            "id": site.id,
            "name": site.name,
            "address": site.address,
            "timezone": site.timezone,
            "facility_type": site.facility_type,
            "square_footage": site.square_footage,
            "utility_rate": float(site.utility_rate) if site.utility_rate else None,
            "asset_count": asset_count,
            "created_at": site.created_at.isoformat(),
            "updated_at": site.updated_at.isoformat(),
        })

    return response


@router.get("/{site_id}")
async def get_site(
    site_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Get site details with systems and assets."""
    result = await db.execute(
        select(Site).where(
            Site.id == site_id,
            Site.tenant_id == current_user.tenant_id
        )
    )
    site = result.scalar_one_or_none()

    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    count_result = await db.execute(
        select(func.count()).select_from(Asset).where(Asset.site_id == site.id)
    )
    asset_count = count_result.scalar() or 0

    portfolio_result = await db.execute(select(Portfolio).where(Portfolio.id == site.portfolio_id))
    portfolio = portfolio_result.scalar_one_or_none()

    return {
        "id": site.id,
        "name": site.name,
        "address": site.address,
        "timezone": site.timezone,
        "facility_type": site.facility_type,
        "square_footage": site.square_footage,
        "utility_rate": float(site.utility_rate) if site.utility_rate else None,
        "asset_count": asset_count,
        "portfolio_id": site.portfolio_id,
        "portfolio_name": portfolio.name if portfolio else None,
        "created_at": site.created_at.isoformat(),
        "updated_at": site.updated_at.isoformat(),
    }


@router.post("")
async def create_site(
    data: SiteCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Create a new site."""
    if current_user.role not in ["admin", "facility_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to create sites")

    portfolio_result = await db.execute(
        select(Portfolio).where(Portfolio.tenant_id == current_user.tenant_id)
    )
    portfolio = portfolio_result.scalar_one_or_none()

    if not portfolio:
        raise HTTPException(status_code=400, detail="No portfolio found for tenant")

    site = Site(
        tenant_id=current_user.tenant_id,
        portfolio_id=portfolio.id,
        name=data.name,
        address=data.address,
        timezone=data.timezone,
        facility_type=data.facility_type,
        square_footage=data.square_footage,
        utility_rate=data.utility_rate,
    )

    db.add(site)
    await db.commit()
    await db.refresh(site)

    return {
        "id": site.id,
        "name": site.name,
        "address": site.address,
        "timezone": site.timezone,
        "facility_type": site.facility_type,
        "square_footage": site.square_footage,
        "utility_rate": float(site.utility_rate) if site.utility_rate else None,
        "portfolio_id": site.portfolio_id,
        "created_at": site.created_at.isoformat(),
        "updated_at": site.updated_at.isoformat(),
    }


@router.put("/{site_id}")
async def update_site(
    site_id: str,
    data: SiteUpdate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Update site."""
    if current_user.role not in ["admin", "facility_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to update sites")

    result = await db.execute(
        select(Site).where(
            Site.id == site_id,
            Site.tenant_id == current_user.tenant_id
        )
    )
    site = result.scalar_one_or_none()

    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    if data.name is not None:
        site.name = data.name
    if data.address is not None:
        site.address = data.address
    if data.timezone is not None:
        site.timezone = data.timezone
    if data.facility_type is not None:
        site.facility_type = data.facility_type
    if data.square_footage is not None:
        site.square_footage = data.square_footage
    if data.utility_rate is not None:
        site.utility_rate = data.utility_rate

    site.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(site)

    return {
        "id": site.id,
        "name": site.name,
        "address": site.address,
        "timezone": site.timezone,
        "facility_type": site.facility_type,
        "square_footage": site.square_footage,
        "utility_rate": float(site.utility_rate) if site.utility_rate else None,
        "portfolio_id": site.portfolio_id,
        "created_at": site.created_at.isoformat(),
        "updated_at": site.updated_at.isoformat(),
    }


@router.delete("/{site_id}")
async def delete_site(
    site_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Delete site and all associated assets (cascade delete)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete sites")

    result = await db.execute(
        select(Site).where(
            Site.id == site_id,
            Site.tenant_id == current_user.tenant_id
        )
    )
    site = result.scalar_one_or_none()

    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    # Delete all assets associated with the site first
    assets_result = await db.execute(
        select(Asset).where(Asset.site_id == site.id)
    )
    assets = assets_result.scalars().all()
    for asset in assets:
        await db.delete(asset)

    await db.delete(site)
    await db.commit()

    return {"message": "Site deleted successfully", "id": site_id, "assets_deleted": len(assets)}
