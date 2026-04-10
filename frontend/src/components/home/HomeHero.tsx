export function HomeHero() {
  return (
    <section className="rounded-[28px] border border-white/10 bg-night-900/90 px-6 py-8 shadow-glow">
      <div className="max-w-4xl">
        <p className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-cyan-200">
          Personal Journey Map
        </p>

        <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
          My journey from India to the USA
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
          I built this app to capture the memories, places, and experiences that shaped
          my journey while exploring life in the U.S. Over time, it also became a practical
          tool for daily travel, commute insights, and road intelligence.
        </p>
      </div>
    </section>
  );
}