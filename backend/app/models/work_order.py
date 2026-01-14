"""WorkOrder model - maintenance task management."""

import uuid
from datetime import datetime, date
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text, Date, Numeric, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class WorkOrder(Base):
    """WorkOrder represents a maintenance task."""

    __tablename__ = "work_orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    asset_id: Mapped[str] = mapped_column(String(36), ForeignKey("assets.id"), nullable=False)
    alert_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("alerts.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="reactive")  # reactive, preventive, inspection, corrective
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")  # critical, high, medium, low
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")  # open, assigned, in_progress, on_hold, completed, closed, cancelled
    assigned_to: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    time_spent_hours: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True)
    parts_used: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    follow_up_required: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="work_orders")
    asset: Mapped["Asset"] = relationship("Asset", back_populates="work_orders")
    alert: Mapped[Optional["Alert"]] = relationship("Alert", back_populates="work_orders")
    assigned_user: Mapped[Optional["User"]] = relationship("User", back_populates="assigned_work_orders", foreign_keys=[assigned_to])
    creator: Mapped["User"] = relationship("User", back_populates="created_work_orders", foreign_keys=[created_by])
    history: Mapped[list["WorkOrderHistory"]] = relationship("WorkOrderHistory", back_populates="work_order", cascade="all, delete-orphan")
