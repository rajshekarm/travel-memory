type JourneyStatsProps = {
  totalTrips: number;
  totalPlaces: number;
  totalDistance: number;
  totalCities: number;
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

export function JourneyStats({
  totalTrips,
  totalPlaces,
  totalDistance,
  totalCities
}: JourneyStatsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Trips" value={totalTrips} />
      <StatCard label="Places" value={totalPlaces} />
      <StatCard label="Distance (km)" value={Math.round(totalDistance)} />
      <StatCard label="Cities Explored" value={totalCities} />
    </section>
  );
}