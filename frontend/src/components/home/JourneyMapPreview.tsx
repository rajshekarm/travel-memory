import { useState } from "react";
import type { Trip, Place } from "../../types";
import { JourneyMap } from "../JourneyMap";

type JourneyMapPreviewProps = {
  trips: Trip[];
  places: Place[];
};

export function JourneyMapPreview({ trips, places }: JourneyMapPreviewProps) {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(
    places[0]?.place_id ?? null
  );
  const [selectedTripId, setSelectedTripId] = useState<string | null>(
    trips[0]?.public_id ?? null
  );

  return (
    <section className="rounded-[28px] border border-white/10 bg-night-900/80 p-5 shadow-glow">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Journey Map</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Explore your story on the map
          </h2>
        </div>

        <button className="rounded-2xl bg-gradient-to-br from-cyan-300 to-amber-300 px-4 py-2 text-sm font-semibold text-slate-950">
          View Full Map
        </button>
      </div>

      <JourneyMap
        places={places}
        trips={trips}
        selectedPlaceId={selectedPlaceId}
        selectedTripId={selectedTripId}
        onSelectPlace={setSelectedPlaceId}
        onSelectTrip={setSelectedTripId}
        currentTripId={trips[0]?.public_id ?? null}
      />

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
        <span>{trips.length} trips plotted</span>
        <span>•</span>
        <span>{places.length} places saved</span>
      </div>
    </section>
  );
}