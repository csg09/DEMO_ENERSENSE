"""ActivityLog model - audit trail for all significant actions."""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ActivityLog(Base):
    """ActivityLog records significant actions for auditing."""

    __tablename__ = "activity_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)  # asset, alert, work_order, user
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="activity_logs")
    user: Mapped["User"] = relationship("User", back_populates="activity_logs")
