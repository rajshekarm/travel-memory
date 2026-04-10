import type { MouseEvent } from "react";

import { cn } from "../lib/utils";
import type { MapFeature } from "../types";

const markerColors: Record<MapFeature["type"], string> = {
  pickup: "#5dd6b0",
  dropoff: "#f4cc72",
  hazard: "#ff876a",
  parking: "#85a5ff",
  closure: "#f7a654"
};

export function MapCanvas({
  features,
  activeFeatureId,
  stagedCoords,
  minimal = false,
  onSelect,
  onMapClick
}: {
  features: MapFeature[];
  activeFeatureId: string | null;
  stagedCoords: { x: string; y: string };
  minimal?: boolean;
  onSelect: (id: string) => void;
  onMapClick: (event: MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-b from-night-800 to-night-950",
        minimal
          ? "min-h-[78vh] rounded-[32px] border border-white/5"
          : "min-h-[620px] rounded-[28px] border border-cyan-300/10"
      )}
      onClick={onMapClick}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 650" aria-hidden="true">
        <defs>
          <linearGradient id="roadGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#173046" />
            <stop offset="100%" stopColor="#08121d" />
          </linearGradient>
          <linearGradient id="lotFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2d4f67" />
            <stop offset="100%" stopColor="#183042" />
          </linearGradient>
        </defs>
        <rect width="1000" height="650" rx="40" fill="url(#roadGlow)" />
        <g opacity="0.16">
          <path d="M110 580L450 240" stroke="#8dd0ff" strokeWidth="54" strokeLinecap="round" />
          <path d="M340 610L740 210" stroke="#8dd0ff" strokeWidth="46" strokeLinecap="round" />
          <path d="M560 615L900 275" stroke="#8dd0ff" strokeWidth="40" strokeLinecap="round" />
          <path d="M185 130L815 130" stroke="#8dd0ff" strokeWidth="42" strokeLinecap="round" />
          <path d="M120 310L880 310" stroke="#8dd0ff" strokeWidth="34" strokeLinecap="round" />
          <path d="M80 470L720 470" stroke="#8dd0ff" strokeWidth="34" strokeLinecap="round" />
        </g>
        <g opacity="0.92">
          <polygon points="178,160 280,160 354,230 252,230" fill="url(#lotFill)" />
          <polygon points="316,160 425,160 500,230 391,230" fill="url(#lotFill)" />
          <polygon points="456,160 565,160 640,230 531,230" fill="url(#lotFill)" />
          <polygon points="595,160 705,160 780,230 670,230" fill="url(#lotFill)" />
          <polygon points="112,340 250,340 325,410 187,410" fill="url(#lotFill)" />
          <polygon points="286,340 435,340 510,410 360,410" fill="url(#lotFill)" />
          <polygon points="472,340 628,340 703,410 546,410" fill="url(#lotFill)" />
          <polygon points="665,340 810,340 885,410 740,410" fill="url(#lotFill)" />
          <polygon points="182,500 330,500 406,570 258,570" fill="url(#lotFill)" />
          <polygon points="367,500 532,500 606,570 441,570" fill="url(#lotFill)" />
          <polygon points="570,500 712,500 788,570 646,570" fill="url(#lotFill)" />
        </g>
      </svg>

      <div className="absolute inset-0">
        {features.map((feature) => (
          <button
            key={feature.id}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(feature.id);
            }}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-night-950 transition",
              minimal ? "h-4 w-4 shadow-[0_0_0_8px_rgba(255,255,255,0.03)]" : "h-5 w-5 shadow-[0_0_0_10px_rgba(255,255,255,0.05)]",
              activeFeatureId === feature.id && "shadow-[0_0_0_12px_rgba(255,255,255,0.12),0_0_16px_currentColor]"
            )}
            style={{
              left: `${feature.x}%`,
              top: `${feature.y}%`,
              backgroundColor: markerColors[feature.type],
              color: markerColors[feature.type]
            }}
            title={`${feature.title} (${feature.status})`}
          >
            {!minimal ? (
              <span className="absolute left-1/2 top-8 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-950/90 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white">
                {feature.type[0]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {!minimal ? (
        <>
          <div className="absolute right-4 top-4 rounded-full border border-cyan-300/15 bg-slate-950/60 px-3 py-2 text-xs text-cyan-100">
            {stagedCoords.x && stagedCoords.y
              ? `Staged at ${stagedCoords.x}, ${stagedCoords.y}`
              : "Tap map to set coordinates"}
          </div>
          <div className="absolute bottom-4 left-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
            <div className="text-xs uppercase tracking-[0.22em] text-cyan-200">Ops surface</div>
            <div className="mt-1">Use this panel like a mini HD map review canvas.</div>
          </div>
        </>
      ) : null}
    </div>
  );
}
