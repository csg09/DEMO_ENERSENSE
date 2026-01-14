"""Alert management API routes."""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from app.core.database import get_db
from app.api.auth import get_current_user_from_token
from app.models import User, Alert, Asset, AlertAcknowledgment, WorkOrder, AlertRule, AssetType
from app.core.websocket import manager

router = APIRouter()


class AlertCreate(BaseModel):
    title: str
    description: Optional[str] = None
    asset_id: str
    severity: str = "medium"


class AcknowledgeRequest(BaseModel):
    note: Optional[str] = None


class ResolveRequest(BaseModel):
    resolution_notes: Optional[str] = None


class CreateWorkOrderRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: str = "medium"


class CloseAlertRequest(BaseModel):
    note: Optional[str] = None


class AlertRuleCreate(BaseModel):
    name: Optional[str] = None
    asset_type_id: Optional[str] = None
    asset_id: Optional[str] = None
    sensor_type: str
    condition: str  # gt, lt, eq, between
    threshold_value: float
    threshold_value_2: Optional[float] = None
    duration_minutes: int = 15
    severity: str = "medium"


class AlertRuleUpdate(BaseModel):
    name: Optional[str] = None
    asset_type_id: Optional[str] = None
    asset_id: Optional[str] = None
    sensor_type: Optional[str] = None
    condition: Optional[str] = None
    threshold_value: Optional[float] = None
    threshold_value_2: Optional[float] = None
    duration_minutes: Optional[int] = None
    severity: Optional[str] = None
    enabled: Optional[bool] = None


@router.get("")
async def list_alerts(
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """List alerts with optional filters and pagination."""
    # Build base query with filters
    base_query = select(Alert).where(Alert.tenant_id == current_user.tenant_id)

    if severity:
        base_query = base_query.where(Alert.severity == severity)
    if status:
        base_query = base_query.where(Alert.status == status)
    if search:
        base_query = base_query.where(Alert.title.ilike(f"%{search}%"))

    # Get total count
    count_query = select(func.count()).select_from(base_query.subquery())
    count_result = await db.execute(count_query)
    total_count = count_result.scalar() or 0

    # Apply pagination and ordering
    query = base_query.order_by(Alert.triggered_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    alerts = result.scalars().all()

    # Get related data
    items = []
    for alert in alerts:
        # Get asset name
        asset_result = await db.execute(select(Asset).where(Asset.id == alert.asset_id))
        asset = asset_result.scalar_one_or_none()

        # Get acknowledged by user name
        acknowledged_by_name = None
        if alert.acknowledged_by:
            user_result = await db.execute(select(User).where(User.id == alert.acknowledged_by))
            ack_user = user_result.scalar_one_or_none()
            if ack_user:
                acknowledged_by_name = ack_user.name

        items.append({
            "id": alert.id,
            "title": alert.title,
            "description": alert.description,
            "severity": alert.severity,
            "status": alert.status,
            "asset_id": alert.asset_id,
            "asset_name": asset.name if asset else "Unknown",
            "triggered_at": alert.triggered_at.isoformat(),
            "triggered_value": float(alert.triggered_value) if alert.triggered_value else None,
            "acknowledged_at": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
            "acknowledged_by": alert.acknowledged_by,
            "acknowledged_by_name": acknowledged_by_name,
            "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
        })

    return {
        "items": items,
        "total": total_count,
        "skip": skip,
        "limit": limit
    }


# ==================== Alert Rules Endpoints ====================
# IMPORTANT: These must come BEFORE /{alert_id} to avoid route conflicts

@router.get("/rules")
async def list_alert_rules(
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """List alert rules for tenant."""
    result = await db.execute(
        select(AlertRule).where(AlertRule.tenant_id == current_user.tenant_id).order_by(AlertRule.created_at.desc())
    )
    rules = result.scalars().all()

    items = []
    for rule in rules:
        # Get asset type name if applicable
        asset_type_name = None
        if rule.asset_type_id:
            asset_type_result = await db.execute(select(AssetType).where(AssetType.id == rule.asset_type_id))
            asset_type = asset_type_result.scalar_one_or_none()
            if asset_type:
                asset_type_name = asset_type.name

        # Get asset name if applicable
        asset_name = None
        if rule.asset_id:
            asset_result = await db.execute(select(Asset).where(Asset.id == rule.asset_id))
            asset = asset_result.scalar_one_or_none()
            if asset:
                asset_name = asset.name

        items.append({
            "id": rule.id,
            "name": getattr(rule, 'name', None) or f"{rule.sensor_type} {rule.condition} {rule.threshold_value}",
            "asset_type_id": rule.asset_type_id,
            "asset_type_name": asset_type_name,
            "asset_id": rule.asset_id,
            "asset_name": asset_name,
            "sensor_type": rule.sensor_type,
            "condition": rule.condition,
            "threshold_value": float(rule.threshold_value),
            "threshold_value_2": float(rule.threshold_value_2) if rule.threshold_value_2 else None,
            "duration_minutes": rule.duration_minutes,
            "severity": rule.severity,
            "enabled": rule.enabled,
            "created_at": rule.created_at.isoformat(),
            "updated_at": rule.updated_at.isoformat() if rule.updated_at else None,
        })

    return items


@router.post("/rules")
async def create_alert_rule(
    data: AlertRuleCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Create custom alert rule."""
    # Validate condition
    valid_conditions = ["gt", "lt", "eq", "between", "gte", "lte"]
    if data.condition not in valid_conditions:
        raise HTTPException(status_code=400, detail=f"Invalid condition. Must be one of: {valid_conditions}")

    # Validate severity
    valid_severities = ["critical", "high", "medium", "low"]
    if data.severity not in valid_severities:
        raise HTTPException(status_code=400, detail=f"Invalid severity. Must be one of: {valid_severities}")

    # Validate between condition has second threshold
    if data.condition == "between" and data.threshold_value_2 is None:
        raise HTTPException(status_code=400, detail="Between condition requires threshold_value_2")

    rule = AlertRule(
        tenant_id=current_user.tenant_id,
        asset_type_id=data.asset_type_id,
        asset_id=data.asset_id,
        sensor_type=data.sensor_type,
        condition=data.condition,
        threshold_value=data.threshold_value,
        threshold_value_2=data.threshold_value_2,
        duration_minutes=data.duration_minutes,
        severity=data.severity,
        enabled=True,
    )

    db.add(rule)
    await db.commit()
    await db.refresh(rule)

    return {
        "id": rule.id,
        "name": data.name or f"{rule.sensor_type} {rule.condition} {rule.threshold_value}",
        "sensor_type": rule.sensor_type,
        "condition": rule.condition,
        "threshold_value": float(rule.threshold_value),
        "threshold_value_2": float(rule.threshold_value_2) if rule.threshold_value_2 else None,
        "duration_minutes": rule.duration_minutes,
        "severity": rule.severity,
        "enabled": rule.enabled,
        "created_at": rule.created_at.isoformat(),
    }


@router.get("/rules/{rule_id}")
async def get_alert_rule(
    rule_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Get a single alert rule."""
    result = await db.execute(
        select(AlertRule).where(
            AlertRule.id == rule_id,
            AlertRule.tenant_id == current_user.tenant_id
        )
    )
    rule = result.scalar_one_or_none()

    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")

    return {
        "id": rule.id,
        "name": getattr(rule, 'name', None) or f"{rule.sensor_type} {rule.condition} {rule.threshold_value}",
        "asset_type_id": rule.asset_type_id,
        "asset_id": rule.asset_id,
        "sensor_type": rule.sensor_type,
        "condition": rule.condition,
        "threshold_value": float(rule.threshold_value),
        "threshold_value_2": float(rule.threshold_value_2) if rule.threshold_value_2 else None,
        "duration_minutes": rule.duration_minutes,
        "severity": rule.severity,
        "enabled": rule.enabled,
        "created_at": rule.created_at.isoformat(),
        "updated_at": rule.updated_at.isoformat() if rule.updated_at else None,
    }


@router.put("/rules/{rule_id}")
async def update_alert_rule(
    rule_id: str,
    data: AlertRuleUpdate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Update alert rule."""
    result = await db.execute(
        select(AlertRule).where(
            AlertRule.id == rule_id,
            AlertRule.tenant_id == current_user.tenant_id
        )
    )
    rule = result.scalar_one_or_none()

    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")

    # Update fields if provided
    if data.sensor_type is not None:
        rule.sensor_type = data.sensor_type
    if data.condition is not None:
        valid_conditions = ["gt", "lt", "eq", "between", "gte", "lte"]
        if data.condition not in valid_conditions:
            raise HTTPException(status_code=400, detail=f"Invalid condition. Must be one of: {valid_conditions}")
        rule.condition = data.condition
    if data.threshold_value is not None:
        rule.threshold_value = data.threshold_value
    if data.threshold_value_2 is not None:
        rule.threshold_value_2 = data.threshold_value_2
    if data.duration_minutes is not None:
        rule.duration_minutes = data.duration_minutes
    if data.severity is not None:
        valid_severities = ["critical", "high", "medium", "low"]
        if data.severity not in valid_severities:
            raise HTTPException(status_code=400, detail=f"Invalid severity. Must be one of: {valid_severities}")
        rule.severity = data.severity
    if data.enabled is not None:
        rule.enabled = data.enabled
    if data.asset_type_id is not None:
        rule.asset_type_id = data.asset_type_id
    if data.asset_id is not None:
        rule.asset_id = data.asset_id

    await db.commit()
    await db.refresh(rule)

    return {
        "id": rule.id,
        "name": getattr(rule, 'name', None) or f"{rule.sensor_type} {rule.condition} {rule.threshold_value}",
        "sensor_type": rule.sensor_type,
        "condition": rule.condition,
        "threshold_value": float(rule.threshold_value),
        "threshold_value_2": float(rule.threshold_value_2) if rule.threshold_value_2 else None,
        "duration_minutes": rule.duration_minutes,
        "severity": rule.severity,
        "enabled": rule.enabled,
        "updated_at": rule.updated_at.isoformat() if rule.updated_at else None,
    }


@router.delete("/rules/{rule_id}")
async def delete_alert_rule(
    rule_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Delete alert rule."""
    result = await db.execute(
        select(AlertRule).where(
            AlertRule.id == rule_id,
            AlertRule.tenant_id == current_user.tenant_id
        )
    )
    rule = result.scalar_one_or_none()

    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")

    await db.delete(rule)
    await db.commit()

    return {"message": "Alert rule deleted", "id": rule_id}


# ==================== Single Alert Endpoints ====================

@router.get("/{alert_id}")
async def get_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Get alert details."""
    result = await db.execute(
        select(Alert).where(
            Alert.id == alert_id,
            Alert.tenant_id == current_user.tenant_id
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Get asset
    asset_result = await db.execute(select(Asset).where(Asset.id == alert.asset_id))
    asset = asset_result.scalar_one_or_none()

    # Get acknowledged by user name
    acknowledged_by_name = None
    if alert.acknowledged_by:
        user_result = await db.execute(select(User).where(User.id == alert.acknowledged_by))
        ack_user = user_result.scalar_one_or_none()
        if ack_user:
            acknowledged_by_name = ack_user.name

    return {
        "id": alert.id,
        "title": alert.title,
        "description": alert.description,
        "severity": alert.severity,
        "status": alert.status,
        "asset_id": alert.asset_id,
        "asset_name": asset.name if asset else "Unknown",
        "triggered_at": alert.triggered_at.isoformat(),
        "triggered_value": float(alert.triggered_value) if alert.triggered_value else None,
        "acknowledged_at": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
        "acknowledged_by": alert.acknowledged_by,
        "acknowledged_by_name": acknowledged_by_name,
        "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
        "resolution_notes": alert.resolution_notes,
    }


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    data: AcknowledgeRequest = AcknowledgeRequest(),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Acknowledge an alert."""
    result = await db.execute(
        select(Alert).where(
            Alert.id == alert_id,
            Alert.tenant_id == current_user.tenant_id
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Update alert status
    alert.status = "acknowledged"
    alert.acknowledged_at = datetime.utcnow()
    alert.acknowledged_by = current_user.id

    # Create acknowledgment record
    acknowledgment = AlertAcknowledgment(
        alert_id=alert.id,
        user_id=current_user.id,
        acknowledged_at=datetime.utcnow(),
        note=data.note
    )
    db.add(acknowledgment)

    await db.commit()
    await db.refresh(alert)

    return {
        "message": "Alert acknowledged",
        "id": alert.id,
        "status": alert.status,
        "acknowledged_at": alert.acknowledged_at.isoformat(),
        "acknowledged_by": current_user.name
    }


@router.post("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    data: ResolveRequest = ResolveRequest(),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Manually resolve an alert."""
    result = await db.execute(
        select(Alert).where(
            Alert.id == alert_id,
            Alert.tenant_id == current_user.tenant_id
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = "resolved"
    alert.resolved_at = datetime.utcnow()
    alert.resolved_by = current_user.id
    if data.resolution_notes:
        alert.resolution_notes = data.resolution_notes

    await db.commit()
    await db.refresh(alert)

    return {
        "message": "Alert resolved",
        "id": alert.id,
        "status": alert.status,
        "resolved_at": alert.resolved_at.isoformat()
    }


@router.post("")
async def create_alert(
    data: AlertCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Create a new alert (for testing purposes)."""
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

    alert = Alert(
        tenant_id=current_user.tenant_id,
        asset_id=data.asset_id,
        title=data.title,
        description=data.description,
        severity=data.severity,
        status="open",
        triggered_at=datetime.utcnow(),
    )

    db.add(alert)
    await db.commit()
    await db.refresh(alert)

    alert_data = {
        "id": alert.id,
        "title": alert.title,
        "description": alert.description,
        "severity": alert.severity,
        "status": alert.status,
        "asset_id": alert.asset_id,
        "asset_name": asset.name,
        "triggered_at": alert.triggered_at.isoformat(),
    }

    # Broadcast new alert via WebSocket
    await manager.broadcast_alert(current_user.tenant_id, alert_data)

    return alert_data


@router.post("/{alert_id}/create-work-order")
async def create_work_order_from_alert(
    alert_id: str,
    data: CreateWorkOrderRequest = CreateWorkOrderRequest(),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Create work order from alert."""
    result = await db.execute(
        select(Alert).where(
            Alert.id == alert_id,
            Alert.tenant_id == current_user.tenant_id
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Get asset for title
    asset_result = await db.execute(select(Asset).where(Asset.id == alert.asset_id))
    asset = asset_result.scalar_one_or_none()

    # Create work order
    wo_title = data.title or f"Alert: {alert.title}"
    wo_description = data.description or f"Work order created from alert: {alert.description or alert.title}"

    work_order = WorkOrder(
        tenant_id=current_user.tenant_id,
        asset_id=alert.asset_id,
        alert_id=alert.id,
        title=wo_title,
        description=wo_description,
        type="reactive",
        priority=data.priority,
        status="open",
        created_by=current_user.id,
    )

    db.add(work_order)

    # Update alert status to in_progress
    alert.status = "in_progress"

    await db.commit()
    await db.refresh(work_order)

    return {
        "message": "Work order created from alert",
        "work_order_id": work_order.id,
        "work_order_title": work_order.title,
        "alert_id": alert.id,
        "alert_status": alert.status,
    }


@router.post("/{alert_id}/close")
async def close_alert(
    alert_id: str,
    data: CloseAlertRequest = CloseAlertRequest(),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db)
):
    """Close an alert (final state)."""
    result = await db.execute(
        select(Alert).where(
            Alert.id == alert_id,
            Alert.tenant_id == current_user.tenant_id
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Only resolved alerts can be closed
    if alert.status not in ["resolved", "acknowledged", "in_progress"]:
        raise HTTPException(status_code=400, detail="Alert must be resolved before closing")

    alert.status = "closed"
    if data.note:
        existing_notes = alert.resolution_notes or ""
        alert.resolution_notes = f"{existing_notes}\nClosed: {data.note}".strip()

    await db.commit()
    await db.refresh(alert)

    return {
        "message": "Alert closed",
        "id": alert.id,
        "status": alert.status,
    }
