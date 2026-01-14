"""SensorReading model - time-series sensor data."""

import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Numeric, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class SensorReading(Base):
    """SensorReading stores time-series data from sensors."""

    __tablename__ = "sensor_readings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sensor_id: Mapped[str] = mapped_column(String(36), ForeignKey("sensors.id"), nullable=False)
    value: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    sensor: Mapped["Sensor"] = relationship("Sensor", back_populates="readings")

    # Index for efficient time-series queries
    __table_args__ = (
        Index("ix_sensor_readings_sensor_timestamp", "sensor_id", "timestamp"),
    )
