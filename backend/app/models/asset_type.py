"""AssetType model - defines types of assets (Chiller, AHU, etc.)."""

import uuid
from sqlalchemy import String, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class AssetType(Base):
    """AssetType defines the types of assets available in the system."""

    __tablename__ = "asset_types"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    icon: Mapped[str] = mapped_column(String(50), nullable=True)
    default_sensors: Mapped[list] = mapped_column(JSON, nullable=True)  # Array of sensor configs

    # Relationships
    assets: Mapped[list["Asset"]] = relationship("Asset", back_populates="asset_type")
    alert_rules: Mapped[list["AlertRule"]] = relationship("AlertRule", back_populates="asset_type")
