"""Asset model - individual equipment being monitored."""

import uuid
from datetime import datetime, date
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text, Date, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Asset(Base):
    """Asset represents individual equipment being monitored (Chiller-01, AHU-101, etc.)."""

    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    site_id: Mapped[str] = mapped_column(String(36), ForeignKey("sites.id"), nullable=False)
    system_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("systems.id"), nullable=True)
    asset_type_id: Mapped[str] = mapped_column(String(36), ForeignKey("asset_types.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")  # active, inactive, maintenance
    criticality: Mapped[str] = mapped_column(String(50), nullable=False, default="medium")  # critical, high, medium, low
    manufacturer: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    serial_number: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    install_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    capacity: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    asset_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="assets")
    site: Mapped["Site"] = relationship("Site", back_populates="assets")
    system: Mapped[Optional["System"]] = relationship("System", back_populates="assets")
    asset_type: Mapped["AssetType"] = relationship("AssetType", back_populates="assets")
    sensors: Mapped[list["Sensor"]] = relationship("Sensor", back_populates="asset", cascade="all, delete-orphan")
    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="asset", cascade="all, delete-orphan")
    work_orders: Mapped[list["WorkOrder"]] = relationship("WorkOrder", back_populates="asset", cascade="all, delete-orphan")
