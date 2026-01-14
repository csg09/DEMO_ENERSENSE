"""Seed database with demo data."""

import asyncio
import uuid
from datetime import datetime, date, timedelta
import random

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import async_session_maker, create_tables
from app.core.security import get_password_hash
from app.models import (
    Tenant, User, Portfolio, Site, System, AssetType, Asset, Sensor
)


async def seed_asset_types(db: AsyncSession) -> dict[str, AssetType]:
    """Create default asset types."""
    asset_types = {}

    type_configs = [
        {"name": "Chiller", "icon": "snowflake", "default_sensors": [
            {"type": "temperature", "name": "Supply Temp", "unit": "F"},
            {"type": "temperature", "name": "Return Temp", "unit": "F"},
            {"type": "power", "name": "Power", "unit": "kW"},
        ]},
        {"name": "AHU", "icon": "wind", "default_sensors": [
            {"type": "temperature", "name": "Supply Air Temp", "unit": "F"},
            {"type": "temperature", "name": "Return Air Temp", "unit": "F"},
            {"type": "humidity", "name": "Humidity", "unit": "%"},
        ]},
        {"name": "Cooling Tower", "icon": "tower", "default_sensors": [
            {"type": "temperature", "name": "Water Temp", "unit": "F"},
            {"type": "flow", "name": "Flow Rate", "unit": "GPM"},
        ]},
        {"name": "Pump", "icon": "droplet", "default_sensors": [
            {"type": "pressure", "name": "Discharge Pressure", "unit": "PSI"},
            {"type": "flow", "name": "Flow Rate", "unit": "GPM"},
            {"type": "power", "name": "Power", "unit": "kW"},
        ]},
        {"name": "Boiler", "icon": "flame", "default_sensors": [
            {"type": "temperature", "name": "Steam Temp", "unit": "F"},
            {"type": "pressure", "name": "Steam Pressure", "unit": "PSI"},
        ]},
        {"name": "RTU", "icon": "box", "default_sensors": [
            {"type": "temperature", "name": "Supply Air Temp", "unit": "F"},
            {"type": "temperature", "name": "Outside Air Temp", "unit": "F"},
        ]},
        {"name": "VAV", "icon": "air-vent", "default_sensors": [
            {"type": "temperature", "name": "Zone Temp", "unit": "F"},
            {"type": "flow", "name": "Airflow", "unit": "CFM"},
        ]},
        {"name": "Meter", "icon": "gauge", "default_sensors": [
            {"type": "power", "name": "Power", "unit": "kW"},
            {"type": "power", "name": "Energy", "unit": "kWh"},
        ]},
        {"name": "UPS", "icon": "battery", "default_sensors": [
            {"type": "power", "name": "Load", "unit": "kW"},
            {"type": "power", "name": "Battery", "unit": "%"},
        ]},
        {"name": "Generator", "icon": "zap", "default_sensors": [
            {"type": "power", "name": "Power Output", "unit": "kW"},
            {"type": "runtime", "name": "Runtime", "unit": "hours"},
        ]},
    ]

    for config in type_configs:
        asset_type = AssetType(
            id=str(uuid.uuid4()),
            name=config["name"],
            icon=config["icon"],
            default_sensors=config["default_sensors"],
        )
        db.add(asset_type)
        asset_types[config["name"]] = asset_type

    await db.flush()
    return asset_types


async def seed_demo_tenant(db: AsyncSession, asset_types: dict[str, AssetType]):
    """Create demo tenant with users and assets."""

    # Create tenant
    tenant = Tenant(
        id=str(uuid.uuid4()),
        name="ACME Corporation",
        industry="data_center",
        timezone="America/Chicago",
    )
    db.add(tenant)
    await db.flush()

    # Create users with all 4 roles
    users = []
    user_configs = [
        {"email": "admin@acme.com", "name": "Admin User", "role": "admin"},
        {"email": "manager@acme.com", "name": "Facility Manager", "role": "facility_manager"},
        {"email": "tech@acme.com", "name": "Tech Johnson", "role": "technician"},
        {"email": "exec@acme.com", "name": "Executive Smith", "role": "executive"},
    ]

    # All demo users have password: "password123"
    password_hash = get_password_hash("password123")

    for config in user_configs:
        user = User(
            id=str(uuid.uuid4()),
            tenant_id=tenant.id,
            email=config["email"],
            password_hash=password_hash,
            name=config["name"],
            role=config["role"],
            status="active",
        )
        db.add(user)
        users.append(user)

    await db.flush()

    # Create portfolio
    portfolio = Portfolio(
        id=str(uuid.uuid4()),
        tenant_id=tenant.id,
        name="ACME Data Centers",
        description="Primary data center portfolio",
    )
    db.add(portfolio)
    await db.flush()

    # Create sites
    sites_data = [
        {
            "name": "Chicago DC1",
            "address": "123 Data Center Way, Chicago, IL 60601",
            "timezone": "America/Chicago",
            "facility_type": "data_center",
            "square_footage": 50000,
            "utility_rate": 0.085,
        },
        {
            "name": "Dallas DC2",
            "address": "456 Server Lane, Dallas, TX 75201",
            "timezone": "America/Chicago",
            "facility_type": "data_center",
            "square_footage": 35000,
            "utility_rate": 0.075,
        },
    ]

    sites = []
    for site_data in sites_data:
        site = Site(
            id=str(uuid.uuid4()),
            tenant_id=tenant.id,
            portfolio_id=portfolio.id,
            **site_data,
        )
        db.add(site)
        sites.append(site)

    await db.flush()

    # Create systems and assets for Chicago DC1
    chicago = sites[0]

    # Cooling Plant system
    cooling_system = System(
        id=str(uuid.uuid4()),
        tenant_id=tenant.id,
        site_id=chicago.id,
        name="Cooling Plant",
        description="Main cooling system for data halls",
    )
    db.add(cooling_system)

    # HVAC system
    hvac_system = System(
        id=str(uuid.uuid4()),
        tenant_id=tenant.id,
        site_id=chicago.id,
        name="HVAC System",
        description="Air handling units and ventilation",
    )
    db.add(hvac_system)

    # Electrical system
    electrical_system = System(
        id=str(uuid.uuid4()),
        tenant_id=tenant.id,
        site_id=chicago.id,
        name="Electrical",
        description="Power distribution and backup",
    )
    db.add(electrical_system)

    await db.flush()

    # Create assets
    assets_config = [
        # Cooling Plant assets
        {"name": "Chiller-01", "type": "Chiller", "system": cooling_system, "criticality": "critical", "manufacturer": "Carrier", "model": "30XA400"},
        {"name": "Chiller-02", "type": "Chiller", "system": cooling_system, "criticality": "critical", "manufacturer": "Carrier", "model": "30XA400"},
        {"name": "Cooling Tower-01", "type": "Cooling Tower", "system": cooling_system, "criticality": "high", "manufacturer": "BAC", "model": "3000-S"},
        {"name": "CW Pump-01", "type": "Pump", "system": cooling_system, "criticality": "high", "manufacturer": "Armstrong", "model": "4300"},
        {"name": "CW Pump-02", "type": "Pump", "system": cooling_system, "criticality": "high", "manufacturer": "Armstrong", "model": "4300"},

        # HVAC assets
        {"name": "AHU-101", "type": "AHU", "system": hvac_system, "criticality": "high", "manufacturer": "Trane", "model": "M-Series"},
        {"name": "AHU-102", "type": "AHU", "system": hvac_system, "criticality": "high", "manufacturer": "Trane", "model": "M-Series"},
        {"name": "RTU-01", "type": "RTU", "system": hvac_system, "criticality": "medium", "manufacturer": "Lennox", "model": "KGA240"},

        # Electrical assets
        {"name": "Main Meter", "type": "Meter", "system": electrical_system, "criticality": "critical", "manufacturer": "Schneider", "model": "PM8000"},
        {"name": "UPS-A", "type": "UPS", "system": electrical_system, "criticality": "critical", "manufacturer": "Eaton", "model": "93PM"},
        {"name": "Generator-01", "type": "Generator", "system": electrical_system, "criticality": "critical", "manufacturer": "Caterpillar", "model": "C32"},
    ]

    for asset_config in assets_config:
        asset_type = asset_types[asset_config["type"]]
        asset = Asset(
            id=str(uuid.uuid4()),
            tenant_id=tenant.id,
            site_id=chicago.id,
            system_id=asset_config["system"].id,
            asset_type_id=asset_type.id,
            name=asset_config["name"],
            status="active",
            criticality=asset_config["criticality"],
            manufacturer=asset_config.get("manufacturer"),
            model=asset_config.get("model"),
            install_date=date(2020, 1, 15),
        )
        db.add(asset)

        # Create sensors for this asset
        if asset_type.default_sensors:
            for sensor_config in asset_type.default_sensors:
                sensor = Sensor(
                    id=str(uuid.uuid4()),
                    asset_id=asset.id,
                    name=sensor_config["name"],
                    sensor_type=sensor_config["type"],
                    unit=sensor_config["unit"],
                )
                db.add(sensor)

    await db.flush()

    # Create a few assets for Dallas DC2
    dallas = sites[1]

    dallas_assets = [
        {"name": "Chiller-01", "type": "Chiller", "criticality": "critical"},
        {"name": "AHU-201", "type": "AHU", "criticality": "high"},
        {"name": "UPS-B", "type": "UPS", "criticality": "critical"},
    ]

    for asset_config in dallas_assets:
        asset_type = asset_types[asset_config["type"]]
        asset = Asset(
            id=str(uuid.uuid4()),
            tenant_id=tenant.id,
            site_id=dallas.id,
            system_id=None,  # Direct to site
            asset_type_id=asset_type.id,
            name=asset_config["name"],
            status="active",
            criticality=asset_config["criticality"],
            install_date=date(2021, 6, 1),
        )
        db.add(asset)

        if asset_type.default_sensors:
            for sensor_config in asset_type.default_sensors:
                sensor = Sensor(
                    id=str(uuid.uuid4()),
                    asset_id=asset.id,
                    name=sensor_config["name"],
                    sensor_type=sensor_config["type"],
                    unit=sensor_config["unit"],
                )
                db.add(sensor)

    await db.commit()

    print(f"Created tenant: {tenant.name}")
    print(f"Created {len(users)} users:")
    for user in users:
        print(f"  - {user.email} ({user.role})")
    print(f"Created {len(sites)} sites")
    print("Demo users can login with password: password123")


async def main():
    """Main seed function."""
    print("Creating database tables...")
    await create_tables()

    print("Seeding database...")
    async with async_session_maker() as db:
        # Check if already seeded
        from sqlalchemy import select
        result = await db.execute(select(Tenant))
        if result.scalar_one_or_none():
            print("Database already seeded. Skipping...")
            return

        # Seed asset types first
        asset_types = await seed_asset_types(db)

        # Seed demo tenant
        await seed_demo_tenant(db, asset_types)

    print("\nSeeding complete!")


if __name__ == "__main__":
    asyncio.run(main())
