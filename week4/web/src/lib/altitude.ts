// Shared altitude → color scale (FR24-style: warm low, cool high).
// Used by map icons, list dots, trail segments and the legend.

export interface AltitudeBand {
  minM: number; // inclusive lower bound in meters
  color: string;
  label: string; // shown in the legend, in feet (aviation convention)
}

export const GROUND_COLOR = "#64748b";

export const ALTITUDE_BANDS: AltitudeBand[] = [
  { minM: 0, color: "#f59e0b", label: "< 6.5k ft" },
  { minM: 2000, color: "#a3e635", label: "6.5–20k ft" },
  { minM: 6000, color: "#34d399", label: "20–30k ft" },
  { minM: 9000, color: "#38bdf8", label: "30–36k ft" },
  { minM: 11000, color: "#c084fc", label: "> 36k ft" },
];

export function altitudeColor(
  altM: number | null,
  onGround: boolean,
): string {
  if (onGround) return GROUND_COLOR;
  if (altM == null) return ALTITUDE_BANDS[0].color;
  let color = ALTITUDE_BANDS[0].color;
  for (const band of ALTITUDE_BANDS) {
    if (altM >= band.minM) color = band.color;
  }
  return color;
}

// Coarse band index for icon caching.
export function altitudeBandIndex(
  altM: number | null,
  onGround: boolean,
): number {
  if (onGround) return -1;
  if (altM == null) return 0;
  let idx = 0;
  for (let i = 0; i < ALTITUDE_BANDS.length; i++) {
    if (altM >= ALTITUDE_BANDS[i].minM) idx = i;
  }
  return idx;
}

export const M_TO_FT = 3.28084;
export const MPS_TO_KT = 1.9438445;

export function fmtFeet(altM: number | null): string {
  if (altM == null) return "—";
  return `${Math.round((altM * M_TO_FT) / 100) * 100} ft`;
}

export function fmtKnots(mps: number | null): string {
  if (mps == null) return "—";
  return `${Math.round(mps * MPS_TO_KT)} kt`;
}
