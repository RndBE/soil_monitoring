// Mock data untuk Peatland & Plantation Monitoring Dashboard.
// Semua angka statis menyesuaikan mockup (PT Sinarmas Agribusiness, 9-10 Sep 2024).

export type Severity = "critical" | "warning" | "info"
export type StatusLevel = "normal" | "warning" | "critical" | "offline"

export const dashboardMeta = {
  title: "Peatland & Plantation Monitoring Dashboard",
  org: "PT Sinarmas Agribusiness",
  estate: "Sei Galuh Estate",
  division: "Block C",
  dateRange: "9 - 10 Sep 2024",
  weather: { temp: "24°C", condition: "Light Rain" },
  user: { name: "Anisa Octa N", role: "Peat Management Officer" },
  lastUpdate: "10 Sep 2024 09:37 AM",
}

export type Kpi = {
  key: string
  label: string
  value: string
  unit?: string
  status: string
  statusTone: "normal" | "warning" | "critical" | "info"
  delta: string
  deltaDir: "up" | "down"
  deltaTone: "good" | "bad" | "neutral"
  icon: "water" | "borehole" | "fire" | "rain" | "alert" | "signal"
}

export const kpis: Kpi[] = [
  {
    key: "water-table",
    label: "Water Table Level (Avg)",
    value: "-35",
    unit: "cm",
    status: "Normal",
    statusTone: "normal",
    delta: "3 cm",
    deltaDir: "down",
    deltaTone: "good",
    icon: "water",
  },
  {
    key: "borehole-critical",
    label: "Borehole Critical",
    value: "3",
    unit: "Stations",
    status: "Stations",
    statusTone: "critical",
    delta: "1",
    deltaDir: "up",
    deltaTone: "bad",
    icon: "borehole",
  },
  {
    key: "fire-risk",
    label: "Fire Risk Index (Estate)",
    value: "82",
    status: "High",
    statusTone: "critical",
    delta: "12",
    deltaDir: "up",
    deltaTone: "bad",
    icon: "fire",
  },
  {
    key: "rainfall",
    label: "Rainfall (24h)",
    value: "18.6",
    unit: "mm",
    status: "Moderate",
    statusTone: "info",
    delta: "6.4 mm",
    deltaDir: "down",
    deltaTone: "neutral",
    icon: "rain",
  },
  {
    key: "active-alerts",
    label: "Active Alerts",
    value: "7",
    status: "Alerts",
    statusTone: "warning",
    delta: "2",
    deltaDir: "up",
    deltaTone: "bad",
    icon: "alert",
  },
  {
    key: "stations-online",
    label: "Stations Online",
    value: "128",
    unit: "/ 139",
    status: "92%",
    statusTone: "normal",
    delta: "2",
    deltaDir: "up",
    deltaTone: "good",
    icon: "signal",
  },
]

export type AlertRow = {
  time: string
  asset: string
  alert: string
  severity: Severity
}

export const alerts: AlertRow[] = [
  { time: "09:15", asset: "BH-07", alert: "Water level critical", severity: "critical" },
  { time: "09:00", asset: "WTG-02", alert: "Water Gate offline", severity: "critical" },
  { time: "08:45", asset: "RG-04", alert: "No rainfall 7 days", severity: "warning" },
  { time: "08:30", asset: "BH-12", alert: "Water level warning", severity: "warning" },
  { time: "08:20", asset: "PMS-03", alert: "Soil moisture low", severity: "warning" },
  { time: "08:10", asset: "BH-03", alert: "Data not received", severity: "info" },
  { time: "08:05", asset: "RG-01", alert: "Rainfall high intensity", severity: "info" },
]

export const aiInsight =
  "Water table at Block C is declining for 5 consecutive days and is forecasted to reach warning threshold (-40 cm) within 72 hours based on current trend and weather forecast."

export const stations = { online: 128, offline: 11, total: 139, percent: 92 }

export type MapLayer = { key: string; label: string; enabled: boolean }

export const mapLayers: MapLayer[] = [
  { key: "borehole", label: "Borehole", enabled: true },
  { key: "water-station", label: "Water Table Station", enabled: true },
  { key: "rain-gauge", label: "Rain Gauge", enabled: true },
  { key: "water-gate", label: "Water Gate", enabled: true },
  { key: "canal", label: "Canal", enabled: true },
  { key: "peat-station", label: "Peat Monitoring Station", enabled: true },
  { key: "fire-hotspot", label: "Fire Hotspot (VIIRS)", enabled: true },
  { key: "plantation-block", label: "Plantation Block", enabled: true },
]

export type MapMarker = {
  id: string
  // posisi dalam persen relatif container peta
  x: number
  y: number
  kind: "normal" | "warning" | "critical" | "offline" | "gate"
}

export const mapMarkers: MapMarker[] = [
  { id: "m1", x: 26, y: 32, kind: "warning" },
  { id: "m2", x: 39, y: 24, kind: "normal" },
  { id: "m3", x: 50, y: 22, kind: "normal" },
  { id: "m4", x: 60, y: 30, kind: "warning" },
  { id: "m5", x: 70, y: 33, kind: "critical" },
  { id: "m6", x: 18, y: 46, kind: "critical" },
  { id: "m7", x: 30, y: 48, kind: "gate" },
  { id: "m8", x: 44, y: 52, kind: "critical" },
  { id: "m9", x: 55, y: 50, kind: "gate" },
  { id: "m10", x: 64, y: 47, kind: "normal" },
  { id: "m11", x: 74, y: 50, kind: "offline" },
  { id: "m12", x: 33, y: 64, kind: "warning" },
  { id: "m13", x: 47, y: 68, kind: "gate" },
  { id: "m14", x: 58, y: 66, kind: "warning" },
  { id: "m15", x: 40, y: 76, kind: "critical" },
  { id: "m16", x: 68, y: 62, kind: "normal" },
  { id: "m17", x: 80, y: 40, kind: "warning" },
]

export const blockLabels = [
  { label: "Block A", x: 14, y: 28 },
  { label: "Block C", x: 40, y: 56 },
  { label: "Block E", x: 50, y: 18 },
  { label: "Block E", x: 70, y: 28 },
]

// Water Table Trend (7 hari) — nilai cm (negatif = di bawah permukaan)
export const waterTableTrend = [
  { day: "4 Sep", value: -27 },
  { day: "5 Sep", value: -28 },
  { day: "6 Sep", value: -29 },
  { day: "7 Sep", value: -31 },
  { day: "8 Sep", value: -32 },
  { day: "9 Sep", value: -34 },
  { day: "10 Sep", value: -35 },
]

// Rainfall (mm) + Water Table (cm) korelasi 7 hari
export const rainfallCorrelation = [
  { day: "4 Sep", rainfall: 38, waterTable: -42 },
  { day: "5 Sep", rainfall: 6, waterTable: -38 },
  { day: "6 Sep", rainfall: 12, waterTable: -40 },
  { day: "7 Sep", rainfall: 60, waterTable: -28 },
  { day: "8 Sep", rainfall: 30, waterTable: -22 },
  { day: "9 Sep", rainfall: 5, waterTable: -30 },
  { day: "10 Sep", rainfall: 4, waterTable: -35 },
]

// Fire Risk Trend (7 hari) — index 0-100
export const fireRiskTrend = [
  { day: "4 Sep", value: 64 },
  { day: "5 Sep", value: 67 },
  { day: "6 Sep", value: 63 },
  { day: "7 Sep", value: 70 },
  { day: "8 Sep", value: 72 },
  { day: "9 Sep", value: 78 },
  { day: "10 Sep", value: 82 },
]

export type BoreholeRow = {
  id: string
  location: string
  waterLevel: number
  status: StatusLevel
  trend: number[]
}

export const boreholeStatus: BoreholeRow[] = [
  { id: "BH-07", location: "Block C", waterLevel: -62, status: "critical", trend: [-48, -52, -55, -58, -60, -62] },
  { id: "BH-12", location: "Block D", waterLevel: -42, status: "warning", trend: [-36, -38, -39, -40, -41, -42] },
  { id: "BH-03", location: "Block A", waterLevel: -28, status: "normal", trend: [-30, -29, -28, -27, -28, -28] },
  { id: "BH-01", location: "Block B", waterLevel: -31, status: "normal", trend: [-33, -32, -31, -30, -31, -31] },
  { id: "BH-09", location: "Block E", waterLevel: -25, status: "normal", trend: [-27, -26, -25, -24, -25, -25] },
]

export type PeatRow = {
  station: string
  peatDepth: number
  soilMoisture: number
  soilTemp: number
  status: StatusLevel
}

export const peatMonitoring: PeatRow[] = [
  { station: "PMS-01", peatDepth: 322, soilMoisture: 68, soilTemp: 28.4, status: "normal" },
  { station: "PMS-02", peatDepth: 305, soilMoisture: 65, soilTemp: 28.1, status: "normal" },
  { station: "PMS-03", peatDepth: 289, soilMoisture: 38, soilTemp: 29.2, status: "warning" },
  { station: "PMS-04", peatDepth: 310, soilMoisture: 71, soilTemp: 27.6, status: "normal" },
]

export type NdviRow = {
  block: string
  ndvi: number
  health: string
  healthTone: "very-good" | "good" | "moderate" | "poor"
  area: number
}

export const plantationHealth: NdviRow[] = [
  { block: "Block A", ndvi: 0.82, health: "Very Good", healthTone: "very-good", area: 1250 },
  { block: "Block B", ndvi: 0.71, health: "Good", healthTone: "good", area: 1180 },
  { block: "Block C", ndvi: 0.59, health: "Moderate", healthTone: "moderate", area: 1320 },
  { block: "Block D", ndvi: 0.42, health: "Poor", healthTone: "poor", area: 1150 },
  { block: "Block E", ndvi: 0.78, health: "Good", healthTone: "good", area: 1210 },
]
