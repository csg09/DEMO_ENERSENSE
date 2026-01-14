"""Sensor model - data collection points on assets."""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Sensor(Base):
    """Sensor represents a data collection point on an asset."""

    __tablename__ = "sensors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    asset_id: Mapped[str] = mapped_column(String(36), ForeignKey("assets.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sensor_type: Mapped[str] = mapped_column(String(50), nullable=False)  # temperature, power, flow, pressure, humidity, runtime
    unit: Mapped[str] = mapped_column(String(20), nullable=False)  # F, C, kW, GPM, PSI, %, hours
    min_value: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    max_value: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    asset: Mapped["Asset"] = relationship("Asset", back_populates="sensors")
    readings: Mapped[list["SensorReading"]] = relationship("SensorReading", back_populates="sensor", cascade="all, delete-orphan")
    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="sensor")
