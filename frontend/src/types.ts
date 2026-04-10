export type FeatureType = "pickup" | "dropoff" | "hazard" | "parking" | "closure";
export type FeatureStatus = "draft" | "review" | "approved" | "published";
export type FeaturePriority = "high" | "medium" | "low";

export interface MapFeature {
  id: string;
  title: string;
  type: FeatureType;
  status: FeatureStatus;
  priority: FeaturePriority;
  x: number;
  y: number;
  area: string;
  notes: string;
  assignee: string;
  created_at: string;
  last_updated: string;
}

export interface ActivityItem {
  timestamp: string;
  message: string;
}

export interface Metrics {
  total_features: number;
  status_counts: Record<string, number>;
  type_counts: Record<string, number>;
  published_features: number;
  action_required: number;
  rider_zones: number;
  live_hazards: number;
}

export interface MapState {
  project_name: string;
  region: string;
  version: string;
  published_version: string;
  updated_at: string;
  features: MapFeature[];
  activity: ActivityItem[];
  metrics: Metrics;
}

export interface DashboardSummary {
  project_name: string;
  region: string;
  version: string;
  published_version: string;
  updated_at: string;
  total_places: number;
  total_trips: number;
  total_distance_km: number;
  latest_trip_title: string | null;
  metrics: Metrics;
}

export interface Place {
  public_id: string;
  name: string;
  category: string;
  city: string;
  area: string;
  latitude: number;
  longitude: number;
  notes: string;
  best_pickup_notes: string;
  best_dropoff_notes: string;
  parking_notes: string;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  public_id: string;
  title: string;
  mode: string;
  city: string;
  origin_name: string;
  destination_name: string;
  start_time: string;
  end_time: string | null;
  distance_km: number | null;
  duration_minutes: number | null;
  rating: number | null;
  notes: string;
  route_summary: string;
  route_geojson: RouteFeature | null;
  created_at: string;
  updated_at: string;
}

export interface RouteGeometry {
  type: "LineString";
  coordinates: [number, number][];
}

export interface RouteFeature {
  type: "Feature";
  properties?: Record<string, unknown>;
  geometry: RouteGeometry;
}

export interface RecentPlaceVisit {
  place_id: string;
  name: string;
  category: string;
  area: string;
  latitude: number;
  longitude: number;
  visit_count: number;
  last_visited_at: string;
  last_trip_title: string;
  recent_trip_ids: string[];
}

export interface RecentPlacesResponse {
  window: "day" | "week" | "month";
  reference_time: string;
  places: RecentPlaceVisit[];
}

export interface CreateFeaturePayload {
  title: string;
  type: FeatureType;
  priority: FeaturePriority;
  x: number;
  y: number;
  area: string;
  notes: string;
}
