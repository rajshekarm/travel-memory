import type { Place } from "../../types";

type FavoritePlacesProps = {
  places: Place[];
};

export function FavoritePlaces({ places }: FavoritePlacesProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-night-900/80 p-5 shadow-glow">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Favorite Places</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Places I want to remember</h2>
      </div>

      <div className="space-y-3">
        {places.map((place) => (
          <div key={place.public_id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium text-white">{place.name}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
              {place.category} • {place.area}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {place.best_pickup_notes || "A meaningful place from my journey."}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}