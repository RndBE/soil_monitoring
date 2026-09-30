// Registri stasiun lapangan tunggal untuk semua halaman: kode, jenis, block,
// koordinat, bacaan utama, dan status EWS. Stasiun yang dimodelkan di scene 3D
// punya `twinId` (m1..m17, lihat [[map-points]] & [[digital-twin]]); bacaannya
// diambil dari TWIN_ASSETS supaya tabel, peta, dan twin selalu sama.
// Koordinat stasiun non-twin di-generate di dalam polygon KHG, di wilayah
// block-nya (sensor twin terdekat ber-block sama). Jangan diedit manual.

import {
  ASSET_LAYER_LABEL,
  EWS_META,
  TWIN_ASSETS,
  ewsFromMoisture,
  ewsFromWaterTable,
  type EwsLevel,
} from "./digital-twin"
import type { MarkerLayer } from "./map-points"

export type StationLevel = EwsLevel | "offline"
export type StationSignal = "Good" | "Fair" | "Weak" | "No signal"

export type Station = {
  code: string
  type: MarkerLayer
  block: string
  lat: number
  lng: number
  /** Id aset di digital twin; null = tidak dimodelkan di scene 3D. */
  twinId: string | null
  /** Bacaan utama (muka air cm, kelembapan %, hujan 24 jam mm, bukaan %, FRP MW). */
  value: number | null
  unit: string
  level: StationLevel
  battery: number
  signal: StationSignal
  lastSeen: string
  /** Keterangan singkat (mis. "7 hari tanpa hujan"). */
  note?: string
  peatDepth?: number
  soilTemp?: number
}

type Seed = Omit<Station, "lat" | "lng" | "level" | "value" | "unit" | "lastSeen"> & {
  lat?: number
  lng?: number
  value?: number | null
  unit?: string
  level?: StationLevel
  lastSeen?: string
}

const SEEDS: Seed[] = [
  // Borehole (muka air, cm)
  { code: "BH-01", type: "borehole", block: "Block B", twinId: null, lat: 1.1109, lng: 101.79988, value: -31, battery: 92, signal: "Good", lastSeen: "09:36" },
  { code: "BH-02", type: "borehole", block: "Block A", twinId: null, lat: 1.07846, lng: 101.83978, value: -26, battery: 88, signal: "Good", lastSeen: "09:35" },
  { code: "BH-03", type: "borehole", block: "Block A", twinId: "m2", battery: 95, signal: "Good" },
  { code: "BH-04", type: "borehole", block: "Block B", twinId: null, lat: 1.11406, lng: 101.62362, value: -33, battery: 71, signal: "Fair", lastSeen: "09:34" },
  { code: "BH-05", type: "borehole", block: "Block C", twinId: null, lat: 1.01868, lng: 101.8694, value: -26, battery: 90, signal: "Good", lastSeen: "09:33" },
  { code: "BH-07", type: "borehole", block: "Block C", twinId: "m5", battery: 58, signal: "Weak" },
  { code: "BH-09", type: "borehole", block: "Block E", twinId: null, lat: 1.11398, lng: 101.72077, value: -25, battery: 96, signal: "Good", lastSeen: "09:33" },
  { code: "BH-11", type: "borehole", block: "Block C", twinId: "m6", battery: 73, signal: "Fair" },
  { code: "BH-12", type: "borehole", block: "Block D", twinId: null, lat: 1.20495, lng: 101.57094, value: -42, battery: 64, signal: "Fair", lastSeen: "09:30" },
  { code: "BH-15", type: "borehole", block: "Block E", twinId: null, lat: 1.10502, lng: 101.74883, value: -38, battery: 80, signal: "Good", lastSeen: "09:32" },
  // Water table station (muka air, cm)
  { code: "WTS-01", type: "water-station", block: "Block A", twinId: "m1", battery: 84, signal: "Good" },
  { code: "WTS-02", type: "water-station", block: "Block B", twinId: "m4", battery: 77, signal: "Good" },
  { code: "WTS-03", type: "water-station", block: "Block D", twinId: "m11", battery: 12, signal: "No signal", note: "Baterai lemah, data terakhir 06:12" },
  // Rain gauge (hujan 24 jam, mm) — rata-rata 6 penakar = 18,6 mm (KPI dashboard)
  { code: "RG-01", type: "rain-gauge", block: "Block B", twinId: "m3", battery: 90, signal: "Good" },
  { code: "RG-02", type: "rain-gauge", block: "Block E", twinId: "m10", battery: 88, signal: "Good" },
  { code: "RG-03", type: "rain-gauge", block: "Block C", twinId: null, lat: 1.05976, lng: 101.82552, value: 8.2, battery: 86, signal: "Good", lastSeen: "09:30" },
  { code: "RG-04", type: "rain-gauge", block: "Block B", twinId: "m17", battery: 81, signal: "Good", level: "waspada", note: "7 hari tanpa hujan" },
  { code: "RG-05", type: "rain-gauge", block: "Block D", twinId: null, lat: 1.22284, lng: 101.63535, value: 38.6, battery: 79, signal: "Fair", lastSeen: "09:31" },
  { code: "RG-06", type: "rain-gauge", block: "Block A", twinId: null, lat: 1.01831, lng: 101.82452, value: 28.2, battery: 67, signal: "Weak", lastSeen: "09:29" },
  // Pintu air (bukaan, %)
  { code: "WTG-01", type: "water-gate", block: "Block A", twinId: "m7", battery: 100, signal: "Good" },
  { code: "WTG-02", type: "water-gate", block: "Block C", twinId: "m9", battery: 0, signal: "No signal", note: "Offline sejak 09:00, bukaan terakhir 60%" },
  { code: "WTG-03", type: "water-gate", block: "Block D", twinId: "m13", battery: 100, signal: "Good" },
  // Stasiun gambut (kelembapan tanah, %)
  { code: "PMS-01", type: "peat-station", block: "Block A", twinId: null, lat: 1.0926, lng: 101.86297, value: 68, battery: 91, signal: "Good", lastSeen: "09:34", peatDepth: 322, soilTemp: 28.4 },
  { code: "PMS-02", type: "peat-station", block: "Block B", twinId: null, lat: 1.09541, lng: 101.67564, value: 65, battery: 87, signal: "Good", lastSeen: "09:33", peatDepth: 305, soilTemp: 28.1 },
  { code: "PMS-03", type: "peat-station", block: "Block C", twinId: null, lat: 1.04313, lng: 101.87145, value: 38, battery: 76, signal: "Fair", lastSeen: "09:31", peatDepth: 289, soilTemp: 29.2 },
  { code: "PMS-04", type: "peat-station", block: "Block D", twinId: null, lat: 1.23558, lng: 101.57561, value: 71, battery: 89, signal: "Good", lastSeen: "09:30", peatDepth: 310, soilTemp: 27.6 },
  { code: "PMS-05", type: "peat-station", block: "Block D", twinId: "m8", battery: 70, signal: "Fair", peatDepth: 310, soilTemp: 30.1 },
  { code: "PMS-06", type: "peat-station", block: "Block D", twinId: "m12", battery: 82, signal: "Good", peatDepth: 318, soilTemp: 29.0 },
  { code: "PMS-07", type: "peat-station", block: "Block E", twinId: "m16", battery: 93, signal: "Good", peatDepth: 298, soilTemp: 27.8 },
  { code: "PMS-08", type: "peat-station", block: "Block E", twinId: null, lat: 1.12535, lng: 101.75843, value: 60, battery: 85, signal: "Good", lastSeen: "09:32", peatDepth: 298, soilTemp: 28.3 },
  // Hotspot VIIRS (FRP, MW)
  { code: "HS-01", type: "fire-hotspot", block: "Block D", twinId: "m14", battery: 100, signal: "Good", level: "siaga", note: "Aktif · confidence nominal" },
  { code: "HS-02", type: "fire-hotspot", block: "Block D", twinId: "m15", battery: 100, signal: "Good", level: "awas", note: "Aktif · confidence high" },
  { code: "HS-03", type: "fire-hotspot", block: "Block C", twinId: null, lat: 1.30825, lng: 101.56291, value: 0, unit: "MW", battery: 100, signal: "Good", lastSeen: "8 Sep 13:20", level: "normal", note: "Padam · diverifikasi 8 Sep" },
  { code: "HS-04", type: "fire-hotspot", block: "Block D", twinId: null, lat: 1.17099, lng: 101.57762, value: 0, unit: "MW", battery: 100, signal: "Good", lastSeen: "9 Sep 01:40", level: "normal", note: "Positif palsu · atap seng" },
]

const UNIT: Record<MarkerLayer, string> = {
  borehole: "cm",
  "water-station": "cm",
  "rain-gauge": "mm",
  "water-gate": "%",
  "peat-station": "%",
  "fire-hotspot": "MW",
}

function levelOf(type: MarkerLayer, value: number | null): StationLevel {
  if (value == null) return "offline"
  if (type === "borehole" || type === "water-station") return ewsFromWaterTable(value)
  if (type === "peat-station") return ewsFromMoisture(value)
  if (type === "rain-gauge") return value >= 50 ? "siaga" : value >= 30 ? "waspada" : "normal"
  return "normal"
}

export const STATIONS: Station[] = SEEDS.map((s) => {
  const twin = s.twinId ? TWIN_ASSETS.find((a) => a.id === s.twinId) : undefined
  const offline = twin?.status === "offline"
  const value = s.value !== undefined ? s.value : offline ? null : (twin?.primary?.value ?? null)
  return {
    ...s,
    lat: twin?.lat ?? s.lat ?? 0,
    lng: twin?.lng ?? s.lng ?? 0,
    value,
    unit: s.unit ?? twin?.primary?.unit ?? UNIT[s.type],
    level: offline ? "offline" : (s.level ?? levelOf(s.type, value)),
    lastSeen: s.lastSeen ?? twin?.lastSeen ?? "—",
  }
})

export const STATION_TYPE_LABEL = ASSET_LAYER_LABEL

export function stationByCode(code: string): Station | undefined {
  return STATIONS.find((s) => s.code === code)
}

export function stationsOfType(type: MarkerLayer): Station[] {
  return STATIONS.filter((s) => s.type === type)
}

/** "1.0506° N, 101.7721° E" — koordinat desimal untuk tabel. */
export function formatLatLng(lat: number, lng: number): string {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`
}

/** Teks bacaan utama stasiun, mis. "−62 cm", "38%", "22.4 mm", "OFFLINE". */
export function formatStationValue(s: Pick<Station, "value" | "unit">): string {
  if (s.value == null) return "OFFLINE"
  const n = Number.isInteger(s.value) ? String(Math.abs(s.value)) : Math.abs(s.value).toFixed(1)
  const sign = s.value < 0 ? "−" : ""
  return s.unit === "%" ? `${sign}${n}%` : `${sign}${n} ${s.unit}`
}

export function stationLevelLabel(level: StationLevel): string {
  return level === "offline" ? "Offline" : EWS_META[level].label
}

export type TwinLink = {
  /** Id aset twin (m1..m17) atau kode stasiun (BH-07); kode tanpa twinId jatuh ke block-nya. */
  asset?: string
  block?: string
  layer?: "waterTable" | "soilMoisture" | "fireRisk" | "ndvi" | "peatDepth"
  scenario?: "baseline" | "dry" | "rewet" | "wet"
}

/** URL halaman Digital Twin yang langsung memilih aset / block / layer / skenario. */
export function twinHref(link: TwinLink = {}): string {
  const q = new URLSearchParams()
  let { asset, block } = link
  if (asset && !/^m\d+$/.test(asset)) {
    const st = stationByCode(asset)
    if (st?.twinId) asset = st.twinId
    else {
      block = block ?? st?.block
      asset = undefined
    }
  }
  if (asset) q.set("asset", asset)
  if (block) q.set("block", block)
  if (link.layer) q.set("layer", link.layer)
  if (link.scenario) q.set("scenario", link.scenario)
  const s = q.toString()
  return s ? `/digital-twin?${s}` : "/digital-twin"
}
