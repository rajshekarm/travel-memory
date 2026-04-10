import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { NavigationControl, ScaleControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { RecentPlaceVisit, Trip } from "../types";
import { cn } from "../lib/utils";

type JourneyMode = "live" | "history" | "patterns";
type TimeWindow = "today" | "week" | "month" | "all";

type PlaceCategory =
  | "restaurant"
  | "cafe"
  | "bar"
  | "home"
  | "work"
  | "gym"
  | "shopping"
  | "airport"
  | "hotel"
  | "park"
  | "other";
type TripBucket = "current" | "recent" | "week" | "month";

type JourneyMapProps = {
  places: RecentPlaceVisit[];
  trips: Trip[];
  selectedPlaceId: string | null;
  selectedTripId: string | null;
  onSelectPlace: (placeId: string) => void;
  onSelectTrip: (tripId: string) => void;
  currentTripId?: string | null;
};

type TripFeatureProps = {
  tripId: string;
  title: string;
  bucket: TripBucket;
  startedAt: string;
  tripCount: number;
};

type PlacePointProps = {
  placeId: string;
  name: string;
  area: string;
  visitCount: number;
  lastVisitedAt: string;
  category: PlaceCategory;
  bucket: "recent" | "week" | "month" | "frequent";
};

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

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getAgeDays(timestamp?: string | null) {
  if (!timestamp) return Number.POSITIVE_INFINITY;
  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) return Number.POSITIVE_INFINITY;
  return (Date.now() - time) / (1000 * 60 * 60 * 24);
}

function getTripBucket(trip: Trip, currentTripId?: string | null): TripBucket {
  if (currentTripId && trip.public_id === currentTripId) return "current";

  const ageDays = getAgeDays(trip.start_time);
  if (ageDays <= 1) return "recent";
  if (ageDays <= 7) return "week";
  return "month";
}

function isTripInsideWindow(trip: Trip, window: TimeWindow, currentTripId?: string | null) {
  if (currentTripId && trip.public_id === currentTripId) return true;

  const ageDays = getAgeDays(trip.start_time);
  if (window === "today") return ageDays <= 1;
  if (window === "week") return ageDays <= 7;
  return ageDays <= 30;
}

function normalizeCategory(value?: string | null): PlaceCategory {
  const normalized = (value ?? "").trim().toLowerCase();

  if (["restaurant", "food", "dining"].includes(normalized)) return "restaurant";
  if (["cafe", "coffee", "coffee shop"].includes(normalized)) return "cafe";
  if (["bar", "pub", "lounge"].includes(normalized)) return "bar";
  if (["home", "house"].includes(normalized)) return "home";
  if (["work", "office"].includes(normalized)) return "work";
  if (["gym", "fitness"].includes(normalized)) return "gym";
  if (["shopping", "store", "mall"].includes(normalized)) return "shopping";
  if (["airport"].includes(normalized)) return "airport";
  if (["hotel"].includes(normalized)) return "hotel";
  if (["park"].includes(normalized)) return "park";
  return "other";
}

function getPlaceBucket(place: RecentPlaceVisit): PlacePointProps["bucket"] {
  const ageDays = getAgeDays(place.last_visited_at);
  if (place.visit_count >= 6) return "frequent";
  if (ageDays <= 1) return "recent";
  if (ageDays <= 7) return "week";
  return "month";
}

function isPlaceInsideWindow(place: RecentPlaceVisit, window: TimeWindow) {
  const ageDays = getAgeDays(place.last_visited_at);
  if (window === "today") return ageDays <= 1 || place.visit_count >= 6;
  if (window === "week") return ageDays <= 7 || place.visit_count >= 6;
  if (window === "month") return ageDays <= 30 || place.visit_count >= 6;
  return true;
}

function buildBounds(coordinates: [number, number][]) {
  const bounds = new maplibregl.LngLatBounds(coordinates[0], coordinates[0]);
  for (const coordinate of coordinates.slice(1)) bounds.extend(coordinate);
  return bounds;
}

function buildTripCollection(
  trips: Trip[],
  currentTripId?: string | null
): GeoJSON.FeatureCollection<GeoJSON.LineString, TripFeatureProps> {
  return {
    type: "FeatureCollection",
    features: trips
      .filter((trip) => trip.route_geojson?.geometry.type === "LineString")
      .map((trip) => ({
        type: "Feature" as const,
        properties: {
          tripId: trip.public_id,
          title: trip.title,
          bucket: getTripBucket(trip, currentTripId),
          startedAt: trip.start_time,
          tripCount: 1
        },
        geometry: {
          type: "LineString" as const,
          coordinates: trip.route_geojson?.geometry.coordinates ?? []
        }
      }))
  };
}

function buildSelectedTripCollection(
  trip: Trip | null
): GeoJSON.FeatureCollection<GeoJSON.LineString, Pick<TripFeatureProps, "tripId" | "title" | "bucket" | "startedAt" | "tripCount">> {
  if (!trip || trip.route_geojson?.geometry.type !== "LineString") {
    return { type: "FeatureCollection", features: [] };
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          tripId: trip.public_id,
          title: trip.title,
          bucket: getTripBucket(trip),
          startedAt: trip.start_time,
          tripCount: 1
        },
        geometry: {
          type: "LineString",
          coordinates: trip.route_geojson.geometry.coordinates
        }
      }
    ]
  };
}

function buildPlacePointCollection(
  places: RecentPlaceVisit[]
): GeoJSON.FeatureCollection<GeoJSON.Point, PlacePointProps> {
  return {
    type: "FeatureCollection",
    features: places.map((place) => ({
      type: "Feature" as const,
      properties: {
        placeId: place.place_id,
        name: place.name,
        area: place.area,
        visitCount: place.visit_count,
        lastVisitedAt: place.last_visited_at,
        category: normalizeCategory(place.category),
        bucket: getPlaceBucket(place)
      },
      geometry: {
        type: "Point" as const,
        coordinates: [place.longitude, place.latitude]
      }
    }))
  };
}



function getRelatedTripsForPlace(place: RecentPlaceVisit, trips: Trip[]) {
  return trips.filter((trip) => place.recent_trip_ids?.includes(trip.public_id));
}

function buildHotspotCollection(
  places: RecentPlaceVisit[]
): GeoJSON.FeatureCollection<GeoJSON.Point, PlacePointProps> {
  return {
    type: "FeatureCollection",
    features: places
      .filter((place) => place.visit_count >= 2)
      .map((place) => ({
        type: "Feature" as const,
        properties: {
          placeId: place.place_id,
          name: place.name,
          area: place.area,
          visitCount: place.visit_count,
          lastVisitedAt: place.last_visited_at,
          category: place.category,
          bucket: getPlaceBucket(place)
        },
        geometry: {
          type: "Point" as const,
          coordinates: [place.longitude, place.latitude]
        }
      }))
  };
}

const defaultCenter: [number, number] = [-87.6505, 41.8865];

function ensureMapLayers(map: maplibregl.Map) {
  if (!map.getSource("chicago-buildings")) {
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
  }

  if (!map.getSource("journey-routes")) {
    map.addSource("journey-routes", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] }
    });
  }

  if (!map.getLayer("journey-routes-glow")) {
    map.addLayer({
      id: "journey-routes-glow",
      type: "line",
      source: "journey-routes",
      paint: {
        "line-color": [
          "match",
          ["get", "bucket"],
          "current", "#7ae7ff",
          "recent", "#60a5fa",
          "week", "#f4cc72",
          "month", "#c084fc",
          "#7ae7ff"
        ],
        "line-width": [
          "match",
          ["get", "bucket"],
          "current", 14,
          "recent", 9,
          "week", 7,
          "month", 5,
          5
        ],
        "line-opacity": [
          "match",
          ["get", "bucket"],
          "current", 0.22,
          "recent", 0.14,
          "week", 0.12,
          "month", 0.08,
          0.08
        ],
        "line-blur": 12
      }
    });
  }

  if (!map.getLayer("journey-routes-line")) {
    map.addLayer({
      id: "journey-routes-line",
      type: "line",
      source: "journey-routes",
      paint: {
        "line-color": [
          "match",
          ["get", "bucket"],
          "current", "#7ae7ff",
          "recent", "#60a5fa",
          "week", "#f4cc72",
          "month", "#c084fc",
          "#7ae7ff"
        ],
        "line-width": [
          "match",
          ["get", "bucket"],
          "current", 6,
          "recent", 4,
          "week", 3,
          "month", 2,
          2
        ],
        "line-opacity": [
          "match",
          ["get", "bucket"],
          "current", 0.98,
          "recent", 0.8,
          "week", 0.72,
          "month", 0.48,
          0.48
        ]
      }
    });
  }

  if (!map.getSource("selected-trip-route")) {
    map.addSource("selected-trip-route", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] }
    });
  }

  if (!map.getLayer("selected-trip-route-glow")) {
    map.addLayer({
      id: "selected-trip-route-glow",
      type: "line",
      source: "selected-trip-route",
      paint: {
        "line-color": "#ffffff",
        "line-width": 18,
        "line-opacity": 0.18,
        "line-blur": 10
      }
    });
  }

  if (!map.getLayer("selected-trip-route-line")) {
    map.addLayer({
      id: "selected-trip-route-line",
      type: "line",
      source: "selected-trip-route",
      paint: {
        "line-color": "#f8fafc",
        "line-width": 5,
        "line-opacity": 1
      }
    });
  }

  if (!map.getSource("place-points")) {
    map.addSource("place-points", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] }
    });
  }

  if (!map.getLayer("place-points-circle")) {
    map.addLayer({
      id: "place-points-circle",
      type: "circle",
      source: "place-points",
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["get", "visitCount"],
          1, 5,
          3, 8,
          6, 12,
          12, 18
        ],
        "circle-color": [
          "match",
          ["get", "category"],
          "restaurant", "#fb7185",
          "cafe", "#f59e0b",
          "bar", "#a78bfa",
          "home", "#7dd3fc",
          "work", "#60a5fa",
          "gym", "#34d399",
          "shopping", "#f472b6",
          "airport", "#cbd5e1",
          "hotel", "#fde68a",
          "park", "#86efac",
          "#94a3b8"
        ],
        "circle-opacity": 0.9,
        "circle-stroke-color": "rgba(255,255,255,0.8)",
        "circle-stroke-width": 1.5
      }
    });
  }

  if (!map.getLayer("place-points-label")) {
    map.addLayer({
      id: "place-points-label",
      type: "symbol",
      source: "place-points",
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Open Sans SemiBold"],
        "text-size": 11,
        "text-offset": [0, 1.35],
        "text-anchor": "top",
        "text-optional": true
      },
      paint: {
        "text-color": "rgba(226,232,240,0.92)",
        "text-halo-color": "rgba(2,6,23,0.88)",
        "text-halo-width": 1
      }
    });
  }

  if (!map.getSource("hotspots")) {
    map.addSource("hotspots", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] }
    });
  }

  if (!map.getLayer("hotspots-heat")) {
    map.addLayer({
      id: "hotspots-heat",
      type: "heatmap",
      source: "hotspots",
      maxzoom: 15,
      paint: {
        "heatmap-weight": [
          "interpolate",
          ["linear"],
          ["get", "visitCount"],
          1, 0.15,
          12, 1
        ],
        "heatmap-intensity": 0.9,
        "heatmap-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10, 18,
          14, 34
        ],
        "heatmap-opacity": 0.45,
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0, "rgba(0,0,0,0)",
          0.2, "rgba(96,165,250,0.3)",
          0.5, "rgba(244,204,114,0.55)",
          0.8, "rgba(251,113,133,0.75)",
          1, "rgba(255,255,255,0.92)"
        ]
      }
    });
  }
}

export function JourneyMap({
  places,
  trips,
  selectedPlaceId,
  selectedTripId,
  onSelectPlace,
  onSelectTrip,
  currentTripId
}: JourneyMapProps) {

  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory | "all">("all");
  const [mode, setMode] = useState<JourneyMode>("history");
  const [window, setWindow] = useState<TimeWindow>("week");

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const styleLoadedRef = useRef(false);

  const visibleTrips = useMemo(() => {
    const filtered = trips.filter((trip) => isTripInsideWindow(trip, window, currentTripId));

    if (mode === "live") {
      return filtered.filter((trip) => getTripBucket(trip, currentTripId) === "current" || getAgeDays(trip.start_time) <= 2);
    }

    if (mode === "history") {
      return filtered;
    }

    return filtered.filter((trip) => getAgeDays(trip.start_time) <= 30);
  }, [currentTripId, mode, trips, window]);

  const visiblePlaces = useMemo(() => {
    const filtered = places.filter((place) => isPlaceInsideWindow(place, window));

    const categoryFiltered = selectedCategory === "all"
      ? filtered
      : filtered.filter((place) => normalizeCategory(place.category) === selectedCategory);

    if (mode === "live") {
      return categoryFiltered.filter((place) => getPlaceBucket(place) === "recent" || place.visit_count >= 6);
    }

    if (mode === "history") {
      return categoryFiltered;
    }

    return categoryFiltered.filter((place) => place.visit_count >= 2);
  }, [mode, places, selectedCategory, window]);

  const selectedTrip = useMemo(
    () => visibleTrips.find((trip) => trip.public_id === selectedTripId) ?? visibleTrips[0] ?? null,
    [selectedTripId, visibleTrips]
  );

  const selectedPlace = useMemo(
    () => visiblePlaces.find((place) => place.place_id === selectedPlaceId) ?? visiblePlaces[0] ?? null,
    [selectedPlaceId, visiblePlaces]
  );

  const summaryCounts = useMemo(() => {
    const current = visibleTrips.filter((trip) => getTripBucket(trip, currentTripId) === "current").length;
    const recent = visibleTrips.filter((trip) => getTripBucket(trip, currentTripId) === "recent").length;
    const weekTrips = visibleTrips.filter((trip) => getTripBucket(trip, currentTripId) === "week").length;
    const monthTrips = visibleTrips.filter((trip) => getTripBucket(trip, currentTripId) === "month").length;
    const restaurants = visiblePlaces.filter((place) => normalizeCategory(place.category) === "restaurant").length;

    return { current, recent, weekTrips, monthTrips, restaurants };
  }, [currentTripId, visiblePlaces, visibleTrips]);

  const relatedTrips = useMemo(() => {
    if (!selectedPlace) return [];
    return getRelatedTripsForPlace(selectedPlace, trips).slice(0, 3);
  }, [selectedPlace, trips]);

  const categories = useMemo(() => {
    const set = new Set<PlaceCategory>();
    places.forEach((place) => set.add(normalizeCategory(place.category)));
    return ["all", ...Array.from(set)] as Array<PlaceCategory | "all">;
  }, [places]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

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
      center: defaultCenter,
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
      styleLoadedRef.current = true;
      ensureMapLayers(map);
    });

    map.on("click", "journey-routes-line", (event) => {
      const feature = event.features?.[0];
      const tripId = feature?.properties?.tripId;
      if (typeof tripId === "string") onSelectTrip(tripId);
    });

    map.on("click", "place-points-circle", (event) => {
      const feature = event.features?.[0];
      const placeId = feature?.properties?.placeId;
      if (typeof placeId === "string") onSelectPlace(placeId);
    });

    map.on("mouseenter", "journey-routes-line", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "journey-routes-line", () => {
      map.getCanvas().style.cursor = "";
    });

    map.on("mouseenter", "place-points-circle", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "place-points-circle", () => {
      map.getCanvas().style.cursor = "";
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      styleLoadedRef.current = false;
    };
  }, [onSelectPlace, onSelectTrip]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;

    const tripSource = map.getSource("journey-routes") as maplibregl.GeoJSONSource | undefined;
    const selectedTripSource = map.getSource("selected-trip-route") as maplibregl.GeoJSONSource | undefined;
    const placeSource = map.getSource("place-points") as maplibregl.GeoJSONSource | undefined;
    const hotspotSource = map.getSource("hotspots") as maplibregl.GeoJSONSource | undefined;

    tripSource?.setData(buildTripCollection(visibleTrips, currentTripId));
    selectedTripSource?.setData(buildSelectedTripCollection(selectedTrip));
    placeSource?.setData(buildPlacePointCollection(visiblePlaces));
    hotspotSource?.setData(buildHotspotCollection(visiblePlaces));

    map.setLayoutProperty("hotspots-heat", "visibility", mode === "patterns" ? "visible" : "none");
    map.setLayoutProperty("place-points-label", "visibility", mode === "live" ? "visible" : "none");
  }, [currentTripId, mode, selectedTrip, visiblePlaces, visibleTrips]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;

    const selectedCoordinates = selectedTrip?.route_geojson?.geometry.coordinates ?? [];
    if (selectedCoordinates.length > 1) {
      map.fitBounds(buildBounds(selectedCoordinates), {
        padding: { top: 140, right: 140, bottom: 120, left: 120 },
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
        zoom: 13.2,
        pitch: 72,
        bearing: -30,
        speed: 0.65
      });
      return;
    }

    map.flyTo({
      center: defaultCenter,
      zoom: 11.4,
      pitch: 68,
      bearing: -24,
      speed: 0.55
    });
  }, [selectedPlace, selectedTrip]);

  const routeSummary = selectedTrip
    ? `${selectedTrip.origin_name} to ${selectedTrip.destination_name}`
    : "No route selected";

  const routeTiming = selectedTrip ? formatDateTime(selectedTrip.start_time) : null;

  const legend = [
    { key: "current", label: "Current trip", swatch: "bg-cyan-300" },
    { key: "recent", label: "Recent trips", swatch: "bg-blue-400" },
    { key: "week", label: "Last 7 days", swatch: "bg-amber-300" },
    { key: "month", label: "Last 30 days", swatch: "bg-violet-400" }
  ] as const;

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-night-900/70 shadow-glow">
      <div className="pointer-events-none absolute left-6 top-6 z-10 rounded-full border border-white/10 bg-slate-950/45 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-slate-100 backdrop-blur">
        Journey Map
      </div>

      <div className="absolute left-6 top-20 z-10 flex flex-wrap items-center gap-2">
        {(["live", "history", "patterns"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMode(item)}
            className={cn(
              "rounded-full px-3 py-2 text-sm capitalize transition backdrop-blur",
              mode === item
                ? "bg-gradient-to-br from-cyan-300 to-amber-300 text-slate-950"
                : "border border-white/10 bg-slate-950/55 text-slate-200 hover:bg-white/10"
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="absolute left-6 top-36 z-10 flex flex-wrap items-center gap-2">
        {(["today", "week", "month", "all"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setWindow(item)}
            className={cn(
              "rounded-full px-3 py-2 text-sm capitalize transition backdrop-blur",
              window === item
                ? "bg-white text-slate-950"
                : "border border-white/10 bg-slate-950/55 text-slate-200 hover:bg-white/10"
            )}
          >
            {item === "today" ? "Today" : item === "all" ? "All time" : `Last ${item}`}
          </button>
        ))}
      </div>

      <div className="pointer-events-none absolute right-6 top-6 z-10 w-[360px] max-w-[calc(100%-3rem)] rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-4 text-slate-100 backdrop-blur">
        <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200">Map summary</p>
        <div className="mt-3 grid grid-cols-5 gap-2 text-center">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-3">
            <p className="text-lg font-semibold">{summaryCounts.current}</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Current</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-3">
            <p className="text-lg font-semibold">{summaryCounts.recent}</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Recent</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-3">
            <p className="text-lg font-semibold">{summaryCounts.weekTrips}</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">7D</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-3">
            <p className="text-lg font-semibold">{summaryCounts.monthTrips}</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">30D</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-3">
            <p className="text-lg font-semibold">{summaryCounts.restaurants}</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Food</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSelectedCategory(item)}
              className={cn(
                "pointer-events-auto rounded-full border px-3 py-1.5 text-xs capitalize transition",
                selectedCategory === item
                  ? "border-transparent bg-white text-slate-950"
                  : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-300">
          {legend.map((item) => (
            <div key={item.key} className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", item.swatch)} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedTrip ? (
        <div className="pointer-events-none absolute right-6 top-48 z-10 max-w-sm rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-slate-100 backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200">Journey in focus</p>
          <h2 className="mt-1 text-base font-semibold">{selectedTrip.title}</h2>
          <p className="mt-1 text-sm text-slate-300">{routeSummary}</p>
          {routeTiming ? (
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{routeTiming}</p>
          ) : null}
          <p className="mt-3 text-sm leading-6 text-slate-300">{selectedTrip.route_summary}</p>
        </div>
      ) : null}

      <div ref={mapContainerRef} className="min-h-[78vh] w-full" />

      {selectedPlace ? (
        <div className="pointer-events-none absolute bottom-6 left-6 z-10 max-w-md rounded-2xl border border-white/10 bg-slate-950/55 px-5 py-4 text-slate-100 backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200">Place insight</p>
          <h2 className="mt-2 text-2xl font-semibold">{selectedPlace.name}</h2>
          <p className="mt-1 text-sm text-slate-300">{selectedPlace.area}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
              {normalizeCategory(selectedPlace.category)}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
              {selectedPlace.visit_count} visits
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Last visited {formatDateTime(selectedPlace.last_visited_at)}
          </p>
          <p className="mt-3 text-sm text-slate-300">{selectedPlace.last_trip_title}</p>
        {relatedTrips.length ? (
  <div className="mt-4 space-y-2">
    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
      Related trips
    </p>

    {relatedTrips.map((trip) => (
      <button
        key={trip.public_id}
        type="button"
        onClick={() => onSelectTrip(trip.public_id)}
        className="pointer-events-auto block w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:bg-white/10"
      >
        <p className="text-sm font-medium text-slate-100">{trip.title}</p>
        <p className="mt-1 text-xs text-slate-400">
          {formatDateTime(trip.start_time)}
        </p>
      </button>
    ))}
  </div>
) : null}
        </div>
      ) : (
        <div className="pointer-events-none absolute bottom-6 left-6 z-10 rounded-2xl border border-white/10 bg-slate-950/55 px-5 py-4 text-sm text-slate-300 backdrop-blur">
          No places match this view yet.
        </div>
      )}
    </div>
  );
}
