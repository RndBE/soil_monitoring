// Tema grafik Recharts bersama semua halaman: sumbu, grid, tooltip, dan pita /
// garis ambang EWS. Recharts butuh <ReferenceArea>/<ReferenceLine> sebagai anak
// langsung chart, jadi yang dibagikan adalah datanya; halaman me-map-nya:
//   {WT_BANDS.map((b) => <ReferenceArea key={b.level} {...bandProps(b)} />)}

import { EWS_META, WT_COMPLIANCE, WT_CRITICAL, WT_TARGET, type EwsLevel } from "@/lib/peatland/digital-twin"

export const axisProps = {
  tick: { fontSize: 10, fill: "rgba(255,255,255,0.5)" },
  axisLine: { stroke: "rgba(255,255,255,0.12)" },
  tickLine: false as const,
}

export const gridProps = {
  strokeDasharray: "3 3",
  stroke: "rgba(255,255,255,0.07)",
  vertical: false,
}

export const tooltipStyle = {
  contentStyle: {
    background: "rgba(4, 16, 11, 0.95)",
    border: "1px solid rgba(110, 231, 183, 0.22)",
    borderRadius: 10,
    fontSize: 12,
    boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
  },
  labelStyle: { color: "rgba(255,255,255,0.65)", fontWeight: 600 },
  itemStyle: { padding: 0 },
  cursor: { stroke: "rgba(110, 231, 183, 0.35)", strokeDasharray: "3 3", fill: "rgba(110, 231, 183, 0.06)" },
}

/** Formatter tooltip dengan satuan: `<Tooltip formatter={withUnit("cm")} />`. */
export const withUnit = (unit: string) => (value: unknown) =>
  typeof value === "number" ? `${Number.isInteger(value) ? value : value.toFixed(1)}${unit === "%" ? "%" : ` ${unit}`}` : String(value ?? "")

export type Band = { level: EwsLevel; y1: number; y2: number }
export type Threshold = { level: EwsLevel; y: number; label: string }

/** Pita EWS muka air (cm): ≥ −30 normal, −30…−40 waspada, −40…−60 siaga, < −60 awas. */
export const WT_BANDS: Band[] = [
  { level: "normal", y1: WT_TARGET, y2: 0 },
  { level: "waspada", y1: WT_COMPLIANCE, y2: WT_TARGET },
  { level: "siaga", y1: WT_CRITICAL, y2: WT_COMPLIANCE },
  { level: "awas", y1: -120, y2: WT_CRITICAL },
]
export const WT_LINES: Threshold[] = [
  { level: "siaga", y: WT_COMPLIANCE, label: "PP 57/2016 · −40 cm" },
  { level: "awas", y: WT_CRITICAL, label: "Awas · −60 cm" },
]

/** Pita EWS indeks risiko api (0–100): 50 waspada, 70 siaga, 85 awas. */
export const FIRE_BANDS: Band[] = [
  { level: "normal", y1: 0, y2: 50 },
  { level: "waspada", y1: 50, y2: 70 },
  { level: "siaga", y1: 70, y2: 85 },
  { level: "awas", y1: 85, y2: 100 },
]
export const FIRE_LINES: Threshold[] = [
  { level: "siaga", y: 70, label: "Siaga · 70" },
  { level: "awas", y: 85, label: "Awas · 85" },
]

/** Pita EWS kelembapan tanah (%): < 45 waspada, < 35 siaga, < 25 awas. */
export const MOISTURE_BANDS: Band[] = [
  { level: "normal", y1: 45, y2: 100 },
  { level: "waspada", y1: 35, y2: 45 },
  { level: "siaga", y1: 25, y2: 35 },
  { level: "awas", y1: 0, y2: 25 },
]
export const MOISTURE_LINES: Threshold[] = [{ level: "siaga", y: 35, label: "Siaga · 35%" }]

export const bandProps = (b: Band) => ({
  y1: b.y1,
  y2: b.y2,
  fill: EWS_META[b.level].color,
  fillOpacity: b.level === "normal" ? 0.035 : 0.06,
  ifOverflow: "hidden" as const,
})

type LabelPosition = "insideTopLeft" | "insideTopRight" | "insideBottomLeft" | "insideBottomRight"

/** Props `<ReferenceLine>` untuk ambang; `position` memindah label bila bertumpuk dengan data. */
export const lineProps = (t: Threshold, position: LabelPosition = "insideTopLeft") => ({
  y: t.y,
  stroke: EWS_META[t.level].color,
  strokeDasharray: "4 3",
  strokeOpacity: 0.7,
  label: { value: t.label, position, fontSize: 9, fill: EWS_META[t.level].color },
})
