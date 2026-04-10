import type { ReactNode } from "react";

export function StatChip({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-cyan-200">{icon}</div>
      <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint
}: {
  label: string;
  value: number | string;
  hint: string;
}) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-night-900/80 p-5 shadow-glow">
      <p className="text-sm text-slate-300">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </article>
  );
}

export function GlassPanel({
  children,
  title,
  pill,
  icon
}: {
  children: ReactNode;
  title: string;
  pill?: string;
  icon?: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-night-900/80 p-5 shadow-glow">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon ? <span className="text-cyan-200">{icon}</span> : null}
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        {pill ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
            {pill}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block text-sm text-slate-300">
      <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-night-950 px-4 text-slate-200">
      <div className="rounded-[28px] border border-white/10 bg-night-900/90 p-8 text-center shadow-glow">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">Loading</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Booting mobility intelligence surface</h1>
        <p className="mt-3 max-w-md text-sm leading-7 text-slate-400">
          Pulling map ops state, travel memory, and dashboard signals from the backend.
        </p>
      </div>
    </div>
  );
}

export function ErrorState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-night-950 px-4 text-slate-200">
      <div className="rounded-[28px] border border-rose-400/20 bg-rose-400/10 p-8 text-center shadow-glow">
        <p className="text-xs uppercase tracking-[0.28em] text-rose-200">Error</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">The dashboard could not load</h1>
        <p className="mt-3 max-w-md text-sm leading-7 text-slate-200/80">
          Start the FastAPI server and make sure the frontend can reach `/api/state`.
        </p>
      </div>
    </div>
  );
}
