import type { MapFeature } from "../../types";

type CommuteInsightsPreviewProps = {
  features: MapFeature[];
};

export function CommuteInsightsPreview({ features }: CommuteInsightsPreviewProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-night-900/80 p-5 shadow-glow">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Commute Intelligence</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Useful notes for everyday travel</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {features.map((feature) => (
          <div key={feature.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{feature.type}</p>
            <p className="mt-2 text-sm font-medium text-white">{feature.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{feature.notes}</p>
          </div>
        ))}
      </div>
    </section>
  );
}