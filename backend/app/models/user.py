"""User model for authentication and authorization."""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class User(Base):
    """User represents a person who can access the system."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # admin, facility_manager, technician, executive
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")  # active, inactive, pending_invite
    invite_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    invite_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    notification_preferences: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="users")
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    acknowledged_alerts: Mapped[list["AlertAcknowledgment"]] = relationship("AlertAcknowledgment", back_populates="user")
    assigned_work_orders: Mapped[list["WorkOrder"]] = relationship(
        "WorkOrder", back_populates="assigned_user", foreign_keys="WorkOrder.assigned_to"
    )
    created_work_orders: Mapped[list["WorkOrder"]] = relationship(
        "WorkOrder", back_populates="creator", foreign_keys="WorkOrder.created_by"
    )
    work_order_history: Mapped[list["WorkOrderHistory"]] = relationship("WorkOrderHistory", back_populates="user")
    activity_logs: Mapped[list["ActivityLog"]] = relationship("ActivityLog", back_populates="user")
