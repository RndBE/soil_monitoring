"use client"

import { useMemo } from "react"
import L from "leaflet"
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip } from "react-leaflet"

import type { PintuAirRingkas, SaluranRingkas, StatusRisiko, TitikMonitoringRingkas } from "@/lib/types"

type Props = {
  titik: TitikMonitoringRingkas[]
  pintuAir: PintuAirRingkas[]
  saluran?: SaluranRingkas[]
  height?: string
}

function statusColor(status: StatusRisiko): string {
  switch (status) {
    case "Waspada":
      return "#f59e0b"
    case "Siaga":
      return "#f97316"
    case "Awas":
      return "#e11d48"
    default:
      return "#10b981"
  }
}

function jenisColor(jenis: string): string {
  switch (jenis) {
    case "AWLR":
      return "#0ea5e9"
    case "DEBIT":
      return "#6366f1"
    case "CUACA_TANAH":
      return "#84cc16"
    case "PINTU_AIR":
      return "#a855f7"
    default:
      return "#475569"
  }
}

function gateIcon(status: StatusRisiko, posisi: number) {
  const fill = statusColor(status)
  const opacity = 0.35 + (posisi / 100) * 0.55
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <rect x="3" y="3" width="22" height="22" rx="4" fill="${fill}" fill-opacity="${opacity}" stroke="${fill}" stroke-width="2"/>
      <text x="14" y="18" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">${Math.round(posisi)}%</text>
    </svg>`
  return L.divIcon({
    className: "pintu-air-marker",
    html: svg,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

export default function PetaJaringanMap({ titik, pintuAir, saluran: _saluran, height = "100%" }: Props) {
  const allLatLng = useMemo(() => {
    const arr: [number, number][] = []
    for (const t of titik) arr.push([t.latitude, t.longitude])
    for (const p of pintuAir) arr.push([p.latitude, p.longitude])
    return arr
  }, [titik, pintuAir])

  const center: [number, number] = useMemo(() => {
    if (allLatLng.length === 0) return [-7.63, 111.53]
    const lat = allLatLng.reduce((sum, [a]) => sum + a, 0) / allLatLng.length
    const lng = allLatLng.reduce((sum, [, b]) => sum + b, 0) / allLatLng.length
    return [lat, lng]
  }, [allLatLng])

  // Garis saluran skematik: hubungkan pintu air primer → sekunder → tersier secara linier
  const polylines = useMemo(() => {
    if (pintuAir.length < 2) return []
    const sorted = [...pintuAir].sort((a, b) => a.kode.localeCompare(b.kode))
    const segments: [number, number][][] = []
    for (let i = 0; i < sorted.length - 1; i += 1) {
      segments.push([
        [sorted[i].latitude, sorted[i].longitude],
        [sorted[i + 1].latitude, sorted[i + 1].longitude],
      ])
    }
    return segments
  }, [pintuAir])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl ring-1 ring-foreground/10" style={{ minHeight: 320, height }}>
      <MapContainer center={center} zoom={15} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {polylines.map((seg, i) => (
          <Polyline key={i} positions={seg} color="#3b82f6" weight={3} opacity={0.55} dashArray="6 6" />
        ))}

        {titik.map((t) => (
          <CircleMarker
            key={t.id}
            center={[t.latitude, t.longitude]}
            radius={9}
            pathOptions={{
              color: statusColor(t.status),
              fillColor: jenisColor(t.jenis),
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <span className="font-medium">{t.nama}</span>
            </Tooltip>
            <Popup>
              <div className="space-y-1">
                <div className="text-sm font-semibold">{t.nama}</div>
                <div className="text-xs text-muted-foreground">
                  {t.kode} · {t.jenis}
                </div>
                <div className="text-xs">Saluran: {t.saluran ?? "-"}</div>
                <div className="text-xs">Nilai: {t.nilaiTerakhir}</div>
                <div className="text-xs">Status: {t.status}</div>
                <div className="text-xs text-muted-foreground">{t.lastUpdate}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {pintuAir.map((p) => (
          <Marker key={p.id} position={[p.latitude, p.longitude]} icon={gateIcon(p.status, p.posisiPersen)}>
            <Tooltip direction="top" offset={[0, -8]}>
              <span className="font-medium">{p.nama}</span>
            </Tooltip>
            <Popup>
              <div className="space-y-1">
                <div className="text-sm font-semibold">{p.nama}</div>
                <div className="text-xs text-muted-foreground">
                  {p.kode} · {p.mode}
                </div>
                <div className="text-xs">Saluran: {p.saluran ?? "-"}</div>
                <div className="text-xs">Bukaan: {p.posisiPersen.toFixed(0)}%</div>
                <div className="text-xs">Kapasitas: {p.kapasitasM3s.toFixed(2)} m³/s</div>
                <div className="text-xs">Status: {p.status}</div>
                <div className="text-xs text-muted-foreground">{p.lastUpdate}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
