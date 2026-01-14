"""Alert model - triggered alerts from monitoring."""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Alert(Base):
    """Alert represents a triggered alert from monitoring sensor data."""

    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    asset_id: Mapped[str] = mapped_column(String(36), ForeignKey("assets.id"), nullable=False)
    alert_rule_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("alert_rules.id"), nullable=True)
    sensor_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("sensors.id"), nullable=True)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)  # critical, high, medium, low
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")  # open, acknowledged, in_progress, resolved, closed
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    triggered_value: Mapped[Optional[float]] = mapped_column(Numeric(12, 4), nullable=True)
    triggered_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    acknowledged_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    resolved_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="alerts")
    asset: Mapped["Asset"] = relationship("Asset", back_populates="alerts")
    alert_rule: Mapped[Optional["AlertRule"]] = relationship("AlertRule", back_populates="alerts")
    sensor: Mapped[Optional["Sensor"]] = relationship("Sensor", back_populates="alerts")
    acknowledgments: Mapped[list["AlertAcknowledgment"]] = relationship("AlertAcknowledgment", back_populates="alert", cascade="all, delete-orphan")
    work_orders: Mapped[list["WorkOrder"]] = relationship("WorkOrder", back_populates="alert")
