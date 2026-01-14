"""Portfolio management API routes."""

# Portfolio management API - fully implemented

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from app.core.database import get_db
from app.api.auth import get_current_user_from_token
from app.models import User, Portfolio, Site

router = APIRouter()


class PortfolioCreate(BaseModel):
    name: str
    description: Optional[str] = None


class PortfolioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


@router.get("")
async def list_portfolios(
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """List all portfolios for the tenant."""
    query = select(Portfolio).where(Portfolio.tenant_id == current_user.tenant_id)

    if search:
        query = query.where(Portfolio.name.ilike(f"%{search}%"))

    query = query.order_by(Portfolio.name)

    result = await db.execute(query)
    portfolios = result.scalars().all()

    response = []
    for portfolio in portfolios:
        # Count sites
        count_result = await db.execute(
            select(func.count()).select_from(Site).where(Site.portfolio_id == portfolio.id)
        )
        site_count = count_result.scalar() or 0

        response.append({
            "id": portfolio.id,
            "name": portfolio.name,
            "description": portfolio.description,
            "site_count": site_count,
            "created_at": portfolio.created_at.isoformat(),
            "updated_at": portfolio.updated_at.isoformat(),
        })

    return response


@router.get("/{portfolio_id}")
async def get_portfolio(
    portfolio_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Get portfolio details with sites."""
    result = await db.execute(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.tenant_id == current_user.tenant_id
        )
    )
    portfolio = result.scalar_one_or_none()

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Get sites
    sites_result = await db.execute(
        select(Site).where(Site.portfolio_id == portfolio.id).order_by(Site.name)
    )
    sites = sites_result.scalars().all()

    sites_list = []
    for site in sites:
        sites_list.append({
            "id": site.id,
            "name": site.name,
            "facility_type": site.facility_type,
            "address": site.address,
        })

    return {
        "id": portfolio.id,
        "name": portfolio.name,
        "description": portfolio.description,
        "sites": sites_list,
        "site_count": len(sites_list),
        "created_at": portfolio.created_at.isoformat(),
        "updated_at": portfolio.updated_at.isoformat(),
    }


@router.post("")
async def create_portfolio(
    data: PortfolioCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Create a new portfolio."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create portfolios")

    portfolio = Portfolio(
        tenant_id=current_user.tenant_id,
        name=data.name,
        description=data.description,
    )

    db.add(portfolio)
    await db.commit()
    await db.refresh(portfolio)

    return {
        "id": portfolio.id,
        "name": portfolio.name,
        "description": portfolio.description,
        "site_count": 0,
        "created_at": portfolio.created_at.isoformat(),
        "updated_at": portfolio.updated_at.isoformat(),
    }


@router.put("/{portfolio_id}")
async def update_portfolio(
    portfolio_id: str,
    data: PortfolioUpdate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Update portfolio."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update portfolios")

    result = await db.execute(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.tenant_id == current_user.tenant_id
        )
    )
    portfolio = result.scalar_one_or_none()

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    if data.name is not None:
        portfolio.name = data.name
    if data.description is not None:
        portfolio.description = data.description

    portfolio.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(portfolio)

    count_result = await db.execute(
        select(func.count()).select_from(Site).where(Site.portfolio_id == portfolio.id)
    )
    site_count = count_result.scalar() or 0

    return {
        "id": portfolio.id,
        "name": portfolio.name,
        "description": portfolio.description,
        "site_count": site_count,
        "created_at": portfolio.created_at.isoformat(),
        "updated_at": portfolio.updated_at.isoformat(),
    }


@router.delete("/{portfolio_id}")
async def delete_portfolio(
    portfolio_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Delete portfolio if empty (no sites)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete portfolios")

    result = await db.execute(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.tenant_id == current_user.tenant_id
        )
    )
    portfolio = result.scalar_one_or_none()

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    count_result = await db.execute(
        select(func.count()).select_from(Site).where(Site.portfolio_id == portfolio.id)
    )
    site_count = count_result.scalar() or 0

    if site_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete portfolio with {site_count} sites. Remove all sites first."
        )

    await db.delete(portfolio)
    await db.commit()

    return {"message": "Portfolio deleted successfully", "id": portfolio_id}
