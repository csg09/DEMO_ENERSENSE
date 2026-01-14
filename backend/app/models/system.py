"""System model - optional logical grouping within a site."""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class System(Base):
    """System represents an optional logical grouping within a site (e.g., Cooling Plant, HVAC Floor 1)."""

    __tablename__ = "systems"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    site_id: Mapped[str] = mapped_column(String(36), ForeignKey("sites.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="systems")
    site: Mapped["Site"] = relationship("Site", back_populates="systems")
    assets: Mapped[list["Asset"]] = relationship("Asset", back_populates="system", cascade="all, delete-orphan")
