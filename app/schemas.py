from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


FeatureType = Literal["pickup", "dropoff", "hazard", "parking", "closure"]
FeatureStatus = Literal["draft", "review", "approved", "published"]
MutableFeatureStatus = Literal["draft", "review", "approved"]
FeaturePriority = Literal["high", "medium", "low"]
TripMode = Literal["drive", "robotaxi", "walk", "bike", "train", "flight"]


class OrmModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ActivityRead(OrmModel):
    timestamp: datetime
    message: str


class DashboardMetrics(BaseModel):
    total_features: int
    status_counts: dict[str, int]
    type_counts: dict[str, int]
    published_features: int
    action_required: int
    rider_zones: int
    live_hazards: int


class DashboardSummary(BaseModel):
    project_name: str
    region: str
    version: str
    published_version: str
    updated_at: datetime
    total_places: int
    total_trips: int
    total_distance_km: float
    latest_trip_title: Optional[str] = None
    metrics: DashboardMetrics


class PlaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=140)
    category: str = Field(min_length=1, max_length=50)
    city: str = Field(min_length=1, max_length=120)
    area: str = Field(min_length=1, max_length=120)
    latitude: float
    longitude: float
    notes: str = ""
    best_pickup_notes: str = ""
    best_dropoff_notes: str = ""
    parking_notes: str = ""


class PlaceRead(OrmModel):
    public_id: str
    name: str
    category: str
    city: str
    area: str
    latitude: float
    longitude: float
    notes: str
    best_pickup_notes: str
    best_dropoff_notes: str
    parking_notes: str
    created_at: datetime
    updated_at: datetime


class TripCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    mode: TripMode
    city: str = Field(min_length=1, max_length=120)
    origin_name: str = Field(min_length=1, max_length=140)
    destination_name: str = Field(min_length=1, max_length=140)
    start_time: datetime
    end_time: Optional[datetime] = None
    distance_km: Optional[float] = None
    duration_minutes: Optional[int] = None
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    notes: str = ""
    route_summary: str = ""
    route_geojson: Optional[dict[str, Any]] = None


class TripRead(OrmModel):
    public_id: str
    title: str
    mode: str
    city: str
    origin_name: str
    destination_name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    distance_km: Optional[float] = None
    duration_minutes: Optional[int] = None
    rating: Optional[int] = None
    notes: str
    route_summary: str
    route_geojson: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime


class RecentPlaceVisit(BaseModel):
    place_id: str
    name: str
    category: str
    area: str
    latitude: float
    longitude: float
    visit_count: int
    last_visited_at: datetime
    last_trip_title: str
    recent_trip_ids: list[str]


class RecentPlacesResponse(BaseModel):
    window: Literal["day", "week", "month"]
    reference_time: datetime
    places: list[RecentPlaceVisit]


class MapFeatureCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    type: FeatureType
    priority: FeaturePriority = "medium"
    x: float = Field(ge=0, le=100)
    y: float = Field(ge=0, le=100)
    area: str = ""
    notes: str = ""
    assignee: str = "You"
    place_public_id: Optional[str] = None


class MapFeatureRead(OrmModel):
    public_id: str = Field(serialization_alias="id")
    title: str
    type: FeatureType
    status: FeatureStatus
    priority: FeaturePriority
    x: float
    y: float
    area: str
    notes: str
    assignee: str
    created_at: datetime
    updated_at: datetime = Field(serialization_alias="last_updated")


class FeatureStatusUpdate(BaseModel):
    status: MutableFeatureStatus


class MapStateResponse(BaseModel):
    project_name: str
    region: str
    version: str
    published_version: str
    updated_at: datetime
    features: list[MapFeatureRead]
    activity: list[ActivityRead]
    metrics: DashboardMetrics
