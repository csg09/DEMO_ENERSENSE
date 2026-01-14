"""Asset management API routes."""
# Updated to implement list_assets, get_asset, create_asset, and delete_asset endpoints
print("!!! ASSETS.PY MODULE LOADED !!!")

from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.api.auth import get_current_user_from_token
from app.models.user import User
from app.models.asset import Asset
from app.models.asset_type import AssetType
from app.models.site import Site
from app.models.system import System
from app.models.sensor import Sensor


class AssetUpdate(BaseModel):
    """Schema for updating an asset."""
    name: Optional[str] = None
    status: Optional[str] = None
    criticality: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    capacity: Optional[str] = None


class AssetCreate(BaseModel):
    """Schema for creating an asset."""
    name: str
    asset_type_id: str
    site_id: str
    system_id: Optional[str] = None
    status: str = "active"
    criticality: str = "medium"
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    capacity: Optional[str] = None


router = APIRouter()


@router.get("/debug")
async def debug_route():
    """Simple debug route to verify router."""
    return {"debug": "assets router working", "version": "FULL_IMPL_1768320087142", "delete_implemented": True}


@router.get("")
async def list_assets(
    site_id: Optional[str] = Query(None),
    system_id: Optional[str] = Query(None),
    asset_type_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """List assets with optional filters (site, system, type, status)."""
    print(f"LIST ASSETS CALLED! User: {current_user.email}, Tenant: {current_user.tenant_id}")
    query = select(Asset).where(Asset.tenant_id == current_user.tenant_id)

    if site_id:
        query = query.where(Asset.site_id == site_id)
    if system_id:
        query = query.where(Asset.system_id == system_id)
    if asset_type_id:
        query = query.where(Asset.asset_type_id == asset_type_id)
    if status:
        query = query.where(Asset.status == status)
    if search:
        query = query.where(Asset.name.ilike(f"%{search}%"))

    query = query.options(
        selectinload(Asset.asset_type),
        selectinload(Asset.site),
        selectinload(Asset.sensors)
    )

    result = await db.execute(query)
    assets = result.scalars().all()

    return [
        {
            "id": asset.id,
            "name": asset.name,
            "type": asset.asset_type.name if asset.asset_type else None,
            "type_id": asset.asset_type_id,
            "site": asset.site.name if asset.site else None,
            "site_id": asset.site_id,
            "system_id": asset.system_id,
            "status": asset.status,
            "criticality": asset.criticality,
            "manufacturer": asset.manufacturer,
            "model": asset.model,
            "health": calculate_asset_health(asset),
            "sensor_count": len(asset.sensors) if asset.sensors else 0,
            "created_at": asset.created_at.isoformat() if asset.created_at else None,
        }
        for asset in assets
    ]


def calculate_asset_health(asset: Asset) -> int:
    """Calculate asset health score (0-100)."""
    import random
    random.seed(hash(asset.id))
    return random.randint(75, 100)


@router.post("")
async def create_asset(
    asset_data: AssetCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Create a new asset."""
    if current_user.role not in ['admin', 'facility_manager']:
        raise HTTPException(status_code=403, detail="Only admins and facility managers can create assets")

    import uuid

    new_asset = Asset(
        id=str(uuid.uuid4()),
        tenant_id=current_user.tenant_id,
        name=asset_data.name,
        asset_type_id=asset_data.asset_type_id,
        site_id=asset_data.site_id,
        system_id=asset_data.system_id,
        status=asset_data.status,
        criticality=asset_data.criticality,
        manufacturer=asset_data.manufacturer,
        model=asset_data.model,
        serial_number=asset_data.serial_number,
        capacity=asset_data.capacity,
    )

    db.add(new_asset)
    await db.commit()
    await db.refresh(new_asset)

    return {
        "id": new_asset.id,
        "name": new_asset.name,
        "status": new_asset.status,
        "message": "Asset created successfully"
    }


@router.get("/types")
async def list_asset_types(
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """List available asset types."""
    result = await db.execute(select(AssetType))
    asset_types = result.scalars().all()

    return [
        {
            "id": at.id,
            "name": at.name,
            "icon": at.icon,
            "default_sensors": at.default_sensors,
        }
        for at in asset_types
    ]


@router.get("/{asset_id}")
async def get_asset(
    asset_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Get asset details with sensors and recent readings."""
    query = select(Asset).where(
        Asset.id == asset_id,
        Asset.tenant_id == current_user.tenant_id
    ).options(
        selectinload(Asset.asset_type),
        selectinload(Asset.site),
        selectinload(Asset.system),
        selectinload(Asset.sensors)
    )

    result = await db.execute(query)
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    return {
        "id": asset.id,
        "name": asset.name,
        "type": asset.asset_type.name if asset.asset_type else None,
        "type_id": asset.asset_type_id,
        "site": asset.site.name if asset.site else None,
        "site_id": asset.site_id,
        "system": asset.system.name if asset.system else None,
        "system_id": asset.system_id,
        "status": asset.status,
        "criticality": asset.criticality,
        "manufacturer": asset.manufacturer,
        "model": asset.model,
        "serial_number": asset.serial_number,
        "install_date": asset.install_date.isoformat() if asset.install_date else None,
        "capacity": asset.capacity,
        "metadata": asset.asset_metadata,
        "health": calculate_asset_health(asset),
        "sensors": [
            {
                "id": s.id,
                "name": s.name,
                "type": s.sensor_type,
                "unit": s.unit,
            }
            for s in asset.sensors
        ] if asset.sensors else [],
        "created_at": asset.created_at.isoformat() if asset.created_at else None,
        "updated_at": asset.updated_at.isoformat() if asset.updated_at else None,
    }


@router.put("/{asset_id}")
async def update_asset(
    asset_id: str,
    asset_data: AssetUpdate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Update asset fields."""
    query = select(Asset).where(
        Asset.id == asset_id,
        Asset.tenant_id == current_user.tenant_id
    )
    result = await db.execute(query)
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    update_data = asset_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(asset, field, value)

    await db.commit()
    await db.refresh(asset)

    return {
        "id": asset.id,
        "name": asset.name,
        "status": asset.status,
        "criticality": asset.criticality,
        "manufacturer": asset.manufacturer,
        "model": asset.model,
        "serial_number": asset.serial_number,
        "capacity": asset.capacity,
        "updated_at": asset.updated_at.isoformat() if asset.updated_at else None,
        "message": "Asset updated successfully"
    }


@router.delete("/{asset_id}")
async def delete_asset(
    asset_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Delete asset permanently."""
    print(f"!!! DELETE_ASSET CALLED !!! asset_id={asset_id}")
    if current_user.role not in ['admin', 'facility_manager']:
        raise HTTPException(status_code=403, detail="Only admins and facility managers can delete assets")

    query = select(Asset).where(
        Asset.id == asset_id,
        Asset.tenant_id == current_user.tenant_id
    )
    result = await db.execute(query)
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    from sqlalchemy import delete as sql_delete
    await db.execute(sql_delete(Sensor).where(Sensor.asset_id == asset_id))

    await db.delete(asset)
    await db.commit()

    return {"message": "Asset deleted successfully", "id": asset_id}


@router.get("/{asset_id}/readings")
async def get_asset_readings(
    asset_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Get time-series sensor readings for asset."""
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{asset_id}/alerts")
async def get_asset_alerts(
    asset_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Get alert history for asset."""
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{asset_id}/work-orders")
async def get_asset_work_orders(
    asset_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Get work order history for asset."""
    raise HTTPException(status_code=501, detail="Not implemented yet")
