import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CarFront,
  Clock3,
  GitBranchPlus,
  MapPinned,
  Navigation,
  Route,
  Sparkles,
  UploadCloud
} from "lucide-react";
import { format } from "date-fns";

import { api } from "./lib/api";
import { cn } from "./lib/utils";
import { FeatureForm } from "./components/FeatureForm";
import { MapCanvas } from "./components/MapCanvas";
import { RecentChicago3DMap, TimeFilterBar } from "./components/RecentChicago3DMap";
import { ErrorState, GlassPanel, LoadingState, MetricCard, StatChip } from "./components/ui";
import type {
  CreateFeaturePayload,
  FeaturePriority,
  FeatureStatus,
  FeatureType,
  Trip
} from "./types";

const featureTypeStyles: Record<FeatureType, string> = {
  pickup: "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/20",
  dropoff: "bg-amber-300/15 text-amber-200 ring-1 ring-amber-300/20",
  hazard: "bg-rose-400/15 text-rose-300 ring-1 ring-rose-300/20",
  parking: "bg-indigo-400/15 text-indigo-200 ring-1 ring-indigo-300/20",
  closure: "bg-orange-400/15 text-orange-300 ring-1 ring-orange-300/20"
};

const statusStyles: Record<FeatureStatus, string> = {
  draft: "bg-rose-400/15 text-rose-200 ring-1 ring-rose-300/20",
  review: "bg-amber-400/15 text-amber-200 ring-1 ring-amber-300/20",
  approved: "bg-sky-400/15 text-sky-200 ring-1 ring-sky-300/20",
  published: "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/20"
};

const visibleFeatureTypes: FeatureType[] = ["pickup", "dropoff", "hazard", "parking", "closure"];
const statusFlow: Array<Exclude<FeatureStatus, "published">> = ["draft", "review", "approved"];
type ViewMode = "full" | "map";
type TimeWindow = "day" | "week" | "month";

function formatTimestamp(timestamp: string) {
  return format(new Date(timestamp), "MMM d, h:mm a");
}

function getWindowStart(trips: Trip[], window: TimeWindow) {
  if (!trips.length) {
    return null;
  }

  const referenceTime = trips.reduce((latest, trip) => {
    const tripTime = new Date(trip.start_time).getTime();
    return Math.max(latest, tripTime);
  }, 0);

  const durationMs =
    window === "day" ? 24 * 60 * 60 * 1000 : window === "week" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;

  return referenceTime - durationMs;
}

function App() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("full");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("week");
  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(null);
  const [selectedRecentPlaceId, setSelectedRecentPlaceId] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<FeatureType[]>(visibleFeatureTypes);
  const [coords, setCoords] = useState({ x: "", y: "" });
  const [form, setForm] = useState<CreateFeaturePayload>({
    title: "",
    type: "pickup",
    priority: "medium" satisfies FeaturePriority,
    x: 0,
    y: 0,
    area: "",
    notes: ""
  });

  const stateQuery = useQuery({ queryKey: ["state"], queryFn: api.getState });
  const summaryQuery = useQuery({ queryKey: ["summary"], queryFn: api.getSummary });
  const placesQuery = useQuery({ queryKey: ["places"], queryFn: api.getPlaces });
  const tripsQuery = useQuery({ queryKey: ["trips"], queryFn: api.getTrips });
  const recentPlacesQuery = useQuery({
    queryKey: ["recent-places", timeWindow],
    queryFn: () => api.getRecentPlaces(timeWindow)
  });

  const createFeature = useMutation({
    mutationFn: api.createFeature,
    onSuccess: (nextState) => {
      queryClient.setQueryData(["state"], nextState);
      void queryClient.invalidateQueries({ queryKey: ["summary"] });
      const created = nextState.features.find((item) => item.title === form.title);
      setActiveFeatureId(created?.id ?? nextState.features[0]?.id ?? null);
      setForm({ title: "", type: "pickup", priority: "medium", x: 0, y: 0, area: "", notes: "" });
      setCoords({ x: "", y: "" });
    }
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "draft" | "review" | "approved" }) =>
      api.updateFeatureStatus(id, status),
    onSuccess: (nextState) => {
      queryClient.setQueryData(["state"], nextState);
      void queryClient.invalidateQueries({ queryKey: ["summary"] });
    }
  });

  const publish = useMutation({
    mutationFn: api.publish,
    onSuccess: (nextState) => {
      queryClient.setQueryData(["state"], nextState);
      void queryClient.invalidateQueries({ queryKey: ["summary"] });
    }
  });

  const state = stateQuery.data;
  const summary = summaryQuery.data;
  const places = placesQuery.data ?? [];
  const trips = tripsQuery.data ?? [];
  const recentPlaces = recentPlacesQuery.data?.places ?? [];
  const filteredTrips = useMemo(() => {
    const threshold = getWindowStart(trips, timeWindow);
    if (threshold === null) {
      return [];
    }

    return trips.filter((trip) => {
      const tripTime = new Date(trip.start_time).getTime();
      return trip.city === "Chicago" && tripTime >= threshold && trip.route_geojson?.geometry.coordinates.length;
    });
  }, [timeWindow, trips]);

  const visibleFeatures = useMemo(() => {
    if (!state) {
      return [];
    }
    return state.features.filter((feature) => visibleTypes.includes(feature.type));
  }, [state, visibleTypes]);

  const activeFeature = useMemo(() => {
    if (!visibleFeatures.length) {
      return null;
    }
    return visibleFeatures.find((feature) => feature.id === activeFeatureId) ?? visibleFeatures[0];
  }, [activeFeatureId, visibleFeatures]);

  useEffect(() => {
    if (!recentPlaces.length) {
      return;
    }
    if (!selectedRecentPlaceId || !recentPlaces.some((place) => place.place_id === selectedRecentPlaceId)) {
      setSelectedRecentPlaceId(recentPlaces[0].place_id);
    }
  }, [recentPlaces, selectedRecentPlaceId]);

  useEffect(() => {
    if (!filteredTrips.length) {
      if (selectedTripId !== null) {
        setSelectedTripId(null);
      }
      return;
    }

    if (!selectedTripId || !filteredTrips.some((trip) => trip.public_id === selectedTripId)) {
      setSelectedTripId(filteredTrips[0].public_id);
    }
  }, [filteredTrips, selectedTripId]);

  const handleMapClick = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (((event.clientX - bounds.left) / bounds.width) * 100).toFixed(1);
    const y = (((event.clientY - bounds.top) / bounds.height) * 100).toFixed(1);
    setCoords({ x, y });
    setForm((current) => ({ ...current, x: Number(x), y: Number(y) }));
  };

  const toggleType = (type: FeatureType) => {
    setVisibleTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
    );
  };

  if (stateQuery.isLoading || summaryQuery.isLoading) {
    return <LoadingState />;
  }

  if (stateQuery.isError || summaryQuery.isError || !state || !summary) {
    return <ErrorState />;
  }

  return (
    <div className="min-h-screen bg-page-grid px-3 py-4 text-slate-100 md:px-5 md:py-5">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4">
        {viewMode === "full" ? (
          <>
            <header className="overflow-hidden rounded-[28px] border border-white/10 bg-night-900/90 shadow-glow">
              <div className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-cyan-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    Personal Mobility Intelligence
                  </div>
                  <h1 className="font-display text-3xl font-semibold leading-none tracking-[-0.05em] md:text-5xl">
                    Personal Road Intelligence Map
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                    A travel-ops dashboard for routes, pickups, hazards, and trip memory.
                  </p>
                </div>

                <div className="flex flex-col gap-3 lg:w-[520px]">
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <StatChip label="Draft Version" value={state.version} icon={<GitBranchPlus className="h-4 w-4" />} />
                    <StatChip label="Published" value={state.published_version} icon={<UploadCloud className="h-4 w-4" />} />
                    <button
                      className="rounded-3xl bg-gradient-to-br from-cyan-300 to-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => publish.mutate()}
                      disabled={publish.isPending}
                    >
                      Publish Approved
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/80">Travel Memory</p>
                      <p className="mt-1 text-sm text-slate-300">
                        {summary.total_trips} trips, {summary.total_places} places, {summary.total_distance_km} km
                      </p>
                    </div>
                    <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1">
                      <button
                        type="button"
                        onClick={() => setViewMode("full")}
                        className={cn(
                          "rounded-xl px-4 py-2 text-sm font-medium transition",
                          viewMode === "full"
                            ? "bg-gradient-to-br from-cyan-300 to-amber-300 text-slate-950"
                            : "text-slate-300 hover:bg-white/10"
                        )}
                      >
                        Full View
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("map")}
                        className={cn(
                          "rounded-xl px-4 py-2 text-sm font-medium transition",
                          viewMode === "map"
                            ? "bg-gradient-to-br from-cyan-300 to-amber-300 text-slate-950"
                            : "text-slate-300 hover:bg-white/10"
                        )}
                      >
                        3D View
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </header>
          </>
        ) : (
          <header className="rounded-[24px] border border-white/10 bg-night-900/80 px-4 py-3 shadow-glow">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  3D View
                </div>
                <h1 className="mt-1 truncate font-display text-xl font-semibold tracking-[-0.04em] text-white md:text-2xl">
                  Personal Road Intelligence Map
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 md:block">
                  {state.version}
                </div>
                <button
                  className="rounded-2xl bg-gradient-to-br from-cyan-300 to-amber-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => publish.mutate()}
                  disabled={publish.isPending}
                >
                  Publish
                </button>
                <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("full")}
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm font-medium transition",
                      viewMode === "full"
                        ? "bg-gradient-to-br from-cyan-300 to-amber-300 text-slate-950"
                        : "text-slate-300 hover:bg-white/10"
                    )}
                  >
                    Full
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("map")}
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm font-medium transition",
                      viewMode === "map"
                        ? "bg-gradient-to-br from-cyan-300 to-amber-300 text-slate-950"
                        : "text-slate-300 hover:bg-white/10"
                    )}
                  >
                    3D
                  </button>
                </div>
              </div>
            </div>
          </header>
        )}

        {viewMode === "full" ? (
          <>
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Published Features" value={state.metrics.published_features} hint="Live routing intelligence" />
              <MetricCard label="Needs Action" value={state.metrics.action_required} hint="Drafts and review work" />
              <MetricCard label="Pickup + Dropoff" value={state.metrics.rider_zones} hint="Passenger-ready curb knowledge" />
              <MetricCard label="Latest Trip" value={summary.latest_trip_title ?? "No trips"} hint="Most recent mobility memory" />
            </section>

            <main className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
              <aside className="space-y-4">
                <GlassPanel title="Layers" pill={state.region}>
                  <div className="grid grid-cols-2 gap-2">
                    {visibleFeatureTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleType(type)}
                        className={cn(
                          "rounded-2xl px-3 py-3 text-left text-sm capitalize transition",
                          visibleTypes.includes(type)
                            ? "border border-white/10 bg-white/10 text-white"
                            : "border border-white/5 bg-white/5 text-slate-400"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </GlassPanel>

                <GlassPanel title="Feature Queue" pill={`${visibleFeatures.length} items`}>
                  <div className="space-y-2">
                    {visibleFeatures.map((feature) => (
                      <button
                        key={feature.id}
                        type="button"
                        onClick={() => setActiveFeatureId(feature.id)}
                        className={cn(
                          "w-full rounded-2xl border p-3 text-left transition",
                          activeFeature?.id === feature.id
                            ? "border-cyan-300/35 bg-cyan-300/10"
                            : "border-white/5 bg-white/5 hover:border-white/15 hover:bg-white/10"
                        )}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span className={cn("rounded-full px-2 py-1 text-[11px] uppercase tracking-[0.18em]", featureTypeStyles[feature.type])}>
                            {feature.type}
                          </span>
                          <span className={cn("rounded-full px-2 py-1 text-[11px] uppercase tracking-[0.18em]", statusStyles[feature.status])}>
                            {feature.status}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-white">{feature.title}</div>
                        <div className="mt-1 text-xs text-slate-400">{feature.area} • priority {feature.priority}</div>
                      </button>
                    ))}
                  </div>
                </GlassPanel>

                <GlassPanel title="Saved Places" pill={`${places.length} memory anchors`}>
                  <div className="space-y-3">
                    {places.slice(0, 3).map((place) => (
                      <div key={place.public_id} className="rounded-2xl border border-white/5 bg-white/5 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-white">{place.name}</p>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{place.category} • {place.area}</p>
                          </div>
                          <MapPinned className="h-4 w-4 text-cyan-200" />
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{place.best_pickup_notes}</p>
                      </div>
                    ))}
                  </div>
                </GlassPanel>
              </aside>

              <section className="space-y-4">
                <GlassPanel title="West Loop Mobility Surface" pill="Click map to stage a new annotation" icon={<Navigation className="h-4 w-4" />}>
                  <MapCanvas
                    features={visibleFeatures}
                    activeFeatureId={activeFeature?.id ?? null}
                    stagedCoords={coords}
                    onSelect={setActiveFeatureId}
                    onMapClick={handleMapClick}
                  />
                </GlassPanel>

                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <GlassPanel title="Recent Activity" pill="Map maintenance">
                    <div className="space-y-2">
                      {state.activity.map((item) => (
                        <div key={`${item.timestamp}-${item.message}`} className="rounded-2xl border border-white/5 bg-white/5 p-3">
                          <p className="text-sm leading-6 text-slate-200">{item.message}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{formatTimestamp(item.timestamp)}</p>
                        </div>
                      ))}
                    </div>
                  </GlassPanel>

                  <GlassPanel title="Journey Memory" pill={`${trips.length} trips`}>
                    <div className="space-y-3">
                      {trips.slice(0, 3).map((trip) => (
                        <div key={trip.public_id} className="rounded-2xl border border-white/5 bg-white/5 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-white">{trip.title}</p>
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{trip.mode} • {trip.origin_name} to {trip.destination_name}</p>
                            </div>
                            <Route className="h-4 w-4 text-cyan-200" />
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-300">{trip.route_summary}</p>
                        </div>
                      ))}
                    </div>
                  </GlassPanel>
                </div>
              </section>

              <aside className="space-y-4">
                <GlassPanel title="Selected Feature" pill={activeFeature ? activeFeature.status : "No selection"} icon={<AlertTriangle className="h-4 w-4" />}>
                  {activeFeature ? (
                    <div className="space-y-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("rounded-full px-2 py-1 text-[11px] uppercase tracking-[0.18em]", featureTypeStyles[activeFeature.type])}>{activeFeature.type}</span>
                          <span className={cn("rounded-full px-2 py-1 text-[11px] uppercase tracking-[0.18em]", statusStyles[activeFeature.status])}>{activeFeature.status}</span>
                        </div>
                        <h2 className="mt-3 text-xl font-semibold text-white">{activeFeature.title}</h2>
                        <p className="mt-3 text-sm leading-7 text-slate-300">{activeFeature.notes}</p>
                      </div>
                      <dl className="grid gap-2 text-sm text-slate-300">
                        <div className="flex justify-between gap-3 rounded-2xl bg-white/5 px-3 py-2"><dt>Area</dt><dd>{activeFeature.area}</dd></div>
                        <div className="flex justify-between gap-3 rounded-2xl bg-white/5 px-3 py-2"><dt>Coordinates</dt><dd>{activeFeature.x.toFixed(1)}, {activeFeature.y.toFixed(1)}</dd></div>
                        <div className="flex justify-between gap-3 rounded-2xl bg-white/5 px-3 py-2"><dt>Updated</dt><dd>{formatTimestamp(activeFeature.last_updated)}</dd></div>
                      </dl>
                      {activeFeature.status !== "published" ? (
                        <div className="flex flex-wrap gap-2">
                          {statusFlow.filter((status) => status !== activeFeature.status).map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => updateStatus.mutate({ id: activeFeature.id, status })}
                              className="rounded-2xl bg-gradient-to-br from-cyan-300 to-amber-300 px-3 py-2 text-sm font-semibold text-slate-950"
                            >
                              Move to {status}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm leading-7 text-slate-300">Select a visible feature to inspect its notes and workflow state.</p>
                  )}
                </GlassPanel>

                <GlassPanel title="Add Annotation" pill="Map click first" icon={<CarFront className="h-4 w-4" />}>
                  <FeatureForm
                    form={form}
                    coords={coords}
                    region={state.region}
                    pending={createFeature.isPending}
                    setCoords={setCoords}
                    setForm={setForm}
                    onSubmit={(event) => {
                      event.preventDefault();
                      createFeature.mutate(form);
                    }}
                  />
                </GlassPanel>

                <GlassPanel title="System Lens" pill="Why this matters" icon={<Clock3 className="h-4 w-4" />}>
                  <div className="space-y-3 text-sm leading-7 text-slate-300">
                    <p>
                      This frontend is intentionally shaped like an internal map operations tool rather than a generic map app. That makes the project stronger for autonomous mobility roles.
                    </p>
                    <p>
                      The left side manages operational state, the center acts like a lightweight review surface, and the right side combines QA workflow with knowledge capture.
                    </p>
                  </div>
                </GlassPanel>
              </aside>
            </main>
          </>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-night-900/80 px-4 py-3 shadow-glow">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Recent Visits</p>
                <p className="mt-1 text-sm text-slate-300">Explore Chicago in interactive 3D with the places and routes from your recent trips.</p>
              </div>
              <TimeFilterBar window={timeWindow} onChange={setTimeWindow} />
            </div>

            {filteredTrips.length ? (
              <div className="flex gap-2 overflow-x-auto rounded-[22px] border border-white/10 bg-night-900/75 px-3 py-3 shadow-glow">
                {filteredTrips.map((trip) => {
                  const active = trip.public_id === selectedTripId;
                  return (
                    <button
                      key={trip.public_id}
                      type="button"
                      onClick={() => setSelectedTripId(trip.public_id)}
                      className={cn(
                        "min-w-[220px] rounded-2xl border px-3 py-2 text-left transition",
                        active
                          ? "border-cyan-300/35 bg-cyan-300/10 text-white"
                          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                      )}
                    >
                      <p className="truncate text-sm font-medium">{trip.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                        {trip.origin_name} to {trip.destination_name}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : null}

            <RecentChicago3DMap
              places={recentPlaces}
              trips={filteredTrips}
              selectedPlaceId={selectedRecentPlaceId}
              selectedTripId={selectedTripId}
              onSelectPlace={setSelectedRecentPlaceId}
              onSelectTrip={setSelectedTripId}
            />
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
