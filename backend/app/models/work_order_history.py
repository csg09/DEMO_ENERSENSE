"""WorkOrderHistory model - audit trail for work order changes."""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class WorkOrderHistory(Base):
    """WorkOrderHistory tracks changes to work orders."""

    __tablename__ = "work_order_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    work_order_id: Mapped[str] = mapped_column(String(36), ForeignKey("work_orders.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # created, assigned, status_changed, commented
    old_value: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    work_order: Mapped["WorkOrder"] = relationship("WorkOrder", back_populates="history")
    user: Mapped["User"] = relationship("User", back_populates="work_order_history")
