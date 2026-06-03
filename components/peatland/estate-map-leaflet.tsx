"use client"

import { useEffect } from "react"
import L from "leaflet"
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
} from "react-leaflet"

import { lahanGambut } from "@/lib/peatland/lahan-gambut"
import { blockPoints, markerPoints, type MarkerKind } from "@/lib/peatland/map-points"

// Area lahan gambut nyata: Suaka Margasatwa Giam Siak Kecil (Bengkalis, Riau).
const CENTER: [number, number] = [1.1624, 101.6885]
// [south, west], [north, east] — batas penuh kawasan, dipakai untuk fitBounds.
const GAMBUT_BOUNDS: [[number, number], [number, number]] = [
  [0.965, 101.46],
  [1.36, 101.92],
]

const markerColor: Record<MarkerKind, string> = {
  normal: "#22c55e",
  warning: "#f59e0b",
  critical: "#ef4444",
  offline: "#64748b",
  gate: "#38bdf8",
}

const markerLabel: Record<MarkerKind, string> = {
  normal: "Normal",
  warning: "Warning",
  critical: "Critical",
  offline: "Offline",
  gate: "Water Gate",
}

const gambutStyle: L.PathOptions = {
  color: "#5eead4",
  weight: 2,
  opacity: 0.9,
  fillColor: "#22c55e",
  fillOpacity: 0.12,
  dashArray: "5 4",
}

// Leaflet menghitung ukuran container saat init. Karena komponen ini di-load
// lewat dynamic import (ssr:false), ukurannya bisa terbaca 0 → tile tidak diminta.
// invalidateSize() memaksa Leaflet mengukur ulang & memuat tile, lalu fitBounds
// membingkai kawasan gambut.
function MapInit() {
  const map = useMap()
  useEffect(() => {
    const refit = () => {
      map.invalidateSize()
      map.fitBounds(GAMBUT_BOUNDS, { padding: [24, 24] })
    }
    const t1 = setTimeout(refit, 150)
    const t2 = setTimeout(refit, 600)
    const onResize = () => map.invalidateSize()
    const ro = new ResizeObserver(onResize)
    ro.observe(map.getContainer())
    window.addEventListener("resize", onResize)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      ro.disconnect()
      window.removeEventListener("resize", onResize)
    }
  }, [map])
  return null
}

function blockIcon(label: string) {
  return L.divIcon({
    className: "peat-block-label",
    html: `<span>${label}</span>`,
    iconSize: [60, 16],
    iconAnchor: [30, 8],
  })
}

export default function EstateMapLeaflet() {
  return (
    <MapContainer
      center={CENTER}
      zoom={10}
      scrollWheelZoom
      zoomControl={false}
      className="peat-map h-full w-full"
      style={{ background: "#0c1612" }}
    >
      <TileLayer
        url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
        subdomains={["mt0", "mt1", "mt2", "mt3"]}
        attribution="&copy; Google"
        maxZoom={20}
      />

      <ZoomControl position="topright" />
      <MapInit />

      {/* Batas lahan gambut nyata (OpenStreetMap) */}
      <GeoJSON
        data={lahanGambut}
        style={gambutStyle}
        onEachFeature={(feature, layer) => {
          const p = feature.properties as { name?: string; type?: string; region?: string } | null
          if (p?.name) {
            layer.bindTooltip(
              `<b>${p.name}</b><br/>${p.type ?? ""}${p.region ? ` · ${p.region}` : ""}`,
              { sticky: true }
            )
          }
        }}
      />

      {/* Label block — di dalam polygon */}
      {blockPoints.map((b, i) => (
        <Marker key={`blk-${i}`} position={[b.lat, b.lng]} icon={blockIcon(b.label)} interactive={false} />
      ))}

      {/* Titik stasiun — di dalam polygon */}
      {markerPoints.map((m) => (
        <CircleMarker
          key={m.id}
          center={[m.lat, m.lng]}
          radius={7}
          pathOptions={{
            color: "#ffffff",
            weight: 1.5,
            opacity: 0.85,
            fillColor: markerColor[m.kind],
            fillOpacity: 0.95,
          }}
        >
          <Tooltip direction="top" offset={[0, -6]}>
            <span style={{ fontWeight: 600 }}>{m.id.toUpperCase()}</span> — {markerLabel[m.kind]}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
