"""Work order management API routes with lifecycle support."""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from app.core.database import get_db
from app.api.auth import get_current_user_from_token
from app.models import User, WorkOrder, Asset
from app.models.work_order_history import WorkOrderHistory

router = APIRouter()


class WorkOrderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    asset_id: str
    priority: str = "medium"
    type: str = "reactive"
    due_date: Optional[str] = None


class WorkOrderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None
    resolution_notes: Optional[str] = None


class WorkOrderAssign(BaseModel):
    assigned_to: str


class WorkOrderStatusChange(BaseModel):
    status: str
    note: Optional[str] = None
    resolution_notes: Optional[str] = None
    time_spent: Optional[float] = None


async def add_history_entry(db: AsyncSession, work_order_id: str, user_id: str,
                           action: str, old_value: str = None, new_value: str = None, note: str = None):
    """Add a history entry for work order changes."""
    history = WorkOrderHistory(
        work_order_id=work_order_id,
        user_id=user_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
        note=note,
    )
    db.add(history)


@router.get("")
async def list_work_orders(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None, description="Field to sort by: due_date, created_at, priority, status"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc or desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """List work orders with optional filters, sorting, and pagination."""
    base_query = select(WorkOrder).where(WorkOrder.tenant_id == current_user.tenant_id)
    count_query = select(func.count()).select_from(WorkOrder).where(WorkOrder.tenant_id == current_user.tenant_id)

    if status:
        base_query = base_query.where(WorkOrder.status == status)
        count_query = count_query.where(WorkOrder.status == status)
    if priority:
        base_query = base_query.where(WorkOrder.priority == priority)
        count_query = count_query.where(WorkOrder.priority == priority)
    if search:
        base_query = base_query.where(WorkOrder.title.ilike(f"%{search}%"))
        count_query = count_query.where(WorkOrder.title.ilike(f"%{search}%"))

    # Get total count
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Apply sorting
    sort_column = WorkOrder.created_at  # Default
    if sort_by == "due_date":
        sort_column = WorkOrder.due_date
    elif sort_by == "priority":
        sort_column = WorkOrder.priority
    elif sort_by == "status":
        sort_column = WorkOrder.status
    elif sort_by == "title":
        sort_column = WorkOrder.title

    if sort_order == "asc":
        base_query = base_query.order_by(sort_column.asc().nullslast())
    else:
        base_query = base_query.order_by(sort_column.desc().nullslast())

    # Apply pagination
    base_query = base_query.offset(skip).limit(limit)

    result = await db.execute(base_query)
    work_orders = result.scalars().all()

    # Get related data
    items = []
    for wo in work_orders:
        # Get asset name
        asset_result = await db.execute(select(Asset).where(Asset.id == wo.asset_id))
        asset = asset_result.scalar_one_or_none()

        # Get assigned user name
        assigned_name = None
        if wo.assigned_to:
            assigned_result = await db.execute(select(User).where(User.id == wo.assigned_to))
            assigned_user = assigned_result.scalar_one_or_none()
            if assigned_user:
                assigned_name = assigned_user.name

        # Get completed by user name
        completed_by_name = None
        if wo.completed_by:
            completed_by_result = await db.execute(select(User).where(User.id == wo.completed_by))
            completed_by_user = completed_by_result.scalar_one_or_none()
            if completed_by_user:
                completed_by_name = completed_by_user.name

        items.append({
            "id": wo.id,
            "title": wo.title,
            "description": wo.description,
            "type": wo.type,
            "priority": wo.priority,
            "status": wo.status,
            "asset_id": wo.asset_id,
            "asset_name": asset.name if asset else "Unknown",
            "assigned_to": wo.assigned_to,
            "assigned_name": assigned_name,
            "due_date": wo.due_date.isoformat() if wo.due_date else None,
            "created_at": wo.created_at.isoformat(),
            "completed_at": wo.completed_at.isoformat() if wo.completed_at else None,
            "completed_by": wo.completed_by,
            "completed_by_name": completed_by_name,
            "resolution_notes": wo.resolution_notes,
        })

    return {"items": items, "total": total}


@router.get("/users")
async def list_assignable_users(
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """List users who can be assigned to work orders (technicians and facility managers)."""
    result = await db.execute(
        select(User).where(
            User.tenant_id == current_user.tenant_id,
            User.role.in_(["technician", "facility_manager", "admin"]),
            User.status == "active"
        )
    )
    users = result.scalars().all()
    return [{"id": u.id, "name": u.name, "role": u.role} for u in users]


@router.post("")
async def create_work_order(
    data: WorkOrderCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Create a new work order."""
    # Verify asset exists and belongs to tenant
    asset_result = await db.execute(
        select(Asset).where(
            Asset.id == data.asset_id,
            Asset.tenant_id == current_user.tenant_id
        )
    )
    asset = asset_result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Parse due_date if provided
    due_date = None
    if data.due_date:
        try:
            due_date = datetime.fromisoformat(data.due_date).date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid due_date format")

    work_order = WorkOrder(
        tenant_id=current_user.tenant_id,
        asset_id=data.asset_id,
        title=data.title,
        description=data.description,
        type=data.type,
        priority=data.priority,
        status="open",
        created_by=current_user.id,
        due_date=due_date,
    )

    db.add(work_order)
    await db.flush()  # Get the ID before adding history

    # Add creation history
    await add_history_entry(db, work_order.id, current_user.id, "created",
                           new_value="open", note=f"Work order created: {data.title}")

    await db.commit()
    await db.refresh(work_order)

    return {
        "id": work_order.id,
        "title": work_order.title,
        "description": work_order.description,
        "type": work_order.type,
        "priority": work_order.priority,
        "status": work_order.status,
        "asset_id": work_order.asset_id,
        "asset_name": asset.name,
        "due_date": work_order.due_date.isoformat() if work_order.due_date else None,
        "created_at": work_order.created_at.isoformat(),
    }


@router.get("/{work_order_id}")
async def get_work_order(
    work_order_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Get work order details with history."""
    result = await db.execute(
        select(WorkOrder).where(
            WorkOrder.id == work_order_id,
            WorkOrder.tenant_id == current_user.tenant_id
        )
    )
    work_order = result.scalar_one_or_none()

    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")

    # Get asset
    asset_result = await db.execute(select(Asset).where(Asset.id == work_order.asset_id))
    asset = asset_result.scalar_one_or_none()

    # Get assigned user
    assigned_name = None
    if work_order.assigned_to:
        assigned_result = await db.execute(select(User).where(User.id == work_order.assigned_to))
        assigned_user = assigned_result.scalar_one_or_none()
        if assigned_user:
            assigned_name = assigned_user.name

    # Get creator
    creator_result = await db.execute(select(User).where(User.id == work_order.created_by))
    creator = creator_result.scalar_one_or_none()

    # Get history
    history_result = await db.execute(
        select(WorkOrderHistory)
        .where(WorkOrderHistory.work_order_id == work_order_id)
        .order_by(WorkOrderHistory.created_at.desc())
    )
    history_entries = history_result.scalars().all()

    history = []
    for entry in history_entries:
        user_result = await db.execute(select(User).where(User.id == entry.user_id))
        user = user_result.scalar_one_or_none()
        history.append({
            "id": entry.id,
            "action": entry.action,
            "old_value": entry.old_value,
            "new_value": entry.new_value,
            "note": entry.note,
            "user_name": user.name if user else "Unknown",
            "created_at": entry.created_at.isoformat(),
        })

    return {
        "id": work_order.id,
        "title": work_order.title,
        "description": work_order.description,
        "type": work_order.type,
        "priority": work_order.priority,
        "status": work_order.status,
        "asset_id": work_order.asset_id,
        "asset_name": asset.name if asset else "Unknown",
        "assigned_to": work_order.assigned_to,
        "assigned_name": assigned_name,
        "created_by": work_order.created_by,
        "created_by_name": creator.name if creator else "Unknown",
        "resolution_notes": work_order.resolution_notes,
        "completed_at": work_order.completed_at.isoformat() if work_order.completed_at else None,
        "due_date": work_order.due_date.isoformat() if work_order.due_date else None,
        "created_at": work_order.created_at.isoformat(),
        "updated_at": work_order.updated_at.isoformat() if work_order.updated_at else None,
        "history": history,
    }


@router.post("/{work_order_id}/assign")
async def assign_work_order(
    work_order_id: str,
    data: WorkOrderAssign,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Assign work order to a user."""
    if current_user.role not in ["admin", "facility_manager"]:
        raise HTTPException(status_code=403, detail="Only admins and facility managers can assign work orders")

    result = await db.execute(
        select(WorkOrder).where(
            WorkOrder.id == work_order_id,
            WorkOrder.tenant_id == current_user.tenant_id
        )
    )
    work_order = result.scalar_one_or_none()

    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")

    # Verify assignee exists
    assignee_result = await db.execute(
        select(User).where(
            User.id == data.assigned_to,
            User.tenant_id == current_user.tenant_id
        )
    )
    assignee = assignee_result.scalar_one_or_none()
    if not assignee:
        raise HTTPException(status_code=404, detail="User not found")

    old_status = work_order.status
    old_assigned = work_order.assigned_to

    work_order.assigned_to = data.assigned_to
    if work_order.status == "open":
        work_order.status = "assigned"

    await add_history_entry(db, work_order_id, current_user.id, "assigned",
                           old_value=old_assigned, new_value=data.assigned_to,
                           note=f"Assigned to {assignee.name}")

    if old_status != work_order.status:
        await add_history_entry(db, work_order_id, current_user.id, "status_changed",
                               old_value=old_status, new_value=work_order.status)

    await db.commit()
    await db.refresh(work_order)

    return {"message": "Work order assigned", "id": work_order.id, "status": work_order.status}


@router.post("/{work_order_id}/status")
async def change_work_order_status(
    work_order_id: str,
    data: WorkOrderStatusChange,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Change work order status."""
    result = await db.execute(
        select(WorkOrder).where(
            WorkOrder.id == work_order_id,
            WorkOrder.tenant_id == current_user.tenant_id
        )
    )
    work_order = result.scalar_one_or_none()

    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")

    # Valid status transitions
    valid_statuses = ["open", "assigned", "in_progress", "on_hold", "completed", "closed", "cancelled"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    # Only admins can close work orders
    if data.status == "closed" and current_user.role not in ["admin", "facility_manager"]:
        raise HTTPException(status_code=403, detail="Only admins and facility managers can close work orders")

    old_status = work_order.status
    work_order.status = data.status

    # Handle completion - require resolution notes and time spent
    if data.status == "completed":
        # Validate required fields for completion
        if not data.resolution_notes or len(data.resolution_notes) < 50:
            raise HTTPException(status_code=400, detail="Resolution notes must be at least 50 characters")
        if data.time_spent is None or data.time_spent <= 0:
            raise HTTPException(status_code=400, detail="Time spent must be provided and greater than 0")

        work_order.completed_at = datetime.utcnow()
        work_order.completed_by = current_user.id
        work_order.resolution_notes = data.resolution_notes
        work_order.time_spent_hours = data.time_spent

    # Add history entry
    await add_history_entry(db, work_order_id, current_user.id, "status_changed",
                           old_value=old_status, new_value=data.status, note=data.note)

    await db.commit()
    await db.refresh(work_order)

    return {"message": f"Status changed to {data.status}", "id": work_order.id, "status": work_order.status}


@router.put("/{work_order_id}")
async def update_work_order(
    work_order_id: str,
    data: WorkOrderUpdate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Update work order."""
    result = await db.execute(
        select(WorkOrder).where(
            WorkOrder.id == work_order_id,
            WorkOrder.tenant_id == current_user.tenant_id
        )
    )
    work_order = result.scalar_one_or_none()

    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")

    if data.title is not None:
        work_order.title = data.title
    if data.description is not None:
        work_order.description = data.description
    if data.priority is not None:
        work_order.priority = data.priority
    if data.status is not None:
        old_status = work_order.status
        work_order.status = data.status
        await add_history_entry(db, work_order_id, current_user.id, "status_changed",
                               old_value=old_status, new_value=data.status)
    if data.resolution_notes is not None:
        work_order.resolution_notes = data.resolution_notes
    if data.due_date is not None:
        try:
            work_order.due_date = datetime.fromisoformat(data.due_date).date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid due_date format")

    await db.commit()
    await db.refresh(work_order)

    return {"message": "Work order updated", "id": work_order.id}


@router.delete("/{work_order_id}")
async def delete_work_order(
    work_order_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Delete/cancel work order."""
    result = await db.execute(
        select(WorkOrder).where(
            WorkOrder.id == work_order_id,
            WorkOrder.tenant_id == current_user.tenant_id
        )
    )
    work_order = result.scalar_one_or_none()

    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")

    await db.delete(work_order)
    await db.commit()

    return {"message": "Work order deleted", "id": work_order_id}
