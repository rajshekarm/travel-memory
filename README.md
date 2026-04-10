# Personal Road Intelligence Map

This project is now a FastAPI-backed fullstack MVP for a Zoox-aligned portfolio app: a personal mobility intelligence dashboard for pickup/dropoff zones, hazards, closures, places, and trip memory.

## What is in the stack

- FastAPI service with OpenAPI docs
- SQLAlchemy models and a real SQLite database
- startup seeding from the legacy `data/map_state.json`
- React + TypeScript + Tailwind frontend built with Vite
- compatibility endpoints for the frontend state workflow
- expanded routes for `places`, `trips`, and `dashboard` summary data

## Run it

1. Make sure Python 3.10+ is available.
2. Install backend dependencies if needed:

```powershell
pip install -r requirements.txt
```

3. Install frontend dependencies:

```powershell
cd frontend
npm.cmd install
cd ..
```

4. Build the frontend into the FastAPI-served `web/` directory:

```powershell
cd frontend
npm.cmd run build
cd ..
```

5. Start the app:

```powershell
python server.py
```

6. Open the UI at `http://127.0.0.1:8000`
7. Open API docs at `http://127.0.0.1:8000/docs`

## Frontend development

For local UI work with hot reload:

```powershell
cd frontend
npm.cmd run dev
```

The Vite dev server proxies `/api` to `http://127.0.0.1:8000`.

## Main API routes

- `GET /api/health`
- `GET /api/state`
- `GET /api/dashboard/summary`
- `GET /api/map-features`
- `POST /api/map-features`
- `PATCH /api/map-features/{id}/status`
- `POST /api/features`
- `POST /api/features/{id}/status`
- `POST /api/publish`
- `GET /api/places`
- `POST /api/places`
- `GET /api/trips`
- `POST /api/trips`

## Data storage

- default database: `data/travel_buddy.db`
- default seed source: `data/map_state.json`
- override the database by setting `DATABASE_URL`

## Good next steps

- switch SQLite to Postgres + PostGIS
- add auth and user-specific datasets
- connect trips to route geometry and replay
- replace the stylized map underlay with Mapbox, deck.gl, or Cesium
- add upload support for trip photos, GPX, or exported travel history
