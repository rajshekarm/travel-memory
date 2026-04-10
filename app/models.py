from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ProjectState(Base):
    __tablename__ = "project_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    project_name: Mapped[str] = mapped_column(String(160))
    region: Mapped[str] = mapped_column(String(120))
    version: Mapped[str] = mapped_column(String(64))
    published_version: Mapped[str] = mapped_column(String(64))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    message: Mapped[str] = mapped_column(Text())


class Place(Base):
    __tablename__ = "places"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(140))
    category: Mapped[str] = mapped_column(String(50))
    city: Mapped[str] = mapped_column(String(120))
    area: Mapped[str] = mapped_column(String(120))
    latitude: Mapped[float] = mapped_column(Float())
    longitude: Mapped[float] = mapped_column(Float())
    notes: Mapped[str] = mapped_column(Text(), default="")
    best_pickup_notes: Mapped[str] = mapped_column(Text(), default="")
    best_dropoff_notes: Mapped[str] = mapped_column(Text(), default="")
    parking_notes: Mapped[str] = mapped_column(Text(), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    features: Mapped[list["MapFeature"]] = relationship(back_populates="place")


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(160))
    mode: Mapped[str] = mapped_column(String(40))
    city: Mapped[str] = mapped_column(String(120))
    origin_name: Mapped[str] = mapped_column(String(140))
    destination_name: Mapped[str] = mapped_column(String(140))
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    distance_km: Mapped[Optional[float]] = mapped_column(Float(), nullable=True)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[str] = mapped_column(Text(), default="")
    route_summary: Mapped[str] = mapped_column(Text(), default="")
    route_geojson: Mapped[Optional[str]] = mapped_column(Text(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class MapFeature(Base):
    __tablename__ = "map_features"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(160))
    type: Mapped[str] = mapped_column(String(32), index=True)
    status: Mapped[str] = mapped_column(String(32), index=True)
    priority: Mapped[str] = mapped_column(String(32))
    x: Mapped[float] = mapped_column(Float())
    y: Mapped[float] = mapped_column(Float())
    area: Mapped[str] = mapped_column(String(120))
    notes: Mapped[str] = mapped_column(Text(), default="")
    assignee: Mapped[str] = mapped_column(String(80), default="You")
    place_id: Mapped[Optional[int]] = mapped_column(ForeignKey("places.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    place: Mapped[Optional[Place]] = relationship(back_populates="features")
