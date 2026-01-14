"""Portfolio model - top level of asset hierarchy."""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Portfolio(Base):
    """Portfolio represents a top-level grouping of sites (typically one per tenant)."""

    __tablename__ = "portfolios"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="portfolios")
    sites: Mapped[list["Site"]] = relationship("Site", back_populates="portfolio", cascade="all, delete-orphan")
