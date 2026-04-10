import { useEffect, useMemo, useRef } from "react";
import maplibregl, { NavigationControl, ScaleControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { RecentPlaceVisit, Trip } from "../types";
import { cn } from "../lib/utils";

const chicagoBuildings: GeoJSON.FeatureCollection<GeoJSON.Polygon, { height: number; name: string }> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { height: 180, name: "West Loop Tower" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-87.6548, 41.8859],
          [-87.6541, 41.8859],
          [-87.6541, 41.8853],
          [-87.6548, 41.8853],
          [-87.6548, 41.8859]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { height: 140, name: "Fulton Market Block" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-87.6519, 41.8866],
          [-87.6511, 41.8866],
          [-87.6511, 41.8859],
          [-87.6519, 41.8859],
          [-87.6519, 41.8866]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { height: 120, name: "River North Midrise" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-87.6351, 41.8943],
          [-87.6342, 41.8943],
          [-87.6342, 41.8937],
          [-87.6351, 41.8937],
          [-87.6351, 41.8943]
        ]]
      }
    }
  ]
};

function createAvatarElement(place: RecentPlaceVisit, active: boolean) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "avatar-marker";
  const initials = place.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  el.style.width = active ? "56px" : "44px";
  el.style.height = active ? "56px" : "44px";
  el.style.borderRadius = "999px";
  el.style.border = active ? "3px solid rgba(255,255,255,0.9)" : "2px solid rgba(255,255,255,0.65)";
  el.style.background = active
    ? "linear-gradient(135deg, rgba(122,231,255,0.98), rgba(244,204,114,0.98))"
    : "linear-gradient(135deg, rgba(122,231,255,0.92), rgba(93,214,176,0.92))";
  el.style.boxShadow = active
    ? "0 0 0 12px rgba(122,231,255,0.14), 0 18px 40px rgba(0,0,0,0.35)"
    : "0 0 0 8px rgba(122,231,255,0.08), 0 12px 28px rgba(0,0,0,0.28)";
  el.style.color = "#08121d";
  el.style.fontWeight = "800";
  el.style.fontSize = active ? "12px" : "11px";
  el.style.cursor = "pointer";
  el.textContent = initials;
  el.title = `${place.name} - visited ${place.visit_count} time(s)`;
  return el;
}

function buildRouteCollection(trips: Trip[]): GeoJSON.FeatureCollection<GeoJSON.LineString, { tripId: string; title: string }> {
  return {
    type: "FeatureCollection",
    features: trips
      .filter((trip) => trip.route_geojson?.geometry.type === "LineString")
      .map((trip) => ({
        type: "Feature" as const,
        properties: {
          tripId: trip.public_id,
          title: trip.title
        },
        geometry: {
          type: "LineString" as const,
          coordinates: trip.route_geojson?.geometry.coordinates ?? []
        }
      }))
  };
}

function buildBounds(coordinates: [number, number][]) {
  const bounds = new maplibregl.LngLatBounds(coordinates[0], coordinates[0]);
  for (const coordinate of coordinates.slice(1)) {
    bounds.extend(coordinate);
  }
  return bounds;
}

export function RecentChicago3DMap({
  places,
  trips,
  selectedPlaceId,
  selectedTripId,
  onSelectPlace,
  onSelectTrip
}: {
  places: RecentPlaceVisit[];
  trips: Trip[];
  selectedPlaceId: string | null;
  selectedTripId: string | null;
  onSelectPlace: (placeId: string) => void;
  onSelectTrip: (tripId: string) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const currentStyleLoadedRef = useRef(false);

  const selectedPlace = useMemo(
    () => places.find((place) => place.place_id === selectedPlaceId) ?? places[0] ?? null,
    [places, selectedPlaceId]
  );
  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.public_id === selectedTripId) ?? trips[0] ?? null,
    [selectedTripId, trips]
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          carto: {
            type: "raster",
            tiles: ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap &copy; CARTO"
          }
        },
        layers: [
          {
            id: "carto",
            type: "raster",
            source: "carto"
          }
        ]
      },
      center: [-87.6505, 41.8865],
      zoom: 11.4,
      pitch: 68,
      bearing: -24,
      antialias: true,
      dragRotate: true,
      touchZoomRotate: true
    });

    map.addControl(new NavigationControl({ showCompass: true, showZoom: true }), "top-right");
    map.addControl(new ScaleControl({ maxWidth: 120, unit: "imperial" }), "bottom-right");

    map.on("style.load", () => {
      currentStyleLoadedRef.current = true;

      map.addSource("chicago-buildings", {
        type: "geojson",
        data: chicagoBuildings
      });
      map.addLayer({
        id: "chicago-buildings-fill",
        type: "fill-extrusion",
        source: "chicago-buildings",
        paint: {
          "fill-extrusion-color": [
            "interpolate",
            ["linear"],
            ["get", "height"],
            100,
            "#31546d",
            200,
            "#4f81a5"
          ],
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.85
        }
      });

      map.addSource("trip-routes", {
        type: "geojson",
        data: buildRouteCollection([])
      });
      map.addLayer({
        id: "trip-routes-line",
        type: "line",
        source: "trip-routes",
        paint: {
          "line-color": "#7ae7ff",
          "line-width": 3,
          "line-opacity": 0.22
        }
      });

      map.addSource("selected-trip-route", {
        type: "geojson",
        data: buildRouteCollection([])
      });
      map.addLayer({
        id: "selected-trip-route-glow",
        type: "line",
        source: "selected-trip-route",
        paint: {
          "line-color": "#7ae7ff",
          "line-width": 12,
          "line-opacity": 0.15,
          "line-blur": 8
        }
      });
      map.addLayer({
        id: "selected-trip-route-line",
        type: "line",
        source: "selected-trip-route",
        paint: {
          "line-color": "#f4cc72",
          "line-width": 5,
          "line-opacity": 0.95
        }
      });
    });

    mapRef.current = map;
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      currentStyleLoadedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentStyleLoadedRef.current) {
      return;
    }

    const routeSource = map.getSource("trip-routes") as maplibregl.GeoJSONSource | undefined;
    const selectedRouteSource = map.getSource("selected-trip-route") as maplibregl.GeoJSONSource | undefined;
    if (!routeSource || !selectedRouteSource) {
      return;
    }

    routeSource.setData(buildRouteCollection(trips));
    selectedRouteSource.setData(buildRouteCollection(selectedTrip ? [selectedTrip] : []));
  }, [selectedTrip, trips]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentStyleLoadedRef.current) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    for (const place of places) {
      const active = selectedPlace?.place_id === place.place_id;
      const avatarEl = createAvatarElement(place, active);
      avatarEl.addEventListener("click", () => {
        onSelectPlace(place.place_id);
        const relatedTripId = place.recent_trip_ids.find((tripId) => trips.some((trip) => trip.public_id === tripId));
        if (relatedTripId) {
          onSelectTrip(relatedTripId);
        }
      });

      const marker = new maplibregl.Marker({ element: avatarEl, anchor: "bottom" })
        .setLngLat([place.longitude, place.latitude])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [onSelectPlace, onSelectTrip, places, selectedPlace, trips]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentStyleLoadedRef.current) {
      return;
    }

    const selectedCoordinates = selectedTrip?.route_geojson?.geometry.coordinates ?? [];
    if (selectedCoordinates.length > 1) {
      map.fitBounds(buildBounds(selectedCoordinates), {
        padding: { top: 120, right: 120, bottom: 120, left: 120 },
        pitch: 68,
        bearing: -28,
        duration: 1200,
        maxZoom: 13.8
      });
      return;
    }

    if (selectedPlace) {
      map.flyTo({
        center: [selectedPlace.longitude, selectedPlace.latitude],
        zoom: 13.4,
        pitch: 72,
        bearing: -32,
        speed: 0.6
      });
      return;
    }

    map.flyTo({
      center: [-87.6505, 41.8865],
      zoom: 11.4,
      pitch: 68,
      bearing: -24,
      speed: 0.5
    });
  }, [selectedPlace, selectedTrip]);

  const routeSummary = selectedTrip ? `${selectedTrip.origin_name} to ${selectedTrip.destination_name}` : "No route selected";
  const routeTiming = selectedTrip
    ? new Date(selectedTrip.start_time).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      })
    : null;

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-night-900/70 shadow-glow">
      <div className="pointer-events-none absolute left-6 top-6 z-10 rounded-full border border-white/10 bg-slate-950/45 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-slate-100 backdrop-blur">
        Chicago 3D
      </div>
      {selectedTrip ? (
        <div className="pointer-events-none absolute right-6 top-6 z-10 max-w-sm rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-slate-100 backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200">Route in focus</p>
          <h2 className="mt-1 text-base font-semibold">{selectedTrip.title}</h2>
          <p className="mt-1 text-sm text-slate-300">{routeSummary}</p>
          {routeTiming ? <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{routeTiming}</p> : null}
        </div>
      ) : null}
      <div ref={mapContainerRef} className="min-h-[78vh] w-full" />
      {selectedPlace ? (
        <div className="pointer-events-none absolute bottom-6 left-6 z-10 max-w-md rounded-2xl border border-white/10 bg-slate-950/55 px-5 py-4 text-slate-100 backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200">{selectedPlace.category}</p>
          <h2 className="mt-2 text-2xl font-semibold">{selectedPlace.name}</h2>
          <p className="mt-1 text-sm text-slate-300">{selectedPlace.area}</p>
          <p className="mt-3 text-sm text-slate-200">
            Visited {selectedPlace.visit_count} time(s), last on{" "}
            {new Date(selectedPlace.last_visited_at).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit"
            })}
          </p>
          <p className="mt-1 text-sm text-slate-400">{selectedPlace.last_trip_title}</p>
        </div>
      ) : (
        <div className="pointer-events-none absolute bottom-6 left-6 z-10 rounded-2xl border border-white/10 bg-slate-950/55 px-5 py-4 text-sm text-slate-300 backdrop-blur">
          No recent Chicago places in this filter window yet.
        </div>
      )}
    </div>
  );
}

export function TimeFilterBar({
  window,
  onChange
}: {
  window: "day" | "week" | "month";
  onChange: (value: "day" | "week" | "month") => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {(["day", "week", "month"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cn(
            "rounded-full px-3 py-2 text-sm capitalize transition",
            item === window
              ? "bg-gradient-to-br from-cyan-300 to-amber-300 text-slate-950"
              : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
          )}
        >
          Last {item}
        </button>
      ))}
    </div>
  );
}
