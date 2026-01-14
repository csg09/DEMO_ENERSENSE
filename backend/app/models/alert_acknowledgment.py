"""AlertAcknowledgment model - tracks who acknowledged alerts."""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class AlertAcknowledgment(Base):
    """AlertAcknowledgment tracks users who acknowledged an alert."""

    __tablename__ = "alert_acknowledgments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    alert_id: Mapped[str] = mapped_column(String(36), ForeignKey("alerts.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    acknowledged_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    alert: Mapped["Alert"] = relationship("Alert", back_populates="acknowledgments")
    user: Mapped["User"] = relationship("User", back_populates="acknowledged_alerts")
