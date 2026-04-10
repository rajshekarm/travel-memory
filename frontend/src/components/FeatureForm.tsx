import type { Dispatch, FormEvent, SetStateAction } from "react";

import { Field } from "./ui";
import type { CreateFeaturePayload, FeaturePriority, FeatureType } from "../types";

const featureTypes: FeatureType[] = ["pickup", "dropoff", "hazard", "parking", "closure"];
const priorities: FeaturePriority[] = ["high", "medium", "low"];

export function FeatureForm({
  form,
  coords,
  region,
  pending,
  setCoords,
  setForm,
  onSubmit
}: {
  form: CreateFeaturePayload;
  coords: { x: string; y: string };
  region: string;
  pending: boolean;
  setCoords: Dispatch<SetStateAction<{ x: string; y: string }>>;
  setForm: Dispatch<SetStateAction<CreateFeaturePayload>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <Field label="Title">
        <input
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          placeholder="Canal pickup fallback zone"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/30"
          required
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type">
          <select
            value={form.type}
            onChange={(event) =>
              setForm((current) => ({ ...current, type: event.target.value as FeatureType }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/30"
          >
            {featureTypes.map((type) => (
              <option key={type} value={type} className="bg-slate-900">
                {type}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select
            value={form.priority}
            onChange={(event) =>
              setForm((current) => ({ ...current, priority: event.target.value as FeaturePriority }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/30"
          >
            {priorities.map((priority) => (
              <option key={priority} value={priority} className="bg-slate-900">
                {priority}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Area">
        <input
          value={form.area}
          onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))}
          placeholder={region}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/30"
        />
      </Field>
      <Field label="Notes">
        <textarea
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          placeholder="Why does this matter for future trips, pickups, or route safety?"
          className="min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/30"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="X">
          <input
            value={coords.x}
            onChange={(event) => {
              setCoords((current) => ({ ...current, x: event.target.value }));
              setForm((current) => ({ ...current, x: Number(event.target.value) || 0 }));
            }}
            type="number"
            step="0.1"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/30"
            required
          />
        </Field>
        <Field label="Y">
          <input
            value={coords.y}
            onChange={(event) => {
              setCoords((current) => ({ ...current, y: event.target.value }));
              setForm((current) => ({ ...current, y: Number(event.target.value) || 0 }));
            }}
            type="number"
            step="0.1"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/30"
            required
          />
        </Field>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-gradient-to-br from-cyan-300 to-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Create Draft Annotation
      </button>
    </form>
  );
}
