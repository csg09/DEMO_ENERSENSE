"""AlertRule model - defines conditions for triggering alerts."""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Numeric, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class AlertRule(Base):
    """AlertRule defines conditions for triggering alerts based on sensor data."""

    __tablename__ = "alert_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    asset_type_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("asset_types.id"), nullable=True)  # For type-wide rules
    asset_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("assets.id"), nullable=True)  # For asset-specific rules
    sensor_type: Mapped[str] = mapped_column(String(50), nullable=False)
    condition: Mapped[str] = mapped_column(String(20), nullable=False)  # gt, lt, eq, between
    threshold_value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    threshold_value_2: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)  # For between condition
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")  # critical, high, medium, low
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="alert_rules")
    asset_type: Mapped[Optional["AssetType"]] = relationship("AssetType", back_populates="alert_rules")
    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="alert_rule")
