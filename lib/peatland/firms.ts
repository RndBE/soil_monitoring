// Hotspot satelit NASA FIRMS (VIIRS 375 m, NOAA-20 & NOAA-21) untuk KHG Giam Siak Kecil.
// Logika murni: parsing CSV FIRMS, penempatan titik ke block/sector ([[block-zones]]),
// jarak ke batas KHG ([[lahan-gambut]]), dan level EWS. Pengambilan data + cache ada di
// app/api/firms/hotspots/route.ts; client membacanya lewat [[use-firms-hotspots]].

import { zoneAt } from "./block-zones"
import type { EwsLevel } from "./digital-twin"
import { lahanGambut } from "./lahan-gambut"

export type FirmsConfidence = "High" | "Nominal" | "Low"

export type FirmsHotspot = {
  /** Kunci stabil: satelit + waktu akuisisi + koordinat. */
  id: string
  /** Kode tampilan "HS-XXXX" (hash dari `id`). */
  code: string
  lat: number
  lng: number
  /** "NOAA-20", "NOAA-21", "Suomi NPP". */
  satellite: string
  /** Waktu lintasan satelit (ISO, UTC). */
  acquiredAt: string
  confidence: FirmsConfidence
  /** Fire radiative power (MW). */
  frp: number
  /** Suhu kecerahan kanal I-4 (K). */
  brightness: number
  daynight: "D" | "N"
  /** null = di luar KHG (zona penyangga). */
  block: string | null
  sector: string | null
  /** Jarak ke batas KHG (km); 0 = di dalam KHG. */
  distanceKm: number
  level: EwsLevel
}

export type FirmsFeed = {
  /** "api" = FIRMS Area API (MAP_KEY), "public" = file CSV regional tanpa key. */
  source: "api" | "public"
  windowHours: number
  fetchedAt: string
  hotspots: FirmsHotspot[]
  /** Satelit yang gagal diambil; data satelit lain tetap ditampilkan. */
  failed: string[]
  /** true = gagal memperbarui, ini data dari pengambilan sebelumnya. */
  stale?: boolean
}

/** Radius zona penyangga di sekitar batas KHG (km). */
export const FIRMS_BUFFER_KM = 10

const KHG_RING = lahanGambut.features[0].geometry.coordinates[0] as [number, number][]

// Proyeksi equirectangular pada lintang tengah KHG (~1,2° N) — cukup akurat untuk jarak < 50 km.
const MID_LAT = KHG_RING.reduce((a, [, lat]) => a + lat, 0) / KHG_RING.length
const KM_PER_DEG_LAT = 110.574
const KM_PER_DEG_LNG = 111.32 * Math.cos((MID_LAT * Math.PI) / 180)

/** Kotak [barat, selatan, timur, utara] = batas KHG + zona penyangga, untuk query FIRMS. */
export const FIRMS_BBOX: [number, number, number, number] = (() => {
  const lngs = KHG_RING.map(([lng]) => lng)
  const lats = KHG_RING.map(([, lat]) => lat)
  const dLng = FIRMS_BUFFER_KM / KM_PER_DEG_LNG
  const dLat = FIRMS_BUFFER_KM / KM_PER_DEG_LAT
  const r = (v: number) => Math.round(v * 1000) / 1000
  return [r(Math.min(...lngs) - dLng), r(Math.min(...lats) - dLat), r(Math.max(...lngs) + dLng), r(Math.max(...lats) + dLat)]
})()

function inRing(lng: number, lat: number, ring: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Jarak titik ke batas KHG (km); 0 bila di dalam. */
export function distanceToKhgKm(lat: number, lng: number): number {
  if (inRing(lng, lat, KHG_RING)) return 0
  const px = lng * KM_PER_DEG_LNG
  const py = lat * KM_PER_DEG_LAT
  let best = Infinity
  for (let i = 0, j = KHG_RING.length - 1; i < KHG_RING.length; j = i++) {
    const ax = KHG_RING[j][0] * KM_PER_DEG_LNG
    const ay = KHG_RING[j][1] * KM_PER_DEG_LAT
    const bx = KHG_RING[i][0] * KM_PER_DEG_LNG
    const by = KHG_RING[i][1] * KM_PER_DEG_LAT
    const dx = bx - ax
    const dy = by - ay
    const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0
    best = Math.min(best, Math.hypot(px - (ax + t * dx), py - (ay + t * dy)))
  }
  return best
}

// CSV FIRMS: API memakai "h/n/l", file regional "high/nominal/low", arsip lama 2/1/0.
const CONFIDENCE: Record<string, FirmsConfidence> = {
  h: "High",
  high: "High",
  "2": "High",
  n: "Nominal",
  nominal: "Nominal",
  "1": "Nominal",
  l: "Low",
  low: "Low",
  "0": "Low",
}

const SATELLITE: Record<string, string> = { N: "Suomi NPP", N20: "NOAA-20", "1": "NOAA-20", N21: "NOAA-21" }

/** Confidence menentukan level; titik di zona penyangga turun satu level (belum masuk KHG). */
const CONF_LEVEL: Record<FirmsConfidence, EwsLevel> = { High: "awas", Nominal: "siaga", Low: "waspada" }
const LEVEL_DOWN: Record<EwsLevel, EwsLevel> = { awas: "siaga", siaga: "waspada", waspada: "normal", normal: "normal" }

function shortHash(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36).toUpperCase().slice(-4).padStart(4, "0")
}

const REQUIRED = ["latitude", "longitude", "acq_date", "acq_time", "satellite", "confidence", "frp"] as const

/**
 * Parse CSV FIRMS (VIIRS) → hotspot di dalam KHG + zona penyangga yang terdeteksi
 * dalam `windowHours` terakhir. Melempar error bila isi bukan CSV FIRMS (mis. pesan
 * "Invalid MAP_KEY." yang dikirim API sebagai teks biasa).
 */
export function parseFirmsCsv(csv: string, windowHours: number, now = Date.now()): FirmsHotspot[] {
  const lines = csv.trim().split(/\r?\n/)
  const header = lines[0]?.split(",").map((h) => h.trim()) ?? []
  const col = Object.fromEntries(header.map((h, i) => [h, i]))
  const missing = REQUIRED.filter((k) => !(k in col))
  if (missing.length) {
    throw new Error(`Respons FIRMS bukan CSV yang dikenal: ${lines[0]?.slice(0, 120) ?? "(kosong)"}`)
  }
  const brightCol = col.bright_ti4 ?? col.brightness
  const since = now - windowHours * 3600_000
  const [w, s, e, n] = FIRMS_BBOX

  const out: FirmsHotspot[] = []
  for (const line of lines.slice(1)) {
    const f = line.split(",")
    const lat = Number(f[col.latitude])
    const lng = Number(f[col.longitude])
    if (!(lat >= s && lat <= n && lng >= w && lng <= e)) continue

    const hhmm = f[col.acq_time].trim().padStart(4, "0")
    const t = Date.parse(`${f[col.acq_date].trim()}T${hhmm.slice(0, 2)}:${hhmm.slice(2)}:00Z`)
    if (!(t >= since)) continue

    const distanceKm = distanceToKhgKm(lat, lng)
    if (distanceKm > FIRMS_BUFFER_KM) continue

    const satCode = f[col.satellite].trim()
    const confidence = CONFIDENCE[f[col.confidence].trim().toLowerCase()] ?? "Nominal"
    const zone = distanceKm === 0 ? zoneAt(lat, lng) : null
    const id = `${satCode}_${f[col.acq_date].trim()}_${hhmm}_${lat}_${lng}`
    const base = CONF_LEVEL[confidence]

    out.push({
      id,
      code: `HS-${shortHash(id)}`,
      lat,
      lng,
      satellite: SATELLITE[satCode] ?? satCode,
      acquiredAt: new Date(t).toISOString(),
      confidence,
      frp: Number(f[col.frp]) || 0,
      brightness: brightCol == null ? 0 : Number(f[brightCol]) || 0,
      daynight: col.daynight != null && f[col.daynight]?.trim() === "N" ? "N" : "D",
      block: zone?.block ?? null,
      sector: zone?.sector ?? null,
      distanceKm: Math.round(distanceKm * 10) / 10,
      level: distanceKm === 0 ? base : LEVEL_DOWN[base],
    })
  }
  return out
}

/** Terbaru dulu; pada waktu yang sama, FRP terbesar dulu. */
export function sortHotspots(list: FirmsHotspot[]): FirmsHotspot[] {
  return [...list].sort((a, b) => b.acquiredAt.localeCompare(a.acquiredAt) || b.frp - a.frp)
}
