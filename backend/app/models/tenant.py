"""Tenant model for multi-tenancy."""

import uuid
from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Tenant(Base):
    """Tenant represents an organization in the multi-tenant system."""

    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    industry: Mapped[str] = mapped_column(String(50), nullable=False)  # data_center, manufacturing, commercial_real_estate
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="UTC")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    users: Mapped[list["User"]] = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    portfolios: Mapped[list["Portfolio"]] = relationship("Portfolio", back_populates="tenant", cascade="all, delete-orphan")
    sites: Mapped[list["Site"]] = relationship("Site", back_populates="tenant", cascade="all, delete-orphan")
    systems: Mapped[list["System"]] = relationship("System", back_populates="tenant", cascade="all, delete-orphan")
    assets: Mapped[list["Asset"]] = relationship("Asset", back_populates="tenant", cascade="all, delete-orphan")
    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="tenant", cascade="all, delete-orphan")
    alert_rules: Mapped[list["AlertRule"]] = relationship("AlertRule", back_populates="tenant", cascade="all, delete-orphan")
    work_orders: Mapped[list["WorkOrder"]] = relationship("WorkOrder", back_populates="tenant", cascade="all, delete-orphan")
    activity_logs: Mapped[list["ActivityLog"]] = relationship("ActivityLog", back_populates="tenant", cascade="all, delete-orphan")
