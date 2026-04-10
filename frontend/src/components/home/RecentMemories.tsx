import type { Trip } from "../../types";

type RecentMemoriesProps = {
  trips: Trip[];
};

export function RecentMemories({ trips }: RecentMemoriesProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-night-900/80 p-5 shadow-glow">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Recent Memories</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Trips that stayed with me</h2>
      </div>

      <div className="space-y-3">
        {trips.map((trip) => (
          <div key={trip.public_id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium text-white">{trip.title}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
              {trip.origin_name} to {trip.destination_name}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {trip.route_summary}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}