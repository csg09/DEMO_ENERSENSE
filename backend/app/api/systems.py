"""System management API routes."""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from app.core.database import get_db
from app.api.auth import get_current_user_from_token
from app.models import User, System, Site, Asset

router = APIRouter()


class SystemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    site_id: str


class SystemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


@router.get("")
async def list_systems(
    site_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """List all systems, optionally filtered by site."""
    query = select(System).where(System.tenant_id == current_user.tenant_id)

    if site_id:
        query = query.where(System.site_id == site_id)
    if search:
        query = query.where(System.name.ilike(f"%{search}%"))

    query = query.order_by(System.name)

    result = await db.execute(query)
    systems = result.scalars().all()

    response = []
    for system in systems:
        # Count assets
        count_result = await db.execute(
            select(func.count()).select_from(Asset).where(Asset.system_id == system.id)
        )
        asset_count = count_result.scalar() or 0

        # Get site name
        site_result = await db.execute(select(Site).where(Site.id == system.site_id))
        site = site_result.scalar_one_or_none()

        response.append({
            "id": system.id,
            "name": system.name,
            "description": system.description,
            "site_id": system.site_id,
            "site_name": site.name if site else None,
            "asset_count": asset_count,
            "created_at": system.created_at.isoformat(),
            "updated_at": system.updated_at.isoformat(),
        })

    return response


@router.get("/{system_id}")
async def get_system(
    system_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Get system details with assets."""
    result = await db.execute(
        select(System).where(
            System.id == system_id,
            System.tenant_id == current_user.tenant_id
        )
    )
    system = result.scalar_one_or_none()

    if not system:
        raise HTTPException(status_code=404, detail="System not found")

    # Get site info
    site_result = await db.execute(select(Site).where(Site.id == system.site_id))
    site = site_result.scalar_one_or_none()

    # Get assets
    assets_result = await db.execute(
        select(Asset).where(Asset.system_id == system.id).order_by(Asset.name)
    )
    assets = assets_result.scalars().all()

    assets_list = []
    for asset in assets:
        assets_list.append({
            "id": asset.id,
            "name": asset.name,
            "status": asset.status,
            "criticality": asset.criticality,
        })

    return {
        "id": system.id,
        "name": system.name,
        "description": system.description,
        "site_id": system.site_id,
        "site_name": site.name if site else None,
        "assets": assets_list,
        "asset_count": len(assets_list),
        "created_at": system.created_at.isoformat(),
        "updated_at": system.updated_at.isoformat(),
    }


@router.post("")
async def create_system(
    data: SystemCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Create a new system."""
    if current_user.role not in ["admin", "facility_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to create systems")

    # Verify site exists and belongs to tenant
    site_result = await db.execute(
        select(Site).where(
            Site.id == data.site_id,
            Site.tenant_id == current_user.tenant_id
        )
    )
    site = site_result.scalar_one_or_none()

    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    system = System(
        tenant_id=current_user.tenant_id,
        site_id=data.site_id,
        name=data.name,
        description=data.description,
    )

    db.add(system)
    await db.commit()
    await db.refresh(system)

    return {
        "id": system.id,
        "name": system.name,
        "description": system.description,
        "site_id": system.site_id,
        "site_name": site.name,
        "asset_count": 0,
        "created_at": system.created_at.isoformat(),
        "updated_at": system.updated_at.isoformat(),
    }


@router.put("/{system_id}")
async def update_system(
    system_id: str,
    data: SystemUpdate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Update system."""
    if current_user.role not in ["admin", "facility_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to update systems")

    result = await db.execute(
        select(System).where(
            System.id == system_id,
            System.tenant_id == current_user.tenant_id
        )
    )
    system = result.scalar_one_or_none()

    if not system:
        raise HTTPException(status_code=404, detail="System not found")

    if data.name is not None:
        system.name = data.name
    if data.description is not None:
        system.description = data.description

    system.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(system)

    # Get site name
    site_result = await db.execute(select(Site).where(Site.id == system.site_id))
    site = site_result.scalar_one_or_none()

    count_result = await db.execute(
        select(func.count()).select_from(Asset).where(Asset.system_id == system.id)
    )
    asset_count = count_result.scalar() or 0

    return {
        "id": system.id,
        "name": system.name,
        "description": system.description,
        "site_id": system.site_id,
        "site_name": site.name if site else None,
        "asset_count": asset_count,
        "created_at": system.created_at.isoformat(),
        "updated_at": system.updated_at.isoformat(),
    }


@router.delete("/{system_id}")
async def delete_system(
    system_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Delete system if empty (no assets)."""
    if current_user.role not in ["admin", "facility_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete systems")

    result = await db.execute(
        select(System).where(
            System.id == system_id,
            System.tenant_id == current_user.tenant_id
        )
    )
    system = result.scalar_one_or_none()

    if not system:
        raise HTTPException(status_code=404, detail="System not found")

    count_result = await db.execute(
        select(func.count()).select_from(Asset).where(Asset.system_id == system.id)
    )
    asset_count = count_result.scalar() or 0

    if asset_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete system with {asset_count} assets. Remove all assets first."
        )

    await db.delete(system)
    await db.commit()

    return {"message": "System deleted successfully", "id": system_id}
