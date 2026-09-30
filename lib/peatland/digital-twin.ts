// Model digital twin estate gambut: cermin state per block (diturunkan dari
// [[mock-data]]) + simulasi hidrologi sederhana untuk skenario "what-if".
// Murni, tanpa React/three — dipakai halaman /digital-twin dan
// [[digital-twin-scene]]. Posisi aset mengikuti [[map-points]].

import {
  boreholeStatus,
  peatMonitoring,
  plantationHealth,
  rainfallCorrelation,
  waterTableTrend,
} from "./mock-data"
import { markerPoints, type MarkerKind, type MarkerLayer } from "./map-points"
import { scaleNumber } from "./filter-logic"

export const TWIN_BLOCKS = ["Block A", "Block B", "Block C", "Block D", "Block E"]

/** Warna identitas tiap block (grafik, label block di scene, legenda). */
export const BLOCK_COLOR: Record<string, string> = {
  "Block A": "#38bdf8",
  "Block B": "#a78bfa",
  "Block C": "#f87171",
  "Block D": "#fbbf24",
  "Block E": "#34d399",
}

// Ambang muka air (cm). -40 cm = batas PP 57/2016 untuk titik penaatan gambut.
export const WT_TARGET = -30
export const WT_COMPLIANCE = -40
export const WT_CRITICAL = -60
export const WT_FLOOD = -10

// Parameter model bucket muka air — dikalibrasi agar skenario baseline
// mereproduksi tren turun ~1.3 cm/hari pada data 4–10 Sep.
const SPECIFIC_YIELD = 0.25
const EVAPOTRANSPIRATION_MM = 4.5
const DRAIN_K_MM = 4
const CANAL_LEVEL_CM = -80
// Koefisien emisi: ~0.91 t CO₂/ha/tahun per cm kedalaman drainase (Hooijer dkk., 2010).
const CO2_PER_CM = 0.91

export const LIVE_GATE_OPENING = 60
export const LIVE_LABEL = "10 Sep"

// Intensitas drainase relatif per block (kedekatan & kerapatan kanal).
const DRAIN_FACTOR: Record<string, number> = {
  "Block A": 0.9,
  "Block B": 1,
  "Block C": 1.35,
  "Block D": 1.15,
  "Block E": 0.8,
}

export type StatusTone = "normal" | "warning" | "critical" | "offline"

export type BlockState = {
  block: string
  waterTable: number
  peatDepth: number
  soilMoisture: number
  soilTemp: number
  ndvi: number
  area: number
}

export type BlockSnapshot = {
  waterTable: number
  soilMoisture: number
  fireRisk: number
  ndvi: number
  peatDepth: number
}

export type TwinFrame = {
  key: string
  label: string
  kind: "history" | "live" | "forecast"
  rainfall: number
  rain3d: number
  gateOpening: number
  blocks: Record<string, BlockSnapshot>
}

export type Scenario = {
  rainfall: number
  gateOpening: number
  days: number
  canalBlocking: boolean
}

export const SCENARIO_PRESETS: { key: string; label: string; scenario: Omit<Scenario, "days"> }[] = [
  { key: "baseline", label: "Baseline", scenario: { rainfall: 4, gateOpening: LIVE_GATE_OPENING, canalBlocking: false } },
  { key: "dry", label: "Dry Spell", scenario: { rainfall: 0, gateOpening: LIVE_GATE_OPENING, canalBlocking: false } },
  { key: "retain", label: "Close Gates", scenario: { rainfall: 4, gateOpening: 20, canalBlocking: false } },
  { key: "rewet", label: "Rewetting", scenario: { rainfall: 4, gateOpening: 20, canalBlocking: true } },
  { key: "wet", label: "Heavy Rain", scenario: { rainfall: 35, gateOpening: 80, canalBlocking: false } },
]

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const round1 = (v: number) => Math.round(v * 10) / 10
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** State terkini tiap block — mirror dari tabel borehole, stasiun gambut, dan NDVI. */
export function getBlockBaseline(estate: string): BlockState[] {
  return TWIN_BLOCKS.map((block) => {
    const bh = boreholeStatus.find((b) => b.location === block)
    const peat = peatMonitoring.find((p) => p.block === block)
    const ndvi = plantationHealth.find((p) => p.block === block)
    return {
      block,
      waterTable: scaleNumber(bh?.waterLevel ?? -30, estate),
      peatDepth: peat?.peatDepth ?? 298,
      soilMoisture: peat?.soilMoisture ?? 62,
      soilTemp: peat?.soilTemp ?? 28,
      ndvi: ndvi?.ndvi ?? 0.7,
      area: ndvi?.area ?? 1200,
    }
  })
}

/** Indeks risiko kebakaran 0–100 dari kedalaman muka air dan hujan rata-rata 3 hari. */
export function fireRiskIndex(waterTable: number, rain3d: number): number {
  const depth = Math.max(0, -waterTable)
  const dryness = 14 * (1 - Math.min(rain3d, 20) / 20)
  return clamp(Math.round(10 + 1.65 * depth + dryness), 0, 100)
}

function moistureFor(base: BlockState, waterTable: number): number {
  return clamp(Math.round(base.soilMoisture + (waterTable - base.waterTable) * 0.6), 12, 96)
}

function snapshot(base: BlockState, waterTable: number, rain3d: number): BlockSnapshot {
  const wt = Math.round(waterTable)
  return {
    waterTable: wt,
    soilMoisture: moistureFor(base, wt),
    fireRisk: fireRiskIndex(wt, rain3d),
    ndvi: base.ndvi,
    peatDepth: base.peatDepth,
  }
}

/** Satu langkah harian model bucket: hujan − ET − drainase kanal, dibagi specific yield. */
export function stepWaterTable(
  waterTable: number,
  rainfall: number,
  gateOpening: number,
  drainFactor = 1,
  canalBlocking = false,
): number {
  const head = clamp((waterTable - CANAL_LEVEL_CM) / 40, 0, 1.5)
  const drainage = DRAIN_K_MM * (gateOpening / 100) * head * drainFactor * (canalBlocking ? 0.35 : 1)
  const inflow = canalBlocking ? 1 : 0
  const netMm = rainfall + inflow - EVAPOTRANSPIRATION_MM - drainage
  return clamp(waterTable + netMm / SPECIFIC_YIELD / 10, -120, 5)
}

/** Replay 7 hari terakhir (4–10 Sep). Frame terakhir = state live. */
export function buildHistoryFrames(baseline: BlockState[]): TwinFrame[] {
  const last = waterTableTrend[waterTableTrend.length - 1].value
  return waterTableTrend.map((t, i) => {
    const rains = rainfallCorrelation.slice(Math.max(0, i - 2), i + 1).map((r) => r.rainfall)
    const rain3d = round1(avg(rains))
    const isLive = i === waterTableTrend.length - 1
    return {
      key: `h-${i}`,
      label: t.day,
      kind: isLive ? "live" : "history",
      rainfall: rainfallCorrelation[i]?.rainfall ?? 0,
      rain3d,
      gateOpening: LIVE_GATE_OPENING,
      blocks: Object.fromEntries(
        baseline.map((b) => [b.block, snapshot(b, isLive ? b.waterTable : (b.waterTable * t.value) / last, rain3d)]),
      ),
    }
  })
}

/** Proyeksi harian ke depan untuk skenario; dimulai dari state live. */
export function simulateScenario(baseline: BlockState[], scenario: Scenario): TwinFrame[] {
  const rains = rainfallCorrelation.slice(-3).map((r) => r.rainfall)
  const wt = Object.fromEntries(baseline.map((b) => [b.block, b.waterTable]))
  const frames: TwinFrame[] = []
  for (let d = 1; d <= scenario.days; d += 1) {
    rains.push(scenario.rainfall)
    const rain3d = round1(avg(rains.slice(-3)))
    for (const b of baseline) {
      wt[b.block] = stepWaterTable(
        wt[b.block],
        scenario.rainfall,
        scenario.gateOpening,
        DRAIN_FACTOR[b.block] ?? 1,
        scenario.canalBlocking,
      )
    }
    frames.push({
      key: `f-${d}`,
      label: `${10 + d} Sep`,
      kind: "forecast",
      rainfall: scenario.rainfall,
      rain3d,
      gateOpening: scenario.gateOpening,
      blocks: Object.fromEntries(baseline.map((b) => [b.block, snapshot(b, wt[b.block], rain3d)])),
    })
  }
  return frames
}

/**
 * Frame pada posisi timeline pecahan (mis. 7.25), interpolasi linear antara dua
 * frame harian. Timeline berjalan per 0,25 hari supaya model bergerak mulus.
 */
export function frameAt(frames: TwinFrame[], pos: number, liveIndex: number): TwinFrame {
  const p = clamp(pos, 0, frames.length - 1)
  const i = Math.floor(p)
  const t = p - i
  const a = frames[i]
  const b = frames[Math.min(frames.length - 1, i + 1)]
  if (t < 1e-6 || a === b) return a
  const mix = (x: number, y: number) => x + (y - x) * t
  const blocks: Record<string, BlockSnapshot> = {}
  for (const key of Object.keys(a.blocks)) {
    const sa = a.blocks[key]
    const sb = b.blocks[key]
    blocks[key] = {
      waterTable: Math.round(mix(sa.waterTable, sb.waterTable)),
      soilMoisture: Math.round(mix(sa.soilMoisture, sb.soilMoisture)),
      fireRisk: Math.round(mix(sa.fireRisk, sb.fireRisk)),
      ndvi: mix(sa.ndvi, sb.ndvi),
      peatDepth: sa.peatDepth,
    }
  }
  return {
    key: `p-${p}`,
    label: t < 0.5 ? a.label : b.label,
    kind: p < liveIndex ? "history" : "forecast",
    rainfall: round1(mix(a.rainfall, b.rainfall)),
    rain3d: round1(mix(a.rain3d, b.rain3d)),
    gateOpening: Math.round(mix(a.gateOpening, b.gateOpening)),
    blocks,
  }
}

export type Recommendation = {
  gateOpening: number
  feasible: boolean
  worstBlock: string
  worstLevel: number
  floodBlock: string | null
}

/** Jarak (cm) muka air di luar pita aman [-40, -10] cm; 0 bila di dalam pita. */
function bandViolation(wt: number): number {
  return Math.max(0, WT_COMPLIANCE - wt) + Math.max(0, wt - WT_FLOOD)
}

/**
 * Cari bukaan pintu air (0–100%, step 5) yang membawa semua block ke pita
 * [-40, -10] cm pada akhir horizon. Urutan pilihan: akhir horizon di dalam
 * pita → total pelanggaran sepanjang horizon terkecil → paling dekat bukaan
 * skenario. Total pelanggaran membedakan bukaan saat muka air mentok di
 * batas model (mis. banjir), sehingga kompromi tetap masuk akal.
 */
export function recommendGateOpening(baseline: BlockState[], scenario: Scenario): Recommendation {
  let best: { gate: number; feasible: boolean; cost: number; end: [string, number][] } | null = null
  for (let gate = 0; gate <= 100; gate += 5) {
    const frames = simulateScenario(baseline, { ...scenario, gateOpening: gate })
    const cost = frames.reduce(
      (acc, f) => acc + Object.values(f.blocks).reduce((a, s) => a + bandViolation(s.waterTable), 0),
      0,
    )
    const end = Object.entries(frames[frames.length - 1]?.blocks ?? {}).map(
      ([block, s]) => [block, s.waterTable] as [string, number],
    )
    const feasible = end.every(([, wt]) => bandViolation(wt) === 0)
    const better =
      !best ||
      (feasible !== best.feasible
        ? feasible
        : cost !== best.cost
          ? cost < best.cost
          : Math.abs(gate - scenario.gateOpening) < Math.abs(best.gate - scenario.gateOpening))
    if (better) best = { gate, feasible, cost, end }
  }
  const end = best?.end ?? []
  const worst = [...end].sort((a, b) => bandViolation(b[1]) - bandViolation(a[1]))[0] ?? ["Block C", 0]
  const flood = end.find(([, wt]) => wt > WT_FLOOD)
  return {
    gateOpening: best?.gate ?? scenario.gateOpening,
    feasible: best?.feasible ?? false,
    worstBlock: worst[0],
    worstLevel: worst[1],
    floodBlock: flood ? flood[0] : null,
  }
}

export function waterTableTone(wt: number): StatusTone {
  if (wt > WT_FLOOD) return "warning"
  if (wt >= WT_TARGET) return "normal"
  if (wt > WT_CRITICAL) return "warning"
  return "critical"
}

export function fireRiskTone(index: number): StatusTone {
  if (index >= 80) return "critical"
  if (index >= 60) return "warning"
  return "normal"
}

/** Estimasi emisi CO₂ tahunan (t/tahun) dari kedalaman drainase. */
export function co2Emission(area: number, waterTable: number): number {
  return area * CO2_PER_CM * Math.max(0, -waterTable)
}

/** Estimasi laju subsidence (cm/tahun) ≈ 1 cm per 10 cm kedalaman drainase. */
export function subsidenceRate(waterTable: number): number {
  return round1(Math.max(0, -waterTable) / 10)
}

export type TwinSummary = {
  waterTable: number
  fireRisk: number
  soilMoisture: number
  compliant: number
  total: number
  co2: number
}

/** Ringkasan (rata-rata tertimbang luas) untuk block yang lolos filter. */
export function summarizeFrame(frame: TwinFrame, baseline: BlockState[], blocks: string[]): TwinSummary {
  const rows = baseline.filter((b) => blocks.includes(b.block))
  const area = rows.reduce((a, b) => a + b.area, 0) || 1
  const weighted = (pick: (s: BlockSnapshot) => number) =>
    rows.reduce((acc, b) => acc + pick(frame.blocks[b.block]) * b.area, 0) / area
  return {
    waterTable: Math.round(weighted((s) => s.waterTable)),
    fireRisk: Math.round(weighted((s) => s.fireRisk)),
    soilMoisture: Math.round(weighted((s) => s.soilMoisture)),
    compliant: rows.filter((b) => frame.blocks[b.block].waterTable >= WT_COMPLIANCE).length,
    total: rows.length,
    co2: rows.reduce((acc, b) => acc + co2Emission(b.area, frame.blocks[b.block].waterTable), 0),
  }
}

// ---------------------------------------------------------------------------
// Layer tampilan & skala warna (dipakai scene 3D dan legend halaman)

export type TwinLayer = "waterTable" | "soilMoisture" | "fireRisk" | "ndvi" | "peatDepth"

export const TWIN_LAYERS: {
  key: TwinLayer
  label: string
  unit: string
  stops: [number, string][]
}[] = [
  {
    key: "waterTable",
    label: "Water Table",
    unit: "cm",
    stops: [
      [-80, "#7f1d1d"],
      [-60, "#ef4444"],
      [-40, "#f59e0b"],
      [-30, "#facc15"],
      [-20, "#22c55e"],
      [-8, "#38bdf8"],
      [5, "#1d4ed8"],
    ],
  },
  {
    key: "soilMoisture",
    label: "Soil Moisture",
    unit: "%",
    stops: [
      [15, "#92400e"],
      [35, "#f59e0b"],
      [55, "#22c55e"],
      [75, "#38bdf8"],
      [95, "#1d4ed8"],
    ],
  },
  {
    key: "fireRisk",
    label: "Fire Risk",
    unit: "",
    stops: [
      [0, "#16a34a"],
      [40, "#a3e635"],
      [60, "#f59e0b"],
      [80, "#ef4444"],
      [100, "#7f1d1d"],
    ],
  },
  {
    key: "ndvi",
    label: "NDVI",
    unit: "",
    stops: [
      [0.3, "#7c2d12"],
      [0.45, "#f59e0b"],
      [0.6, "#a3e635"],
      [0.75, "#22c55e"],
      [0.9, "#065f46"],
    ],
  },
  {
    key: "peatDepth",
    label: "Peat Depth",
    unit: "cm",
    stops: [
      [260, "#fde68a"],
      [285, "#f59e0b"],
      [305, "#b45309"],
      [330, "#78350f"],
    ],
  },
]

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** Warna sRGB (0–1) untuk nilai pada layer, interpolasi linear antar stop. */
export function rampColor(layer: TwinLayer, value: number): [number, number, number] {
  const stops = TWIN_LAYERS.find((l) => l.key === layer)?.stops ?? TWIN_LAYERS[0].stops
  if (value <= stops[0][0]) return hexToRgb(stops[0][1])
  for (let i = 1; i < stops.length; i += 1) {
    const [v1, c1] = stops[i]
    if (value <= v1) {
      const [v0, c0] = stops[i - 1]
      const t = (value - v0) / (v1 - v0)
      const a = hexToRgb(c0)
      const b = hexToRgb(c1)
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
    }
  }
  return hexToRgb(stops[stops.length - 1][1])
}

// ---------------------------------------------------------------------------
// Aset lapangan pada twin — titik dari [[map-points]] diberi kode & bacaan.

export type TwinAsset = {
  id: string
  code: string
  layer: MarkerLayer
  kind: MarkerKind
  status: StatusTone
  block: string
  lat: number
  lng: number
  lastSeen: string
  readings: { label: string; value: string }[]
  /** Bacaan utama live; null = tidak ada data. */
  primary: { value: number; unit: string } | null
}

// Singkatan & warna identitas per jenis aset (kode callout, legenda, chip tipe).
export const ASSET_TYPE_META: Record<MarkerLayer, { short: string; color: string }> = {
  borehole: { short: "BH", color: "#38bdf8" },
  "water-station": { short: "WTS", color: "#60a5fa" },
  "rain-gauge": { short: "RG", color: "#22d3ee" },
  "water-gate": { short: "WTG", color: "#fbbf24" },
  "peat-station": { short: "PMS", color: "#a3e635" },
  "fire-hotspot": { short: "HS", color: "#fb7185" },
}

export const ASSET_LAYER_LABEL: Record<MarkerLayer, string> = {
  borehole: "Borehole",
  "water-station": "Water Table Station",
  "rain-gauge": "Rain Gauge",
  "water-gate": "Water Gate",
  "peat-station": "Peat Monitoring Station",
  "fire-hotspot": "Fire Hotspot (VIIRS)",
}

const ASSET_META: Record<string, Pick<TwinAsset, "code" | "lastSeen" | "readings"> & { status?: StatusTone }> = {
  m1: { code: "WTS-01", lastSeen: "09:35", readings: [{ label: "Water Table", value: "-33 cm" }, { label: "Canal Level", value: "-78 cm" }, { label: "Battery", value: "84%" }] },
  m2: { code: "BH-03", lastSeen: "09:36", readings: [{ label: "Water Level", value: "-28 cm" }, { label: "Battery", value: "95%" }, { label: "Signal", value: "Good" }] },
  m3: { code: "RG-01", lastSeen: "09:30", readings: [{ label: "Rainfall 24h", value: "22.4 mm" }, { label: "Peak Intensity", value: "12 mm/h" }, { label: "Battery", value: "90%" }] },
  m4: { code: "WTS-02", lastSeen: "09:34", readings: [{ label: "Water Table", value: "-34 cm" }, { label: "Canal Level", value: "-81 cm" }, { label: "Battery", value: "77%" }] },
  m5: { code: "BH-07", lastSeen: "09:15", readings: [{ label: "Water Level", value: "-62 cm" }, { label: "Battery", value: "58%" }, { label: "Signal", value: "Weak" }] },
  m6: { code: "BH-11", lastSeen: "09:31", readings: [{ label: "Water Level", value: "-60 cm" }, { label: "Battery", value: "73%" }, { label: "Signal", value: "Fair" }] },
  m7: { code: "WTG-01", lastSeen: "09:37", readings: [{ label: "Opening", value: "60%" }, { label: "Upstream", value: "-22 cm" }, { label: "Downstream", value: "-78 cm" }, { label: "Mode", value: "Auto" }] },
  m8: { code: "PMS-05", lastSeen: "09:28", readings: [{ label: "Soil Moisture", value: "31%" }, { label: "Soil Temp", value: "30.1 °C" }, { label: "Peat Depth", value: "310 cm" }] },
  m9: { code: "WTG-02", status: "offline", lastSeen: "09:00", readings: [{ label: "Opening", value: "60% (last known)" }, { label: "Upstream", value: "—" }, { label: "Downstream", value: "—" }, { label: "Mode", value: "Offline" }] },
  m10: { code: "RG-02", lastSeen: "09:33", readings: [{ label: "Rainfall 24h", value: "14.2 mm" }, { label: "Peak Intensity", value: "6 mm/h" }, { label: "Battery", value: "88%" }] },
  m11: { code: "WTS-03", lastSeen: "06:12", readings: [{ label: "Water Table", value: "No data" }, { label: "Canal Level", value: "No data" }, { label: "Battery", value: "12%" }] },
  m12: { code: "PMS-06", lastSeen: "09:29", readings: [{ label: "Soil Moisture", value: "42%" }, { label: "Soil Temp", value: "29.0 °C" }, { label: "Peat Depth", value: "318 cm" }] },
  m13: { code: "WTG-03", lastSeen: "09:37", readings: [{ label: "Opening", value: "45%" }, { label: "Upstream", value: "-25 cm" }, { label: "Downstream", value: "-74 cm" }, { label: "Mode", value: "Auto" }] },
  m14: { code: "HS-01", lastSeen: "01:42", readings: [{ label: "Confidence", value: "Nominal" }, { label: "FRP", value: "6.2 MW" }, { label: "Satellite", value: "NOAA-20 VIIRS" }] },
  m15: { code: "HS-02", lastSeen: "01:42", readings: [{ label: "Confidence", value: "High" }, { label: "FRP", value: "18.7 MW" }, { label: "Satellite", value: "NOAA-20 VIIRS" }] },
  m16: { code: "PMS-07", lastSeen: "09:32", readings: [{ label: "Soil Moisture", value: "64%" }, { label: "Soil Temp", value: "27.8 °C" }, { label: "Peat Depth", value: "298 cm" }] },
  m17: { code: "RG-04", lastSeen: "09:30", readings: [{ label: "Rainfall 24h", value: "0 mm" }, { label: "Dry Days", value: "7" }, { label: "Battery", value: "81%" }] },
}

// Bacaan utama live per aset (angka yang tampil di callout & sparkline).
const ASSET_PRIMARY: Record<string, { value: number; unit: string }> = {
  m1: { value: -33, unit: "cm" },
  m2: { value: -28, unit: "cm" },
  m3: { value: 22.4, unit: "mm" },
  m4: { value: -34, unit: "cm" },
  m5: { value: -62, unit: "cm" },
  m6: { value: -60, unit: "cm" },
  m7: { value: 60, unit: "%" },
  m8: { value: 31, unit: "%" },
  m10: { value: 14.2, unit: "mm" },
  m12: { value: 42, unit: "%" },
  m13: { value: 45, unit: "%" },
  m14: { value: 6.2, unit: "MW" },
  m15: { value: 18.7, unit: "MW" },
  m16: { value: 64, unit: "%" },
  m17: { value: 0, unit: "mm" },
}

export const TWIN_ASSETS: TwinAsset[] = markerPoints.map((m) => {
  const meta = ASSET_META[m.id]
  const status: StatusTone = meta?.status ?? (m.kind === "gate" ? "normal" : m.kind)
  return {
    id: m.id,
    code: meta?.code ?? m.id.toUpperCase(),
    layer: m.layer,
    kind: m.kind,
    status,
    block: m.block,
    lat: m.lat,
    lng: m.lng,
    lastSeen: meta?.lastSeen ?? "—",
    readings: meta?.readings ?? [],
    primary: ASSET_PRIMARY[m.id] ?? null,
  }
})


// ---------------------------------------------------------------------------
// Early Warning System 4 level (kartu sensor, chip callout, skala EWS).

export type EwsLevel = "normal" | "waspada" | "siaga" | "awas"

export const EWS_LEVELS: EwsLevel[] = ["normal", "waspada", "siaga", "awas"]

export const EWS_META: Record<EwsLevel, { label: string; color: string }> = {
  normal: { label: "Normal", color: "#46d78f" },
  waspada: { label: "Waspada", color: "#ffd27a" },
  siaga: { label: "Siaga", color: "#ffb454" },
  awas: { label: "Awas", color: "#ff7a66" },
}

/** EWS muka air: ≥ -30 normal, > -40 waspada, > -60 siaga, sisanya awas. Genangan ikut naik level. */
export function ewsFromWaterTable(wt: number): EwsLevel {
  if (wt > 0) return "siaga"
  if (wt > WT_FLOOD) return "waspada"
  if (wt >= WT_TARGET) return "normal"
  if (wt > WT_COMPLIANCE) return "waspada"
  if (wt > WT_CRITICAL) return "siaga"
  return "awas"
}

export function ewsFromFireRisk(index: number): EwsLevel {
  if (index >= 85) return "awas"
  if (index >= 70) return "siaga"
  if (index >= 50) return "waspada"
  return "normal"
}

export function ewsFromMoisture(pct: number): EwsLevel {
  if (pct < 25) return "awas"
  if (pct < 35) return "siaga"
  if (pct < 45) return "waspada"
  return "normal"
}

export type AssetReading = {
  value: number | null
  unit: string
  text: string
  level: EwsLevel | "offline"
}

// Sebaran spasial hujan: faktor tiap penakar terhadap hujan skenario.
const GAUGE_FACTOR: Record<string, number> = { "RG-01": 1.2, "RG-02": 0.85, "RG-04": 0.6 }

function formatReading(value: number, unit: string): string {
  const n = Number.isInteger(value) ? String(value) : value.toFixed(1)
  return unit === "%" ? `${n}%` : `${n} ${unit}`
}

/**
 * Bacaan utama aset pada sebuah frame. Frame live = telemetri asli; frame
 * lain = bacaan live + perubahan state block/skenario sejak live.
 */
export function assetReading(asset: TwinAsset, frame: TwinFrame, live: TwinFrame): AssetReading {
  if (asset.status === "offline" || !asset.primary) {
    return { value: null, unit: asset.primary?.unit ?? "", text: "OFFLINE", level: "offline" }
  }
  const { unit } = asset.primary
  const now = frame.blocks[asset.block]
  const then = live.blocks[asset.block]
  let value = asset.primary.value
  let level: EwsLevel
  switch (asset.layer) {
    case "borehole":
    case "water-station":
      value = Math.round(value + (now.waterTable - then.waterTable))
      level = ewsFromWaterTable(value)
      break
    case "peat-station":
      value = clamp(Math.round(value + (now.soilMoisture - then.soilMoisture)), 5, 98)
      level = ewsFromMoisture(value)
      break
    case "rain-gauge":
      if (frame.kind !== "live") value = round1(frame.rainfall * (GAUGE_FACTOR[asset.code] ?? 1))
      level = value >= 50 ? "siaga" : value >= 30 ? "waspada" : "normal"
      break
    case "water-gate":
      if (frame.kind !== "live") value = frame.gateOpening
      level = "normal"
      break
    default:
      // Hotspot: FRP mengikuti perubahan risiko api block.
      value = round1(value * (now.fireRisk / Math.max(1, then.fireRisk)))
      level = ewsFromFireRisk(now.fireRisk)
  }
  return { value, unit, text: formatReading(value, unit), level }
}

/** Deskripsi cuaca singkat dari curah hujan harian (mm). */
export function weatherLabel(mm: number): string {
  if (mm <= 0.5) return "Cerah"
  if (mm < 10) return "Gerimis"
  if (mm < 25) return "Hujan sedang"
  return "Hujan lebat"
}

/**
 * Perkiraan luas (ha) block dengan muka air di bawah -40 cm. Muka air lokal
 * diasumsikan menyebar rata di [WT−12, WT+4] cm akibat drawdown kanal.
 */
export function areaBelowCompliance(area: number, waterTable: number): number {
  return Math.round(area * clamp((WT_COMPLIANCE - (waterTable - 12)) / 16, 0, 1))
}

// Aliran data yang menyinkronkan twin dengan lapangan.
export const TWIN_STREAMS: { label: string; source: string; value: string; latency: string; status: StatusTone }[] = [
  { label: "Borehole Network", source: "LoRaWAN", value: "48/52", latency: "5 min", status: "warning" },
  { label: "Water Table Stations", source: "LoRaWAN", value: "11/12", latency: "5 min", status: "warning" },
  { label: "Water Gates", source: "SCADA", value: "2/3", latency: "1 min", status: "critical" },
  { label: "Rain Gauges", source: "GSM", value: "8/8", latency: "10 min", status: "normal" },
  { label: "Peat Stations", source: "LoRaWAN", value: "14/15", latency: "15 min", status: "normal" },
  { label: "NDVI (Sentinel-2)", source: "Satellite", value: "8 Sep", latency: "2 days", status: "normal" },
  { label: "Hotspot (VIIRS)", source: "Satellite", value: "2 active", latency: "8 h", status: "warning" },
]
