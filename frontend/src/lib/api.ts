import type {
  CreateFeaturePayload,
  DashboardSummary,
  MapState,
  Place,
  RecentPlacesResponse,
  Trip
} from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed.");
  }

  return response.json() as Promise<T>;
}

export const api = {
  getState: () => request<MapState>("/api/state"),
  getSummary: () => request<DashboardSummary>("/api/dashboard/summary"),
  getPlaces: () => request<Place[]>("/api/places"),
  getRecentPlaces: (window: "day" | "week" | "month") =>
    request<RecentPlacesResponse>(`/api/places/visited?window=${window}`),
  getTrips: () => request<Trip[]>("/api/trips"),
  createFeature: (payload: CreateFeaturePayload) =>
    request<MapState>("/api/features", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateFeatureStatus: (id: string, status: "draft" | "review" | "approved") =>
    request<MapState>(`/api/features/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status })
    }),
  publish: () =>
    request<MapState>("/api/publish", {
      method: "POST",
      body: JSON.stringify({})
    })
};
