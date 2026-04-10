from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas, services
from app.config import WEB_DIR
from app.database import SessionLocal, get_session, init_db


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    with SessionLocal() as session:
        services.seed_database(session)
        services.ensure_sample_entities(session)
    yield


app = FastAPI(
    title="Personal Road Intelligence Map API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/state", response_model=schemas.MapStateResponse)
def get_state(session: Session = Depends(get_session)) -> schemas.MapStateResponse:
    return services.build_state_response(session)


@app.get("/api/dashboard/summary", response_model=schemas.DashboardSummary)
def get_dashboard_summary(session: Session = Depends(get_session)) -> schemas.DashboardSummary:
    return services.build_dashboard_summary(session)


@app.get("/api/places/visited", response_model=schemas.RecentPlacesResponse)
def get_recent_places(
    window: str = "week", session: Session = Depends(get_session)
) -> schemas.RecentPlacesResponse:
    try:
        return services.build_recent_places(session, window)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@app.get("/api/map-features", response_model=list[schemas.MapFeatureRead])
def get_map_features(session: Session = Depends(get_session)) -> list[schemas.MapFeatureRead]:
    return [schemas.MapFeatureRead.model_validate(item) for item in services.list_features(session)]


@app.get("/api/map-features/{feature_id}", response_model=schemas.MapFeatureRead)
def get_map_feature(feature_id: str, session: Session = Depends(get_session)) -> schemas.MapFeatureRead:
    feature = session.scalar(select(models.MapFeature).where(models.MapFeature.public_id == feature_id))
    if feature is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feature not found.")
    return schemas.MapFeatureRead.model_validate(feature)


@app.post(
    "/api/map-features",
    response_model=schemas.MapFeatureRead,
    status_code=status.HTTP_201_CREATED,
)
def create_map_feature(
    payload: schemas.MapFeatureCreate, session: Session = Depends(get_session)
) -> schemas.MapFeatureRead:
    try:
        feature = services.create_feature(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return schemas.MapFeatureRead.model_validate(feature)


@app.patch("/api/map-features/{feature_id}/status", response_model=schemas.MapFeatureRead)
def patch_map_feature_status(
    feature_id: str,
    payload: schemas.FeatureStatusUpdate,
    session: Session = Depends(get_session),
) -> schemas.MapFeatureRead:
    feature = services.update_feature_status(session, feature_id, payload)
    if feature is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feature not found.")
    return schemas.MapFeatureRead.model_validate(feature)


@app.post("/api/features", response_model=schemas.MapStateResponse, status_code=status.HTTP_201_CREATED)
def create_feature_compat(
    payload: schemas.MapFeatureCreate, session: Session = Depends(get_session)
) -> schemas.MapStateResponse:
    try:
        services.create_feature(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return services.build_state_response(session)


@app.post("/api/features/{feature_id}/status", response_model=schemas.MapStateResponse)
def patch_feature_status_compat(
    feature_id: str,
    payload: schemas.FeatureStatusUpdate,
    session: Session = Depends(get_session),
) -> schemas.MapStateResponse:
    feature = services.update_feature_status(session, feature_id, payload)
    if feature is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feature not found.")
    return services.build_state_response(session)


@app.post("/api/publish", response_model=schemas.MapStateResponse)
def publish(session: Session = Depends(get_session)) -> schemas.MapStateResponse:
    return services.publish_approved_features(session)


@app.get("/api/places", response_model=list[schemas.PlaceRead])
def get_places(session: Session = Depends(get_session)) -> list[schemas.PlaceRead]:
    places = session.scalars(select(models.Place).order_by(models.Place.name.asc())).all()
    return [schemas.PlaceRead.model_validate(place) for place in places]


@app.get("/api/places/{place_id}", response_model=schemas.PlaceRead)
def get_place(place_id: str, session: Session = Depends(get_session)) -> schemas.PlaceRead:
    place = session.scalar(select(models.Place).where(models.Place.public_id == place_id))
    if place is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found.")
    return schemas.PlaceRead.model_validate(place)


@app.post("/api/places", response_model=schemas.PlaceRead, status_code=status.HTTP_201_CREATED)
def post_place(payload: schemas.PlaceCreate, session: Session = Depends(get_session)) -> schemas.PlaceRead:
    place = services.create_place(session, payload)
    return schemas.PlaceRead.model_validate(place)


@app.get("/api/trips", response_model=list[schemas.TripRead])
def get_trips(session: Session = Depends(get_session)) -> list[schemas.TripRead]:
    trips = session.scalars(select(models.Trip).order_by(models.Trip.start_time.desc())).all()
    return [services.serialize_trip(trip) for trip in trips]


@app.get("/api/trips/{trip_id}", response_model=schemas.TripRead)
def get_trip(trip_id: str, session: Session = Depends(get_session)) -> schemas.TripRead:
    trip = session.scalar(select(models.Trip).where(models.Trip.public_id == trip_id))
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found.")
    return services.serialize_trip(trip)


@app.post("/api/trips", response_model=schemas.TripRead, status_code=status.HTTP_201_CREATED)
def post_trip(payload: schemas.TripCreate, session: Session = Depends(get_session)) -> schemas.TripRead:
    trip = services.create_trip(session, payload)
    return services.serialize_trip(trip)


if WEB_DIR.exists():
    app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
