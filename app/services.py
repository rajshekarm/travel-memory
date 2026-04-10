from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import SEED_FILE
from app import models, schemas


STATUS_ORDER = ["draft", "review", "approved", "published"]
PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}
VALID_TYPES = {"pickup", "dropoff", "hazard", "parking", "closure"}


SAMPLE_PLACES = [
    {
        "name": "Home Base",
        "category": "home",
        "city": "Chicago",
        "area": "West Loop",
        "latitude": 41.8827,
        "longitude": -87.6476,
        "notes": "Primary base for commute experiments and pickup staging notes.",
        "best_pickup_notes": "Use the west curb on the side street after evening rush.",
        "best_dropoff_notes": "North-side curb is easier for unloading groceries.",
        "parking_notes": "Short-term loading is easier than overnight parking nearby.",
    },
    {
        "name": "Union Station",
        "category": "transit",
        "city": "Chicago",
        "area": "West Loop",
        "latitude": 41.8786,
        "longitude": -87.6405,
        "notes": "Frequent train hub with high pickup churn.",
        "best_pickup_notes": "Use the quieter canal-facing side after 5 PM.",
        "best_dropoff_notes": "Front entrance works before 7 AM, otherwise use the side street.",
        "parking_notes": "Best for quick waiting, not long stays.",
    },
    {
        "name": "O'Hare Terminal 2",
        "category": "airport",
        "city": "Chicago",
        "area": "O'Hare",
        "latitude": 41.9777,
        "longitude": -87.9045,
        "notes": "Useful for airport memory and travel journal context.",
        "best_pickup_notes": "Track terminal-specific pickup habits when rideshare queues are busy.",
        "best_dropoff_notes": "Departures curb is usually smoother than arrivals for quick unloads.",
        "parking_notes": "Use economy parking if waiting longer than pickup window.",
    },
    {
        "name": "Office Hub",
        "category": "office",
        "city": "Chicago",
        "area": "Fulton Market",
        "latitude": 41.8862,
        "longitude": -87.6518,
        "notes": "Primary work destination and a good anchor for commute route memory.",
        "best_pickup_notes": "North-side curb is smoother after 5 PM than the main frontage.",
        "best_dropoff_notes": "Drop off near the side entrance to avoid double-parked delivery vans.",
        "parking_notes": "Garage entrance is easier from the alley off the west side street.",
    },
    {
        "name": "River North Dinner Spot",
        "category": "restaurant",
        "city": "Chicago",
        "area": "River North",
        "latitude": 41.8939,
        "longitude": -87.6341,
        "notes": "Useful weekend destination for evening pickup experiments.",
        "best_pickup_notes": "Use the quieter side street behind the venue after 8 PM.",
        "best_dropoff_notes": "Main entrance is okay before dinner rush, then switch to the rear lane.",
        "parking_notes": "Valet zone crowds the curb, so avoid stopping directly in front.",
    },
]


SAMPLE_TRIPS = [
    {
        "title": "Morning office commute",
        "mode": "drive",
        "city": "Chicago",
        "origin_name": "Home Base",
        "destination_name": "Office Hub",
        "start_time": "2026-04-09T13:10:00Z",
        "end_time": "2026-04-09T13:42:00Z",
        "distance_km": 7.8,
        "duration_minutes": 32,
        "rating": 4,
        "notes": "Best route before 8 AM. River crossing becomes noisy later.",
        "route_summary": "Preferred via quieter warehouse streets with one protected left turn.",
        "route_geojson": {
            "type": "Feature",
            "properties": {"trip": "Morning office commute"},
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [-87.6476, 41.8827],
                    [-87.6492, 41.8838],
                    [-87.6510, 41.8852],
                    [-87.6518, 41.8862],
                ],
            },
        },
    },
    {
        "title": "Airport pickup experiment",
        "mode": "robotaxi",
        "city": "Chicago",
        "origin_name": "O'Hare Terminal 2",
        "destination_name": "Home Base",
        "start_time": "2026-04-06T23:20:00Z",
        "end_time": "2026-04-07T00:05:00Z",
        "distance_km": 26.4,
        "duration_minutes": 45,
        "rating": 5,
        "notes": "Good benchmark trip for terminal pickup timing and fallback spots.",
        "route_summary": "Smoothest late-night return using expressway exit closest to the west loop.",
        "route_geojson": {
            "type": "Feature",
            "properties": {"trip": "Airport pickup experiment"},
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [-87.9045, 41.9777],
                    [-87.8350, 41.9510],
                    [-87.7600, 41.9200],
                    [-87.7020, 41.8980],
                    [-87.6476, 41.8827],
                ],
            },
        },
    },
    {
        "title": "Late dinner ride north",
        "mode": "robotaxi",
        "city": "Chicago",
        "origin_name": "Home Base",
        "destination_name": "River North Dinner Spot",
        "start_time": "2026-04-10T01:25:00Z",
        "end_time": "2026-04-10T01:42:00Z",
        "distance_km": 4.9,
        "duration_minutes": 17,
        "rating": 4,
        "notes": "Short city ride useful for testing dense curbside pickups.",
        "route_summary": "Best route avoided river bridge backups and used quieter northbound streets.",
        "route_geojson": {
            "type": "Feature",
            "properties": {"trip": "Late dinner ride north"},
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [-87.6476, 41.8827],
                    [-87.6440, 41.8852],
                    [-87.6395, 41.8892],
                    [-87.6368, 41.8922],
                    [-87.6341, 41.8939],
                ],
            },
        },
    },
    {
        "title": "Union Station train connection",
        "mode": "train",
        "city": "Chicago",
        "origin_name": "Home Base",
        "destination_name": "Union Station",
        "start_time": "2026-04-08T12:15:00Z",
        "end_time": "2026-04-08T12:29:00Z",
        "distance_km": 1.8,
        "duration_minutes": 14,
        "rating": 5,
        "notes": "A reliable short hop for testing station approach notes.",
        "route_summary": "Quick walk-to-train route with minimal street crossing friction.",
        "route_geojson": {
            "type": "Feature",
            "properties": {"trip": "Union Station train connection"},
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [-87.6476, 41.8827],
                    [-87.6458, 41.8818],
                    [-87.6434, 41.8800],
                    [-87.6405, 41.8786],
                ],
            },
        },
    },
    {
        "title": "Weekend office reset",
        "mode": "drive",
        "city": "Chicago",
        "origin_name": "Home Base",
        "destination_name": "Office Hub",
        "start_time": "2026-03-20T15:30:00Z",
        "end_time": "2026-03-20T15:54:00Z",
        "distance_km": 7.6,
        "duration_minutes": 24,
        "rating": 4,
        "notes": "A quieter off-peak route that is useful for baseline comparisons.",
        "route_summary": "Weekend route via warehouse streets with lighter merge pressure.",
        "route_geojson": {
            "type": "Feature",
            "properties": {"trip": "Weekend office reset"},
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [-87.6476, 41.8827],
                    [-87.6490, 41.8836],
                    [-87.6506, 41.8848],
                    [-87.6518, 41.8862],
                ],
            },
        },
    },
]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_seed_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def next_public_id(session: Session, model: type[models.Base], prefix: str) -> str:
    last_id = session.scalar(select(func.max(model.id))) or 0
    return f"{prefix}-{last_id + 1}"


def add_activity(session: Session, message: str, timestamp: datetime | None = None) -> None:
    session.add(models.ActivityLog(timestamp=timestamp or utc_now(), message=message))


def get_project_state(session: Session) -> models.ProjectState:
    project_state = session.scalar(select(models.ProjectState).where(models.ProjectState.id == 1))
    if project_state is None:
        raise RuntimeError("Project state has not been initialized.")
    return project_state


def list_features(session: Session) -> list[models.MapFeature]:
    features = session.scalars(select(models.MapFeature)).all()
    return sorted(
        features,
        key=lambda item: (
            STATUS_ORDER.index(item.status),
            PRIORITY_ORDER.get(item.priority, 1),
            item.title.lower(),
        ),
    )


def build_metrics(session: Session) -> schemas.DashboardMetrics:
    features = list_features(session)
    status_counts = {status: 0 for status in STATUS_ORDER}
    type_counts = {feature_type: 0 for feature_type in VALID_TYPES}

    for feature in features:
        status_counts[feature.status] = status_counts.get(feature.status, 0) + 1
        type_counts[feature.type] = type_counts.get(feature.type, 0) + 1

    return schemas.DashboardMetrics(
        total_features=len(features),
        status_counts=status_counts,
        type_counts=type_counts,
        published_features=status_counts.get("published", 0),
        action_required=status_counts.get("draft", 0) + status_counts.get("review", 0),
        rider_zones=type_counts.get("pickup", 0) + type_counts.get("dropoff", 0),
        live_hazards=type_counts.get("hazard", 0) + type_counts.get("closure", 0),
    )


def build_state_response(session: Session) -> schemas.MapStateResponse:
    project_state = get_project_state(session)
    activities = session.scalars(
        select(models.ActivityLog).order_by(models.ActivityLog.timestamp.desc()).limit(8)
    ).all()
    features = list_features(session)
    return schemas.MapStateResponse(
        project_name=project_state.project_name,
        region=project_state.region,
        version=project_state.version,
        published_version=project_state.published_version,
        updated_at=project_state.updated_at,
        features=[schemas.MapFeatureRead.model_validate(feature) for feature in features],
        activity=[schemas.ActivityRead.model_validate(item) for item in activities],
        metrics=build_metrics(session),
    )


def build_dashboard_summary(session: Session) -> schemas.DashboardSummary:
    project_state = get_project_state(session)
    latest_trip = session.scalar(select(models.Trip).order_by(models.Trip.start_time.desc()).limit(1))
    total_distance = session.scalar(select(func.coalesce(func.sum(models.Trip.distance_km), 0.0))) or 0.0
    total_places = session.scalar(select(func.count(models.Place.id))) or 0
    total_trips = session.scalar(select(func.count(models.Trip.id))) or 0
    return schemas.DashboardSummary(
        project_name=project_state.project_name,
        region=project_state.region,
        version=project_state.version,
        published_version=project_state.published_version,
        updated_at=project_state.updated_at,
        total_places=total_places,
        total_trips=total_trips,
        total_distance_km=round(float(total_distance), 1),
        latest_trip_title=latest_trip.title if latest_trip else None,
        metrics=build_metrics(session),
    )


def build_recent_places(session: Session, window: str) -> schemas.RecentPlacesResponse:
    window_map = {
        "day": timedelta(days=1),
        "week": timedelta(days=7),
        "month": timedelta(days=30),
    }
    if window not in window_map:
        raise ValueError("Unsupported window.")

    reference_time = session.scalar(select(func.max(models.Trip.start_time))) or utc_now()
    threshold = reference_time - window_map[window]
    trips = session.scalars(
        select(models.Trip).where(models.Trip.start_time >= threshold).order_by(models.Trip.start_time.desc())
    ).all()
    places = {
        place.name: place
        for place in session.scalars(select(models.Place).where(models.Place.city == "Chicago")).all()
    }

    visit_index: dict[str, schemas.RecentPlaceVisit] = {}
    for trip in trips:
        for place_name in (trip.origin_name, trip.destination_name):
            place = places.get(place_name)
            if place is None:
                continue

            existing = visit_index.get(place.public_id)
            if existing is None:
                visit_index[place.public_id] = schemas.RecentPlaceVisit(
                    place_id=place.public_id,
                    name=place.name,
                    category=place.category,
                    area=place.area,
                    latitude=place.latitude,
                    longitude=place.longitude,
                    visit_count=1,
                    last_visited_at=trip.start_time,
                    last_trip_title=trip.title,
                    recent_trip_ids=[trip.public_id],
                )
            else:
                existing.visit_count += 1
                if trip.start_time > existing.last_visited_at:
                    existing.last_visited_at = trip.start_time
                    existing.last_trip_title = trip.title
                if trip.public_id not in existing.recent_trip_ids:
                    existing.recent_trip_ids.append(trip.public_id)

    places_sorted = sorted(
        visit_index.values(),
        key=lambda item: (item.last_visited_at, item.visit_count),
        reverse=True,
    )
    return schemas.RecentPlacesResponse(
        window=window, reference_time=reference_time, places=places_sorted
    )


def parse_route_geojson(route_geojson: str | None) -> dict | None:
    if not route_geojson:
        return None

    try:
        parsed = json.loads(route_geojson)
    except json.JSONDecodeError:
        return None

    return parsed if isinstance(parsed, dict) else None


def serialize_trip(trip: models.Trip) -> schemas.TripRead:
    return schemas.TripRead(
        public_id=trip.public_id,
        title=trip.title,
        mode=trip.mode,
        city=trip.city,
        origin_name=trip.origin_name,
        destination_name=trip.destination_name,
        start_time=trip.start_time,
        end_time=trip.end_time,
        distance_km=trip.distance_km,
        duration_minutes=trip.duration_minutes,
        rating=trip.rating,
        notes=trip.notes,
        route_summary=trip.route_summary,
        route_geojson=parse_route_geojson(trip.route_geojson),
        created_at=trip.created_at,
        updated_at=trip.updated_at,
    )


def create_place(session: Session, payload: schemas.PlaceCreate) -> models.Place:
    now = utc_now()
    place = models.Place(
        public_id=next_public_id(session, models.Place, "plc"),
        created_at=now,
        updated_at=now,
        **payload.model_dump(),
    )
    session.add(place)
    add_activity(session, f"{place.name} saved as a new place intelligence record.", now)
    project_state = get_project_state(session)
    project_state.updated_at = now
    session.commit()
    session.refresh(place)
    return place


def create_trip(session: Session, payload: schemas.TripCreate) -> models.Trip:
    now = utc_now()
    trip_data = payload.model_dump()
    route_geojson = trip_data.pop("route_geojson", None)
    trip = models.Trip(
        public_id=next_public_id(session, models.Trip, "trp"),
        created_at=now,
        updated_at=now,
        route_geojson=json.dumps(route_geojson) if route_geojson else None,
        **trip_data,
    )
    session.add(trip)
    add_activity(
        session,
        f"{trip.title} logged from {trip.origin_name} to {trip.destination_name}.",
        now,
    )
    project_state = get_project_state(session)
    project_state.updated_at = now
    session.commit()
    session.refresh(trip)
    return trip


def create_feature(session: Session, payload: schemas.MapFeatureCreate) -> models.MapFeature:
    now = utc_now()
    place_id = None
    if payload.place_public_id:
        place = session.scalar(select(models.Place).where(models.Place.public_id == payload.place_public_id))
        if place is None:
            raise ValueError("Referenced place was not found.")
        place_id = place.id

    feature = models.MapFeature(
        public_id=next_public_id(session, models.MapFeature, "feat"),
        title=payload.title,
        type=payload.type,
        status="draft",
        priority=payload.priority,
        x=payload.x,
        y=payload.y,
        area=payload.area or get_project_state(session).region,
        notes=payload.notes,
        assignee=payload.assignee,
        place_id=place_id,
        created_at=now,
        updated_at=now,
    )
    session.add(feature)
    add_activity(session, f"{feature.title} created as a draft {feature.type} annotation.", now)
    project_state = get_project_state(session)
    project_state.updated_at = now
    session.commit()
    session.refresh(feature)
    return feature


def update_feature_status(
    session: Session, public_id: str, payload: schemas.FeatureStatusUpdate
) -> models.MapFeature | None:
    feature = session.scalar(select(models.MapFeature).where(models.MapFeature.public_id == public_id))
    if feature is None:
        return None

    now = utc_now()
    feature.status = payload.status
    feature.updated_at = now
    add_activity(session, f"{feature.title} moved to {payload.status}.", now)
    project_state = get_project_state(session)
    project_state.updated_at = now
    session.commit()
    session.refresh(feature)
    return feature


def next_draft_version(current_version: str) -> str:
    today = utc_now().strftime("%Y.%m.%d")
    if current_version.startswith(f"{today}-draft."):
        try:
            revision = int(current_version.rsplit(".", 1)[-1]) + 1
        except ValueError:
            revision = 1
    else:
        revision = 1
    return f"{today}-draft.{revision}"


def publish_approved_features(session: Session) -> schemas.MapStateResponse:
    now = utc_now()
    project_state = get_project_state(session)
    approved_features = session.scalars(
        select(models.MapFeature).where(models.MapFeature.status == "approved")
    ).all()

    for feature in approved_features:
        feature.status = "published"
        feature.updated_at = now

    published_count = len(approved_features)
    project_state.published_version = project_state.version
    project_state.version = next_draft_version(project_state.version)
    project_state.updated_at = now
    add_activity(
        session,
        f"Published {published_count} approved updates to {project_state.published_version}.",
        now,
    )
    session.commit()
    return build_state_response(session)


def seed_database(session: Session) -> None:
    if session.scalar(select(func.count(models.ProjectState.id))) not in (None, 0):
        return

    with SEED_FILE.open("r", encoding="utf-8") as handle:
        legacy_state = json.load(handle)

    project_state = models.ProjectState(
        id=1,
        project_name=legacy_state["project_name"],
        region=legacy_state["region"],
        version=legacy_state["version"],
        published_version=legacy_state["published_version"],
        updated_at=parse_seed_timestamp(legacy_state["updated_at"]),
    )
    session.add(project_state)

    for feature_data in legacy_state["features"]:
        session.add(
            models.MapFeature(
                public_id=feature_data["id"],
                title=feature_data["title"],
                type=feature_data["type"],
                status=feature_data["status"],
                priority=feature_data["priority"],
                x=feature_data["x"],
                y=feature_data["y"],
                area=feature_data["area"],
                notes=feature_data["notes"],
                assignee=feature_data.get("assignee", "You"),
                created_at=parse_seed_timestamp(feature_data["last_updated"]),
                updated_at=parse_seed_timestamp(feature_data["last_updated"]),
            )
        )

    for activity in legacy_state["activity"]:
        session.add(
            models.ActivityLog(
                timestamp=parse_seed_timestamp(activity["timestamp"]),
                message=activity["message"],
            )
        )

    now = utc_now()
    for index, place_data in enumerate(SAMPLE_PLACES, start=1):
        session.add(
            models.Place(
                public_id=f"plc-{index}",
                created_at=now,
                updated_at=now,
                **place_data,
            )
        )

    for index, trip_data in enumerate(SAMPLE_TRIPS, start=1):
        payload = dict(trip_data)
        payload["start_time"] = parse_seed_timestamp(payload["start_time"])
        payload["end_time"] = parse_seed_timestamp(payload["end_time"])
        route_geojson = payload.pop("route_geojson", None)
        session.add(
            models.Trip(
                public_id=f"trp-{index}",
                created_at=now,
                updated_at=now,
                route_geojson=json.dumps(route_geojson) if route_geojson else None,
                **payload,
            )
        )

    session.commit()


def ensure_sample_entities(session: Session) -> None:
    changed = False
    now = utc_now()
    existing_place_names = set(session.scalars(select(models.Place.name)).all())
    existing_trip_titles = set(session.scalars(select(models.Trip.title)).all())

    next_place_number = (session.scalar(select(func.max(models.Place.id))) or 0) + 1
    for place_data in SAMPLE_PLACES:
        if place_data["name"] in existing_place_names:
            continue
        session.add(
            models.Place(
                public_id=f"plc-{next_place_number}",
                created_at=now,
                updated_at=now,
                **place_data,
            )
        )
        next_place_number += 1
        changed = True

    next_trip_number = (session.scalar(select(func.max(models.Trip.id))) or 0) + 1
    for trip_data in SAMPLE_TRIPS:
        if trip_data["title"] in existing_trip_titles:
            continue
        payload = dict(trip_data)
        payload["start_time"] = parse_seed_timestamp(payload["start_time"])
        payload["end_time"] = parse_seed_timestamp(payload["end_time"])
        route_geojson = payload.pop("route_geojson", None)
        session.add(
            models.Trip(
                public_id=f"trp-{next_trip_number}",
                created_at=now,
                updated_at=now,
                route_geojson=json.dumps(route_geojson) if route_geojson else None,
                **payload,
            )
        )
        next_trip_number += 1
        changed = True

    existing_trips = session.scalars(select(models.Trip)).all()
    seed_trip_by_title = {trip["title"]: trip for trip in SAMPLE_TRIPS}
    for trip in existing_trips:
        if trip.route_geojson:
            continue
        seed = seed_trip_by_title.get(trip.title)
        if seed and seed.get("route_geojson"):
            trip.route_geojson = json.dumps(seed["route_geojson"])
            changed = True

    if changed:
        session.commit()
