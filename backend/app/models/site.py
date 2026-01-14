"""Site model - physical facility location."""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Site(Base):
    """Site represents a physical facility location."""

    __tablename__ = "sites"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    portfolio_id: Mapped[str] = mapped_column(String(36), ForeignKey("portfolios.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    timezone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    facility_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # data_center, factory, office, retail
    square_footage: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    utility_rate: Mapped[Optional[float]] = mapped_column(Numeric(10, 4), nullable=True)  # cost per kWh
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="sites")
    portfolio: Mapped["Portfolio"] = relationship("Portfolio", back_populates="sites")
    systems: Mapped[list["System"]] = relationship("System", back_populates="site", cascade="all, delete-orphan")
    assets: Mapped[list["Asset"]] = relationship("Asset", back_populates="site", cascade="all, delete-orphan")
